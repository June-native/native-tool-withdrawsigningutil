import { useMemo, useState } from 'react'
import {
  useAccount,
  useChainId,
  useSignTypedData,
  useSwitchChain,
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  getAddress,
  hashTypedData,
  isAddress,
  keccak256,
  parseUnits,
  toHex,
  type Address,
  type Hex,
} from 'viem'

import './App.css'

/**
 * EIP-712 domain & type definition mirroring DepositWithdrawVault.sol:
 *
 *   EIP712("DepositWithdrawVault", "1")
 *   WithdrawRequest(address token,address user,uint256 amount,uint256 nonce,uint256 deadline)
 */
const DOMAIN_NAME = 'DepositWithdrawVault'
const DOMAIN_VERSION = '1'

const TYPES = {
  WithdrawRequest: [
    { name: 'token', type: 'address' },
    { name: 'user', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

type FormState = {
  verifyingContract: string
  chainIdOverride: string
  token: string
  user: string
  amount: string
  decimals: string
  nonce: string
  deadline: string
}

const DEFAULTS: FormState = {
  verifyingContract: '',
  chainIdOverride: '',
  token: '',
  user: '',
  amount: '',
  decimals: '18',
  nonce: '',
  deadline: '',
}

const oneHourFromNow = () =>
  Math.floor(Date.now() / 1000 + 60 * 60).toString()

const randomNonce = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return BigInt('0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')).toString()
}

function App() {
  const { address, isConnected } = useAccount()
  const activeChainId = useChainId()
  const { switchChain, chains } = useSwitchChain()
  const { signTypedDataAsync, isPending } = useSignTypedData()

  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [signature, setSignature] = useState<Hex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [combineInput, setCombineInput] = useState('')

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSignature(null)
    setError(null)
  }

  const chainIdForSig = useMemo(() => {
    if (form.chainIdOverride.trim() !== '') {
      const n = Number(form.chainIdOverride)
      return Number.isFinite(n) && n > 0 ? n : undefined
    }
    return activeChainId
  }, [form.chainIdOverride, activeChainId])

  const validation = useMemo(() => validate(form, chainIdForSig), [form, chainIdForSig])

  const parsed = useMemo(() => {
    if (!validation.ok) return null
    return {
      token: getAddress(form.token),
      user: getAddress(form.user),
      amount: parseUnits(form.amount as `${number}`, Number(form.decimals)),
      nonce: BigInt(form.nonce),
      deadline: BigInt(form.deadline),
      verifyingContract: getAddress(form.verifyingContract),
      chainId: chainIdForSig!,
    }
  }, [validation.ok, form, chainIdForSig])

  const digest = useMemo(() => {
    if (!parsed) return null
    return hashTypedData({
      domain: {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId: parsed.chainId,
        verifyingContract: parsed.verifyingContract,
      },
      types: TYPES,
      primaryType: 'WithdrawRequest',
      message: {
        token: parsed.token,
        user: parsed.user,
        amount: parsed.amount,
        nonce: parsed.nonce,
        deadline: parsed.deadline,
      },
    })
  }, [parsed])

  const structHash = useMemo(() => {
    if (!parsed) return null
    const typeHash = keccak256(
      toHex(
        'WithdrawRequest(address token,address user,uint256 amount,uint256 nonce,uint256 deadline)',
      ),
    )
    return { typeHash }
  }, [parsed])

  async function handleSign() {
    setError(null)
    setSignature(null)
    if (!parsed) {
      setError(validation.message ?? 'Invalid input')
      return
    }
    if (parsed.chainId !== activeChainId) {
      setError(
        `Wallet is on chain ${activeChainId}, but signature targets chain ${parsed.chainId}. ` +
          'Switch network in your wallet first (the EIP-712 domain encodes the chain id).',
      )
      return
    }
    try {
      const sig = await signTypedDataAsync({
        domain: {
          name: DOMAIN_NAME,
          version: DOMAIN_VERSION,
          chainId: parsed.chainId,
          verifyingContract: parsed.verifyingContract,
        },
        types: TYPES,
        primaryType: 'WithdrawRequest',
        message: {
          token: parsed.token,
          user: parsed.user,
          amount: parsed.amount,
          nonce: parsed.nonce,
          deadline: parsed.deadline,
        },
      })
      setSignature(sig)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const canSwitch = !!parsed && parsed.chainId !== activeChainId && chains.some((c) => c.id === parsed.chainId)

  const combined = useMemo(() => combineSignatures(combineInput), [combineInput])

  return (
    <main className="app">
      <header className="topbar">
        <div className="title">
          <h1>Withdraw Signature Utility</h1>
          <p>
            Sign EIP-712 <code>WithdrawRequest</code> messages for{' '}
            <code>DepositWithdrawVault.withdraw()</code>.
          </p>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" />
      </header>

      <section className="card">
        <h2>Message</h2>
        <div className="grid">
          <Field
            label="Vault contract (verifyingContract)"
            placeholder="0x…"
            value={form.verifyingContract}
            onChange={(v) => update('verifyingContract', v)}
            error={validation.fieldErrors.verifyingContract}
          />
          <Field
            label="Chain id"
            placeholder={activeChainId ? String(activeChainId) : '1'}
            value={form.chainIdOverride}
            onChange={(v) => update('chainIdOverride', v)}
            hint={
              form.chainIdOverride.trim() === '' && activeChainId
                ? `Using wallet chain: ${activeChainId}`
                : undefined
            }
            error={validation.fieldErrors.chainId}
          />
          <Field
            label="token (underlying)"
            placeholder="0x…"
            value={form.token}
            onChange={(v) => update('token', v)}
            error={validation.fieldErrors.token}
          />
          <Field
            label="user (recipient)"
            placeholder="0x…"
            value={form.user}
            onChange={(v) => update('user', v)}
            error={validation.fieldErrors.user}
          />
          <Field
            label="amount (human-readable)"
            placeholder="100.5"
            value={form.amount}
            onChange={(v) => update('amount', v)}
            error={validation.fieldErrors.amount}
            hint={
              parsed
                ? `= ${parsed.amount.toString()} (uint256)`
                : 'parsed with `decimals` below via parseUnits'
            }
          />
          <Field
            label="token decimals"
            placeholder="18"
            value={form.decimals}
            onChange={(v) => update('decimals', v)}
            error={validation.fieldErrors.decimals}
          />
          <Field
            label="nonce"
            placeholder="unique uint256"
            value={form.nonce}
            onChange={(v) => update('nonce', v)}
            hint="Replay protection is per user: contract uses usedNonces[user][nonce]"
            error={validation.fieldErrors.nonce}
            trailing={
              <button
                type="button"
                className="ghost"
                onClick={() => update('nonce', randomNonce())}
              >
                random
              </button>
            }
          />
          <Field
            label="deadline (unix seconds)"
            placeholder="e.g. 1735689600"
            value={form.deadline}
            onChange={(v) => update('deadline', v)}
            error={validation.fieldErrors.deadline}
            hint={
              form.deadline
                ? prettyDeadline(form.deadline)
                : undefined
            }
            trailing={
              <button
                type="button"
                className="ghost"
                onClick={() => update('deadline', oneHourFromNow())}
              >
                +1h
              </button>
            }
          />
        </div>
      </section>

      <section className="card">
        <h2>Preview</h2>
        <dl className="kv">
          <dt>Signer (your wallet)</dt>
          <dd>
            <code>{address ?? '(not connected)'}</code>
          </dd>
          <dt>Typehash</dt>
          <dd>
            <code>{structHash?.typeHash ?? '—'}</code>
          </dd>
          <dt>Domain separator chain</dt>
          <dd>
            <code>{chainIdForSig ?? '—'}</code>
          </dd>
          <dt>EIP-712 digest</dt>
          <dd>
            <code>{digest ?? '—'}</code>
          </dd>
        </dl>
      </section>

      <section className="card">
        <h2>Sign</h2>
        {!isConnected && (
          <p className="hint">Connect a wallet above to sign.</p>
        )}
        {isConnected && parsed && parsed.chainId !== activeChainId && (
          <div className="warn">
            <p>
              Wallet is on chain <strong>{activeChainId}</strong>, but the
              signature targets chain <strong>{parsed.chainId}</strong>. Switch
              networks so the wallet domain matches.
            </p>
            {canSwitch && (
              <button
                type="button"
                onClick={() => switchChain({ chainId: parsed.chainId })}
              >
                Switch to {chainName(chains, parsed.chainId)}
              </button>
            )}
          </div>
        )}
        <div className="actions">
          <button
            type="button"
            className="primary"
            disabled={!isConnected || !parsed || isPending}
            onClick={handleSign}
          >
            {isPending ? 'Waiting for wallet…' : 'Sign WithdrawRequest'}
          </button>
          {!validation.ok && form !== DEFAULTS && (
            <span className="hint">{validation.message}</span>
          )}
        </div>
        {error && <pre className="error">{error}</pre>}
        {signature && (
          <SignatureBlock signature={signature} signer={address} parsed={parsed!} />
        )}
      </section>

      <section className="card">
        <h2>Combine signatures for withdraw()</h2>
        <p className="hint">
          The contract expects <code>bytes signatures</code> as a concatenation of N signatures, each 65 bytes:{' '}
          <code>r(32) || s(32) || v(1)</code>. Paste one signature per line (0x…).
        </p>

        <label className="field" style={{ marginTop: 12 }}>
          <span className="label">Signatures (one per line)</span>
          <textarea
            className="textarea"
            spellCheck={false}
            placeholder={`0x…\n0x…\n0x…`}
            value={combineInput}
            onChange={(e) => setCombineInput(e.target.value)}
          />
          {!combined.ok && combined.error ? (
            <span className="field-error">{combined.error}</span>
          ) : (
            <span className="field-hint">
              Detected <strong>{combined.signatures.length}</strong> signature(s) · total{' '}
              <strong>{combined.totalBytes}</strong> bytes
            </span>
          )}
        </label>

        <div className="actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => combined.ok && navigator.clipboard.writeText(combined.concatenated)}
            disabled={!combined.ok}
          >
            Copy concatenated bytes
          </button>
          <button
            type="button"
            onClick={() => signature && setCombineInput((t) => (t.trim() ? `${t.trim()}\n${signature}` : signature))}
            disabled={!signature}
          >
            Append last signed
          </button>
        </div>

        {combined.ok && (
          <pre className="sig-value" style={{ marginTop: 12 }}>
            {combined.concatenated}
          </pre>
        )}
      </section>

      <footer className="footer">
        <p>
          Domain: <code>name="{DOMAIN_NAME}", version="{DOMAIN_VERSION}"</code>{' '}
          · Wallets via{' '}
          <a href="https://www.rainbowkit.com" target="_blank" rel="noreferrer">
            RainbowKit
          </a>
        </p>
      </footer>
    </main>
  )
}

export default App

/* -------------------------------------------------------------------------- */
/*                                helpers / UI                                */
/* -------------------------------------------------------------------------- */

function Field(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  error?: string
  trailing?: React.ReactNode
}) {
  return (
    <label className="field">
      <span className="label">{props.label}</span>
      <span className="input-row">
        <input
          type="text"
          spellCheck={false}
          autoComplete="off"
          value={props.value}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
          aria-invalid={!!props.error}
        />
        {props.trailing}
      </span>
      {props.error ? (
        <span className="field-error">{props.error}</span>
      ) : props.hint ? (
        <span className="field-hint">{props.hint}</span>
      ) : null}
    </label>
  )
}

function SignatureBlock({
  signature,
  signer,
  parsed,
}: {
  signature: Hex
  signer?: Address
  parsed: {
    token: Address
    user: Address
    amount: bigint
    nonce: bigint
    deadline: bigint
    verifyingContract: Address
    chainId: number
  }
}) {
  const r = ('0x' + signature.slice(2, 66)) as Hex
  const s = ('0x' + signature.slice(66, 130)) as Hex
  const v = parseInt(signature.slice(130, 132), 16)

  const payload = {
    signer,
    signature,
    r,
    s,
    v,
    message: {
      token: parsed.token,
      user: parsed.user,
      amount: parsed.amount.toString(),
      nonce: parsed.nonce.toString(),
      deadline: parsed.deadline.toString(),
    },
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: parsed.chainId,
      verifyingContract: parsed.verifyingContract,
    },
  }

  const json = JSON.stringify(payload, null, 2)

  return (
    <div className="sig">
      <div className="sig-row">
        <h3>Signature</h3>
        <button type="button" onClick={() => navigator.clipboard.writeText(signature)}>
          Copy signature
        </button>
        <button type="button" onClick={() => navigator.clipboard.writeText(json)}>
          Copy JSON
        </button>
      </div>
      <pre className="sig-value">{signature}</pre>
      <details>
        <summary>r / s / v</summary>
        <dl className="kv">
          <dt>r</dt><dd><code>{r}</code></dd>
          <dt>s</dt><dd><code>{s}</code></dd>
          <dt>v</dt><dd><code>{v}</code></dd>
        </dl>
      </details>
      <details>
        <summary>JSON payload (for the executor / aggregator)</summary>
        <pre>{json}</pre>
      </details>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  validation                                */
/* -------------------------------------------------------------------------- */

type Validation = {
  ok: boolean
  message?: string
  fieldErrors: Partial<Record<keyof FormState | 'chainId', string>>
}

function validate(form: FormState, chainId: number | undefined): Validation {
  const fieldErrors: Validation['fieldErrors'] = {}

  if (!isAddress(form.verifyingContract))
    fieldErrors.verifyingContract = 'Must be a 0x-prefixed address'
  if (!isAddress(form.token)) fieldErrors.token = 'Must be a 0x-prefixed address'
  if (!isAddress(form.user)) fieldErrors.user = 'Must be a 0x-prefixed address'

  if (!chainId || chainId <= 0) fieldErrors.chainId = 'Connect wallet or enter a chain id'

  const dec = Number(form.decimals)
  if (!Number.isInteger(dec) || dec < 0 || dec > 36)
    fieldErrors.decimals = '0–36'

  if (form.amount.trim() === '') {
    fieldErrors.amount = 'Required'
  } else if (!/^\d+(\.\d+)?$/.test(form.amount.trim())) {
    fieldErrors.amount = 'Must be a non-negative decimal'
  } else {
    try {
      const v = parseUnits(form.amount as `${number}`, dec)
      if (v <= 0n) fieldErrors.amount = 'Must be > 0'
    } catch {
      fieldErrors.amount = 'Cannot parse with given decimals'
    }
  }

  if (form.nonce.trim() === '') {
    fieldErrors.nonce = 'Required'
  } else {
    try {
      const n = BigInt(form.nonce)
      if (n < 0n) fieldErrors.nonce = 'Must be ≥ 0'
    } catch {
      fieldErrors.nonce = 'Must be an integer (uint256)'
    }
  }

  if (form.deadline.trim() === '') {
    fieldErrors.deadline = 'Required'
  } else if (!/^\d+$/.test(form.deadline.trim())) {
    fieldErrors.deadline = 'Unix seconds (integer)'
  } else if (BigInt(form.deadline) <= BigInt(Math.floor(Date.now() / 1000))) {
    fieldErrors.deadline = 'Deadline is already in the past'
  }

  const ok = Object.keys(fieldErrors).length === 0
  return {
    ok,
    message: ok ? undefined : 'Fix the highlighted fields to enable signing.',
    fieldErrors,
  }
}

function prettyDeadline(deadline: string) {
  try {
    const ts = Number(deadline)
    if (!Number.isFinite(ts)) return undefined
    const d = new Date(ts * 1000)
    const delta = ts - Math.floor(Date.now() / 1000)
    const rel = delta > 0 ? `in ${humanize(delta)}` : `${humanize(-delta)} ago`
    return `${d.toISOString()} (${rel})`
  } catch {
    return undefined
  }
}

function humanize(sec: number) {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.round(sec / 60)}m`
  if (sec < 86_400) return `${Math.round(sec / 3600)}h`
  return `${Math.round(sec / 86_400)}d`
}

function chainName(chains: readonly { id: number; name: string }[], id: number) {
  return chains.find((c) => c.id === id)?.name ?? `chain ${id}`
}

function combineSignatures(input: string): {
  ok: boolean
  error?: string
  signatures: Hex[]
  concatenated: Hex
  totalBytes: number
} {
  const parts = input
    .split(/\r?\n|,|;/g)
    .map((s) => s.trim())
    .filter(Boolean)

  const signatures: Hex[] = []
  for (let i = 0; i < parts.length; i++) {
    const s = parts[i]!
    if (!s.startsWith('0x')) {
      return {
        ok: false,
        error: `Line ${i + 1}: signature must start with 0x`,
        signatures,
        concatenated: '0x',
        totalBytes: 0,
      }
    }
    if (!/^0x[0-9a-fA-F]+$/.test(s)) {
      return {
        ok: false,
        error: `Line ${i + 1}: signature must be hex`,
        signatures,
        concatenated: '0x',
        totalBytes: 0,
      }
    }
    if (s.length !== 132) {
      return {
        ok: false,
        error: `Line ${i + 1}: expected 65-byte signature (132 chars incl 0x), got ${s.length}`,
        signatures,
        concatenated: '0x',
        totalBytes: 0,
      }
    }
    signatures.push(s as Hex)
  }

  const concatenated = (`0x${signatures.map((x) => x.slice(2)).join('')}` || '0x') as Hex
  const totalBytes = signatures.length * 65
  return { ok: true, signatures, concatenated, totalBytes }
}

# Withdraw Signing Utility

A small Vite + React + TypeScript app that connects to common Ethereum wallets
via [RainbowKit](https://www.rainbowkit.com) / [wagmi](https://wagmi.sh) and
helps signers produce **EIP-712 `WithdrawRequest`** signatures for the
`DepositWithdrawVault` contract.

The vault's `withdraw(...)` function verifies multi-sig signatures over:

```
WithdrawRequest(address token, address user, uint256 amount, uint256 nonce, uint256 deadline)
```

with EIP-712 domain `name="DepositWithdrawVault", version="1"` and the
`chainId` / `verifyingContract` of the deployed vault. This tool builds that
typed-data payload and asks the connected wallet to sign it.

## Quick start

```bash
npm install
cp .env.example .env.local       # then fill in VITE_WALLETCONNECT_PROJECT_ID
npm run dev
```

Then open the printed URL, connect a wallet, fill in the form, and click
**Sign WithdrawRequest**. The resulting 65-byte signature (and a JSON payload
including `r`, `s`, `v`, message and domain) is shown for copy-paste to the
executor / aggregator.

### WalletConnect project id

RainbowKit uses WalletConnect v2 under the hood for mobile / browserless
wallets. Create a free project at <https://cloud.reown.com> and put the id in
`.env.local` as `VITE_WALLETCONNECT_PROJECT_ID`. Without it the WC-based
wallets will not initialize (a warning is logged).

## What it does

- **Wallet connect** via RainbowKit. Supported chains: Ethereum mainnet,
  BSC mainnet, Base mainnet, Arbitrum mainnet, and Arbitrum Sepolia. Edit
  `src/wagmi.ts` to add more.
- **Network-aware signing** — the EIP-712 domain encodes `chainId`, so the
  app refuses to sign if the wallet's current chain doesn't match the target
  chain id (and offers a one-click switch).
- **Human-friendly amounts** — enter `100.5` + `decimals=6` and the tool
  parses it into the `uint256` the contract expects via `viem`'s `parseUnits`.
- **Live digest preview** — shows the `TYPE_HASH` and the
  `_hashTypedDataV4(...)` digest so you can sanity-check what your wallet
  will sign.
- **Convenience helpers** — random uint256 nonce, "+1h" deadline.
- **Per-user nonces** — `usedNonces[user][nonce]` on-chain; the same nonce can be used for different recipients.

## Files of interest

- `src/wagmi.ts` — RainbowKit `getDefaultConfig` (chains, projectId).
- `src/main.tsx` — `WagmiProvider` + `QueryClientProvider` +
  `RainbowKitProvider`.
- `src/App.tsx` — form, validation, `useSignTypedData` call, signature
  display.

## Scripts

| script           | what it does                       |
| ---------------- | ---------------------------------- |
| `npm run dev`    | start the Vite dev server          |
| `npm run build`  | type-check (`tsc -b`) + production build |
| `npm run preview`| preview the production build       |
| `npm run lint`   | run ESLint                         |

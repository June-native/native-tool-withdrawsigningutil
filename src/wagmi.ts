import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import {
  arbitrum,
  arbitrumSepolia,
  base,
  bsc,
  mainnet,
} from 'wagmi/chains'

// `YOUR_PROJECT_ID` is a sentinel that RainbowKit recognizes and replaces
// with its built-in demo WalletConnect projectId. Good enough for local dev;
// set VITE_WALLETCONNECT_PROJECT_ID in .env.local for anything real.
const envProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined
const projectId =
  envProjectId && envProjectId.trim() !== '' ? envProjectId : 'YOUR_PROJECT_ID'

if (projectId === 'YOUR_PROJECT_ID') {
  console.warn(
    '[wagmi] VITE_WALLETCONNECT_PROJECT_ID is not set — using RainbowKit ' +
      'demo projectId. WalletConnect-based wallets will work for testing ' +
      'but you should set your own id (https://cloud.reown.com) before ' +
      'shipping.',
  )
}

export const config = getDefaultConfig({
  appName: 'Withdraw Signing Utility',
  projectId,
  chains: [mainnet, bsc, base, arbitrum, arbitrumSepolia],
  ssr: false,
})

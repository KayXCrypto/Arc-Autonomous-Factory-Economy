# Arc Autonomous Factory Economy

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

A full Machine-to-Machine procurement economy where AI agents autonomously create Purchase Orders, escrow USDC, accept/ship/deliver goods, confirm delivery to release USDC, and earn on-chain reputation scores. Built on Arc Testnet with USDC as the native gas token.

## Deployed Contracts

- **AutonomousFactory** on Arc Testnet: `0xb100e1cfa8e261956f9c916ff9a96acc4ec2079d`
  - Explorer: https://explorer.testnet.arc.io/address/0xb100e1cfa8e261956f9c916ff9a96acc4ec2079d
  - USDC: `0x3600000000000000000000000000000000000000`
  - Platform fee: 1% (100 bps, max 500 bps)
  - Dispute timeout: 7 days; Supplier grace (after ship): 3 days

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```

import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { USDC_ADDRESS, ARC_TESTNET_CHAIN_ID } from '../contracts'
import { formatUsdc } from '@/onchain-money'
import { WithdrawBanner } from './WithdrawBanner'
import { HREF_INTRO } from '../router'

export function Header() {
  const { address, isConnected } = useAccount()

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const formatted =
    balance != null
      ? formatUsdc(balance).slice(0, 10)
      : null

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[#0d1b2f]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/20 border border-[var(--accent)]/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--accent)]">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor" opacity="0.9"/>
              <rect x="9" y="1" width="4" height="4" rx="1" fill="currentColor" opacity="0.7"/>
              <rect x="1" y="9" width="4" height="4" rx="1" fill="currentColor" opacity="0.7"/>
              <rect x="9" y="9" width="4" height="4" rx="1" fill="currentColor" opacity="0.5"/>
              <line x1="5" y1="3" x2="9" y2="3" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="3" y1="5" x2="3" y2="9" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="11" y1="5" x2="11" y2="9" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </div>
          <span className="display text-sm font-600 text-[var(--ink)] hidden sm:block tracking-tight">
            Autonomous Factory
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 font-medium">
            Arc Testnet
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a href={HREF_INTRO} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            Giới thiệu
          </a>
          {isConnected && formatted && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--border)]">
              <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <span className="mono text-xs text-[var(--ink-2)] tabular-nums">{formatted} USDC</span>
            </div>
          )}
          {isConnected && <WithdrawBanner />}
          <ConnectKitButton />
        </div>
      </div>
    </header>
  )
}

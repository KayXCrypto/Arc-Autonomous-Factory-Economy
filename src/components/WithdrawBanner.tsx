import { useEffect, useRef } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { AUTONOMOUS_FACTORY_ADDRESS, AUTONOMOUS_FACTORY_ABI, ARC_TESTNET_CHAIN_ID } from '../contracts'
import { formatUsdc } from '@/onchain-money'
import { buildTxExplorerUrl } from '@/onchain-facts'

export function WithdrawBanner() {
  const { address } = useAccount()

  const { data: rawPending, refetch } = useReadContract({
    address: AUTONOMOUS_FACTORY_ADDRESS,
    abi: AUTONOMOUS_FACTORY_ABI,
    functionName: 'pendingWithdrawals',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 6000 },
  })

  const { writeContract, data: txHash, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!txHash },
  })

  const refetchedRef = useRef(false)
  useEffect(() => {
    if (isSuccess && !refetchedRef.current) {
      refetchedRef.current = true
      void refetch()
    }
    if (!isSuccess) refetchedRef.current = false
  }, [isSuccess, refetch])

  // Coerce to bigint safely regardless of wagmi's inferred return type
  const pendingBigint: bigint = rawPending != null ? BigInt(rawPending as string | number | bigint) : 0n
  if (pendingBigint === 0n) return null

  const formatted = parseFloat(formatUsdc(pendingBigint)).toFixed(4)
  const busy = isPending || isConfirming

  function handleWithdraw() {
    writeContract(
      {
        address: AUTONOMOUS_FACTORY_ADDRESS,
        abi: AUTONOMOUS_FACTORY_ABI,
        functionName: 'withdraw',
        chainId: ARC_TESTNET_CHAIN_ID,
      },
      {
        onSuccess: (hash) => {
          toast.success('Withdraw submitted', {
            description: (
              <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, hash)} target="_blank" rel="noopener" className="underline">
                View on Arc Explorer
              </a>
            ),
          })
        },
        onError: (e) => {
          toast.error('Withdraw failed', { description: e.message.slice(0, 120) })
        },
      }
    )
  }

  return (
    <button
      onClick={handleWithdraw}
      disabled={busy}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--success)]/50 bg-[var(--success)]/15 hover:bg-[var(--success)]/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed animate-pulse-once"
      title={`${formatted} USDC pending in escrow — click to withdraw`}
    >
      {busy ? (
        <svg className="w-3.5 h-3.5 animate-spin text-[var(--success)]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-[var(--success)]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v9.69l2.97-2.97a.75.75 0 011.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 11.53a.75.75 0 011.06-1.06l2.97 2.97V3.75A.75.75 0 0110 3z" clipRule="evenodd"/>
          <path fillRule="evenodd" d="M3 17.25A.75.75 0 013.75 16.5h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd"/>
        </svg>
      )}
      <span className="mono text-xs font-600 text-[var(--success)] tabular-nums whitespace-nowrap">
        {busy ? 'Withdrawing…' : `Withdraw ${formatted} USDC`}
      </span>
    </button>
  )
}

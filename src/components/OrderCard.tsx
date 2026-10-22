import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useAccount, useReadContract } from 'wagmi'
import { toast } from 'sonner'
import {
  AUTONOMOUS_FACTORY_ADDRESS,
  AUTONOMOUS_FACTORY_ABI,
  ARC_TESTNET_CHAIN_ID,
  statusLabel,
  statusColor,
} from '../contracts'
import { formatUsdc } from '@/onchain-money'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface Order {
  id: bigint
  buyer: string
  supplier: string
  usdcAmount: bigint
  platformFee: bigint
  productHash: string
  productDescription: string
  createdAt: bigint
  acceptDeadline: bigint
  deliveryDeadline: bigint
  disputeDeadline: bigint
  status: number
  trackingInfo: string
  disputeReason: string
}

interface Props {
  order: Order
  onAction: () => void
}

function addr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}` }

export function OrderCard({ order, onAction }: Props) {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [trackingInfo, setTrackingInfo] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [showActions, setShowActions] = useState(false)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const isBuyer = address?.toLowerCase() === order.buyer.toLowerCase()
  const isSupplier = address?.toLowerCase() === order.supplier.toLowerCase()
  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID
  const s = order.status

  // Read pending withdrawal balance — only for supplier on RELEASED orders
  const { data: rawPending, refetch: refetchPending } = useReadContract({
    address: AUTONOMOUS_FACTORY_ADDRESS,
    abi: AUTONOMOUS_FACTORY_ABI,
    functionName: 'pendingWithdrawals',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address && isSupplier && s === 5, refetchInterval: 6000 },
  })
  const pendingBigint: bigint = rawPending != null ? BigInt(rawPending as string | number | bigint) : 0n

  if (isSuccess) { onAction(); void refetchPending() }

  function call(fn: string, args: unknown[]) {
    if (isWrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    writeContract({
      address: AUTONOMOUS_FACTORY_ADDRESS,
      abi: AUTONOMOUS_FACTORY_ABI,
      functionName: fn,
      args: args,
      chainId: ARC_TESTNET_CHAIN_ID,
    })
    toast.loading(`Processing ${fn}…`, { id: fn })
  }

  const amtFormatted = parseFloat(formatUsdc(order.usdcAmount)).toFixed(2)
  const feeFormatted = parseFloat(formatUsdc(order.platformFee)).toFixed(2)
  const netFormatted = (parseFloat(amtFormatted) - parseFloat(feeFormatted)).toFixed(2)

  const nowSecsRef = useState(() => BigInt(Math.floor(Date.now() / 1000)))
  const nowSecs = nowSecsRef[0]
  const statusStr = statusLabel(s)
  const colorClass = statusColor(s)

  const canAccept = isSupplier && s === 1
  const canReject = isSupplier && s === 1   // supplier can reject a FUNDED order
  const canShip = isSupplier && s === 2
  const canConfirm = isBuyer && (s === 3)
  const canDispute = isBuyer && (s === 3)
  const canCancel = isBuyer && s === 0
  const canTimeout = (isBuyer && (s === 1 || s === 2)) || (isSupplier && s === 3 && nowSecs > order.deliveryDeadline + BigInt(3 * 86400))

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur hover:border-[var(--border-strong)] transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="display text-sm font-700 text-[var(--ink)]">PO #{order.id.toString()}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-600 uppercase tracking-wider ${colorClass}`}>
              {statusStr}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{order.productDescription || '—'}</p>
        </div>
        <div className="text-right">
          <p className="display text-lg font-700 text-[var(--ink)] tabular-nums">{amtFormatted}</p>
          <p className="text-xs text-[var(--muted)] tabular-nums">USDC</p>
        </div>
      </div>

      {/* Addresses */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
          <p className="text-[10px] text-[var(--subtle)] uppercase tracking-wider">Buyer</p>
          <p className={`mono text-xs mt-0.5 ${isBuyer ? 'text-[var(--accent)]' : 'text-[var(--ink-2)]'}`}>{addr(order.buyer)}</p>
        </div>
        <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
          <p className="text-[10px] text-[var(--subtle)] uppercase tracking-wider">Supplier</p>
          <p className={`mono text-xs mt-0.5 ${isSupplier ? 'text-[var(--accent)]' : 'text-[var(--ink-2)]'}`}>{addr(order.supplier)}</p>
        </div>
      </div>

      {/* Deadlines */}
      <div className="px-4 pb-3 flex gap-3 text-xs text-[var(--subtle)]">
        <span>Accept by: <span className="text-[var(--ink-2)]">{new Date(Number(order.acceptDeadline) * 1000).toLocaleDateString()}</span></span>
        <span>Deliver by: <span className="text-[var(--ink-2)]">{new Date(Number(order.deliveryDeadline) * 1000).toLocaleDateString()}</span></span>
      </div>

      {/* Tracking / dispute info */}
      {order.trackingInfo && (
        <div className="px-4 pb-3">
          <p className="text-xs text-purple-300"><span className="text-[var(--subtle)]">Tracking:</span> {order.trackingInfo}</p>
        </div>
      )}
      {order.disputeReason && (
        <div className="px-4 pb-3">
          <p className="text-xs text-[var(--danger)]"><span className="text-[var(--subtle)]">Dispute:</span> {order.disputeReason}</p>
        </div>
      )}

      {/* Settlement preview */}
      {(s === 3 || s === 4 || s === 5) && (
        <div className="mx-4 mb-3 rounded-lg bg-white/5 border border-[var(--border)] px-3 py-2 flex justify-between text-xs">
          <span className="text-[var(--subtle)]">Net to supplier</span>
          <span className="text-[var(--success)] tabular-nums font-600">{netFormatted} USDC</span>
        </div>
      )}

      {/* Withdraw button — shown to supplier on RELEASED orders with pending balance */}
      {isSupplier && s === 5 && pendingBigint > 0n && (
        <div className="mx-4 mb-4">
          <button
            onClick={() => {
              if (isWrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
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
                  onError: (e) => toast.error('Withdraw failed', { description: e.message.slice(0, 120) }),
                }
              )
            }}
            disabled={isPending || isConfirming}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--success)]/15 hover:bg-[var(--success)]/25 border border-[var(--success)]/40 text-[var(--success)] text-sm font-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                Confirm in wallet…
              </>
            ) : isConfirming ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                Withdrawing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v9.69l2.97-2.97a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 11.53a.75.75 0 011.06-1.06l2.97 2.97V3.75A.75.75 0 0110 3z" clipRule="evenodd"/>
                  <path fillRule="evenodd" d="M3 17.25A.75.75 0 013.75 16.5h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd"/>
                </svg>
                Withdraw {parseFloat(formatUsdc(pendingBigint)).toFixed(4)} USDC to your wallet
              </>
            )}
          </button>
        </div>
      )}

      {/* Actions */}
      {(canAccept || canReject || canShip || canConfirm || canDispute || canCancel || canTimeout) && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]">
          {!showActions ? (
            <button
              onClick={() => setShowActions(true)}
              className="w-full py-2 px-3 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-600 border border-[var(--accent)]/20 transition-colors"
            >
              Actions available
            </button>
          ) : (
            <div className="space-y-2">
              {canAccept && (
                <button onClick={() => call('acceptOrder', [order.id])} disabled={isPending || isConfirming} className="w-full py-2 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-600 border border-blue-500/20 transition-colors disabled:opacity-40">
                  {isPending ? 'Confirm in wallet…' : isConfirming ? 'Accepting…' : 'Accept Order'}
                </button>
              )}
              {canShip && (
                <div className="space-y-1.5">
                  <input value={trackingInfo} onChange={e => setTrackingInfo(e.target.value)} placeholder="Tracking # or shipping note" className="w-full text-xs bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none" />
                  <button onClick={() => { if (!trackingInfo) { toast.error('Enter tracking info'); return } call('shipOrder', [order.id, trackingInfo]) }} disabled={isPending || isConfirming} className="w-full py-2 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-600 border border-purple-500/20 transition-colors disabled:opacity-40">
                    {isPending ? 'Confirm in wallet…' : isConfirming ? 'Marking shipped…' : 'Mark as Shipped'}
                  </button>
                </div>
              )}
              {canConfirm && (
                <button onClick={() => call('confirmDelivery', [order.id])} disabled={isPending || isConfirming} className="w-full py-2 px-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-[var(--success)] text-xs font-600 border border-green-500/20 transition-colors disabled:opacity-40">
                  {isPending ? 'Confirm in wallet…' : isConfirming ? 'Releasing USDC…' : `Confirm Delivery — Release ${netFormatted} USDC`}
                </button>
              )}
              {canDispute && (
                <div className="space-y-1.5">
                  <input value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Reason for dispute…" className="w-full text-xs bg-white/5 border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none" />
                  <button onClick={() => { if (!disputeReason) { toast.error('Enter dispute reason'); return } call('disputeOrder', [order.id, disputeReason]) }} disabled={isPending || isConfirming} className="w-full py-2 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-[var(--danger)] text-xs font-600 border border-red-500/20 transition-colors disabled:opacity-40">
                    {isPending ? 'Confirm in wallet…' : isConfirming ? 'Raising dispute…' : 'Raise Dispute'}
                  </button>
                </div>
              )}
              {canCancel && (
                <button onClick={() => call('cancelOrder', [order.id])} disabled={isPending || isConfirming} className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--muted)] text-xs font-600 border border-white/10 transition-colors disabled:opacity-40">
                  Cancel Order
                </button>
              )}
              {canTimeout && (
                <button onClick={() => call('claimTimeout', [order.id])} disabled={isPending || isConfirming} className="w-full py-2 px-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-[var(--warning)] text-xs font-600 border border-yellow-500/20 transition-colors disabled:opacity-40">
                  Claim Timeout Refund
                </button>
              )}
              {txHash && (
                <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, txHash)} target="_blank" rel="noopener" className="block text-center text-xs text-[var(--accent)] hover:underline mt-1">View transaction</a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

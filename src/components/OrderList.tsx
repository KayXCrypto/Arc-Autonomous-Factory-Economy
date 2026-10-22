import { useReadContract, useAccount } from 'wagmi'
import { useState, useCallback } from 'react'
import {
  AUTONOMOUS_FACTORY_ADDRESS,
  AUTONOMOUS_FACTORY_ABI,
  ARC_TESTNET_CHAIN_ID,
} from '../contracts'
import { OrderCard } from './OrderCard'

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

export function OrderList() {
  const { address } = useAccount()
  const [tab, setTab] = useState<'buyer' | 'supplier'>('buyer')
  const [refresh, setRefresh] = useState(0)

  const { data: buyerOrderIdsRaw, refetch: refetchBuyer } = useReadContract({
    address: AUTONOMOUS_FACTORY_ADDRESS,
    abi: AUTONOMOUS_FACTORY_ABI,
    functionName: 'getBuyerOrders',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const { data: supplierOrderIdsRaw, refetch: refetchSupplier } = useReadContract({
    address: AUTONOMOUS_FACTORY_ADDRESS,
    abi: AUTONOMOUS_FACTORY_ABI,
    functionName: 'getSupplierOrders',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const buyerOrderIds = (buyerOrderIdsRaw as readonly bigint[] | undefined) ?? []
  const supplierOrderIds = (supplierOrderIdsRaw as readonly bigint[] | undefined) ?? []

  const handleAction = useCallback(() => {
    void refetchBuyer()
    void refetchSupplier()
    setRefresh(r => r + 1)
  }, [refetchBuyer, refetchSupplier])

  const ids = tab === 'buyer' ? buyerOrderIds : supplierOrderIds

  if (!address) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="text-[var(--muted)] text-sm">Connect your wallet to view orders.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-[var(--border)] w-fit">
        {(['buyer', 'supplier'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-600 capitalize transition-all ${
              tab === t
                ? 'bg-[var(--accent)] text-[#0d1b2f]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            As {t} ({(t === 'buyer' ? buyerOrderIds : supplierOrderIds).length})
          </button>
        ))}
      </div>

      {/* Order cards */}
      {ids.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--muted)] text-sm">No orders as {tab} yet.</p>
          {tab === 'buyer' && (
            <p className="text-xs text-[var(--subtle)] mt-1">Create a Purchase Order to get started.</p>
          )}
        </div>
      ) : (
        <OrderLoader ids={[...ids].reverse()} refresh={refresh} onAction={handleAction} />
      )}
    </div>
  )
}

const MAX_VISIBLE = 4

function OrderLoader({ ids, refresh, onAction }: { ids: bigint[]; refresh: number; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? ids : ids.slice(0, MAX_VISIBLE)
  const overflow = ids.length > MAX_VISIBLE

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-3 sm:grid-cols-2 ${overflow && !expanded ? '' : ''} ${expanded ? 'max-h-[700px] overflow-y-auto pr-1 scrollbar-thin' : ''}`}
        style={expanded ? { maxHeight: '700px', overflowY: 'auto' } : {}}
      >
        {visible.map(id => (
          <SingleOrder key={`${id}-${refresh}`} id={id} onAction={onAction} />
        ))}
      </div>
      {overflow && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          {expanded ? `Show less` : `Show ${ids.length - MAX_VISIBLE} more order${ids.length - MAX_VISIBLE > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}

function SingleOrder({ id, onAction }: { id: bigint; onAction: () => void }) {
  const { data: orderRaw } = useReadContract({
    address: AUTONOMOUS_FACTORY_ADDRESS,
    abi: AUTONOMOUS_FACTORY_ABI,
    functionName: 'getOrder',
    args: [id],
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  if (!orderRaw) return null

  // Cast ABI tuple to our typed interface
  const o = orderRaw as unknown as {
    id: bigint; buyer: string; supplier: string; usdcAmount: bigint; platformFee: bigint
    productHash: string; productDescription: string; createdAt: bigint; acceptDeadline: bigint
    deliveryDeadline: bigint; disputeDeadline: bigint; status: number; trackingInfo: string; disputeReason: string
  }

  if (!o.id || o.id === 0n) return null

  const order: Order = {
    id: o.id,
    buyer: o.buyer,
    supplier: o.supplier,
    usdcAmount: o.usdcAmount,
    platformFee: o.platformFee,
    productHash: o.productHash,
    productDescription: o.productDescription,
    createdAt: o.createdAt,
    acceptDeadline: o.acceptDeadline,
    deliveryDeadline: o.deliveryDeadline,
    disputeDeadline: o.disputeDeadline,
    status: Number(o.status),
    trackingInfo: o.trackingInfo,
    disputeReason: o.disputeReason,
  }

  return <OrderCard order={order} onAction={onAction} />
}

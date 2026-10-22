import { useReadContract } from 'wagmi'
import { AUTONOMOUS_FACTORY_ADDRESS, AUTONOMOUS_FACTORY_ABI, ARC_TESTNET_CHAIN_ID } from '../contracts'
import { erc20Abi } from 'viem'
import { USDC_ADDRESS } from '../contracts'
import { formatUsdc } from '@/onchain-money'

export function StatCards() {
  const { data: nextOrderId } = useReadContract({
    address: AUTONOMOUS_FACTORY_ADDRESS,
    abi: AUTONOMOUS_FACTORY_ABI,
    functionName: 'nextOrderId',
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const { data: feeBps } = useReadContract({
    address: AUTONOMOUS_FACTORY_ADDRESS,
    abi: AUTONOMOUS_FACTORY_ABI,
    functionName: 'platformFeeBps',
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const { data: contractBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [AUTONOMOUS_FACTORY_ADDRESS],
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const totalOrders = nextOrderId != null ? Number(nextOrderId) - 1 : 0
  const fee = feeBps != null ? (Number(feeBps) / 100).toFixed(1) : '—'
  const escrowBal =
    contractBalance != null
      ? parseFloat(formatUsdc(contractBalance)).toFixed(2)
      : '—'

  const stats = [
    { label: 'Total Orders', value: totalOrders > 0 ? totalOrders.toString() : '0', sub: 'onchain POs created' },
    { label: 'Escrowed USDC', value: `${escrowBal}`, sub: 'locked in factory', unit: 'USDC' },
    { label: 'Platform Fee', value: `${fee}%`, sub: 'of each settlement' },
    { label: 'Chain', value: 'Arc Testnet', sub: 'USDC native gas', small: true },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur p-4"
        >
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-1">{s.label}</p>
          <p className={`display font-700 text-[var(--ink)] tabular-nums ${s.small ? 'text-base' : 'text-2xl'}`}>
            {s.value}
            {s.unit && <span className="text-sm font-400 text-[var(--muted)] ml-1">{s.unit}</span>}
          </p>
          <p className="text-xs text-[var(--subtle)] mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}

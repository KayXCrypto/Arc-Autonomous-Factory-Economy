import artifact from '../contracts/out/AutonomousFactory.sol/AutonomousFactory.json'

export const AUTONOMOUS_FACTORY_ADDRESS = '0xb100e1cfa8e261956f9c916ff9a96acc4ec2079d' as const
export const AUTONOMOUS_FACTORY_ABI = artifact.abi

export const ORDER_STATUS = [
  'PENDING',
  'FUNDED',
  'ACCEPTED',
  'SHIPPED',
  'DELIVERED',
  'RELEASED',
  'DISPUTED',
  'RESOLVED',
  'REFUNDED',
  'CANCELLED',
] as const

export type OrderStatus = (typeof ORDER_STATUS)[number]

export function statusLabel(s: number): OrderStatus {
  return ORDER_STATUS[s] ?? ('UNKNOWN' as OrderStatus)
}

export function statusColor(s: number): string {
  const colors: Record<number, string> = {
    0: 'text-[var(--muted)] bg-white/5',       // PENDING
    1: 'text-[var(--warning)] bg-yellow-500/10', // FUNDED
    2: 'text-blue-300 bg-blue-500/10',           // ACCEPTED
    3: 'text-purple-300 bg-purple-500/10',       // SHIPPED
    4: 'text-[var(--success)] bg-green-500/10',  // DELIVERED
    5: 'text-[var(--success)] bg-green-500/10',  // RELEASED
    6: 'text-[var(--danger)] bg-red-500/10',     // DISPUTED
    7: 'text-[var(--muted)] bg-white/5',         // RESOLVED
    8: 'text-[var(--muted)] bg-white/5',         // REFUNDED
    9: 'text-[var(--muted)] bg-white/5',         // CANCELLED
  }
  return colors[s] ?? 'text-[var(--muted)] bg-white/5'
}

export const ARC_TESTNET_CHAIN_ID = 5042002
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { erc20Abi, keccak256, toHex } from 'viem'
import { toast } from 'sonner'
import { AUTONOMOUS_FACTORY_ADDRESS, AUTONOMOUS_FACTORY_ABI, ARC_TESTNET_CHAIN_ID, USDC_ADDRESS } from '../contracts'
import { parseAmount } from '@/onchain-money'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function CreateOrderModal({ onClose, onSuccess }: Props) {
  const { chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const [supplier, setSupplier] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [acceptHours, setAcceptHours] = useState('48')
  const [deliveryDays, setDeliveryDays] = useState('7')
  const [step, setStep] = useState<'create' | 'approve' | 'fund' | 'done'>('create')

  const [newOrderId, setNewOrderId] = useState<bigint | null>(null)

  const { writeContract: writeCreate, data: createHash, isPending: isCreating } = useWriteContract()
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess, data: createReceipt } =
    useWaitForTransactionReceipt({ hash: createHash })

  const { writeContract: writeApprove, data: approveHash, isPending: isApproving } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: writeFund, data: fundHash, isPending: isFunding } = useWriteContract()
  const { isLoading: isFundConfirming, isSuccess: isFundSuccess } =
    useWaitForTransactionReceipt({ hash: fundHash })

  const isWrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  const parsedAmount = (() => {
    try { return parseAmount(ARC_TESTNET_CHAIN_ID, amount) } catch { return null }
  })()

  function handleCreate() {
    if (isWrongChain) { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); return }
    if (!supplier || !parsedAmount || !description) return
    const productHash = keccak256(toHex(description))
    writeCreate({
      address: AUTONOMOUS_FACTORY_ADDRESS,
      abi: AUTONOMOUS_FACTORY_ABI,
      functionName: 'createOrder',
      args: [
        supplier as `0x${string}`,
        parsedAmount.raw,
        productHash,
        description,
        BigInt(Number(acceptHours) * 3600),
        BigInt(Number(deliveryDays) * 86400),
      ],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  // After create confirmed, extract orderId from logs
  if (isCreateSuccess && createReceipt && step === 'create') {
    // Find OrderCreated event topic (orderId is first indexed topic = topics[1])
    const log = createReceipt.logs[0]
    if (log) {
      const id = BigInt(log.topics[1] ?? '0x1')
      setNewOrderId(id)
    }
    setStep('approve')
    toast.success('Purchase Order created onchain')
  }

  function handleApprove() {
    if (!parsedAmount) return
    writeApprove({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [AUTONOMOUS_FACTORY_ADDRESS, parsedAmount.raw],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  if (isApproveSuccess && step === 'approve') {
    setStep('fund')
    toast.success('USDC spending approved')
  }

  function handleFund() {
    if (!newOrderId) return
    writeFund({
      address: AUTONOMOUS_FACTORY_ADDRESS,
      abi: AUTONOMOUS_FACTORY_ABI,
      functionName: 'fundOrder',
      args: [newOrderId],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  if (isFundSuccess && step === 'fund') {
    setStep('done')
    toast.success(`Order #${newOrderId} funded — USDC locked in escrow`)
    onSuccess()
  }

  const btnBase = 'w-full py-3 px-4 rounded-xl font-600 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed'
  const btnPrimary = `${btnBase} bg-[var(--accent)] text-[#0d1b2f] hover:bg-[var(--accent-hover)]`

  const steps = [
    { id: 'create', label: 'Create PO', done: ['approve','fund','done'].includes(step) },
    { id: 'approve', label: 'Approve USDC', done: ['fund','done'].includes(step) },
    { id: 'fund', label: 'Fund Escrow', done: step === 'done' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[#0f1e30] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h2 className="display text-base font-700 text-[var(--ink)]">New Purchase Order</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">3-step: Create → Approve USDC → Fund Escrow</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--muted)] transition-colors">
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-5 py-3 border-b border-[var(--border)]">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-0 flex-1">
              <div className={`flex items-center gap-1.5 text-xs font-500 ${
                s.done ? 'text-[var(--success)]' : step === s.id ? 'text-[var(--accent)]' : 'text-[var(--subtle)]'
              }`}>
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center border ${
                  s.done ? 'bg-[var(--success)]/20 border-[var(--success)]/40 text-[var(--success)]'
                    : step === s.id ? 'bg-[var(--accent)]/20 border-[var(--accent)]/40 text-[var(--accent)]'
                    : 'bg-white/5 border-white/10 text-[var(--subtle)]'
                }`}>{s.done ? '✓' : i + 1}</span>
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px mx-2 ${s.done ? 'bg-[var(--success)]/40' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {step === 'create' && (
            <>
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-widest block mb-1.5">Supplier Address</label>
                <input
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="0x..."
                  className="w-full mono text-xs bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--accent)]/60"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-widest block mb-1.5">USDC Amount</label>
                <div className="relative">
                  <input
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="100.00"
                    type="number"
                    min="0"
                    className="w-full display text-xl bg-white/5 border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--accent)]/60 pr-20 tabular-nums"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] font-500">USDC</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] uppercase tracking-widest block mb-1.5">Product Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="500x STM32 microcontrollers, revision B..."
                  rows={2}
                  className="w-full text-sm bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--accent)]/60 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted)] uppercase tracking-widest block mb-1.5">Accept window (hours)</label>
                  <input value={acceptHours} onChange={e => setAcceptHours(e.target.value)} type="number" min="1" className="w-full text-sm bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/60 tabular-nums" />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] uppercase tracking-widest block mb-1.5">Delivery window (days)</label>
                  <input value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} type="number" min="1" className="w-full text-sm bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/60 tabular-nums" />
                </div>
              </div>
              <button
                onClick={isWrongChain ? () => switchChain({ chainId: ARC_TESTNET_CHAIN_ID }) : handleCreate}
                disabled={(!isWrongChain && (!supplier || !parsedAmount || !description)) || isCreating || isCreateConfirming}
                className={btnPrimary}
              >
                {isWrongChain ? 'Switch to Arc Testnet' : isCreating ? 'Confirm in wallet...' : isCreateConfirming ? 'Creating PO...' : 'Create Purchase Order'}
              </button>
            </>
          )}

          {step === 'approve' && (
            <>
              <div className="rounded-xl bg-white/5 border border-[var(--border)] p-4 space-y-2">
                <p className="text-xs text-[var(--muted)] uppercase tracking-widest">Order created</p>
                <p className="text-sm text-[var(--ink-2)]">PO #{newOrderId?.toString()} — <span className="text-[var(--accent)] tabular-nums">{amount} USDC</span></p>
                {createHash && (
                  <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, createHash)} target="_blank" rel="noopener" className="text-xs text-[var(--accent)] hover:underline block">View on explorer</a>
                )}
              </div>
              <p className="text-sm text-[var(--ink-2)]">Now approve the factory contract to pull <strong>{amount} USDC</strong> from your wallet.</p>
              <button onClick={handleApprove} disabled={isApproving || isApproveConfirming} className={btnPrimary}>
                {isApproving ? 'Confirm in wallet...' : isApproveConfirming ? 'Approving...' : `Approve ${amount} USDC`}
              </button>
            </>
          )}

          {step === 'fund' && (
            <>
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                <p className="text-xs text-[var(--success)] uppercase tracking-widest">USDC approved</p>
                <p className="text-sm text-[var(--ink-2)] mt-1">Ready to lock <strong>{amount} USDC</strong> in escrow for PO #{newOrderId?.toString()}.</p>
              </div>
              <button onClick={handleFund} disabled={isFunding || isFundConfirming} className={btnPrimary}>
                {isFunding ? 'Confirm in wallet...' : isFundConfirming ? 'Locking in escrow...' : 'Lock USDC in Escrow'}
              </button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--success)]/20 border border-[var(--success)]/30 flex items-center justify-center mx-auto text-2xl">✓</div>
              <p className="display text-base font-700 text-[var(--ink)]">Escrow Active</p>
              <p className="text-sm text-[var(--muted)]">PO #{newOrderId?.toString()} is funded and waiting for supplier acceptance.</p>
              {fundHash && (
                <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, fundHash)} target="_blank" rel="noopener" className="text-xs text-[var(--accent)] hover:underline block">View funding tx</a>
              )}
              <button onClick={onClose} className={btnPrimary}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

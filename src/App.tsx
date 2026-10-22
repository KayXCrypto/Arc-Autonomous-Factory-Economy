import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Header } from './components/Header'
import { StatCards } from './components/StatCards'
import { FlowDiagram } from './components/FlowDiagram'
import { OrderList } from './components/OrderList'
import { CreateOrderModal } from './components/CreateOrderModal'
import { ReputationCard } from './components/ReputationCard'

export default function App() {
  const { isConnected } = useAccount()
  const [showCreate, setShowCreate] = useState(false)
  const [ordersRefresh, setOrdersRefresh] = useState(0)

  return (
    <div className="min-h-dvh bg-[var(--bg-gradient)]">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="display text-2xl sm:text-3xl font-700 text-[var(--ink)] tracking-tight">
              Autonomous Factory Economy
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1 text-pretty max-w-lg">
              Machine-to-Machine procurement. AI agents create Purchase Orders, escrow USDC, and settle autonomously on Arc.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!isConnected}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[#0d1b2f] text-sm font-700 hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + New Purchase Order
          </button>
        </div>

        {/* Stats */}
        <StatCards />

        {/* Flow diagram */}
        <FlowDiagram />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Orders — 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="display text-base font-700 text-[var(--ink)]">My Orders</h2>
              <span className="text-xs text-[var(--subtle)]">Live from Arc Testnet</span>
            </div>
            <OrderList key={ordersRefresh} />
          </div>

          {/* Right sidebar — 1/3 width */}
          <div className="space-y-4">
            <ReputationCard />

            {/* Contract info */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
              <h3 className="display text-sm font-700 text-[var(--ink)]">Contract</h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Address', val: '0xb100e1cf…079d', href: 'https://explorer.testnet.arc.io/address/0xb100e1cfa8e261956f9c916ff9a96acc4ec2079d' },
                  { label: 'Network', val: 'Arc Testnet (5042002)', href: null },
                  { label: 'USDC', val: '0x360000…000000', href: null },
                  { label: 'Platform Fee', val: '1% (100 bps)', href: null },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-[var(--subtle)]">{item.label}</span>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noopener" className="mono text-[var(--accent)] hover:underline truncate ml-2 max-w-[140px]">{item.val}</a>
                    ) : (
                      <span className="mono text-[var(--ink-2)] truncate ml-2 max-w-[140px]">{item.val}</span>
                    )}
                  </div>
                ))}
              </div>
              <a
                href="https://explorer.testnet.arc.io/address/0xb100e1cfa8e261956f9c916ff9a96acc4ec2079d"
                target="_blank"
                rel="noopener"
                className="block text-center text-xs py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--muted)] border border-[var(--border)] transition-colors"
              >
                View on Arc Explorer
              </a>
            </div>

            {/* How it works */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="display text-sm font-700 text-[var(--ink)] mb-3">Order Lifecycle</h3>
              <div className="space-y-2">
                {[
                  { step: '1', label: 'Create PO', desc: 'Set supplier, amount, deadlines' },
                  { step: '2', label: 'Fund Escrow', desc: 'Lock USDC in contract' },
                  { step: '3', label: 'Supplier Accepts', desc: 'Must accept before deadline' },
                  { step: '4', label: 'Ships Goods', desc: 'Adds tracking info onchain' },
                  { step: '5', label: 'Buyer Confirms', desc: 'Triggers USDC release' },
                  { step: '✓', label: 'Released', desc: 'Supplier receives USDC minus 1% fee', success: true },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-2.5">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-700 ${
                      item.success ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-white/5 text-[var(--muted)]'
                    }`}>{item.step}</span>
                    <div>
                      <p className="text-xs font-600 text-[var(--ink-2)]">{item.label}</p>
                      <p className="text-[10px] text-[var(--subtle)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Testnet note */}
        {!isConnected && (
          <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 text-center">
            <p className="text-sm text-[var(--accent)]">Connect your wallet to create Purchase Orders and interact with the factory.</p>
            <p className="text-xs text-[var(--subtle)] mt-1">
              Need test USDC? Use the <strong className="text-[var(--muted)]">Get test USDC</strong> button in the Arc Studio sidebar.
            </p>
          </div>
        )}

      </main>

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            setOrdersRefresh(r => r + 1)
          }}
        />
      )}
    </div>
  )
}

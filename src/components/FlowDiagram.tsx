export function FlowDiagram() {
  const steps = [
    { icon: '⬡', label: 'Machine', sub: 'detects shortage', color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10 border-[var(--accent)]/20' },
    { icon: '⬡', label: 'AI Agent', sub: 'creates PO', color: 'text-purple-300', bg: 'bg-purple-500/10 border-purple-500/20' },
    { icon: '⬡', label: 'USDC Escrow', sub: 'funds locked', color: 'text-[var(--warning)]', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { icon: '⬡', label: 'Supplier', sub: 'accepts + ships', color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/20' },
    { icon: '⬡', label: 'Oracle', sub: 'confirms delivery', color: 'text-[var(--muted)]', bg: 'bg-white/5 border-white/10' },
    { icon: '⬡', label: 'Release', sub: 'USDC to supplier', color: 'text-[var(--success)]', bg: 'bg-green-500/10 border-green-500/20' },
  ]

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="display text-sm font-700 text-[var(--ink)] mb-1">Autonomous Procurement Flow</h3>
      <p className="text-xs text-[var(--muted)] mb-4">Machine-to-Machine commerce with USDC escrow on Arc.</p>

      <div className="flex items-center gap-0 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${step.bg} min-w-[72px]`}>
              <span className={`text-lg ${step.color}`}>◈</span>
              <span className={`text-[10px] font-700 uppercase tracking-wider ${step.color}`}>{step.label}</span>
              <span className="text-[9px] text-[var(--subtle)] text-center leading-tight">{step.sub}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center mx-1">
                <div className="w-4 h-px bg-[var(--border-strong)]" />
                <svg width="6" height="8" viewBox="0 0 6 8" fill="none" className="text-[var(--border-strong)] -ml-px">
                  <path d="M0 0L6 4L0 8" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
        {[
          { label: 'Accept window', val: '48h default' },
          { label: 'Dispute timeout', val: '7 days' },
          { label: 'Supplier grace', val: '3 days post-ship' },
        ].map(item => (
          <div key={item.label} className="rounded-lg bg-white/5 px-2.5 py-1.5">
            <p className="text-[var(--subtle)] uppercase tracking-wide">{item.label}</p>
            <p className="text-[var(--ink-2)] font-600 mt-0.5">{item.val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { AUTONOMOUS_FACTORY_ADDRESS, AUTONOMOUS_FACTORY_ABI, ARC_TESTNET_CHAIN_ID } from '../contracts'

function addr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}` }

function ScoreRing({ score }: { score: number }) {
  const pct = score / 1000
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = pct >= 0.9 ? '#4ade80' : pct >= 0.6 ? '#fbbf24' : '#f87171'

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="36" y="40" textAnchor="middle" fill={color} fontSize="14" fontFamily="Space Grotesk" fontWeight="700">
        {score}
      </text>
    </svg>
  )
}

export function ReputationCard() {
  const [query, setQuery] = useState('')
  const [lookupAddr, setLookupAddr] = useState<`0x${string}` | null>(null)

  const { data: rep, isFetching } = useReadContract({
    address: AUTONOMOUS_FACTORY_ADDRESS,
    abi: AUTONOMOUS_FACTORY_ABI,
    functionName: 'agentReputation',
    args: lookupAddr ? [lookupAddr] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!lookupAddr },
  })

  function handleLookup() {
    const trimmed = query.trim()
    if (!trimmed.startsWith('0x') || trimmed.length !== 42) return
    setLookupAddr(trimmed as `0x${string}`)
  }

  const repArr = rep as [bigint, bigint, bigint, bigint, bigint] | undefined
  const total = repArr ? Number(repArr[0]) : 0
  const completed = repArr ? Number(repArr[1]) : 0
  const disputed = repArr ? Number(repArr[2]) : 0
  const score = repArr ? Number(repArr[4]) : 0

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur p-5">
      <h3 className="display text-sm font-700 text-[var(--ink)] mb-3">Agent Reputation Score</h3>
      <p className="text-xs text-[var(--muted)] mb-3">Onchain reputation based on order history. Higher = more trustworthy agent.</p>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          placeholder="0x agent address…"
          className="flex-1 mono text-xs bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:border-[var(--accent)]/60"
        />
        <button
          onClick={handleLookup}
          className="px-4 py-2.5 rounded-xl bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-600 border border-[var(--accent)]/20 transition-colors whitespace-nowrap"
        >
          Look up
        </button>
      </div>

      {isFetching && (
        <div className="mt-4 text-center text-xs text-[var(--muted)] animate-pulse">Fetching reputation…</div>
      )}

      {lookupAddr && repArr && !isFetching && (
        <div className="mt-4 rounded-xl bg-white/5 border border-[var(--border)] p-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={score} />
            <div className="flex-1 min-w-0">
              <p className="mono text-xs text-[var(--accent)] truncate">{addr(lookupAddr)}</p>
              <p className="display text-2xl font-700 text-[var(--ink)] tabular-nums mt-0.5">{score} <span className="text-sm font-400 text-[var(--muted)]">/ 1000</span></p>
              <p className="text-xs text-[var(--subtle)] mt-0.5">
                {score >= 900 ? 'Elite Agent' : score >= 700 ? 'Trusted Agent' : score >= 400 ? 'Active Agent' : score > 0 ? 'New Agent' : 'No history yet'}
              </p>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Total Orders', val: total },
                { label: 'Completed', val: completed },
                { label: 'Disputed', val: disputed },
              ].map(item => (
                <div key={item.label} className="rounded-lg bg-white/5 px-3 py-2 text-center">
                  <p className="display text-lg font-700 text-[var(--ink)] tabular-nums">{item.val}</p>
                  <p className="text-[10px] text-[var(--subtle)] mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {total === 0 && (
            <p className="text-xs text-[var(--subtle)] mt-3 text-center">This agent has no recorded order history.</p>
          )}
        </div>
      )}
    </div>
  )
}

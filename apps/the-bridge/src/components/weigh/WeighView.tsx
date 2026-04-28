'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAllWeights, useSettings } from '@/db/hooks'
import { deleteWeight, logWeight } from '@/db/operations'
import { todayISO, daysBetween, fromISO, monthDayLabel, relativeLabel } from '@/lib/date-utils'

export function WeighView() {
  const settings = useSettings()
  const weights = useAllWeights()
  const [logOpen, setLogOpen] = useState(false)

  const latest = weights[weights.length - 1]
  const current = latest?.kg ?? settings.startWeight
  const deltaStart = current - settings.startWeight
  const distanceToGoal = settings.goalWeight - current

  const weeklyChange = useMemo(() => {
    if (weights.length < 2) return 0
    const last = weights[weights.length - 1]
    const cutoff = 7
    const prior = [...weights]
      .reverse()
      .find((w) => daysBetween(w.date, last.date) >= cutoff)
    if (!prior) return 0
    return last.kg - prior.kg
  }, [weights])

  return (
    <div className="space-y-4 pt-1">
      <Card>
        <p className="text-xs uppercase tracking-wider text-white/55">
          Current weight
        </p>
        <p className="font-mono text-5xl font-bold mt-1">
          {current.toFixed(1)}
          <span className="text-lg text-white/55 font-normal"> kg</span>
        </p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat
            label="vs start"
            value={fmtDelta(deltaStart)}
            color={deltaStart >= 0 ? 'text-emerald-300' : 'text-red-300'}
          />
          <Stat
            label="this week"
            value={fmtDelta(weeklyChange)}
            color={weeklyChange >= 0 ? 'text-emerald-300' : 'text-red-300'}
          />
          <Stat
            label="to goal"
            value={`${distanceToGoal > 0 ? '+' : ''}${distanceToGoal.toFixed(1)} kg`}
            color="text-white/85"
          />
        </div>
      </Card>

      <Card>
        <WeightChart weights={weights} settings={settings} />
      </Card>

      <Button onClick={() => setLogOpen(true)} className="w-full">
        Log weight
      </Button>

      {weights.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-white/55 mb-2">
            History
          </h3>
          <ul className="space-y-2">
            {[...weights].reverse().map((w) => (
              <li
                key={w.date}
                className="glass-card p-3 flex items-center gap-3"
              >
                <div className="flex-1">
                  <p className="font-mono text-base font-semibold">
                    {w.kg.toFixed(1)} kg
                  </p>
                  <p className="text-[11px] text-white/55">
                    {monthDayLabel(w.date)} · {relativeLabel(w.date)}
                    {w.notes ? ` — ${w.notes}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => deleteWeight(w.date)}
                  className="text-white/40 hover:text-red-300 tap-target -mr-2"
                  aria-label="Delete entry"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LogWeightModal open={logOpen} onClose={() => setLogOpen(false)} initial={current} />
    </div>
  )
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="text-center">
      <p className={`font-mono font-semibold text-base ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/45">
        {label}
      </p>
    </div>
  )
}

function fmtDelta(n: number): string {
  if (n === 0) return '0 kg'
  return `${n > 0 ? '+' : ''}${n.toFixed(1)} kg`
}

function WeightChart({
  weights,
  settings,
}: {
  weights: { date: string; kg: number }[]
  settings: { startWeight: number; goalWeight: number; startDate: string }
}) {
  if (weights.length === 0) {
    return (
      <div className="text-center py-6 text-white/55 text-sm">
        Log your first weight to see the chart.
      </div>
    )
  }

  const w = 320
  const h = 140
  const pad = 12
  const pts = weights
  const allKg = [
    ...pts.map((p) => p.kg),
    settings.startWeight,
    settings.goalWeight,
  ]
  const min = Math.min(...allKg) - 0.5
  const max = Math.max(...allKg) + 0.5
  const xs = (i: number) =>
    pad + (i / Math.max(1, pts.length - 1)) * (w - pad * 2)
  const ys = (kg: number) =>
    h - pad - ((kg - min) / Math.max(0.1, max - min)) * (h - pad * 2)

  const goalY = ys(settings.goalWeight)
  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(1)} ${ys(p.kg).toFixed(1)}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={pad}
        x2={w - pad}
        y1={goalY}
        y2={goalY}
        stroke="rgba(168,85,247,0.6)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <text
        x={w - pad}
        y={goalY - 4}
        textAnchor="end"
        fill="rgba(168,85,247,0.85)"
        fontSize="9"
        fontFamily="JetBrains Mono"
      >
        {settings.goalWeight} goal
      </text>
      {pts.length > 1 && (
        <path
          d={`${path} L ${xs(pts.length - 1)} ${h - pad} L ${xs(0)} ${h - pad} Z`}
          fill="url(#chartFill)"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke="url(#chartLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle
          key={p.date}
          cx={xs(i)}
          cy={ys(p.kg)}
          r="3"
          fill="#fff"
          stroke="#EC4899"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

function LogWeightModal({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial: number
}) {
  const [kg, setKg] = useState(initial.toString())
  const [notes, setNotes] = useState('')

  async function save() {
    const n = Number(kg)
    if (!Number.isFinite(n) || n <= 0) return
    await logWeight({ date: todayISO(), kg: n, notes: notes.trim() })
    setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log weight">
      <div className="space-y-3">
        <label>
          <span className="block text-xs text-white/55 mb-1">Weight (kg)</span>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className="set-input w-full"
          />
        </label>
        <label>
          <span className="block text-xs text-white/55 mb-1">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Morning, post-coffee, etc."
            className="w-full rounded-md bg-white/6 border border-white/10 p-2 text-sm focus:outline-none focus:border-white/25"
          />
        </label>
        <Button onClick={save} className="w-full">
          Save
        </Button>
      </div>
    </Modal>
  )
}

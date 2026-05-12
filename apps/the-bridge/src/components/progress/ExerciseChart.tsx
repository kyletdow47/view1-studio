'use client'

import { useMemo } from 'react'
import type { SetEntry } from '@/types'
import { e1RM } from '@/lib/analytics'
import { Card } from '@/components/ui/Card'

type Props = {
  sessions: { date: string; sets: SetEntry[] }[]
}

/**
 * Compact SVG line chart of estimated 1RM over time. Picks the best e1RM set
 * per session (the day's hardest single).
 */
export function ExerciseChart({ sessions }: Props) {
  const points = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((s) => {
        let best = 0
        for (const set of s.sets) {
          if (set.r != null && set.r > 0 && set.w != null && set.w > 0) {
            const v = e1RM(set.w, set.r)
            if (v > best) best = v
          }
        }
        return { date: s.date, e1rm: best }
      })
      .filter((p) => p.e1rm > 0)
  }, [sessions])

  if (points.length < 2) {
    return (
      <Card>
        <p className="text-sm text-white/55">
          Log at least 2 sessions with weight to see a chart.
        </p>
      </Card>
    )
  }

  const max = Math.max(...points.map((p) => p.e1rm))
  const min = Math.min(...points.map((p) => p.e1rm))
  const range = Math.max(1, max - min)
  const W = 320
  const H = 120
  const padX = 8
  const padY = 12

  const xFor = (i: number) =>
    padX + (i / Math.max(1, points.length - 1)) * (W - 2 * padX)
  const yFor = (v: number) => padY + (1 - (v - min) / range) * (H - 2 * padY)

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.e1rm)}`)
    .join(' ')

  return (
    <Card className="!p-3">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-semibold">Est. 1RM trend</h3>
        <span className="text-xs font-mono text-white/55">
          {Math.round(min)} → {Math.round(max)} kg
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="bridge-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(236,72,153,0.45)" />
            <stop offset="100%" stopColor="rgba(236,72,153,0.02)" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${xFor(points.length - 1)} ${H - padY} L ${xFor(0)} ${H - padY} Z`}
          fill="url(#bridge-chart-fill)"
        />
        <path d={path} fill="none" stroke="rgb(236,72,153)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={xFor(i)}
            cy={yFor(p.e1rm)}
            r={2.5}
            fill="white"
            stroke="rgb(236,72,153)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <p className="text-[10px] text-white/45 mt-1 font-mono">
        {points[0].date} → {points[points.length - 1].date} · {points.length} sessions
      </p>
    </Card>
  )
}

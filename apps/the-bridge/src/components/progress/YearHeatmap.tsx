'use client'

import { useMemo } from 'react'
import type { WorkoutLog } from '@/types'
import { cn } from '@/lib/cn'

type Props = {
  logs: WorkoutLog[]
}

/**
 * GitHub-style year heatmap: 53 columns × 7 rows. Each cell is one day,
 * colored by total set count that day.
 */
export function YearHeatmap({ logs }: Props) {
  const cells = useMemo(() => {
    const setsByDate = new Map<string, number>()
    for (const log of logs) {
      let n = 0
      for (const ex of log.exercises) {
        for (const s of ex.sets) {
          if (s.r != null && s.r > 0) n++
        }
      }
      if (n > 0) setsByDate.set(log.date, n)
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Show 52 weeks ending today
    const end = new Date(today)
    const start = new Date(today)
    start.setDate(start.getDate() - 53 * 7)
    // Snap start to a Monday
    const day = start.getDay()
    start.setDate(start.getDate() - ((day + 6) % 7))
    const out: { date: string; sets: number }[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10)
      out.push({ date: iso, sets: setsByDate.get(iso) ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }, [logs])

  const max = useMemo(() => Math.max(1, ...cells.map((c) => c.sets)), [cells])

  // Bucket into 5 tiers (0, 1, 2, 3, 4)
  const tier = (n: number) => {
    if (n === 0) return 0
    const t = n / max
    if (t < 0.25) return 1
    if (t < 0.5) return 2
    if (t < 0.75) return 3
    return 4
  }

  const TIER_CLASSES = [
    'bg-white/6',
    'bg-pink-500/20',
    'bg-pink-500/40',
    'bg-pink-500/65',
    'bg-pink-500/95',
  ]

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div
        className="grid grid-flow-col gap-[2px]"
        style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
      >
        {cells.map((c) => (
          <div
            key={c.date}
            className={cn('w-[9px] h-[9px] rounded-[2px]', TIER_CLASSES[tier(c.sets)])}
            title={`${c.date}: ${c.sets} sets`}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-white/55">
        <span>less</span>
        {TIER_CLASSES.map((c, i) => (
          <span key={i} className={cn('w-[9px] h-[9px] rounded-[2px]', c)} />
        ))}
        <span>more</span>
      </div>
    </div>
  )
}

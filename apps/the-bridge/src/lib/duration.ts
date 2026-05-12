'use client'

import { useEffect, useState } from 'react'

/** Format seconds → "1h 23m" or "23m 4s" or "47s" */
export function fmtDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`
  const totalMin = Math.floor(totalSec / 60)
  if (totalMin < 60) {
    const s = totalSec % 60
    return s > 0 ? `${totalMin}m ${s}s` : `${totalMin}m`
  }
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/**
 * Returns elapsed seconds from `startedAt` to now (or to `endedAt` if set).
 * Live-updates every 30 seconds while running; freezes once `endedAt` lands.
 */
export function useElapsed(
  startedAt: string | undefined,
  endedAt?: string
): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt || endedAt) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [startedAt, endedAt])
  if (!startedAt) return 0
  const end = endedAt ? new Date(endedAt).getTime() : now
  const start = new Date(startedAt).getTime()
  return Math.max(0, Math.floor((end - start) / 1000))
}

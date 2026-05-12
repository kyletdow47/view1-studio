'use client'

import type { WorkoutLog } from '@/types'

const SHORTCUT_NAME = 'Bridge Health'

/**
 * Build the JSON payload we hand off to an iOS Shortcut so it can write a
 * HealthKit workout. Pure data — no platform calls — so it's testable.
 */
export function buildHealthPayload(
  log: WorkoutLog
): {
  activityType: string
  start: string
  end: string
  durationMinutes: number
  kcal: number
  workingSets: number
  totalVolumeKg: number
  notes: string
} | null {
  if (!log.startedAt) return null
  const start = log.startedAt
  const end = log.completedAt ?? new Date().toISOString()
  const durationMs = Math.max(
    60_000,
    new Date(end).getTime() - new Date(start).getTime()
  )
  const durationMinutes = Math.round(durationMs / 60_000)

  let workingSets = 0
  let totalVolume = 0
  for (const ex of log.exercises) {
    for (const s of ex.sets) {
      if (s.r == null || s.r <= 0 || s.warmup) continue
      workingSets++
      if (s.w != null) totalVolume += s.w * s.r
    }
  }

  // Rough kcal estimate for resistance training:
  //  ~5–7 kcal/min for moderate intensity. Use 6 as a default.
  const kcal = Math.round(durationMinutes * 6)

  return {
    activityType: 'functionalStrengthTraining',
    start,
    end,
    durationMinutes,
    kcal,
    workingSets,
    totalVolumeKg: Math.round(totalVolume),
    notes: `${workingSets} working sets · ${Math.round(totalVolume)} kg moved`,
  }
}

/**
 * Hand the payload off to the user's iOS Shortcut. Requires the user to
 * have imported a Shortcut named exactly "Bridge Health" that accepts text
 * input and writes a Health workout. Failing safely means: open the URL,
 * if no Shortcut is registered iOS silently no-ops and the user sees an
 * error toast from us.
 */
export function syncWorkoutToHealth(log: WorkoutLog): 'launched' | 'no-data' {
  const payload = buildHealthPayload(log)
  if (!payload) return 'no-data'
  const json = JSON.stringify(payload)
  const url = `shortcuts://run-shortcut?name=${encodeURIComponent(
    SHORTCUT_NAME
  )}&input=text&text=${encodeURIComponent(json)}`
  window.location.href = url
  return 'launched'
}

export { SHORTCUT_NAME }

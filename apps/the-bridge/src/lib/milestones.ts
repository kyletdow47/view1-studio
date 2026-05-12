import type { PersonalRecord, WorkoutLog } from '@/types'
import { computeLifetimeStats } from './analytics'

export type Milestone = {
  id: string
  label: string
  /** ISO date when first reached, null if not yet */
  reachedOn: string | null
}

/**
 * Compute earned-vs-locked milestones. Each milestone has a single "first hit"
 * date so the badge wall can sort by recency or show what's coming next.
 */
export function computeMilestones(
  logs: WorkoutLog[],
  prs: PersonalRecord[]
): { earned: Milestone[]; next: Milestone[] } {
  const lifetime = computeLifetimeStats(logs)
  const totals = {
    sessions: lifetime.totalSessions,
    sets: lifetime.totalSets,
    volume: lifetime.totalVolume,
  }
  const sessionThresholds = [1, 10, 25, 50, 100, 250, 500]
  const setThresholds = [50, 250, 1000, 5000, 10_000]
  const tonnageThresholds = [1_000, 10_000, 50_000, 100_000, 500_000, 1_000_000]

  // Find first session date when threshold was reached
  const sessionFirstReached = (n: number): string | null => {
    let count = 0
    const sorted = logs
      .filter((l) =>
        l.exercises.some((e) => e.sets.some((s) => s.r != null && s.r > 0))
      )
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    for (const log of sorted) {
      count++
      if (count >= n) return log.date
    }
    return null
  }
  const setFirstReached = (n: number): string | null => {
    let count = 0
    const sorted = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1))
    for (const log of sorted) {
      for (const ex of log.exercises) {
        for (const s of ex.sets) {
          if (s.r != null && s.r > 0) {
            count++
            if (count >= n) return log.date
          }
        }
      }
    }
    return null
  }
  const tonnageFirstReached = (kg: number): string | null => {
    let sum = 0
    const sorted = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1))
    for (const log of sorted) {
      for (const ex of log.exercises) {
        for (const s of ex.sets) {
          if (s.r != null && s.r > 0 && s.w != null && s.w > 0) {
            sum += s.w * s.r
            if (sum >= kg) return log.date
          }
        }
      }
    }
    return null
  }

  const milestones: Milestone[] = [
    ...sessionThresholds.map((n) => ({
      id: `sessions-${n}`,
      label: `${n} session${n === 1 ? '' : 's'} logged`,
      reachedOn: totals.sessions >= n ? sessionFirstReached(n) : null,
    })),
    ...setThresholds.map((n) => ({
      id: `sets-${n}`,
      label: `${n.toLocaleString()} sets`,
      reachedOn: totals.sets >= n ? setFirstReached(n) : null,
    })),
    ...tonnageThresholds.map((n) => ({
      id: `tonnage-${n}`,
      label: `${(n / 1000).toLocaleString()}t lifted`,
      reachedOn: totals.volume >= n ? tonnageFirstReached(n) : null,
    })),
    // Lift-specific milestones (only if user has PR data for them)
    ...['Hack Squat', 'Front Squat', 'Romanian Deadlift', 'DB Bench Press', 'Plate-Loaded Chest Press', 'Overhead Press (Barbell)'].flatMap(
      (lift) => {
        const pr = prs.find((p) => p.exerciseName === lift)
        const thresholds = [60, 80, 100, 120, 140]
        return thresholds.map((kg) => ({
          id: `${lift}-${kg}`,
          label: `${lift}: ${kg}kg`,
          reachedOn: pr && pr.weight >= kg ? pr.date : null,
        }))
      }
    ),
  ]

  const earned = milestones
    .filter((m) => m.reachedOn)
    .sort((a, b) => (a.reachedOn! < b.reachedOn! ? 1 : -1))
  const next = milestones.filter((m) => !m.reachedOn).slice(0, 6)
  return { earned, next }
}

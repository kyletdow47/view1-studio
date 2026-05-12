import type { WorkoutLog } from '@/types'
import { daysBetween } from './date-utils'

export type StreakResult = { current: number; best: number }

const MAX_GAP = 3

/**
 * Streak counts logged training sessions. Rest days don't break streaks
 * because rest days have no log entry. A gap of more than MAX_GAP days breaks
 * the streak (allows ≤3 days for the program's rest patterns).
 */
export function calculateStreak(
  workoutLogs: Record<string, WorkoutLog> | WorkoutLog[],
  today: string
): StreakResult {
  const logs = Array.isArray(workoutLogs)
    ? workoutLogs
    : Object.values(workoutLogs)

  // Only dates with at least one set with reps actually count as trained
  const trainedDates = logs
    .filter((log) =>
      log.exercises.some((e) => e.sets.some((s) => s.r != null && s.r > 0))
    )
    .map((log) => log.date)
    .sort()

  if (trainedDates.length === 0) return { current: 0, best: 0 }

  let best = 1
  let run = 1
  for (let i = 1; i < trainedDates.length; i++) {
    const gap = daysBetween(trainedDates[i - 1], trainedDates[i])
    if (gap > 0 && gap <= MAX_GAP) {
      run++
    } else if (gap > MAX_GAP) {
      best = Math.max(best, run)
      run = 1
    }
    // gap === 0 is duplicate (same date) — keep run as is
  }
  best = Math.max(best, run)

  // Current streak: gap from last trained date to today must be within MAX_GAP
  const last = trainedDates[trainedDates.length - 1]
  const gapToToday = daysBetween(last, today)
  if (gapToToday < 0 || gapToToday > MAX_GAP) return { current: 0, best }

  return { current: run, best }
}

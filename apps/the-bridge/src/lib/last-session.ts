import type { SetEntry, WorkoutLog } from '@/types'

export type LastSession = {
  date: string
  sets: SetEntry[]
}

/**
 * Most recent log of `exerciseName` strictly before `beforeDate`.
 * Filters out incomplete sets (no reps recorded). Returns null if no match.
 */
export function findLastSession(
  exerciseName: string,
  beforeDate: string,
  workoutLogs: Record<string, WorkoutLog> | WorkoutLog[]
): LastSession | null {
  const logs = Array.isArray(workoutLogs)
    ? workoutLogs
    : Object.values(workoutLogs)

  const candidates = logs
    .filter((l) => l.date < beforeDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  for (const log of candidates) {
    const exercise = log.exercises.find((e) => e.name === exerciseName)
    if (!exercise) continue
    const validSets = exercise.sets.filter(
      (s) => s.r != null && s.r > 0 && !s.warmup
    )
    if (validSets.length === 0) continue
    return { date: log.date, sets: validSets }
  }

  return null
}

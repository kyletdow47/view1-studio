import type {
  ExerciseLog,
  Muscle,
  PersonalRecord,
  SetEntry,
  WorkoutLog,
} from '@/types'
import { getExerciseDef } from '@/data/exercises'

/** Epley estimated 1RM: weight × (1 + reps/30) */
export function e1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

export type ExerciseAggregate = {
  name: string
  totalSets: number
  totalReps: number
  totalVolume: number
  lastDate: string | null
  bestWeight: { weight: number; reps: number; date: string } | null
  bestReps: { weight: number; reps: number; date: string } | null
  bestVolume: { weight: number; reps: number; date: string } | null
  bestE1RM: { weight: number; reps: number; date: string; e1rm: number } | null
}

/** Per-exercise rollup across all sessions. */
export function aggregateExercise(
  exerciseName: string,
  logs: WorkoutLog[]
): ExerciseAggregate {
  let totalSets = 0
  let totalReps = 0
  let totalVolume = 0
  let lastDate: string | null = null
  let bestWeight: ExerciseAggregate['bestWeight'] = null
  let bestReps: ExerciseAggregate['bestReps'] = null
  let bestVolume: ExerciseAggregate['bestVolume'] = null
  let bestE1RM: ExerciseAggregate['bestE1RM'] = null

  for (const log of logs) {
    const ex = log.exercises.find((e) => e.name === exerciseName)
    if (!ex) continue
    let sawValid = false
    for (const s of ex.sets) {
      if (s.r == null || s.r <= 0) continue
      if (s.warmup) continue
      sawValid = true
      totalSets++
      totalReps += s.r
      const w = s.w ?? 0
      const vol = w * s.r
      totalVolume += vol
      if (w > 0) {
        if (!bestWeight || w > bestWeight.weight) {
          bestWeight = { weight: w, reps: s.r, date: log.date }
        }
        if (!bestVolume || vol > bestVolume.weight * bestVolume.reps) {
          bestVolume = { weight: w, reps: s.r, date: log.date }
        }
        const est = e1RM(w, s.r)
        if (!bestE1RM || est > bestE1RM.e1rm) {
          bestE1RM = { weight: w, reps: s.r, date: log.date, e1rm: est }
        }
      }
      if (!bestReps || s.r > bestReps.reps) {
        bestReps = { weight: w, reps: s.r, date: log.date }
      }
    }
    if (sawValid) {
      if (!lastDate || log.date > lastDate) lastDate = log.date
    }
  }

  return {
    name: exerciseName,
    totalSets,
    totalReps,
    totalVolume: Math.round(totalVolume),
    lastDate,
    bestWeight,
    bestReps,
    bestVolume,
    bestE1RM,
  }
}

export type LifetimeStats = {
  totalSessions: number
  totalSets: number
  totalReps: number
  totalVolume: number
  totalDurationSec: number
  firstSession: string | null
}

export function computeLifetimeStats(logs: WorkoutLog[]): LifetimeStats {
  let totalSessions = 0
  let totalSets = 0
  let totalReps = 0
  let totalVolume = 0
  let totalDurationSec = 0
  let firstSession: string | null = null
  for (const log of logs) {
    let hadValidSet = false
    for (const ex of log.exercises) {
      for (const s of ex.sets) {
        if (s.r == null || s.r <= 0) continue
      if (s.warmup) continue
        hadValidSet = true
        totalSets++
        totalReps += s.r
        if (s.w != null) totalVolume += s.w * s.r
      }
    }
    if (hadValidSet) {
      totalSessions++
      if (log.startedAt && log.completedAt) {
        const dur =
          (new Date(log.completedAt).getTime() -
            new Date(log.startedAt).getTime()) /
          1000
        if (dur > 0 && dur < 86400) totalDurationSec += dur
      }
      if (!firstSession || log.date < firstSession) firstSession = log.date
    }
  }
  return {
    totalSessions,
    totalSets,
    totalReps,
    totalVolume: Math.round(totalVolume),
    totalDurationSec: Math.round(totalDurationSec),
    firstSession,
  }
}

/**
 * Muscle volume rolled up by ISO week ending Sunday. Returns weeks in ascending
 * date order. Useful for the per-muscle volume chart.
 */
export type WeeklyMuscleVolume = {
  weekStart: string // YYYY-MM-DD (Monday)
  byMuscle: Map<Muscle, number> // weighted sets
}

export function weeklyMuscleVolume(logs: WorkoutLog[]): WeeklyMuscleVolume[] {
  const byWeek = new Map<string, WeeklyMuscleVolume>()
  for (const log of logs) {
    const weekStart = startOfWeek(log.date)
    let row = byWeek.get(weekStart)
    if (!row) {
      row = { weekStart, byMuscle: new Map() }
      byWeek.set(weekStart, row)
    }
    for (const ex of log.exercises) {
      const def = getExerciseDef(ex.name)
      const sets = ex.sets.filter((s) => s.r != null && s.r > 0 && !s.warmup).length
      if (sets === 0) continue
      for (const m of def.primaryMuscles ?? []) {
        row.byMuscle.set(m, (row.byMuscle.get(m) ?? 0) + sets)
      }
      for (const m of def.secondaryMuscles ?? []) {
        row.byMuscle.set(m, (row.byMuscle.get(m) ?? 0) + sets * 0.5)
      }
    }
  }
  return Array.from(byWeek.values()).sort((a, b) =>
    a.weekStart < b.weekStart ? -1 : 1
  )
}

/** Returns the Monday (YYYY-MM-DD) of the week containing `date`. */
export function startOfWeek(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay() // 0 Sun, 1 Mon, ...
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

/**
 * Trailing N-day muscle volume (weighted sets) — used for body heatmap and
 * "muscle imbalance" detection.
 */
export function muscleVolumeWindow(
  logs: WorkoutLog[],
  days: number,
  asOf: string
): Map<Muscle, number> {
  const cutoff = new Date(asOf + 'T00:00:00')
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffISO = cutoff.toISOString().slice(0, 10)
  const out = new Map<Muscle, number>()
  for (const log of logs) {
    if (log.date < cutoffISO) continue
    if (log.date > asOf) continue
    for (const ex of log.exercises) {
      const def = getExerciseDef(ex.name)
      const sets = ex.sets.filter((s) => s.r != null && s.r > 0 && !s.warmup).length
      if (sets === 0) continue
      for (const m of def.primaryMuscles ?? []) {
        out.set(m, (out.get(m) ?? 0) + sets)
      }
      for (const m of def.secondaryMuscles ?? []) {
        out.set(m, (out.get(m) ?? 0) + sets * 0.5)
      }
    }
  }
  return out
}

/**
 * Predicts each muscle's end-of-week volume based on the current week's pace.
 * Uses (days_into_week + 1) so a Wednesday with 6 sets predicts 6 × 7/3 = 14.
 * If we're past the user's typical training cadence (no logs yet this week),
 * falls back to the trailing 4-week average for that muscle.
 */
export function predictedWeekVolume(
  logs: WorkoutLog[],
  asOf: string
): Map<Muscle, number> {
  const weekStart = startOfWeek(asOf)
  const elapsedMs =
    new Date(asOf + 'T00:00:00').getTime() -
    new Date(weekStart + 'T00:00:00').getTime()
  const elapsedDays = Math.max(1, Math.floor(elapsedMs / 86_400_000) + 1)

  // This week's volume so far
  const thisWeek = new Map<Muscle, number>()
  for (const log of logs) {
    if (log.date < weekStart || log.date > asOf) continue
    for (const ex of log.exercises) {
      const def = getExerciseDef(ex.name)
      const sets = ex.sets.filter((s) => s.r != null && s.r > 0 && !s.warmup).length
      if (sets === 0) continue
      for (const m of def.primaryMuscles ?? []) {
        thisWeek.set(m, (thisWeek.get(m) ?? 0) + sets)
      }
      for (const m of def.secondaryMuscles ?? []) {
        thisWeek.set(m, (thisWeek.get(m) ?? 0) + sets * 0.5)
      }
    }
  }

  // Trailing 4-week per-muscle average (excluding this week)
  const trailing28 = muscleVolumeWindow(logs, 28, weekStart)
  const trailingAvg = new Map<Muscle, number>()
  trailing28.forEach((v, m) => trailingAvg.set(m, v / 4))

  const out = new Map<Muscle, number>()
  const allMuscles = new Set<Muscle>([
    ...Array.from(thisWeek.keys()),
    ...Array.from(trailingAvg.keys()),
  ])
  allMuscles.forEach((m) => {
    const so_far = thisWeek.get(m) ?? 0
    const projection = (so_far / elapsedDays) * 7
    const avg = trailingAvg.get(m) ?? 0
    // Blend: if very early in week or no work yet, lean on trailing avg.
    // After Wed, mostly trust pace.
    const weight = Math.min(1, elapsedDays / 5)
    const blended = projection * weight + avg * (1 - weight)
    if (blended > 0) out.set(m, Math.round(blended * 10) / 10)
  })
  return out
}

/** Days since each muscle was last hit (any sets). null = never. */
export function daysSinceMuscle(
  logs: WorkoutLog[],
  asOf: string
): Map<Muscle, number> {
  const last = new Map<Muscle, string>()
  for (const log of logs) {
    for (const ex of log.exercises) {
      const hasSet = ex.sets.some((s) => s.r != null && s.r > 0 && !s.warmup)
      if (!hasSet) continue
      const def = getExerciseDef(ex.name)
      const muscles = [
        ...(def.primaryMuscles ?? []),
        ...(def.secondaryMuscles ?? []),
      ]
      for (const m of muscles) {
        const existing = last.get(m)
        if (!existing || existing < log.date) last.set(m, log.date)
      }
    }
  }
  const out = new Map<Muscle, number>()
  const target = new Date(asOf + 'T00:00:00').getTime()
  last.forEach((d, m) => {
    const days = Math.floor(
      (target - new Date(d + 'T00:00:00').getTime()) / 86_400_000
    )
    out.set(m, days)
  })
  return out
}

/**
 * "On this day" — last year and last month sessions, if any.
 */
export function flashbackLogs(
  logs: WorkoutLog[],
  asOf: string
): Array<{ label: string; log: WorkoutLog }> {
  const today = new Date(asOf + 'T00:00:00')
  const lastYear = new Date(today)
  lastYear.setFullYear(lastYear.getFullYear() - 1)
  const lastMonth = new Date(today)
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const matches = (target: Date) => {
    const iso = target.toISOString().slice(0, 10)
    return logs.find(
      (l) =>
        l.date === iso &&
        l.exercises.some((e) =>
          e.sets.some((s) => s.r != null && s.r > 0 && !s.warmup)
        )
    )
  }
  const result: Array<{ label: string; log: WorkoutLog }> = []
  const yearMatch = matches(lastYear)
  if (yearMatch) result.push({ label: '1 year ago', log: yearMatch })
  const monthMatch = matches(lastMonth)
  if (monthMatch) result.push({ label: '1 month ago', log: monthMatch })
  return result
}

/** Sort PRs by recency. */
export function sortPRs(prs: PersonalRecord[]): PersonalRecord[] {
  return [...prs].sort((a, b) => (a.date < b.date ? 1 : -1))
}

/**
 * Detects whether the user is plateaued on a lift: no e1RM improvement in the
 * last `weeks` weeks despite at least 3 sessions.
 */
export function isPlateaued(
  agg: ExerciseAggregate,
  recentSessions: { date: string; sets: SetEntry[] }[],
  weeks = 6
): boolean {
  if (recentSessions.length < 3) return false
  if (!agg.bestE1RM) return false
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeks * 7)
  return new Date(agg.bestE1RM.date) < cutoff
}

/** Helper: extract recent exercise sessions for an exercise name. */
export function recentSessionsFor(
  exerciseName: string,
  logs: WorkoutLog[],
  n = 10
): { date: string; sets: SetEntry[] }[] {
  const found: { date: string; sets: SetEntry[] }[] = []
  for (const log of logs.slice().sort((a, b) => (a.date < b.date ? 1 : -1))) {
    const ex: ExerciseLog | undefined = log.exercises.find((e) => e.name === exerciseName)
    if (!ex) continue
    const validSets = ex.sets.filter((s) => s.r != null && s.r > 0 && !s.warmup)
    if (validSets.length === 0) continue
    found.push({ date: log.date, sets: validSets })
    if (found.length >= n) break
  }
  return found
}

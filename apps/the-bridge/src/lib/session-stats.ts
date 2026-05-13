import type { Muscle, WeightEntry, WorkoutLog } from '@/types'
import { getExerciseDef } from '@/data/exercises'
import { bodyweightLookup, effectiveWeight } from './effective-weight'

export type MuscleVolume = {
  muscle: Muscle
  sets: number // weighted: primary 1.0, secondary 0.5
  primary: number // raw primary set count
  secondary: number // raw secondary set count
  volume: number // weighted weight×reps (kg)
}

export type SessionStats = {
  sets: number
  reps: number
  volume: number // total kg moved
  muscles: MuscleVolume[]
  /** Tonnage by muscle group, sorted high → low. */
  topMuscles: MuscleVolume[]
}

/**
 * Computes session-level stats from a workout log. Muscle sets are weighted:
 * primary muscle gets the full set, secondary muscles get half a set each.
 *
 * `weights` is needed so bodyweight exercises contribute realistic volume
 * (load = bodyweight at session date + any added kg).
 */
export function computeSessionStats(
  log: WorkoutLog | null,
  weights: WeightEntry[] = []
): SessionStats {
  let sets = 0
  let reps = 0
  let volume = 0
  const byMuscle = new Map<Muscle, MuscleVolume>()

  if (!log) return { sets, reps, volume, muscles: [], topMuscles: [] }

  const bwAt = bodyweightLookup(weights)

  for (const ex of log.exercises) {
    const def = getExerciseDef(ex.name)
    const primary = def.primaryMuscles ?? []
    const secondary = def.secondaryMuscles ?? []
    for (const s of ex.sets) {
      if (s.r == null || s.r <= 0) continue
      if (s.warmup) continue
      sets++
      reps += s.r
      const load = effectiveWeight(s, def, bwAt, log.date)
      const setVolume = load * s.r
      volume += setVolume
      for (const m of primary) {
        const cur = byMuscle.get(m) ?? {
          muscle: m,
          sets: 0,
          primary: 0,
          secondary: 0,
          volume: 0,
        }
        cur.sets += 1
        cur.primary += 1
        cur.volume += setVolume
        byMuscle.set(m, cur)
      }
      for (const m of secondary) {
        const cur = byMuscle.get(m) ?? {
          muscle: m,
          sets: 0,
          primary: 0,
          secondary: 0,
          volume: 0,
        }
        cur.sets += 0.5
        cur.secondary += 1
        cur.volume += setVolume * 0.5
        byMuscle.set(m, cur)
      }
    }
  }

  const muscles = Array.from(byMuscle.values()).sort((a, b) => b.sets - a.sets)
  return {
    sets,
    reps,
    volume: Math.round(volume),
    muscles,
    topMuscles: muscles.slice(0, 8),
  }
}

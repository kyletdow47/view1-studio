import type {
  ExerciseLog,
  MealEntry,
  PersonalRecord,
  WeightEntry,
  WorkoutLog,
} from '@/types'
import { getExerciseDef } from '@/data/exercises'
import { getProgramDay, getDayNumber, getWeekNumber } from '@/lib/program-day'

type TrainerExportInput = {
  date: string
  startDate: string
  log: WorkoutLog | null
  meals: MealEntry[]
  weight: WeightEntry | null
  prs: PersonalRecord[]
}

/**
 * Formats one day of the bridge as plain markdown that can be pasted into a
 * Claude project to brief the trainer. Includes: program context, completed
 * exercises with sets, nutrition totals, bodyweight, and PRs hit today.
 */
export function formatSessionForTrainer(input: TrainerExportInput): string {
  const { date, startDate, log, meals, weight, prs } = input
  const day = getProgramDay(startDate, date)
  const dayNum = getDayNumber(startDate, date)
  const weekNum = getWeekNumber(startDate, date)

  const lines: string[] = []
  lines.push(`# Bridge session — ${date}`)
  lines.push('')
  lines.push(
    `**Program:** Week ${weekNum}, Day ${dayNum} — ${day.name} (${day.focus})`
  )
  if (log?.completedAt) {
    lines.push(`**Completed at:** ${log.completedAt}`)
  } else if (log && log.exercises.length > 0) {
    lines.push(`**Status:** in progress`)
  } else {
    lines.push(`**Status:** not started`)
  }

  if (log?.swaps && log.swaps.length > 0) {
    lines.push('')
    lines.push('## Swaps')
    for (const s of log.swaps) {
      lines.push(`- ${s.original} → ${s.replacement}`)
    }
  }

  lines.push('')
  lines.push('## Lifts')
  const exercises = log?.exercises ?? []
  const withSets = exercises.filter((e) =>
    e.sets.some((s) => s.r != null && s.r > 0)
  )
  if (withSets.length === 0) {
    lines.push('_No lifts logged._')
  } else {
    for (const ex of withSets) {
      lines.push(...formatExercise(ex))
    }
  }

  // Today's PRs (hit on `date`)
  const todayPRs = prs.filter((p) => p.date === date)
  if (todayPRs.length > 0) {
    lines.push('')
    lines.push('## PRs hit today')
    for (const pr of todayPRs) {
      lines.push(`- **${pr.exerciseName}:** ${pr.weight} kg × ${pr.reps}`)
    }
  }

  // Nutrition
  const totals = mealTotals(meals)
  if (meals.length > 0) {
    lines.push('')
    lines.push('## Nutrition')
    lines.push(
      `Totals: ${totals.cal} kcal · ${totals.p} P · ${totals.c} C · ${totals.f} F`
    )
    for (const m of meals) {
      lines.push(
        `- ${m.time} · ${m.name} — ${m.cal} kcal (P${m.p}/C${m.c}/F${m.f})`
      )
    }
  }

  if (weight) {
    lines.push('')
    lines.push('## Bodyweight')
    lines.push(`${weight.kg} kg${weight.notes ? ` — ${weight.notes}` : ''}`)
  }

  return lines.join('\n')
}

function formatExercise(ex: ExerciseLog): string[] {
  const def = getExerciseDef(ex.name)
  const out: string[] = []
  out.push('')
  const suffix = ex.pairedWith ? ` _(superset with ${ex.pairedWith})_` : ''
  out.push(`### ${ex.name} _(${def.category}, ${def.priority})_${suffix}`)
  const validSets = ex.sets.filter((s) => s.r != null && s.r > 0)
  for (let i = 0; i < validSets.length; i++) {
    const s = validSets[i]
    const rir = s.rir != null ? ` @ RIR ${s.rir}` : ''
    const body =
      s.w == null ? `${s.r} reps (bodyweight)` : `${s.w} kg × ${s.r}`
    out.push(`${i + 1}. ${body}${rir}`)
  }
  if (ex.notes && ex.notes.trim()) {
    out.push(`> ${ex.notes.trim()}`)
  }
  return out
}

function mealTotals(meals: MealEntry[]) {
  return meals.reduce(
    (acc, m) => ({
      cal: acc.cal + m.cal,
      p: acc.p + m.p,
      c: acc.c + m.c,
      f: acc.f + m.f,
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  )
}

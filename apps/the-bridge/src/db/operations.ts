import { getDB } from './schema'
import { GROCERY_TEMPLATE } from '@/data/grocery'
import { DEFAULT_SETTINGS } from '@/data/settings'
import { isNewPR, buildPR } from '@/lib/pr'
import type {
  ExerciseLog,
  GrocerySection,
  GroceryItem,
  MealEntry,
  PersonalRecord,
  SetEntry,
  Settings,
  WeightEntry,
  WorkoutLog,
} from '@/types'

// ---------- Settings ----------

export async function getSettings(): Promise<Settings> {
  const row = await getDB().settings.get('current')
  return row?.value ?? DEFAULT_SETTINGS
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await getDB().settings.put({ key: 'current', value: { ...current, ...patch } })
}

// ---------- Workout logs ----------

export async function getWorkoutLog(date: string): Promise<WorkoutLog | null> {
  const log = await getDB().workoutLogs.get(date)
  return log ?? null
}

async function upsertExerciseLog(
  date: string,
  dayIndex: number,
  exerciseName: string,
  patch: (exercise: ExerciseLog) => ExerciseLog
): Promise<void> {
  const db = getDB()
  const existing = (await db.workoutLogs.get(date)) ?? {
    date,
    dayIndex,
    exercises: [],
  }
  const idx = existing.exercises.findIndex((e) => e.name === exerciseName)
  let exercises = existing.exercises
  if (idx >= 0) {
    exercises = [...exercises]
    exercises[idx] = patch(exercises[idx])
  } else {
    exercises = [
      ...exercises,
      patch({ name: exerciseName, sets: [], notes: '' }),
    ]
  }
  await db.workoutLogs.put({ ...existing, exercises })
}

export async function logSet(
  date: string,
  dayIndex: number,
  exerciseName: string,
  set: SetEntry
): Promise<{ pr: PersonalRecord | null }> {
  const stamped: SetEntry = { ...set, loggedAt: new Date().toISOString() }
  await upsertExerciseLog(date, dayIndex, exerciseName, (e) => ({
    ...e,
    sets: [...e.sets, stamped],
  }))

  // Stamp startedAt on the workout log the first time a real set lands.
  if (set.r != null && set.r > 0) {
    const db = getDB()
    const log = await db.workoutLogs.get(date)
    if (log && !log.startedAt) {
      await db.workoutLogs.put({ ...log, startedAt: stamped.loggedAt })
    }
  }

  // PR check (only if both weight and reps are valid)
  if (
    stamped.w != null &&
    stamped.r != null &&
    stamped.w > 0 &&
    stamped.r > 0
  ) {
    const current = await getDB().personalRecords.get(exerciseName)
    if (isNewPR(stamped.w, stamped.r, current ?? null)) {
      const pr = buildPR(exerciseName, stamped.w, stamped.r, date)
      await getDB().personalRecords.put(pr)
      return { pr }
    }
  }
  return { pr: null }
}

export async function deleteSet(
  date: string,
  exerciseName: string,
  setIndex: number
): Promise<void> {
  const log = await getDB().workoutLogs.get(date)
  if (!log) return
  const idx = log.exercises.findIndex((e) => e.name === exerciseName)
  if (idx < 0) return
  const exercises = [...log.exercises]
  const exercise = exercises[idx]
  const sets = exercise.sets.filter((_, i) => i !== setIndex)
  exercises[idx] = { ...exercise, sets }
  await getDB().workoutLogs.put({ ...log, exercises })
}

export async function setExerciseNotes(
  date: string,
  dayIndex: number,
  exerciseName: string,
  notes: string
): Promise<void> {
  await upsertExerciseLog(date, dayIndex, exerciseName, (e) => ({ ...e, notes }))
}

/** Adds an empty exercise entry to a log (no-op if it already exists). */
export async function addExerciseToLog(
  date: string,
  dayIndex: number,
  exerciseName: string
): Promise<void> {
  await upsertExerciseLog(date, dayIndex, exerciseName, (e) => e)
}

/** Removes the entire exercise entry from a log (sets + notes gone). */
export async function removeExerciseFromLog(
  date: string,
  exerciseName: string
): Promise<void> {
  const log = await getDB().workoutLogs.get(date)
  if (!log) return
  const exercises = log.exercises.filter((e) => e.name !== exerciseName)
  await getDB().workoutLogs.put({ ...log, exercises })
}

/**
 * Replace a scheduled exercise with another for this date only.
 * Records an entry in `swaps` and drops any (empty) log entry for the original.
 */
export async function swapScheduledExercise(
  date: string,
  dayIndex: number,
  original: string,
  replacement: string
): Promise<void> {
  if (original === replacement) return
  const db = getDB()
  const existing = (await db.workoutLogs.get(date)) ?? {
    date,
    dayIndex,
    exercises: [],
  }
  const swaps = (existing.swaps ?? []).filter((s) => s.original !== original)
  swaps.push({ original, replacement })
  const exercises = existing.exercises.filter((e) => e.name !== original)
  await db.workoutLogs.put({ ...existing, exercises, swaps })
}

/** Undo a swap, restoring the original scheduled exercise. */
export async function undoSwap(date: string, original: string): Promise<void> {
  const log = await getDB().workoutLogs.get(date)
  if (!log || !log.swaps) return
  const swaps = log.swaps.filter((s) => s.original !== original)
  await getDB().workoutLogs.put({ ...log, swaps })
}

/**
 * Pair two exercises as a superset for this date. Creates empty exercise
 * entries if either doesn't have a log row yet. Symmetric: both get a
 * `pairedWith` reference to the other. Breaks any pre-existing pairings.
 */
export async function pairSuperset(
  date: string,
  dayIndex: number,
  a: string,
  b: string
): Promise<void> {
  if (a === b) return
  const db = getDB()
  const existing = (await db.workoutLogs.get(date)) ?? {
    date,
    dayIndex,
    exercises: [],
  }
  // Drop any prior pairings involving a or b
  const cleaned = existing.exercises.map((e) =>
    e.name === a ||
    e.name === b ||
    e.pairedWith === a ||
    e.pairedWith === b
      ? { ...e, pairedWith: undefined }
      : e
  )
  // Ensure both exist as entries
  const ensure = (name: string, partner: string, list: ExerciseLog[]) => {
    const idx = list.findIndex((x) => x.name === name)
    if (idx >= 0) {
      const next = [...list]
      next[idx] = { ...next[idx], pairedWith: partner }
      return next
    }
    return [...list, { name, sets: [], notes: '', pairedWith: partner }]
  }
  let exercises = ensure(a, b, cleaned)
  exercises = ensure(b, a, exercises)
  await db.workoutLogs.put({ ...existing, exercises })
}

/** Break the superset pairing on `exerciseName` (and its partner). */
export async function unpairSuperset(
  date: string,
  exerciseName: string
): Promise<void> {
  const db = getDB()
  const log = await db.workoutLogs.get(date)
  if (!log) return
  const idx = log.exercises.findIndex((e) => e.name === exerciseName)
  if (idx < 0) return
  const partner = log.exercises[idx].pairedWith
  const exercises = log.exercises.map((e) =>
    e.name === exerciseName || e.name === partner
      ? { ...e, pairedWith: undefined }
      : e
  )
  await db.workoutLogs.put({ ...log, exercises })
}

/** Mark today's workout complete (or undo if completedAt already set). */
export async function setWorkoutCompleted(
  date: string,
  dayIndex: number,
  completed: boolean
): Promise<void> {
  const db = getDB()
  const existing = (await db.workoutLogs.get(date)) ?? {
    date,
    dayIndex,
    exercises: [],
  }
  await db.workoutLogs.put({
    ...existing,
    completedAt: completed ? new Date().toISOString() : undefined,
  })
}

export async function getAllWorkoutLogs(): Promise<WorkoutLog[]> {
  return getDB().workoutLogs.toArray()
}

// ---------- Meals ----------

export async function getMeals(date: string): Promise<MealEntry[]> {
  const row = await getDB().meals.get(date)
  return row?.entries ?? []
}

export async function addMeal(date: string, meal: MealEntry): Promise<void> {
  const existing = await getMeals(date)
  await getDB().meals.put({ date, entries: [...existing, meal] })
}

export async function updateMeal(
  date: string,
  mealId: string,
  patch: Partial<MealEntry>
): Promise<void> {
  const existing = await getMeals(date)
  const updated = existing.map((m) => (m.id === mealId ? { ...m, ...patch } : m))
  await getDB().meals.put({ date, entries: updated })
}

export async function deleteMeal(date: string, mealId: string): Promise<void> {
  const existing = await getMeals(date)
  await getDB().meals.put({
    date,
    entries: existing.filter((m) => m.id !== mealId),
  })
}

// ---------- Weights ----------

export async function getAllWeights(): Promise<WeightEntry[]> {
  const rows = await getDB().weights.toArray()
  return rows.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export async function logWeight(entry: WeightEntry): Promise<void> {
  await getDB().weights.put(entry)
}

export async function deleteWeight(date: string): Promise<void> {
  await getDB().weights.delete(date)
}

// ---------- Groceries ----------

export async function getGroceries(): Promise<GrocerySection[]> {
  const row = await getDB().groceries.get('current')
  return row?.sections ?? structuredClone(GROCERY_TEMPLATE)
}

export async function setGroceries(sections: GrocerySection[]): Promise<void> {
  await getDB().groceries.put({ key: 'current', sections })
}

export async function toggleGroceryItem(
  sectionName: string,
  itemName: string
): Promise<void> {
  const sections = await getGroceries()
  const updated = sections.map((s) =>
    s.name !== sectionName
      ? s
      : {
          ...s,
          items: s.items.map((it) =>
            it.name === itemName ? { ...it, checked: !it.checked } : it
          ),
        }
  )
  await setGroceries(updated)
}

export async function resetGroceries(): Promise<void> {
  await setGroceries(structuredClone(GROCERY_TEMPLATE))
}

export async function addGroceryItem(
  sectionName: string,
  item: GroceryItem
): Promise<void> {
  const sections = await getGroceries()
  let found = false
  let updated = sections.map((s) => {
    if (s.name !== sectionName) return s
    found = true
    return { ...s, items: [...s.items, item] }
  })
  if (!found) {
    updated = [...sections, { name: sectionName, items: [item] }]
  }
  await setGroceries(updated)
}

// ---------- Supplements ----------

export async function getSupplementsTaken(date: string): Promise<string[]> {
  const row = await getDB().supplementsTaken.get(date)
  return row?.names ?? []
}

export async function toggleSupplementTaken(
  date: string,
  name: string
): Promise<void> {
  const current = await getSupplementsTaken(date)
  const next = current.includes(name)
    ? current.filter((n) => n !== name)
    : [...current, name]
  await getDB().supplementsTaken.put({ date, names: next })
}

// ---------- Personal Records ----------

export async function getAllPRs(): Promise<PersonalRecord[]> {
  return getDB().personalRecords.toArray()
}

export async function getPR(
  exerciseName: string
): Promise<PersonalRecord | null> {
  return (await getDB().personalRecords.get(exerciseName)) ?? null
}

// ---------- Backup / Restore ----------

export type Backup = {
  version: 1
  exportedAt: string
  settings: Settings
  workoutLogs: WorkoutLog[]
  meals: { date: string; entries: MealEntry[] }[]
  weights: WeightEntry[]
  groceries: GrocerySection[]
  supplementsTaken: { date: string; names: string[] }[]
  personalRecords: PersonalRecord[]
}

export async function exportData(): Promise<Backup> {
  const db = getDB()
  const [settings, workoutLogs, meals, weights, groceries, sup, prs] = await Promise.all([
    getSettings(),
    db.workoutLogs.toArray(),
    db.meals.toArray(),
    db.weights.toArray(),
    getGroceries(),
    db.supplementsTaken.toArray(),
    db.personalRecords.toArray(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    workoutLogs,
    meals,
    weights,
    groceries,
    supplementsTaken: sup,
    personalRecords: prs,
  }
}

export async function importData(backup: Backup): Promise<void> {
  const db = getDB()
  await db.transaction(
    'rw',
    [
      db.settings,
      db.workoutLogs,
      db.meals,
      db.weights,
      db.groceries,
      db.supplementsTaken,
      db.personalRecords,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.workoutLogs.clear(),
        db.meals.clear(),
        db.weights.clear(),
        db.groceries.clear(),
        db.supplementsTaken.clear(),
        db.personalRecords.clear(),
      ])
      await db.settings.put({ key: 'current', value: backup.settings })
      if (backup.workoutLogs.length) await db.workoutLogs.bulkPut(backup.workoutLogs)
      if (backup.meals.length) await db.meals.bulkPut(backup.meals)
      if (backup.weights.length) await db.weights.bulkPut(backup.weights)
      await db.groceries.put({ key: 'current', sections: backup.groceries })
      if (backup.supplementsTaken.length)
        await db.supplementsTaken.bulkPut(backup.supplementsTaken)
      if (backup.personalRecords.length)
        await db.personalRecords.bulkPut(backup.personalRecords)
    }
  )
}

/**
 * Tries to import a v3 prototype localStorage backup (looser shape).
 * Returns null and leaves the DB untouched if the input doesn't look right.
 */
export async function importV3Backup(raw: unknown): Promise<Backup | null> {
  if (!raw || typeof raw !== 'object') return null
  const v3 = raw as Record<string, unknown>
  const settings = (v3.settings as Settings | undefined) ?? DEFAULT_SETTINGS
  const workoutLogs: WorkoutLog[] = Object.entries(
    (v3.workoutLogs as Record<string, Omit<WorkoutLog, 'date'>>) ?? {}
  ).map(([date, log]) => ({
    date,
    dayIndex: log.dayIndex,
    exercises: (log.exercises ?? []).map((e) => ({
      name: e.name,
      notes: e.notes ?? '',
      sets: (e.sets ?? []).map((s) => ({
        w: toNum(s.w),
        r: toNum(s.r),
        rir: toNum(s.rir),
      })),
    })),
  }))
  const meals = Object.entries(
    (v3.meals as Record<string, MealEntry[]>) ?? {}
  ).map(([date, entries]) => ({ date, entries: entries ?? [] }))
  const weights = (v3.weights as WeightEntry[]) ?? []
  const groceries =
    (v3.grocery as GrocerySection[]) ?? structuredClone(GROCERY_TEMPLATE)
  const supplementsTaken = Object.entries(
    (v3.supplementsTaken as Record<string, string[]>) ?? {}
  ).map(([date, names]) => ({ date, names }))
  const personalRecords = Object.entries(
    (v3.personalRecords as Record<string, Omit<PersonalRecord, 'exerciseName'>>) ?? {}
  ).map(([exerciseName, pr]) => ({ exerciseName, ...pr }))

  const backup: Backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    workoutLogs,
    meals,
    weights,
    groceries,
    supplementsTaken,
    personalRecords,
  }
  await importData(backup)
  return backup
}

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

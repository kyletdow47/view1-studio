export type ExercisePriority = 'main' | 'secondary' | 'finisher'

export type ExerciseDef = {
  name: string
  priority: ExercisePriority
  /** seconds — main: 150, secondary: 90, finisher: 60 */
  restSec: number
  /** target set count */
  targetSets: number
  /** display string e.g. "6-8" or "10-12" */
  targetReps: string
  /** target RIR e.g. "2-3" */
  targetRIR: string
  /** uses an Olympic bar — enables plate calculator */
  isBarbell: boolean
  /** form cues to display */
  cues: string[]
  /** common errors to avoid */
  commonErrors?: string[]
  /** YouTube search URL — search, not specific videos (channels delete content) */
  videoSearchQuery: string
  /** optional alternative if equipment is taken */
  alternateOf?: string
}

export type ProgramDay = {
  /** 0-6 */
  index: number
  /** short name e.g. "Legs — Quad" */
  name: string
  /** longer description e.g. "Quad-focused leg session" */
  focus: string
  /** exercises in order; empty array for rest/hike days */
  exercises: ExerciseDef[]
  /** true for active recovery (Day 6) and full rest (Day 7) */
  isRest: boolean
}

export type SetEntry = {
  /** weight in kg, null if not yet entered */
  w: number | null
  /** reps, null if not yet entered */
  r: number | null
  /** reps in reserve, null if not yet entered */
  rir: number | null
  /** ISO timestamp when this set was logged (set on commit) */
  loggedAt?: string
}

export type ExerciseLog = {
  name: string
  sets: SetEntry[]
  notes: string
}

export type WorkoutLog = {
  date: string
  dayIndex: number
  exercises: ExerciseLog[]
}

export type MealPresetType =
  | 'breakfast'
  | 'smoothie'
  | 'lunch'
  | 'snack'
  | 'dinner'
  | 'casein'

export type MealPreset = {
  id: string
  name: string
  cal: number
  p: number
  c: number
  f: number
  type: MealPresetType
}

export type MealEntry = {
  id: string
  name: string
  cal: number
  p: number
  c: number
  f: number
  /** display HH:MM */
  time: string
  /** optional preset id this came from */
  presetId?: string
}

export type WeightEntry = {
  date: string
  kg: number
  notes: string
}

export type GroceryItem = {
  name: string
  qty: string
  checked: boolean
}

export type GrocerySection = {
  name: string
  items: GroceryItem[]
}

export type Supplement = {
  name: string
  dose: string
  time: string
  notes?: string
  /** false if user still needs to buy it */
  owned: boolean
}

export type Settings = {
  calorieTarget: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  startWeight: number
  goalWeight: number
  /** YYYY-MM-DD */
  startDate: string
}

export type PersonalRecord = {
  exerciseName: string
  weight: number
  reps: number
  /** YYYY-MM-DD */
  date: string
}

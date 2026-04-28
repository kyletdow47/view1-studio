import Dexie, { type Table } from 'dexie'
import type {
  WorkoutLog,
  MealEntry,
  WeightEntry,
  GrocerySection,
  PersonalRecord,
  MealPreset,
  Settings,
} from '@/types'

export type SettingsRow = { key: 'current'; value: Settings }
export type MealsByDate = { date: string; entries: MealEntry[] }
export type GroceriesRow = { key: 'current'; sections: GrocerySection[] }
export type SupplementsTakenRow = { date: string; names: string[] }

export class BridgeDB extends Dexie {
  settings!: Table<SettingsRow, string>
  workoutLogs!: Table<WorkoutLog, string>
  meals!: Table<MealsByDate, string>
  weights!: Table<WeightEntry, string>
  groceries!: Table<GroceriesRow, string>
  supplementsTaken!: Table<SupplementsTakenRow, string>
  personalRecords!: Table<PersonalRecord, string>
  customMealPresets!: Table<MealPreset, string>

  constructor() {
    super('thebridge')
    this.version(1).stores({
      settings: 'key',
      workoutLogs: 'date, dayIndex',
      meals: 'date',
      weights: 'date',
      groceries: 'key',
      supplementsTaken: 'date',
      personalRecords: 'exerciseName',
      customMealPresets: 'id',
    })
  }
}

let _db: BridgeDB | null = null

/** Lazy singleton — only instantiates Dexie in the browser. */
export function getDB(): BridgeDB {
  if (typeof window === 'undefined') {
    throw new Error('BridgeDB is browser-only — call from a Client Component')
  }
  if (!_db) _db = new BridgeDB()
  return _db
}

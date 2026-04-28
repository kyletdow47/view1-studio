'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { GROCERY_TEMPLATE } from '@/data/grocery'
import { DEFAULT_SETTINGS } from '@/data/settings'
import type {
  GrocerySection,
  MealEntry,
  PersonalRecord,
  Settings,
  WeightEntry,
  WorkoutLog,
} from '@/types'
import { getDB } from './schema'

export function useSettings(): Settings {
  const settings = useLiveQuery(
    async (): Promise<Settings> =>
      (await getDB().settings.get('current'))?.value ?? DEFAULT_SETTINGS,
    []
  )
  return settings ?? DEFAULT_SETTINGS
}

export function useWorkoutLog(date: string): WorkoutLog | null {
  const log = useLiveQuery(
    async (): Promise<WorkoutLog | null> =>
      (await getDB().workoutLogs.get(date)) ?? null,
    [date]
  )
  return log ?? null
}

export function useAllWorkoutLogs(): WorkoutLog[] {
  const logs = useLiveQuery(
    async (): Promise<WorkoutLog[]> => getDB().workoutLogs.toArray(),
    []
  )
  return logs ?? []
}

export function useMeals(date: string): MealEntry[] {
  const meals = useLiveQuery(
    async (): Promise<MealEntry[]> =>
      (await getDB().meals.get(date))?.entries ?? [],
    [date]
  )
  return meals ?? []
}

export function useAllWeights(): WeightEntry[] {
  const weights = useLiveQuery(
    async (): Promise<WeightEntry[]> => {
      const rows = await getDB().weights.toArray()
      return rows.sort((a, b) => (a.date < b.date ? -1 : 1))
    },
    []
  )
  return weights ?? []
}

export function useGroceries(): GrocerySection[] {
  const sections = useLiveQuery(
    async (): Promise<GrocerySection[] | undefined> =>
      (await getDB().groceries.get('current'))?.sections,
    []
  )
  return sections ?? GROCERY_TEMPLATE
}

export function useSupplementsTaken(date: string): string[] {
  const names = useLiveQuery(
    async (): Promise<string[]> =>
      (await getDB().supplementsTaken.get(date))?.names ?? [],
    [date]
  )
  return names ?? []
}

export function usePR(exerciseName: string): PersonalRecord | null {
  const pr = useLiveQuery(
    async (): Promise<PersonalRecord | null> =>
      (await getDB().personalRecords.get(exerciseName)) ?? null,
    [exerciseName]
  )
  return pr ?? null
}

export function useAllPRs(): PersonalRecord[] {
  const prs = useLiveQuery(
    async (): Promise<PersonalRecord[]> => getDB().personalRecords.toArray(),
    []
  )
  return prs ?? []
}

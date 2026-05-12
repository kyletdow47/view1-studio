import { PROGRAM } from '@/data/program'
import type { ProgramDay } from '@/types'
import { daysBetween, isValidISO } from './date-utils'

const REST_INDEX = 6 // PROGRAM[6] is the Rest day

/**
 * Returns 0-6 for any valid query date >= startDate.
 * Returns the Rest index (6) for before-program-start or invalid dates,
 * so the UI gets a Rest day as a safety fallback.
 */
export function getProgramDayIndex(startDate: string, queryDate: string): number {
  if (!isValidISO(startDate) || !isValidISO(queryDate)) return REST_INDEX
  const diff = daysBetween(startDate, queryDate)
  if (diff < 0) return REST_INDEX
  return diff % 7
}

export function getProgramDay(
  startDate: string,
  queryDate: string,
  program: ProgramDay[] = PROGRAM
): ProgramDay {
  return program[getProgramDayIndex(startDate, queryDate)]
}

export function daysUntilStart(startDate: string, queryDate: string): number {
  if (!isValidISO(startDate) || !isValidISO(queryDate)) return 0
  return Math.max(0, daysBetween(queryDate, startDate))
}

/** 1-based day number (Day 1, Day 2, ...). 0 if before start. */
export function getDayNumber(startDate: string, queryDate: string): number {
  if (!isValidISO(startDate) || !isValidISO(queryDate)) return 0
  const diff = daysBetween(startDate, queryDate)
  if (diff < 0) return 0
  return diff + 1
}

/** 1-based week number. 0 if before start. */
export function getWeekNumber(startDate: string, queryDate: string): number {
  const day = getDayNumber(startDate, queryDate)
  if (day === 0) return 0
  return Math.floor((day - 1) / 7) + 1
}

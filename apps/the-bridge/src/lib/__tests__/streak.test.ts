import { describe, expect, it } from 'vitest'
import { calculateStreak } from '../streak'
import type { WorkoutLog } from '@/types'

function log(date: string, withSets = true): WorkoutLog {
  return {
    date,
    dayIndex: 0,
    exercises: withSets
      ? [{ name: 'X', sets: [{ w: 60, r: 8, rir: 2 }], notes: '' }]
      : [],
  }
}

describe('calculateStreak', () => {
  it('returns 0/0 for empty', () => {
    expect(calculateStreak([], '2026-05-01')).toEqual({ current: 0, best: 0 })
  })

  it('counts 3 consecutive training days', () => {
    const logs = [
      log('2026-04-28'),
      log('2026-04-29'),
      log('2026-04-30'),
    ]
    expect(calculateStreak(logs, '2026-04-30')).toEqual({ current: 3, best: 3 })
  })

  it('rest days do not break a streak (gap of 2 days)', () => {
    const logs = [
      log('2026-04-28'),
      log('2026-04-29'),
      log('2026-05-01'), // skipped 04-30 (rest day)
    ]
    expect(calculateStreak(logs, '2026-05-01').current).toBe(3)
  })

  it('a 4-day gap DOES break a streak', () => {
    const logs = [
      log('2026-04-28'),
      log('2026-04-29'),
      log('2026-05-04'), // 5 day gap from 04-29
    ]
    const result = calculateStreak(logs, '2026-05-04')
    expect(result.current).toBe(1)
    expect(result.best).toBeGreaterThanOrEqual(2)
  })

  it("today not yet logged but yesterday was → today's streak counts yesterday", () => {
    const logs = [
      log('2026-04-28'),
      log('2026-04-29'),
      log('2026-04-30'),
    ]
    expect(calculateStreak(logs, '2026-05-01').current).toBe(3)
  })

  it('logs without sets do not count', () => {
    const logs = [log('2026-04-28', false), log('2026-04-29', false)]
    expect(calculateStreak(logs, '2026-04-29')).toEqual({ current: 0, best: 0 })
  })

  it('large gap to today resets current but preserves best', () => {
    const logs = [
      log('2026-04-01'),
      log('2026-04-02'),
      log('2026-04-03'),
    ]
    const result = calculateStreak(logs, '2026-05-01')
    expect(result.current).toBe(0)
    expect(result.best).toBe(3)
  })
})

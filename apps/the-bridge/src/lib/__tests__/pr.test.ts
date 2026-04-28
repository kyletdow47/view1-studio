import { describe, expect, it } from 'vitest'
import { isNewPR, buildPR } from '../pr'

describe('isNewPR', () => {
  it('first time logging is automatically a PR', () => {
    expect(isNewPR(60, 8, null)).toBe(true)
    expect(isNewPR(60, 8, undefined)).toBe(true)
  })

  it('strictly greater weight*reps product is a new PR', () => {
    expect(isNewPR(60, 9, { exerciseName: 'X', weight: 60, reps: 8, date: '2026-04-28' })).toBe(true)
    expect(isNewPR(70, 8, { exerciseName: 'X', weight: 60, reps: 8, date: '2026-04-28' })).toBe(true)
  })

  it('tie does NOT count as a new PR', () => {
    expect(isNewPR(60, 8, { exerciseName: 'X', weight: 60, reps: 8, date: '2026-04-28' })).toBe(false)
    expect(isNewPR(80, 6, { exerciseName: 'X', weight: 60, reps: 8, date: '2026-04-28' })).toBe(false) // 480 == 480
  })

  it('lower volume does not break PR', () => {
    expect(isNewPR(50, 6, { exerciseName: 'X', weight: 60, reps: 8, date: '2026-04-28' })).toBe(false)
  })

  it('rejects invalid inputs', () => {
    expect(isNewPR(NaN, 8, null)).toBe(false)
    expect(isNewPR(60, 0, null)).toBe(false)
    expect(isNewPR(-10, 8, null)).toBe(false)
  })
})

describe('buildPR', () => {
  it('snapshots all fields', () => {
    expect(buildPR('Hack Squat', 80, 6, '2026-04-28')).toEqual({
      exerciseName: 'Hack Squat',
      weight: 80,
      reps: 6,
      date: '2026-04-28',
    })
  })
})

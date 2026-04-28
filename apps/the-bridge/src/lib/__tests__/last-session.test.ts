import { describe, expect, it } from 'vitest'
import { findLastSession } from '../last-session'
import type { WorkoutLog } from '@/types'

const log = (date: string, exercises: WorkoutLog['exercises']): WorkoutLog => ({
  date,
  dayIndex: 0,
  exercises,
})

describe('findLastSession', () => {
  it('returns null when nothing matches', () => {
    expect(findLastSession('Hack Squat', '2026-05-01', [])).toBeNull()
  })

  it('returns the most recent log strictly before beforeDate', () => {
    const logs = [
      log('2026-04-28', [
        { name: 'Hack Squat', notes: '', sets: [{ w: 60, r: 8, rir: 2 }] },
      ]),
      log('2026-04-30', [
        { name: 'Hack Squat', notes: '', sets: [{ w: 65, r: 8, rir: 2 }] },
      ]),
    ]
    const result = findLastSession('Hack Squat', '2026-05-02', logs)
    expect(result?.date).toBe('2026-04-30')
    expect(result?.sets[0].w).toBe(65)
  })

  it('does not return the same date as beforeDate', () => {
    const logs = [
      log('2026-04-30', [
        { name: 'Hack Squat', notes: '', sets: [{ w: 65, r: 8, rir: 2 }] },
      ]),
    ]
    expect(findLastSession('Hack Squat', '2026-04-30', logs)).toBeNull()
  })

  it('skips entries without reps', () => {
    const logs = [
      log('2026-04-28', [
        { name: 'Hack Squat', notes: '', sets: [{ w: 60, r: 8, rir: 2 }] },
      ]),
      log('2026-04-30', [
        { name: 'Hack Squat', notes: '', sets: [{ w: 65, r: null, rir: null }] },
      ]),
    ]
    const result = findLastSession('Hack Squat', '2026-05-01', logs)
    expect(result?.date).toBe('2026-04-28')
  })

  it('returns null when exercise has never been logged with reps', () => {
    const logs = [
      log('2026-04-28', [
        { name: 'Hack Squat', notes: '', sets: [{ w: 60, r: null, rir: null }] },
      ]),
    ]
    expect(findLastSession('Hack Squat', '2026-05-01', logs)).toBeNull()
  })

  it('handles dictionary input as well as array', () => {
    const logs = {
      '2026-04-28': log('2026-04-28', [
        { name: 'Hack Squat', notes: '', sets: [{ w: 60, r: 8, rir: 2 }] },
      ]),
    }
    expect(findLastSession('Hack Squat', '2026-05-01', logs)?.sets[0].w).toBe(60)
  })
})

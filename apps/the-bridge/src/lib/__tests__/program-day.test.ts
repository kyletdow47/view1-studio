import { describe, expect, it } from 'vitest'
import {
  daysUntilStart,
  getDayNumber,
  getProgramDay,
  getProgramDayIndex,
  getWeekNumber,
} from '../program-day'

const START = '2026-04-28'

describe('getProgramDayIndex', () => {
  it('Day 1 on start date', () => {
    expect(getProgramDayIndex(START, '2026-04-28')).toBe(0)
  })

  it('Day 2 the next day', () => {
    expect(getProgramDayIndex(START, '2026-04-29')).toBe(1)
  })

  it('Day 7 (index 6) one week after start', () => {
    expect(getProgramDayIndex(START, '2026-05-04')).toBe(6)
  })

  it('wraps to Day 1 on day 8', () => {
    expect(getProgramDayIndex(START, '2026-05-05')).toBe(0)
  })

  it('returns Rest index (6) for before-program-start', () => {
    expect(getProgramDayIndex(START, '2026-04-27')).toBe(6)
  })

  it('returns Rest index (6) for invalid query date', () => {
    expect(getProgramDayIndex(START, 'not-a-date')).toBe(6)
  })

  it('returns Rest index (6) for invalid start date', () => {
    expect(getProgramDayIndex('garbage', '2026-04-28')).toBe(6)
  })
})

describe('getProgramDay', () => {
  it('Day 1 = Legs — Quad', () => {
    expect(getProgramDay(START, '2026-04-28').name).toBe('Legs — Quad')
  })

  it('Day 2 = Push', () => {
    expect(getProgramDay(START, '2026-04-29').name).toBe('Push')
  })

  it('Day 7 = Rest', () => {
    expect(getProgramDay(START, '2026-05-04').name).toBe('Rest')
  })

  it('returns Rest for before-program-start', () => {
    expect(getProgramDay(START, '2026-04-27').name).toBe('Rest')
  })

  it('does not crash on invalid date', () => {
    expect(() => getProgramDay(START, 'invalid')).not.toThrow()
    expect(getProgramDay(START, 'invalid').name).toBe('Rest')
  })
})

describe('daysUntilStart', () => {
  it('returns 0 on or after start', () => {
    expect(daysUntilStart(START, '2026-04-28')).toBe(0)
    expect(daysUntilStart(START, '2026-05-15')).toBe(0)
  })

  it('returns positive count before start', () => {
    expect(daysUntilStart(START, '2026-04-25')).toBe(3)
  })
})

describe('getDayNumber', () => {
  it('Day 1 on start date', () => {
    expect(getDayNumber(START, '2026-04-28')).toBe(1)
  })

  it('Day 8 a week after start', () => {
    expect(getDayNumber(START, '2026-05-05')).toBe(8)
  })

  it('returns 0 before start', () => {
    expect(getDayNumber(START, '2026-04-27')).toBe(0)
  })
})

describe('getWeekNumber', () => {
  it('week 1 on day 1', () => {
    expect(getWeekNumber(START, '2026-04-28')).toBe(1)
  })

  it('week 1 on day 7', () => {
    expect(getWeekNumber(START, '2026-05-04')).toBe(1)
  })

  it('week 2 on day 8', () => {
    expect(getWeekNumber(START, '2026-05-05')).toBe(2)
  })

  it('week 4 on day 22', () => {
    expect(getWeekNumber(START, '2026-05-19')).toBe(4)
  })
})

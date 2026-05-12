import { describe, expect, it } from 'vitest'
import { parseVoiceMeal } from '../voice-parser'

describe('parseVoiceMeal', () => {
  it('parses calories + protein + carbs + fat', () => {
    const result = parseVoiceMeal('750 calories 40 grams protein 80 carbs 22 fat oatmeal')
    expect(result?.cal).toBe(750)
    expect(result?.p).toBe(40)
    expect(result?.c).toBe(80)
    expect(result?.f).toBe(22)
    expect(result?.name.toLowerCase()).toContain('oatmeal')
  })

  it('parses partial macro spec', () => {
    const result = parseVoiceMeal('300 calories chicken')
    expect(result?.cal).toBe(300)
    expect(result?.p).toBe(0)
  })

  it('returns null for empty input', () => {
    expect(parseVoiceMeal('')).toBeNull()
  })

  it('returns null when no macros parsed', () => {
    expect(parseVoiceMeal('this is just text with no numbers')).toBeNull()
  })
})

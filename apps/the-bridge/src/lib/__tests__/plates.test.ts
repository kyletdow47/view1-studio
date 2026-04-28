import { describe, expect, it } from 'vitest'
import { calculatePlates } from '../plates'

describe('calculatePlates', () => {
  it('returns empty plates for just the bar', () => {
    expect(calculatePlates(20)).toEqual({ plates: [], leftover: 0 })
  })

  it('returns [1.25] for 22.5kg', () => {
    expect(calculatePlates(22.5)).toEqual({ plates: [1.25], leftover: 0 })
  })

  it('returns [20] for 60kg', () => {
    expect(calculatePlates(60)).toEqual({ plates: [20], leftover: 0 })
  })

  it('returns [25] for 70kg', () => {
    expect(calculatePlates(70)).toEqual({ plates: [25], leftover: 0 })
  })

  it('returns [25, 5] for 80kg', () => {
    expect(calculatePlates(80)).toEqual({ plates: [25, 5], leftover: 0 })
  })

  it('returns [25, 15] for 100kg', () => {
    expect(calculatePlates(100)).toEqual({ plates: [25, 15], leftover: 0 })
  })

  it('returns null when below the bar weight', () => {
    expect(calculatePlates(15)).toBeNull()
  })

  it('honors a custom bar weight', () => {
    expect(calculatePlates(35, 15)).toEqual({ plates: [10], leftover: 0 })
  })

  it('returns null for non-finite input', () => {
    expect(calculatePlates(NaN)).toBeNull()
    expect(calculatePlates(Infinity)).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { PHOTOGRAPHY_LABELS, LABEL_STRINGS, getCategoryForLabel } from './labels'

describe('PHOTOGRAPHY_LABELS', () => {
  it('contains at least 20 labels', () => {
    expect(PHOTOGRAPHY_LABELS.length).toBeGreaterThanOrEqual(20)
  })

  it('every label has a non-empty label string and a valid category', () => {
    const validCategories = new Set([
      'portrait',
      'landscape',
      'event',
      'detail',
      'group',
      'candid',
      'other',
    ])

    PHOTOGRAPHY_LABELS.forEach(({ label, category }) => {
      expect(label.trim().length).toBeGreaterThan(0)
      expect(validCategories.has(category)).toBe(true)
    })
  })

  it('label strings are all lowercase', () => {
    PHOTOGRAPHY_LABELS.forEach(({ label }) => {
      expect(label).toBe(label.toLowerCase())
    })
  })

  it('covers all required moment labels', () => {
    const momentLabels = [
      'wedding ceremony',
      'first dance',
      'cake cutting',
      'getting ready',
      'bouquet toss',
    ]
    const allLabels = new Set(LABEL_STRINGS)
    momentLabels.forEach((l) => expect(allLabels.has(l)).toBe(true))
  })

  it('covers portrait, group, detail, landscape, and candid categories', () => {
    const categories = new Set(PHOTOGRAPHY_LABELS.map((l) => l.category))
    expect(categories.has('portrait')).toBe(true)
    expect(categories.has('group')).toBe(true)
    expect(categories.has('detail')).toBe(true)
    expect(categories.has('landscape')).toBe(true)
    expect(categories.has('candid')).toBe(true)
  })
})

describe('LABEL_STRINGS', () => {
  it('is a flat array of strings', () => {
    expect(Array.isArray(LABEL_STRINGS)).toBe(true)
    LABEL_STRINGS.forEach((s) => expect(typeof s).toBe('string'))
  })

  it('matches PHOTOGRAPHY_LABELS in length', () => {
    expect(LABEL_STRINGS.length).toBe(PHOTOGRAPHY_LABELS.length)
  })
})

describe('getCategoryForLabel', () => {
  it('returns the correct category for known labels', () => {
    expect(getCategoryForLabel('bride portrait')).toBe('portrait')
    expect(getCategoryForLabel('first dance')).toBe('event')
    expect(getCategoryForLabel('family group photo')).toBe('group')
    expect(getCategoryForLabel('detail shot')).toBe('detail')
    expect(getCategoryForLabel('venue exterior')).toBe('landscape')
    expect(getCategoryForLabel('candid moment')).toBe('candid')
  })

  it('returns "other" for unknown labels', () => {
    expect(getCategoryForLabel('unknown label xyz')).toBe('other')
    expect(getCategoryForLabel('')).toBe('other')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { groupByLabel, filterByConfidence, fileToBase64 } from './utils'
import type { ClassificationResult } from './classifier'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const RESULTS: ClassificationResult[] = [
  { photoId: 'p1', label: 'bride portrait', score: 0.95, category: 'portrait' },
  { photoId: 'p2', label: 'bride portrait', score: 0.88, category: 'portrait' },
  { photoId: 'p3', label: 'candid moment', score: 0.72, category: 'candid' },
  { photoId: 'p4', label: 'detail shot', score: 0.45, category: 'detail' },
  { photoId: 'p5', label: 'venue exterior', score: 0.30, category: 'landscape' },
]

// ---------------------------------------------------------------------------
// groupByLabel
// ---------------------------------------------------------------------------
describe('groupByLabel', () => {
  it('groups results under the correct label keys', () => {
    const grouped = groupByLabel(RESULTS)
    expect(Object.keys(grouped).sort()).toEqual(
      ['bride portrait', 'candid moment', 'detail shot', 'venue exterior'].sort()
    )
  })

  it('groups multiple results with the same label together', () => {
    const grouped = groupByLabel(RESULTS)
    expect(grouped['bride portrait']).toHaveLength(2)
  })

  it('returns an empty object for an empty input array', () => {
    expect(groupByLabel([])).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// filterByConfidence
// ---------------------------------------------------------------------------
describe('filterByConfidence', () => {
  it('retains only results with score >= minScore', () => {
    const filtered = filterByConfidence(RESULTS, 0.7)
    expect(filtered).toHaveLength(3)
    filtered.forEach((r) => expect(r.score).toBeGreaterThanOrEqual(0.7))
  })

  it('returns all results when minScore is 0', () => {
    expect(filterByConfidence(RESULTS, 0)).toHaveLength(RESULTS.length)
  })

  it('returns no results when minScore is above all scores', () => {
    expect(filterByConfidence(RESULTS, 1.0)).toHaveLength(0)
  })

  it('returns an empty array for empty input', () => {
    expect(filterByConfidence([], 0.5)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// fileToBase64
// ---------------------------------------------------------------------------
describe('fileToBase64', () => {
  it('resolves with a base64 data URL for a small blob', async () => {
    // FileReader is available in jsdom
    const blob = new Blob(['hello'], { type: 'text/plain' })
    const result = await fileToBase64(blob)
    expect(result).toMatch(/^data:text\/plain;base64,/)
  })

  it('rejects when FileReader encounters an error', async () => {
    // Simulate FileReader error by replacing the result getter
    const originalFR = globalThis.FileReader
    const mockFR = vi.fn().mockImplementation(() => ({
      readAsDataURL: vi.fn(function (this: { onerror?: () => void }) {
        // Trigger onerror asynchronously
        setTimeout(() => this.onerror?.(), 0)
      }),
      set onload(_: unknown) {},
      set onerror(fn: () => void) {
        // Store and call it
        setTimeout(fn, 0)
      },
    }))
    globalThis.FileReader = mockFR as unknown as typeof FileReader

    const blob = new Blob(['x'])
    await expect(fileToBase64(blob)).rejects.toThrow('Failed to read file')

    globalThis.FileReader = originalFR
  })
})

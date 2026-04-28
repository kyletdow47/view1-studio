/** Standard kg plate sizes, heaviest first. */
const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

export type PlateBreakdown = {
  /** plates per side, heaviest first */
  plates: number[]
  /** kg of imbalance that couldn't be expressed in standard plates */
  leftover: number
}

/**
 * Returns null if targetWeight is below the bar weight.
 * Returns { plates: [], leftover: 0 } for "just the bar" (target == bar).
 */
export function calculatePlates(
  targetWeight: number,
  barWeight = 20
): PlateBreakdown | null {
  if (!Number.isFinite(targetWeight) || targetWeight < barWeight) return null
  if (targetWeight === barWeight) return { plates: [], leftover: 0 }

  let perSide = (targetWeight - barWeight) / 2
  const plates: number[] = []

  for (const plate of STANDARD_PLATES) {
    while (perSide >= plate) {
      plates.push(plate)
      perSide = Math.round((perSide - plate) * 100) / 100
    }
  }

  return { plates, leftover: perSide }
}

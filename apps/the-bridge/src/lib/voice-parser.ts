/**
 * Rough regex-based parser for voice-spoken meal entries.
 * Handles forms like "750 calories 40 grams protein 80 carbs 22 fat oatmeal".
 * Intentionally simple — improve only if the user complains.
 */
export type ParsedMeal = {
  name: string
  cal: number
  p: number
  c: number
  f: number
}

const NUM = '(\\d+(?:\\.\\d+)?)'

export function parseVoiceMeal(input: string): ParsedMeal | null {
  if (!input) return null
  const text = input.toLowerCase()

  const cal = matchNumber(text, [
    new RegExp(`${NUM}\\s*(?:k?cal|calorie)`),
    new RegExp(`(?:k?cal|calorie)[a-z\\s]*${NUM}`),
  ])
  const p = matchNumber(text, [
    new RegExp(`${NUM}\\s*(?:g|grams?)?\\s*(?:of\\s+)?protein`),
    new RegExp(`protein[a-z\\s]*${NUM}`),
  ])
  const c = matchNumber(text, [
    new RegExp(`${NUM}\\s*(?:g|grams?)?\\s*(?:of\\s+)?carb`),
    new RegExp(`carb[a-z\\s]*${NUM}`),
  ])
  const f = matchNumber(text, [
    new RegExp(`${NUM}\\s*(?:g|grams?)?\\s*(?:of\\s+)?fat`),
    new RegExp(`fat[a-z\\s]*${NUM}`),
  ])

  if (cal == null && p == null && c == null && f == null) return null

  // Strip the numeric+keyword chunks to leave a name
  const stripped = input
    .replace(/\d+(?:\.\d+)?\s*(?:k?cal|calorie|kcal|gram|grams|g\b)?/gi, ' ')
    .replace(/\b(of|protein|carb(?:s|ohydrates)?|fat)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    name: stripped || 'Logged meal',
    cal: cal ?? 0,
    p: p ?? 0,
    c: c ?? 0,
    f: f ?? 0,
  }
}

function matchNumber(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m && m[1]) return Number(m[1])
  }
  return null
}

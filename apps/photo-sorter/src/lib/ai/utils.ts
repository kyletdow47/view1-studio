import type { ClassificationResult } from './classifier'

/**
 * Group classification results by their label.
 */
export function groupByLabel(
  results: ClassificationResult[]
): Record<string, ClassificationResult[]> {
  return results.reduce<Record<string, ClassificationResult[]>>((acc, result) => {
    const key = result.label
    if (!acc[key]) acc[key] = []
    acc[key].push(result)
    return acc
  }, {})
}

/**
 * Filter results to only those with score >= minScore.
 */
export function filterByConfidence(
  results: ClassificationResult[],
  minScore: number
): ClassificationResult[] {
  return results.filter((r) => r.score >= minScore)
}

/**
 * Convert a File or Blob to a base64 data URL.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('FileReader did not return a string'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

import { pipeline, env } from '@xenova/transformers'
import type { PhotoCategory } from './labels'
import { LABEL_STRINGS, getCategoryForLabel } from './labels'

// Allow remote model downloads and cache in browser IndexedDB
env.allowRemoteModels = true
env.useBrowserCache = true

export interface ClassificationResult {
  photoId: string
  label: string
  score: number
  category: PhotoCategory
}

type RawPipelineResult = Array<{ label: string; score: number }>

// SigLIP / CLIP model hosted on Hugging Face via Xenova
const MODEL_ID = 'Xenova/clip-vit-base-patch32'

type ClassificationPipeline = Awaited<ReturnType<typeof pipeline>>
let pipelineInstance: ClassificationPipeline | null = null

type ProgressInfo = { status: string; progress?: number }

/**
 * Load (or reuse a cached) zero-shot image classification pipeline.
 * Calls onProgress with [0–100] as the model downloads.
 */
export async function loadModel(onProgress?: (progress: number) => void): Promise<void> {
  if (pipelineInstance !== null) return

  pipelineInstance = await pipeline('zero-shot-image-classification', MODEL_ID, {
    progress_callback: (info: unknown) => {
      if (!onProgress) return
      const p = info as ProgressInfo
      if (typeof p?.progress === 'number') {
        onProgress(Math.round(p.progress))
      }
    },
  })
}

/**
 * Classify an image against the photography label taxonomy.
 *
 * @param imageSource  Base64 data URL, object URL, or remote URL
 * @param photoId      Caller-supplied ID attached to each result
 * @param topK         Number of top labels to return (default 5)
 */
export async function classify(
  imageSource: string,
  photoId: string,
  topK = 5
): Promise<ClassificationResult[]> {
  if (pipelineInstance === null) {
    await loadModel()
  }

  const pipe = pipelineInstance as ClassificationPipeline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawOutput = (await (pipe as any)(imageSource, LABEL_STRINGS, { topk: topK })) as RawPipelineResult

  return rawOutput.map((item) => ({
    photoId,
    label: item.label,
    score: item.score,
    category: getCategoryForLabel(item.label),
  }))
}

/** Reset the cached pipeline (useful for testing). */
export function resetModel(): void {
  pipelineInstance = null
}

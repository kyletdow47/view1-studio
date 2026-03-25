'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClassificationResult } from '@/lib/ai/classifier'
import type { WorkerRequest, WorkerResponse } from '@/lib/ai/worker'
import { fileToBase64 } from '@/lib/ai/utils'

export type ClassifierStatus = 'idle' | 'loading' | 'ready' | 'classifying' | 'error'

export interface UseClassifierReturn {
  status: ClassifierStatus
  loadProgress: number
  error: string | null
  classify: (file: File, photoId: string, topK?: number) => Promise<ClassificationResult[]>
}

export function useClassifier(): UseClassifierReturn {
  const workerRef = useRef<Worker | null>(null)
  const [status, setStatus] = useState<ClassifierStatus>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Pending resolve/reject keyed by photoId
  const pendingRef = useRef<
    Map<string, { resolve: (r: ClassificationResult[]) => void; reject: (e: Error) => void }>
  >(new Map())

  useEffect(() => {
    const worker = new Worker(new URL('@/lib/ai/worker.ts', import.meta.url))
    workerRef.current = worker

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data

      switch (msg.type) {
        case 'loadProgress':
          setLoadProgress(msg.progress)
          break

        case 'modelLoaded':
          setStatus('ready')
          setLoadProgress(100)
          break

        case 'result': {
          const pending = pendingRef.current.get(msg.photoId)
          if (pending) {
            pending.resolve(msg.results)
            pendingRef.current.delete(msg.photoId)
          }
          if (pendingRef.current.size === 0) setStatus('ready')
          break
        }

        case 'error': {
          const message = msg.message
          if (msg.photoId) {
            const pending = pendingRef.current.get(msg.photoId)
            if (pending) {
              pending.reject(new Error(message))
              pendingRef.current.delete(msg.photoId)
            }
            if (pendingRef.current.size === 0) setStatus('ready')
          } else {
            setStatus('error')
            setError(message)
          }
          break
        }
      }
    })

    // Kick off model load immediately
    setStatus('loading')
    const request: WorkerRequest = { type: 'loadModel' }
    worker.postMessage(request)

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const classify = useCallback(
    async (file: File, photoId: string, topK = 5): Promise<ClassificationResult[]> => {
      if (!workerRef.current) throw new Error('Worker not initialised')
      if (status === 'loading') throw new Error('Model is still loading')

      const imageData = await fileToBase64(file)

      return new Promise<ClassificationResult[]>((resolve, reject) => {
        pendingRef.current.set(photoId, { resolve, reject })
        setStatus('classifying')

        const request: WorkerRequest = { type: 'classify', photoId, imageData, topK }
        workerRef.current!.postMessage(request)
      })
    },
    [status]
  )

  return { status, loadProgress, error, classify }
}

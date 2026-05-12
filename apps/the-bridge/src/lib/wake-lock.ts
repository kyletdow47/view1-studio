'use client'

import { useEffect } from 'react'

/**
 * Keep the screen awake while `active` is true. Uses the Screen Wake Lock
 * API where available (iOS 16.4+, Chrome desktop+Android, etc.); silently
 * no-ops otherwise. Re-acquires the lock when the page becomes visible
 * again — iOS releases it on tab/app switch.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinel: { release: () => Promise<void> } | null = null
    let cancelled = false

    async function acquire() {
      try {
        sentinel = await (navigator as unknown as {
          wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
        }).wakeLock.request('screen')
      } catch {
        // Permission denied or unavailable — best-effort, ignore.
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible' && active && !cancelled) {
        acquire()
      }
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}

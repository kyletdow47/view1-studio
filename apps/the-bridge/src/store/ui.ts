'use client'

import { create } from 'zustand'
import { todayISO } from '@/lib/date-utils'

/**
 * Wall-clock-based rest timer. `endsAt` is the source of truth; `remaining`
 * is derived on every tick (and on visibility change), so the countdown
 * stays correct after the screen sleeps or the app is backgrounded.
 *
 * Persisted to localStorage so a full app reload doesn't lose the timer.
 */
type RestTimer = {
  endsAt: number
  totalSec: number
  intervalId: number | null
}

type UIState = {
  selectedDate: string
  setSelectedDate: (d: string) => void

  restTimer: RestTimer | null
  /** seconds remaining — derived from endsAt at read time */
  restRemaining: number
  startRestTimer: (sec: number) => void
  adjustRestTimer: (deltaSec: number) => void
  cancelRestTimer: () => void
  /** Recompute remaining from wall clock; called on tick and on visibility change. */
  syncRestTimer: () => void
}

const REST_STORAGE_KEY = 'thebridge.restTimer.v1'

function loadPersisted(): RestTimer | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(REST_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { endsAt: number; totalSec: number }
    if (typeof parsed.endsAt !== 'number' || parsed.endsAt <= Date.now()) {
      localStorage.removeItem(REST_STORAGE_KEY)
      return null
    }
    return { endsAt: parsed.endsAt, totalSec: parsed.totalSec, intervalId: null }
  } catch {
    return null
  }
}

function persist(t: RestTimer | null) {
  if (typeof window === 'undefined') return
  if (!t) {
    localStorage.removeItem(REST_STORAGE_KEY)
    return
  }
  localStorage.setItem(
    REST_STORAGE_KEY,
    JSON.stringify({ endsAt: t.endsAt, totalSec: t.totalSec })
  )
}

function remainingFor(t: RestTimer | null): number {
  if (!t) return 0
  return Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000))
}

export const useUIStore = create<UIState>((set, get) => {
  const persisted = loadPersisted()
  return {
    selectedDate: todayISO(),
    setSelectedDate: (d) => set({ selectedDate: d }),

    restTimer: persisted,
    restRemaining: remainingFor(persisted),

    startRestTimer: (sec) => {
      const existing = get().restTimer
      if (existing?.intervalId != null) window.clearInterval(existing.intervalId)

      const endsAt = Date.now() + sec * 1000
      const id = window.setInterval(() => {
        get().syncRestTimer()
      }, 500)
      const timer: RestTimer = { endsAt, totalSec: sec, intervalId: id }
      persist(timer)
      set({ restTimer: timer, restRemaining: sec })
    },

    adjustRestTimer: (deltaSec) => {
      const t = get().restTimer
      if (!t) return
      const next: RestTimer = {
        ...t,
        endsAt: Math.max(Date.now(), t.endsAt + deltaSec * 1000),
        totalSec: Math.max(t.totalSec, t.totalSec + deltaSec),
      }
      persist(next)
      set({ restTimer: next, restRemaining: remainingFor(next) })
    },

    cancelRestTimer: () => {
      const t = get().restTimer
      if (t?.intervalId != null) window.clearInterval(t.intervalId)
      persist(null)
      set({ restTimer: null, restRemaining: 0 })
    },

    syncRestTimer: () => {
      const t = get().restTimer
      if (!t) return
      const remaining = remainingFor(t)
      if (remaining <= 0) {
        if (t.intervalId != null) window.clearInterval(t.intervalId)
        persist(null)
        set({ restTimer: null, restRemaining: 0 })
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([60, 40, 60, 40, 120])
        }
        // Audible cue if the page is visible; uses Notification API if backgrounded.
        try {
          if (typeof document !== 'undefined' && document.hidden) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Rest done', { body: 'Back to it.', silent: false })
            }
          } else if (typeof window !== 'undefined' && 'AudioContext' in window) {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.001, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
            osc.start()
            osc.stop(ctx.currentTime + 0.4)
          }
        } catch {
          /* audio/notification best-effort */
        }
        return
      }
      if (remaining !== get().restRemaining) set({ restRemaining: remaining })
    },
  }
})

// Resume tick + sync immediately when the page becomes visible again.
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) useUIStore.getState().syncRestTimer()
  })
  // If a persisted timer is still running on load, kick off the interval.
  setTimeout(() => {
    const s = useUIStore.getState()
    if (s.restTimer && s.restTimer.intervalId == null) {
      const id = window.setInterval(() => useUIStore.getState().syncRestTimer(), 500)
      // re-set just the intervalId, preserving everything else
      useUIStore.setState({
        restTimer: { ...s.restTimer, intervalId: id },
      })
      useUIStore.getState().syncRestTimer()
    }
  }, 0)

  // Request notification permission lazily — the first time the user starts a timer
  // it'll prompt; harmless if already granted/denied.
  useUIStore.subscribe((state) => {
    if (state.restTimer && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  })
}

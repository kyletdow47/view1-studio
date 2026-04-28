'use client'

import { create } from 'zustand'
import { todayISO } from '@/lib/date-utils'

type RestTimer = {
  remaining: number
  total: number
  intervalId: number | null
}

type UIState = {
  selectedDate: string
  setSelectedDate: (d: string) => void

  restTimer: RestTimer | null
  startRestTimer: (sec: number) => void
  adjustRestTimer: (deltaSec: number) => void
  cancelRestTimer: () => void
  /** Internal — fired by interval; returns true if timer just hit 0. */
  _tickRestTimer: () => boolean
}

export const useUIStore = create<UIState>((set, get) => ({
  selectedDate: todayISO(),
  setSelectedDate: (d) => set({ selectedDate: d }),

  restTimer: null,

  startRestTimer: (sec) => {
    const existing = get().restTimer
    if (existing?.intervalId != null) {
      window.clearInterval(existing.intervalId)
    }
    const id = window.setInterval(() => {
      const done = get()._tickRestTimer()
      if (done) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([60, 40, 60, 40, 120])
        }
      }
    }, 1000)
    set({ restTimer: { remaining: sec, total: sec, intervalId: id } })
  },

  adjustRestTimer: (deltaSec) =>
    set((s) =>
      s.restTimer
        ? {
            restTimer: {
              ...s.restTimer,
              remaining: Math.max(0, s.restTimer.remaining + deltaSec),
            },
          }
        : {}
    ),

  cancelRestTimer: () => {
    const t = get().restTimer
    if (t?.intervalId != null) window.clearInterval(t.intervalId)
    set({ restTimer: null })
  },

  _tickRestTimer: () => {
    const t = get().restTimer
    if (!t) return false
    const next = t.remaining - 1
    if (next <= 0) {
      if (t.intervalId != null) window.clearInterval(t.intervalId)
      set({ restTimer: null })
      return true
    }
    set({ restTimer: { ...t, remaining: next } })
    return false
  },
}))

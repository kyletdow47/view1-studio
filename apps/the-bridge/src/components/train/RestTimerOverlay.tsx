'use client'

import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/cn'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RestTimerOverlay() {
  const restTimer = useUIStore((s) => s.restTimer)
  const remaining = useUIStore((s) => s.restRemaining)
  const adjust = useUIStore((s) => s.adjustRestTimer)
  const cancel = useUIStore((s) => s.cancelRestTimer)

  if (!restTimer) return null

  const pct = restTimer.totalSec > 0 ? (remaining / restTimer.totalSec) * 100 : 0
  const lowTime = remaining <= 10

  return (
    <div
      className="fixed left-2 right-2 z-30 glass-card glass-card-bright rounded-2xl p-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-white/60">
          Rest
        </span>
        <button
          onClick={cancel}
          className="text-xs text-white/60 hover:text-white px-2 tap-target -mr-2"
        >
          Skip
        </button>
      </div>
      <div className="flex items-end justify-between mb-2 gap-3">
        <span
          className={cn(
            'font-mono text-5xl font-bold tabular-nums leading-none',
            lowTime ? 'rainbow-text' : 'text-white'
          )}
        >
          {fmt(remaining)}
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => adjust(-30)}
            className="bg-white/10 hover:bg-white/16 text-white text-xs font-semibold px-2.5 py-1.5 rounded-pill"
          >
            −30s
          </button>
          <button
            onClick={() => adjust(30)}
            className="bg-white/10 hover:bg-white/16 text-white text-xs font-semibold px-2.5 py-1.5 rounded-pill"
          >
            +30s
          </button>
          <button
            onClick={() => adjust(-15)}
            className="rainbow-bright-fill text-white text-xs font-semibold px-2.5 py-1.5 rounded-pill"
          >
            −15s
          </button>
          <button
            onClick={() => adjust(15)}
            className="rainbow-bright-fill text-white text-xs font-semibold px-2.5 py-1.5 rounded-pill"
          >
            +15s
          </button>
        </div>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rainbow-fill transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

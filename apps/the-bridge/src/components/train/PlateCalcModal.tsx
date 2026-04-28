'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { calculatePlates } from '@/lib/plates'
import { cn } from '@/lib/cn'

type Props = {
  open: boolean
  onClose: () => void
  initialWeight?: number
}

const PLATE_COLOR: Record<number, string> = {
  25: 'bg-red-500/80',
  20: 'bg-blue-500/80',
  15: 'bg-yellow-400/80 text-black',
  10: 'bg-emerald-500/80',
  5: 'bg-white/90 text-black',
  2.5: 'bg-purple-500/80',
  1.25: 'bg-pink-500/80',
}

export function PlateCalcModal({ open, onClose, initialWeight = 60 }: Props) {
  const [weight, setWeight] = useState(initialWeight)
  const [bar, setBar] = useState(20)

  const result = calculatePlates(weight, bar)

  return (
    <Modal open={open} onClose={onClose} title="Plate calculator">
      <div className="flex gap-2 mb-4">
        <label className="flex-1">
          <span className="block text-xs text-white/60 mb-1">Target (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            className="set-input w-full"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value) || 0)}
          />
        </label>
        <label className="w-24">
          <span className="block text-xs text-white/60 mb-1">Bar (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            className="set-input w-full"
            value={bar}
            onChange={(e) => setBar(Number(e.target.value) || 0)}
          />
        </label>
      </div>

      <div className="rounded-lg bg-white/5 p-4 min-h-32">
        {result == null ? (
          <p className="text-sm text-red-300">
            Below bar weight ({bar} kg) — no plates needed.
          </p>
        ) : result.plates.length === 0 ? (
          <p className="text-sm text-white/80">Just the bar — no plates.</p>
        ) : (
          <>
            <p className="text-xs text-white/60 mb-3">
              Per side, heaviest first
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {result.plates.map((p, i) => (
                <span
                  key={i}
                  className={cn(
                    'inline-flex items-center justify-center font-mono font-semibold text-xs rounded-md px-2 py-1.5 shadow-md',
                    PLATE_COLOR[p] ?? 'bg-white/15'
                  )}
                >
                  {p}
                </span>
              ))}
            </div>
            {result.leftover > 0 && (
              <p className="mt-3 text-xs text-amber-300">
                Imbalance: {result.leftover} kg won't fit standard plates.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        {[60, 70, 80, 90, 100].map((w) => (
          <button
            key={w}
            onClick={() => setWeight(w)}
            className="px-3 py-1.5 rounded-pill bg-white/8 text-xs text-white/80 hover:bg-white/14"
          >
            {w}
          </button>
        ))}
      </div>
    </Modal>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { searchExercises, getExerciseDef } from '@/data/exercises'
import { addExerciseToLog, swapScheduledExercise } from '@/db/operations'
import { EXERCISE_CATEGORIES, type ExerciseCategory, type ExerciseDef } from '@/types'
import { cn } from '@/lib/cn'

type Props = {
  open: boolean
  onClose: () => void
  date: string
  dayIndex: number
  /** names already in today's session — shown as "in session" and disabled */
  excludedNames: Set<string>
  /** "add" inserts a new exercise; "swap" replaces a scheduled slot */
  mode?: 'add' | 'swap'
  /** when mode === "swap", the scheduled exercise being replaced */
  swapOriginal?: string
  onSwapDone?: (replacement: string) => void
}

export function AddExerciseModal({
  open,
  onClose,
  date,
  dayIndex,
  excludedNames,
  mode = 'add',
  swapOriginal,
  onSwapDone,
}: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'All'>('All')

  // In swap mode, default the category filter to match the original.
  const initialCategory: ExerciseCategory | 'All' = useMemo(() => {
    if (mode === 'swap' && swapOriginal) {
      return getExerciseDef(swapOriginal).category
    }
    return 'All'
  }, [mode, swapOriginal])

  // Reset category when the modal opens so the swap default applies fresh.
  useMemo(() => {
    if (open) setCategory(initialCategory)
  }, [open, initialCategory])

  const filtered = useMemo(() => {
    let list = searchExercises(query)
    if (category !== 'All') list = list.filter((e) => e.category === category)
    if (mode === 'swap' && swapOriginal) {
      list = list.filter((e) => e.name !== swapOriginal)
    }
    return list
  }, [query, category, mode, swapOriginal])

  async function add(ex: ExerciseDef) {
    if (mode === 'swap' && swapOriginal) {
      await swapScheduledExercise(date, dayIndex, swapOriginal, ex.name)
      setQuery('')
      onSwapDone?.(ex.name)
      return
    }
    await addExerciseToLog(date, dayIndex, ex.name)
    setQuery('')
    onClose()
  }

  const title = mode === 'swap'
    ? `Swap ${swapOriginal ?? 'exercise'}`
    : 'Add exercise'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          className="w-full rounded-md bg-white/8 border border-white/12 px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400/50"
        />

        <div
          className="flex gap-1.5 overflow-x-auto -mx-1 px-1 py-1"
          style={{ scrollbarWidth: 'none' }}
        >
          <Chip
            label="All"
            active={category === 'All'}
            onClick={() => setCategory('All')}
          />
          {EXERCISE_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>

        <ul className="max-h-[55vh] overflow-y-auto -mx-1 px-1 divide-y divide-white/6">
          {filtered.length === 0 && (
            <li className="text-sm text-white/55 text-center py-6">
              No exercises match.
            </li>
          )}
          {filtered.map((ex) => {
            const already = excludedNames.has(ex.name)
            return (
              <li key={ex.name}>
                <button
                  onClick={() => !already && add(ex)}
                  disabled={already}
                  className="w-full flex items-center gap-3 py-3 px-1 text-left disabled:opacity-40"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {ex.name}
                    </p>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      {ex.category} · {ex.targetSets} × {ex.targetReps}
                    </p>
                  </div>
                  {already ? (
                    <span className="text-[10px] uppercase tracking-wider text-white/45 shrink-0">
                      in session
                    </span>
                  ) : (
                    <span className="rainbow-bright-fill text-white text-base font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                      +
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3 py-1.5 rounded-pill text-xs font-medium transition-all whitespace-nowrap',
        active
          ? 'rainbow-bright-fill text-white'
          : 'bg-white/8 text-white/70 hover:bg-white/14'
      )}
    >
      {label}
    </button>
  )
}

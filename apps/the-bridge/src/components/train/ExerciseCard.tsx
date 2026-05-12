'use client'

import { useMemo, useState } from 'react'
import type {
  ExerciseDef,
  ExerciseLog,
  SetEntry,
  WorkoutLog,
} from '@/types'
import { Card } from '@/components/ui/Card'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { useToast } from '@/components/ui/Toast'
import { usePR } from '@/db/hooks'
import {
  deleteSet,
  logSet,
  setExerciseNotes,
} from '@/db/operations'
import { findLastSession } from '@/lib/last-session'
import { relativeLabel } from '@/lib/date-utils'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/cn'
import { PlateCalcModal } from './PlateCalcModal'

type Props = {
  exercise: ExerciseDef
  date: string
  dayIndex: number
  log: ExerciseLog | undefined
  /** today's log of the paired exercise, used to gate the rest timer */
  partnerLog?: ExerciseLog
  allWorkoutLogs: WorkoutLog[]
  /** if provided, shows a small × button to remove this card from today's session */
  onRemove?: () => void
  /** if provided, shows a swap button — fires when the user wants to replace this exercise */
  onSwap?: () => void
  /** when non-null, this slot is a swap of `swappedFrom` and shows an undo affordance */
  swappedFrom?: string | null
  /** restores the original scheduled exercise; only present when swappedFrom is set */
  onUndoSwap?: () => void
  /** opens the superset-pair picker for this exercise */
  onPair?: () => void
  /** removes the current pairing */
  onUnpair?: () => void
}

export function ExerciseCard({
  exercise,
  date,
  dayIndex,
  log,
  partnerLog,
  allWorkoutLogs,
  onRemove,
  onSwap,
  swappedFrom,
  onUndoSwap,
  onPair,
  onUnpair,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false)
  const [plateOpen, setPlateOpen] = useState(false)
  const [draft, setDraft] = useState<SetEntry>({ w: null, r: null, rir: null })
  const { toast } = useToast()
  const startRestTimer = useUIStore((s) => s.startRestTimer)
  const pr = usePR(exercise.name)

  const lastSession = useMemo(
    () => findLastSession(exercise.name, date, allWorkoutLogs),
    [exercise.name, date, allWorkoutLogs]
  )

  const completedSets = log?.sets.filter((s) => s.r != null) ?? []
  const targetReached = completedSets.length >= exercise.targetSets
  const [extraSetUnlocked, setExtraSetUnlocked] = useState(false)
  const showDraftRow = !targetReached || extraSetUnlocked

  async function commitDraft() {
    if (draft.w == null && draft.r == null && draft.rir == null) return
    const result = await logSet(date, dayIndex, exercise.name, draft)
    setDraft({ w: null, r: null, rir: null })
    setExtraSetUnlocked(false)

    // Superset rest gating:
    // If paired AND the partner owes a set (fewer logged sets than us now),
    // skip the rest — the user goes straight to the partner. Otherwise rest.
    const partnerOwesSet =
      log?.pairedWith &&
      partnerLog &&
      (partnerLog.sets.filter((s) => s.r != null).length <
        (log?.sets.filter((s) => s.r != null).length ?? 0) + 1)

    if (partnerOwesSet) {
      toast(`Now: ${log!.pairedWith}`, 'success')
    } else {
      startRestTimer(exercise.restSec)
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(30)
    }
    if (result.pr) {
      toast(`PR! ${result.pr.weight} kg × ${result.pr.reps}`, 'pr')
      navigator.vibrate?.([60, 40, 60, 40, 120])
    }
  }

  return (
    <Card className="space-y-3">
      <header className="flex items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-base leading-tight">
              {exercise.name}
            </h3>
            <PriorityBadge priority={exercise.priority} />
            {pr && (
              <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded-sm border bg-pink-500/15 text-pink-300 border-pink-500/30">
                PR {pr.weight}×{pr.reps}
              </span>
            )}
          </div>
          <p className="text-xs text-white/55 mt-0.5">
            {exercise.targetSets} × {exercise.targetReps} @ RIR {exercise.targetRIR}
          </p>
        </div>
        <div className="flex items-center gap-0.5 -mr-2">
          {onPair && !log?.pairedWith && (
            <button
              onClick={onPair}
              className="text-white/45 hover:text-cyan-200 tap-target"
              aria-label="Pair as superset"
              title="Pair as superset"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          )}
          {onSwap && completedSets.length === 0 && (
            <button
              onClick={onSwap}
              className="text-white/45 hover:text-white tap-target"
              aria-label="Swap exercise"
              title="Swap for another exercise"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m17 3 4 4-4 4" />
                <path d="M21 7H9" />
                <path d="m7 21-4-4 4-4" />
                <path d="M3 17h12" />
              </svg>
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-white/45 hover:text-red-300 tap-target"
              aria-label="Remove from session"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setInfoOpen((v) => !v)}
            className="text-white/50 hover:text-white tap-target"
            aria-label="Form info"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
        </div>
      </header>

      {swappedFrom && (
        <div className="flex items-center justify-between text-[11px] -mt-1.5">
          <span className="text-amber-200/80">
            Swapped from{' '}
            <span className="font-medium">{swappedFrom}</span>
          </span>
          {onUndoSwap && (
            <button
              onClick={onUndoSwap}
              className="text-amber-200 hover:text-amber-100 underline underline-offset-2"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {log?.pairedWith && (
        <div className="flex items-center justify-between text-[11px] -mt-1.5">
          <span className="text-cyan-200/85 inline-flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 font-semibold">
              Superset
            </span>
            with <span className="font-medium">{log.pairedWith}</span>
          </span>
          {onUnpair && (
            <button
              onClick={onUnpair}
              className="text-cyan-200 hover:text-cyan-100 underline underline-offset-2"
            >
              Break
            </button>
          )}
        </div>
      )}

      {infoOpen && (
        <div className="rounded-md bg-white/5 p-3 space-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1">
              Cues
            </p>
            <ul className="text-sm text-white/80 space-y-1">
              {exercise.cues.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-white/40">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          {exercise.commonErrors && exercise.commonErrors.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1">
                Avoid
              </p>
              <ul className="text-sm text-white/70 space-y-1">
                {exercise.commonErrors.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-300/70">×</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <a
            href={exercise.videoSearchQuery}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-xs text-pink-300 hover:text-pink-200 mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 16 24 12 24 12s0-4-.5-5.8ZM9.6 15.6V8.4l6.4 3.6-6.4 3.6Z" />
            </svg>
            Watch on YouTube
          </a>
        </div>
      )}

      {lastSession && <LastSessionPanel lastSession={lastSession} />}

      {completedSets.length > 0 && (
        <ul className="space-y-1.5">
          {log?.sets.map((s, i) => (
            <SetRow
              key={i}
              setNum={i + 1}
              entry={s}
              onDelete={() => deleteSet(date, exercise.name, i)}
            />
          ))}
        </ul>
      )}

      {showDraftRow ? (
        <DraftSetRow
          setNum={(log?.sets.length ?? 0) + 1}
          draft={draft}
          onChange={setDraft}
          onCommit={commitDraft}
        />
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-3 py-2.5">
          <span className="text-xs font-semibold text-emerald-200 inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            All {exercise.targetSets} sets done
          </span>
          <button
            onClick={() => setExtraSetUnlocked(true)}
            className="text-xs font-medium text-white/75 hover:text-white px-2 py-1 rounded-md bg-white/8 hover:bg-white/14"
          >
            + Add set
          </button>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        {exercise.isBarbell ? (
          <button
            onClick={() => setPlateOpen(true)}
            className="text-xs text-white/65 hover:text-white inline-flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9v6" />
              <path d="M3 12h18" />
              <path d="M18 9v6" />
              <path d="M2 10v4" />
              <path d="M22 10v4" />
            </svg>
            Plate calc
          </button>
        ) : (
          <span />
        )}
      </div>

      <ExerciseNotes
        date={date}
        dayIndex={dayIndex}
        exerciseName={exercise.name}
        notes={log?.notes ?? ''}
      />

      <PlateCalcModal
        open={plateOpen}
        onClose={() => setPlateOpen(false)}
        initialWeight={
          completedSets[completedSets.length - 1]?.w ??
          lastSession?.sets[0].w ??
          60
        }
      />
    </Card>
  )
}

function SetRow({
  setNum,
  entry,
  onDelete,
}: {
  setNum: number
  entry: SetEntry
  onDelete: () => void
}) {
  return (
    <li className="flex items-center gap-2 py-0.5">
      <span className="w-6 font-mono text-sm text-white/45">#{setNum}</span>
      <span className="flex-1 font-mono text-lg tabular-nums">
        <span className="text-white font-semibold">{entry.w ?? '—'}</span>
        <span className="text-white/45 text-sm"> kg × </span>
        <span className="text-white font-semibold">{entry.r ?? '—'}</span>
        <span className="text-white/45 text-sm"> @ RIR </span>
        <span className="text-white font-semibold">{entry.rir ?? '—'}</span>
      </span>
      <button
        onClick={onDelete}
        className="text-white/35 hover:text-red-300 tap-target -mr-2"
        aria-label="Delete set"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </li>
  )
}

function DraftSetRow({
  setNum,
  draft,
  onChange,
  onCommit,
}: {
  setNum: number
  draft: SetEntry
  onChange: (s: SetEntry) => void
  onCommit: () => void
}) {
  const filled = draft.w != null && draft.r != null
  return (
    <div className="grid grid-cols-[28px_1fr_1fr_64px_52px] gap-2 items-center">
      <span className="font-mono text-xs text-white/45">#{setNum}</span>
      <NumInput
        placeholder="kg"
        value={draft.w}
        onChange={(v) => onChange({ ...draft, w: v })}
      />
      <NumInput
        placeholder="reps"
        value={draft.r}
        onChange={(v) => onChange({ ...draft, r: v })}
      />
      <NumInput
        placeholder="RIR"
        value={draft.rir}
        onChange={(v) => onChange({ ...draft, rir: v })}
      />
      <button
        onClick={onCommit}
        disabled={!filled}
        className={cn(
          'h-[52px] rounded-md font-semibold transition-all',
          filled
            ? 'rainbow-bright-fill text-white shadow-[0_4px_18px_rgba(236,72,153,0.4)]'
            : 'bg-white/8 text-white/35'
        )}
        aria-label="Log set"
      >
        ✓
      </button>
    </div>
  )
}

function NumInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = Number(raw)
        onChange(Number.isFinite(n) ? n : null)
      }}
      className={cn('set-input w-full', value != null && 'filled')}
    />
  )
}

function LastSessionPanel({ lastSession }: { lastSession: import('@/lib/last-session').LastSession }) {
  const [open, setOpen] = useState(false)
  const first = lastSession.sets[0]
  const totalSets = lastSession.sets.length
  return (
    <div className="text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-white/55 hover:text-white/85 inline-flex items-center gap-1"
        aria-expanded={open}
      >
        <span>
          Last:{' '}
          <span className="text-white/85">
            {first.w} kg × {first.r} @ {first.rir}
          </span>
          {totalSets > 1 && (
            <span className="text-white/40"> · {totalSets} sets</span>
          )}{' '}
          · {relativeLabel(lastSession.date)}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn('transition-transform', open && 'rotate-180')}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && totalSets > 1 && (
        <ul className="mt-1.5 space-y-0.5 rounded-md bg-white/4 p-2">
          {lastSession.sets.map((s, i) => (
            <li key={i} className="font-mono text-white/70 flex gap-2">
              <span className="text-white/40 w-5">#{i + 1}</span>
              <span>
                {s.w} kg × {s.r}{' '}
                <span className="text-white/40">@ RIR {s.rir}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ExerciseNotes({
  date,
  dayIndex,
  exerciseName,
  notes,
}: {
  date: string
  dayIndex: number
  exerciseName: string
  notes: string
}) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-white/45 select-none">
        Notes {notes ? '•' : ''}
      </summary>
      <textarea
        // Remount when external notes change so the uncontrolled value stays in sync
        key={notes}
        defaultValue={notes}
        onBlur={(e) => {
          const next = e.target.value
          if (next !== notes) setExerciseNotes(date, dayIndex, exerciseName, next)
        }}
        rows={2}
        placeholder="How did it feel?"
        className="mt-2 w-full rounded-md bg-white/6 border border-white/10 p-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
      />
    </details>
  )
}

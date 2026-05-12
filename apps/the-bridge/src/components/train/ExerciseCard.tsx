'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  updateSet,
} from '@/db/operations'
import { findLastSession } from '@/lib/last-session'
import { relativeLabel } from '@/lib/date-utils'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/cn'
import { PlateCalcModal } from './PlateCalcModal'
import { PRBurst } from './PRBurst'
import { NumberPad } from './NumberPad'
import type { PersonalRecord } from '@/types'

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
  /** reorder controls; only present for scheduled exercises */
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMove?: (dir: 'up' | 'down') => void
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
  canMoveUp,
  canMoveDown,
  onMove,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false)
  const [plateOpen, setPlateOpen] = useState(false)
  const [draft, setDraft] = useState<SetEntry>({ w: null, r: null, rir: null })
  // Pre-fill weight: prefer last set from today, else first set from last session.
  // Run once per (exercise, day) — don't clobber the user mid-edit.
  const [prefillKey, setPrefillKey] = useState<string | null>(null)
  const [prBurst, setPrBurst] = useState<PersonalRecord | null>(null)
  const { toast } = useToast()
  const startRestTimer = useUIStore((s) => s.startRestTimer)
  const pr = usePR(exercise.name)

  const lastSession = useMemo(
    () => findLastSession(exercise.name, date, allWorkoutLogs),
    [exercise.name, date, allWorkoutLogs]
  )

  const completedSets = log?.sets.filter((s) => s.r != null) ?? []
  const targetReached = completedSets.length >= exercise.targetSets

  // Auto-pre-fill the weight field on a clean draft once per (date, exercise).
  // Last set today wins, else the prior session's first set.
  const key = `${date}:${exercise.name}`
  useEffect(() => {
    if (prefillKey === key) return
    if (draft.w != null || draft.r != null || draft.rir != null) return
    const lastToday = completedSets[completedSets.length - 1]
    const seed = lastToday?.w ?? lastSession?.sets[0]?.w
    if (seed != null) {
      setDraft({ w: seed, r: null, rir: null })
    }
    setPrefillKey(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
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
      setPrBurst(result.pr)
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
          {(exercise.primaryMuscles?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {exercise.primaryMuscles?.map((m) => (
                <span
                  key={m}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-pill bg-pink-500/20 text-pink-100 border border-pink-500/40"
                >
                  {m}
                </span>
              ))}
              {exercise.secondaryMuscles?.map((m) => (
                <span
                  key={m}
                  className="text-[11px] px-2 py-0.5 rounded-pill bg-white/8 text-white/65 border border-white/12"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 -mr-2">
          {onMove && (canMoveUp || canMoveDown) && (
            <div className="flex flex-col items-center">
              <button
                onClick={() => onMove('up')}
                disabled={!canMoveUp}
                className="text-white/45 hover:text-white disabled:opacity-25 disabled:pointer-events-none px-1"
                aria-label="Move up"
                title="Move up"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                onClick={() => onMove('down')}
                disabled={!canMoveDown}
                className="text-white/45 hover:text-white disabled:opacity-25 disabled:pointer-events-none px-1"
                aria-label="Move down"
                title="Move down"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          )}
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
        <ul className="space-y-1">
          {log?.sets.map((s, i) => {
            const prev = i > 0 ? log.sets[i - 1] : null
            const restSec =
              prev?.loggedAt && s.loggedAt
                ? Math.max(
                    0,
                    Math.round(
                      (new Date(s.loggedAt).getTime() -
                        new Date(prev.loggedAt).getTime()) /
                        1000
                    )
                  )
                : null
            return (
              <div key={i}>
                {restSec != null && restSec > 0 && restSec < 3600 && (
                  <p className="text-[10px] text-white/40 font-mono pl-7 leading-tight py-0.5">
                    ↻ {fmtRest(restSec)}
                  </p>
                )}
                <SetRow
                  setNum={i + 1}
                  entry={s}
                  lastSessionSet={lastSession?.sets[i]}
                  onDelete={() => deleteSet(date, exercise.name, i)}
                  onUpdate={(patch) => updateSet(date, exercise.name, i, patch)}
                />
              </div>
            )
          })}
        </ul>
      )}

      {showDraftRow && (
        <ProgressionHint
          targetReps={exercise.targetReps}
          lastSets={completedSets.length > 0 ? completedSets : lastSession?.sets}
        />
      )}
      {showDraftRow ? (
        <DraftSetRow
          setNum={(log?.sets.length ?? 0) + 1}
          draft={draft}
          onChange={setDraft}
          onCommit={commitDraft}
          prevSet={
            completedSets[completedSets.length - 1] ?? lastSession?.sets[0]
          }
          prThreshold={
            pr ? { weight: pr.weight, reps: pr.reps } : null
          }
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

      <PRBurst pr={prBurst} onDone={() => setPrBurst(null)} />
    </Card>
  )
}

function SetRow({
  setNum,
  entry,
  lastSessionSet,
  onDelete,
  onUpdate,
}: {
  setNum: number
  entry: SetEntry
  lastSessionSet?: SetEntry
  onDelete: () => void
  onUpdate?: (patch: Partial<SetEntry>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SetEntry>(entry)

  // Compute deltas vs last session's matching set number.
  const wDelta =
    entry.w != null && lastSessionSet?.w != null
      ? entry.w - lastSessionSet.w
      : null
  const rDelta =
    entry.r != null && lastSessionSet?.r != null
      ? entry.r - lastSessionSet.r
      : null
  const hasDelta =
    (wDelta != null && wDelta !== 0) || (rDelta != null && rDelta !== 0)

  if (editing) {
    return (
      <li className="rounded-md bg-white/6 border border-white/12 p-2 space-y-2">
        <div className="grid grid-cols-[28px_1fr_1fr_64px_52px] gap-2 items-center">
          <span className="font-mono text-xs text-white/45">#{setNum}</span>
          <NumInput
            placeholder="kg"
            value={draft.w}
            onChange={(v) => setDraft({ ...draft, w: v })}
          />
          <NumInput
            placeholder="reps"
            value={draft.r}
            onChange={(v) => setDraft({ ...draft, r: v })}
          />
          <NumInput
            placeholder="RIR"
            value={draft.rir}
            onChange={(v) => setDraft({ ...draft, rir: v })}
          />
          <button
            onClick={() => {
              onUpdate?.({
                w: draft.w,
                r: draft.r,
                rir: draft.rir,
                warmup: draft.warmup,
              })
              setEditing(false)
            }}
            className="h-[52px] rounded-md font-semibold rainbow-bright-fill text-white"
            aria-label="Save edit"
          >
            ✓
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDraft({ ...draft, warmup: !draft.warmup })}
            className={cn(
              'text-[11px] font-medium px-2 py-1 rounded-md transition-all',
              draft.warmup
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                : 'bg-white/6 text-white/55 border border-white/10'
            )}
          >
            {draft.warmup ? '✓ Warmup' : 'Warmup'}
          </button>
          <button
            onClick={() => {
              setDraft(entry)
              setEditing(false)
            }}
            className="text-[11px] text-white/55 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className={cn('flex items-center gap-2 py-0.5', entry.warmup && 'opacity-60')}>
      <span className="w-6 font-mono text-sm text-white/45 flex items-center gap-0.5">
        {entry.warmup ? (
          <span
            className="text-[9px] font-bold px-1 py-0.5 rounded-sm bg-amber-500/25 text-amber-200 border border-amber-500/40"
            title="Warmup set — excluded from PRs and totals"
          >
            W
          </span>
        ) : (
          <>#{setNum}</>
        )}
      </span>
      <button
        onClick={() => {
          if (!onUpdate) return
          setDraft(entry)
          setEditing(true)
        }}
        disabled={!onUpdate}
        className="flex-1 font-mono text-lg tabular-nums text-left hover:bg-white/4 rounded-md -mx-1 px-1 transition-colors"
        title="Tap to edit"
      >
        <span className="text-white font-semibold">{entry.w ?? '—'}</span>
        <span className="text-white/45 text-sm"> kg × </span>
        <span className="text-white font-semibold">{entry.r ?? '—'}</span>
        <span className="text-white/45 text-sm"> @ RIR </span>
        <span className="text-white font-semibold">{entry.rir ?? '—'}</span>
      </button>
      {hasDelta && (
        <span className="text-[10px] font-mono tabular-nums shrink-0 flex flex-col items-end leading-none">
          {wDelta != null && wDelta !== 0 && (
            <span className={wDelta > 0 ? 'text-emerald-300' : 'text-amber-300'}>
              {wDelta > 0 ? '+' : ''}
              {wDelta}kg
            </span>
          )}
          {rDelta != null && rDelta !== 0 && (
            <span className={rDelta > 0 ? 'text-emerald-300' : 'text-amber-300'}>
              {rDelta > 0 ? '+' : ''}
              {rDelta}r
            </span>
          )}
        </span>
      )}
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
  prevSet,
  prThreshold,
}: {
  setNum: number
  draft: SetEntry
  onChange: (s: SetEntry) => void
  onCommit: () => void
  /** previous set (this exercise) for "Repeat last" pre-fill */
  prevSet?: SetEntry
  /** the next-PR weight×reps tonnage to beat; used for "X kg from PR" hint */
  prThreshold?: { weight: number; reps: number } | null
}) {
  const filled = draft.w != null && draft.r != null
  const weightRef = useRef<HTMLInputElement>(null)
  const repsRef = useRef<HTMLInputElement>(null)
  const rirRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState<'w' | 'r' | 'rir' | null>(null)
  // Auto-dismiss pad when the draft empties (typically after a successful commit).
  useEffect(() => {
    if (draft.w == null && draft.r == null && draft.rir == null) {
      setFocused(null)
    }
  }, [draft.w, draft.r, draft.rir])

  // PR proximity: if current draft tonnage is within striking distance of
  // the existing PR (same reps) — flag it so the user knows they're close.
  const prHint = (() => {
    if (!prThreshold || draft.w == null || draft.r == null) return null
    if (draft.r < prThreshold.reps) return null
    const gap = prThreshold.weight - draft.w
    if (gap > 0 && gap <= 5) return `${gap}kg from PR`
    if (gap <= 0 && draft.r >= prThreshold.reps) return 'PR territory'
    return null
  })()

  function repeatLastSet() {
    if (!prevSet) return
    onChange({ w: prevSet.w, r: prevSet.r, rir: prevSet.rir })
  }

  function bumpWeight(delta: number) {
    const next = (draft.w ?? prevSet?.w ?? 0) + delta
    onChange({ ...draft, w: Math.max(0, Math.round(next * 10) / 10) })
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[28px_1fr_1fr_64px_52px] gap-2 items-center">
        <span className="font-mono text-xs text-white/45">#{setNum}</span>
        <NumInput
          inputRef={weightRef}
          placeholder="kg"
          value={draft.w}
          isFocused={focused === 'w'}
          onFocusField={() => setFocused('w')}
          onChange={(v) => onChange({ ...draft, w: v })}
        />
        <NumInput
          inputRef={repsRef}
          placeholder="reps"
          value={draft.r}
          isFocused={focused === 'r'}
          onFocusField={() => setFocused('r')}
          onChange={(v) => onChange({ ...draft, r: v })}
        />
        <NumInput
          inputRef={rirRef}
          placeholder="RIR"
          value={draft.rir}
          isFocused={focused === 'rir'}
          onFocusField={() => setFocused('rir')}
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
      {/* Weight steppers + repeat-last + PR hint */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => bumpWeight(-2.5)}
          className="text-xs font-mono font-semibold text-white/75 hover:text-white px-2.5 py-1 rounded-md bg-white/8 hover:bg-white/14"
          aria-label="Decrease weight by 2.5kg"
        >
          −2.5
        </button>
        <button
          onClick={() => bumpWeight(2.5)}
          className="text-xs font-mono font-semibold text-white/75 hover:text-white px-2.5 py-1 rounded-md bg-white/8 hover:bg-white/14"
          aria-label="Increase weight by 2.5kg"
        >
          +2.5
        </button>
        <button
          onClick={() => bumpWeight(-5)}
          className="text-xs font-mono font-semibold text-white/75 hover:text-white px-2.5 py-1 rounded-md bg-white/8 hover:bg-white/14"
          aria-label="Decrease weight by 5kg"
        >
          −5
        </button>
        <button
          onClick={() => bumpWeight(5)}
          className="text-xs font-mono font-semibold text-white/75 hover:text-white px-2.5 py-1 rounded-md bg-white/8 hover:bg-white/14"
          aria-label="Increase weight by 5kg"
        >
          +5
        </button>
        <button
          onClick={() => onChange({ ...draft, warmup: !draft.warmup })}
          className={cn(
            'text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ml-auto',
            draft.warmup
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
              : 'bg-white/8 text-white/65 border border-white/12'
          )}
          title="Mark this set as warmup — won't count toward PRs or totals"
        >
          {draft.warmup ? '✓ Warmup' : 'Warmup'}
        </button>
        {prevSet && prevSet.w != null && (
          <button
            onClick={repeatLastSet}
            className="text-[11px] font-medium text-cyan-200 hover:text-cyan-100 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30"
            title="Pre-fill same weight/reps/RIR as last set"
          >
            ↻ Same as last
          </button>
        )}
      </div>
      {prHint && (
        <p
          className={cn(
            'text-[11px] font-semibold text-center',
            prHint === 'PR territory'
              ? 'rainbow-text animate-pulse'
              : 'text-pink-300'
          )}
        >
          {prHint === 'PR territory' ? '🔥 PR territory — send it' : `${prHint}`}
        </p>
      )}

      {focused && (
        <NumberPad
          fieldLabel={focused === 'w' ? 'WEIGHT (kg)' : focused === 'r' ? 'REPS' : 'RIR'}
          value={
            focused === 'w' ? draft.w : focused === 'r' ? draft.r : draft.rir
          }
          decimal={focused === 'w'}
          mode={focused === 'rir' ? 'done' : 'next'}
          onChange={(v) => {
            if (focused === 'w') onChange({ ...draft, w: v })
            else if (focused === 'r') onChange({ ...draft, r: v })
            else onChange({ ...draft, rir: v })
          }}
          onNext={() => {
            if (focused === 'w') {
              setFocused('r')
              repsRef.current?.focus()
            } else if (focused === 'r') {
              setFocused('rir')
              rirRef.current?.focus()
            }
          }}
          onDone={() => {
            setFocused(null)
            if (filled) onCommit()
          }}
          onClose={() => setFocused(null)}
        />
      )}
    </div>
  )
}

function NumInput({
  placeholder,
  value,
  onChange,
  inputRef,
  isFocused,
  onFocusField,
}: {
  placeholder: string
  value: number | null
  onChange: (v: number | null) => void
  inputRef?: React.Ref<HTMLInputElement>
  /** parent-tracked focus — drives the visible ring and pad target */
  isFocused?: boolean
  /** when provided, this input opens the in-app NumberPad instead of the
   *  native keyboard. When omitted, behaves as a normal native number input. */
  onFocusField?: () => void
}) {
  const usePad = onFocusField !== undefined
  return (
    <input
      ref={inputRef}
      type={usePad ? 'text' : 'number'}
      inputMode={usePad ? 'none' : 'decimal'}
      readOnly={usePad}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => {
        if (usePad) return // value flows from the pad
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = Number(raw)
        onChange(Number.isFinite(n) ? n : null)
      }}
      onFocus={() => onFocusField?.()}
      onClick={() => onFocusField?.()}
      className={cn(
        'set-input w-full',
        value != null && 'filled',
        usePad && 'caret-transparent cursor-pointer',
        isFocused && 'ring-2 ring-pink-400/60'
      )}
      style={{ color: 'white' }}
    />
  )
}

function ProgressionHint({
  targetReps,
  lastSets,
}: {
  targetReps: string
  lastSets?: SetEntry[]
}) {
  if (!lastSets || lastSets.length === 0) return null
  const last = lastSets[lastSets.length - 1]
  if (last.w == null || last.r == null) return null

  // Parse target rep range — e.g. "8-10" → max 10
  const match = targetReps.match(/(\d+)\s*-\s*(\d+)/)
  if (!match) return null
  const topReps = parseInt(match[2], 10)

  // Hit top of range with RIR ≥ 2 → time to add weight
  const atTop = last.r >= topReps
  const fresh = last.rir != null && last.rir >= 2

  if (atTop && fresh) {
    const bump = last.w >= 50 ? 2.5 : 1.25
    return (
      <div className="text-[11px] rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 text-emerald-200">
        <span className="font-semibold">Bump up:</span> last was {last.w}×{last.r} @ RIR{' '}
        {last.rir} — try{' '}
        <span className="font-mono">{last.w + bump} kg</span> this set.
      </div>
    )
  }

  return null
}

function fmtRest(sec: number): string {
  if (sec < 60) return `${sec}s rest`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s === 0 ? `${m}m rest` : `${m}m ${s}s rest`
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
        className="mt-2 w-full rounded-md bg-white/10 border border-white/15 p-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 caret-white"
        style={{ color: 'white' }}
      />
    </details>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getExerciseDef } from '@/data/exercises'
import { useAllWorkoutLogs, useSettings, useWorkoutLog } from '@/db/hooks'
import {
  pairSuperset,
  removeExerciseFromLog,
  setWorkoutCompleted,
  undoSwap,
  unpairSuperset,
} from '@/db/operations'
import { Modal } from '@/components/ui/Modal'
import { useUIStore } from '@/store/ui'
import { todayISO } from '@/lib/date-utils'
import {
  getDayNumber,
  getProgramDay,
  getWeekNumber,
  daysUntilStart,
} from '@/lib/program-day'
import { calculateStreak } from '@/lib/streak'
import { AddExerciseModal } from './AddExerciseModal'
import { DayPills } from './DayPills'
import { ExerciseCard } from './ExerciseCard'
import { RestTimerOverlay } from './RestTimerOverlay'

export function TrainView() {
  const settings = useSettings()
  const selectedDate = useUIStore((s) => s.selectedDate)
  const setSelectedDate = useUIStore((s) => s.setSelectedDate)
  const log = useWorkoutLog(selectedDate)
  const allLogs = useAllWorkoutLogs()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [swapTarget, setSwapTarget] = useState<string | null>(null)
  const [pairSource, setPairSource] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDate) setSelectedDate(todayISO())
  }, [selectedDate, setSelectedDate])

  const day = useMemo(
    () => getProgramDay(settings.startDate, selectedDate),
    [settings.startDate, selectedDate]
  )
  const dayNum = getDayNumber(settings.startDate, selectedDate)
  const weekNum = getWeekNumber(settings.startDate, selectedDate)
  const daysUntil = daysUntilStart(settings.startDate, selectedDate)

  const streak = useMemo(
    () => calculateStreak(allLogs, todayISO()),
    [allLogs]
  )

  // Resolve scheduled exercises with per-date swap overrides.
  const scheduledExercises = useMemo(() => {
    const swaps = log?.swaps ?? []
    return day.exercises.map((e) => {
      const swap = swaps.find((s) => s.original === e.name)
      if (!swap) return { def: e, swappedFrom: null as string | null }
      return { def: getExerciseDef(swap.replacement), swappedFrom: e.name }
    })
  }, [day.exercises, log?.swaps])

  const scheduledNames = useMemo(
    () => new Set(scheduledExercises.map((e) => e.def.name)),
    [scheduledExercises]
  )
  const extras = useMemo(
    () => (log?.exercises ?? []).filter((e) => !scheduledNames.has(e.name)),
    [log, scheduledNames]
  )

  const allInSession = useMemo(() => {
    const set = new Set<string>(scheduledNames)
    extras.forEach((e) => set.add(e.name))
    return set
  }, [scheduledNames, extras])

  const stats = useMemo(
    () => computeStats(log, scheduledExercises.map((e) => e.def)),
    [log, scheduledExercises]
  )
  const isCompleted = !!log?.completedAt

  return (
    <div className="space-y-4 pt-1">
      <DayPills
        startDate={settings.startDate}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      {streak.current >= 2 && (
        <Card className="!p-3 flex items-center gap-3">
          <span className="rainbow-bright-fill w-9 h-9 rounded-full flex items-center justify-center text-lg">
            🔥
          </span>
          <div>
            <p className="text-sm font-semibold">{streak.current}-day streak</p>
            <p className="text-[11px] text-white/55">Best: {streak.best}</p>
          </div>
        </Card>
      )}

      {daysUntil > 0 && (
        <Card>
          <p className="text-xs text-white/55 uppercase tracking-wider mb-1">
            Pre-program preview
          </p>
          <p className="text-sm">
            Program starts in {daysUntil}{' '}
            {daysUntil === 1 ? 'day' : 'days'}. Tap today's pill to log Day 1.
          </p>
        </Card>
      )}

      {dayNum === 1 && (log?.exercises.length ?? 0) === 0 && (
        <Card bright>
          <p className="font-display text-base font-semibold">
            Day 1. Let's <span className="rainbow-text">go</span>.
          </p>
          <p className="text-sm text-white/70 mt-1">
            Quad-focused legs to kick off the bridge. Aim for the lower end of
            the rep range — you'll ramp volume across the 4 weeks.
          </p>
        </Card>
      )}

      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight flex items-center gap-2">
          Today's <span className="rainbow-text">session</span>
          {isCompleted && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
              Done
            </span>
          )}
        </h2>
        {dayNum > 0 && (
          <span className="text-xs text-white/55 font-mono">
            W{weekNum} · D{dayNum} · {day.name}
          </span>
        )}
      </div>

      {(day.exercises.length > 0 || extras.length > 0) && stats.sets > 0 && (
        <Card className="!p-3 space-y-2">
          <div className="grid grid-cols-3 text-center">
            <Stat label="Sets" value={stats.sets} />
            <Stat label="Reps" value={stats.reps} />
            <Stat label="Volume kg" value={stats.volume} />
          </div>
          {stats.muscles.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-white/8">
              {stats.muscles.map((m) => (
                <span
                  key={m.category}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-pill bg-white/8 text-white/75"
                >
                  {m.category}{' '}
                  <span className="text-white/45">×{m.sets}</span>
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Scheduled exercises (with per-date swaps applied) */}
      {!day.isRest && scheduledExercises.length > 0 && (
        <div className="space-y-3">
          {scheduledExercises.map(({ def, swappedFrom }) => {
            const exLog = log?.exercises.find((x) => x.name === def.name)
            const partnerLog = exLog?.pairedWith
              ? log?.exercises.find((x) => x.name === exLog.pairedWith)
              : undefined
            return (
              <ExerciseCard
                key={swappedFrom ?? def.name}
                exercise={def}
                date={selectedDate}
                dayIndex={day.index}
                log={exLog}
                partnerLog={partnerLog}
                allWorkoutLogs={allLogs}
                swappedFrom={swappedFrom}
                onSwap={() => setSwapTarget(swappedFrom ?? def.name)}
                onUndoSwap={
                  swappedFrom
                    ? async () => {
                        await undoSwap(selectedDate, swappedFrom)
                        toast(`Restored ${swappedFrom}`)
                      }
                    : undefined
                }
                onPair={() => setPairSource(def.name)}
                onUnpair={async () => {
                  await unpairSuperset(selectedDate, def.name)
                  toast('Superset broken')
                }}
              />
            )
          })}
        </div>
      )}

      {/* Rest day — only show if no extras logged */}
      {day.isRest && extras.length === 0 && (
        <Card>
          <p className="font-display text-lg font-semibold">{day.name}</p>
          <p className="text-sm text-white/65 mt-1">{day.focus}</p>
          {day.name === 'Hike' && (
            <p className="text-xs text-white/45 mt-2">
              Active recovery — go outside.
            </p>
          )}
        </Card>
      )}

      {/* Extras section */}
      {extras.length > 0 && (
        <div className="space-y-3">
          {!day.isRest && (
            <h3 className="text-xs uppercase tracking-wider text-white/55 px-1 pt-2">
              Extras
            </h3>
          )}
          {extras.map((e) => {
            const def = getExerciseDef(e.name)
            const partnerLog = e.pairedWith
              ? log?.exercises.find((x) => x.name === e.pairedWith)
              : undefined
            return (
              <ExerciseCard
                key={e.name}
                exercise={def}
                date={selectedDate}
                dayIndex={day.index}
                log={e}
                partnerLog={partnerLog}
                allWorkoutLogs={allLogs}
                onRemove={async () => {
                  await removeExerciseFromLog(selectedDate, e.name)
                  toast(`Removed ${e.name}`)
                }}
                onPair={() => setPairSource(e.name)}
                onUnpair={async () => {
                  await unpairSuperset(selectedDate, e.name)
                  toast('Superset broken')
                }}
              />
            )
          })}
        </div>
      )}

      {/* Add exercise — always available */}
      <button
        onClick={() => setAddOpen(true)}
        className="w-full glass-card p-4 flex items-center justify-center gap-2 text-sm font-medium text-white/85 hover:text-white"
      >
        <span className="rainbow-bright-fill text-white w-7 h-7 rounded-full flex items-center justify-center font-bold">
          +
        </span>
        Add exercise
      </button>

      {/* Complete workout */}
      {(scheduledExercises.length > 0 || extras.length > 0) && stats.sets > 0 && (
        <Button
          onClick={async () => {
            await setWorkoutCompleted(selectedDate, day.index, !isCompleted)
            toast(isCompleted ? 'Workout reopened' : 'Workout complete 💪')
          }}
          variant={isCompleted ? 'ghost' : 'primary'}
          className="w-full"
        >
          {isCompleted ? 'Reopen workout' : 'Complete workout'}
        </Button>
      )}

      <AddExerciseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        date={selectedDate}
        dayIndex={day.index}
        excludedNames={allInSession}
      />

      <AddExerciseModal
        open={swapTarget !== null}
        onClose={() => setSwapTarget(null)}
        date={selectedDate}
        dayIndex={day.index}
        excludedNames={allInSession}
        mode="swap"
        swapOriginal={swapTarget ?? undefined}
        onSwapDone={(replacement) => {
          setSwapTarget(null)
          toast(`Swapped → ${replacement}`)
        }}
      />

      <PairPickerModal
        open={pairSource !== null}
        onClose={() => setPairSource(null)}
        source={pairSource}
        options={Array.from(allInSession).filter((n) => n !== pairSource)}
        onPick={async (partner) => {
          if (!pairSource) return
          await pairSuperset(selectedDate, day.index, pairSource, partner)
          setPairSource(null)
          toast(`Superset: ${pairSource} + ${partner}`)
        }}
      />

      <RestTimerOverlay />
    </div>
  )
}

function PairPickerModal({
  open,
  onClose,
  source,
  options,
  onPick,
}: {
  open: boolean
  onClose: () => void
  source: string | null
  options: string[]
  onPick: (partner: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={source ? `Pair ${source} with…` : 'Pair'}>
      <p className="text-xs text-white/55 mb-2">
        Pick a partner. Sets alternate between the two; rest only starts after
        both partners have logged the round.
      </p>
      {options.length === 0 ? (
        <p className="text-sm text-white/55 py-4 text-center">
          No other exercises in today's session yet.
        </p>
      ) : (
        <ul className="divide-y divide-white/6 -mx-1">
          {options.map((name) => (
            <li key={name}>
              <button
                onClick={() => onPick(name)}
                className="w-full flex items-center justify-between gap-3 py-3 px-1 text-left"
              >
                <span className="text-sm font-medium">{name}</span>
                <span className="rainbow-bright-fill text-white text-xs font-semibold px-2.5 py-1 rounded-pill">
                  Pair
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-3xl font-bold tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-white/50 mt-1.5">
        {label}
      </p>
    </div>
  )
}

function computeStats(
  log:
    | {
        exercises: {
          name: string
          sets: { w: number | null; r: number | null }[]
        }[]
      }
    | null,
  _scheduled: { name: string; category: string }[]
) {
  let sets = 0,
    reps = 0,
    volume = 0
  const muscleSets = new Map<string, number>()
  if (!log) return { sets, reps, volume, muscles: [] as { category: string; sets: number }[] }
  for (const ex of log.exercises) {
    let exerciseSets = 0
    for (const s of ex.sets) {
      if (s.r != null && s.r > 0) {
        sets++
        exerciseSets++
        reps += s.r
        if (s.w != null) volume += s.w * s.r
      }
    }
    if (exerciseSets > 0) {
      const cat = getExerciseDef(ex.name).category
      muscleSets.set(cat, (muscleSets.get(cat) ?? 0) + exerciseSets)
    }
  }
  const muscles = Array.from(muscleSets.entries())
    .map(([category, sets]) => ({ category, sets }))
    .sort((a, b) => b.sets - a.sets)
  return { sets, reps, volume: Math.round(volume), muscles }
}

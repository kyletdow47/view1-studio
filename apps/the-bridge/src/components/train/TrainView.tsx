'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { getExerciseDef } from '@/data/exercises'
import { useAllWorkoutLogs, useSettings, useWorkoutLog } from '@/db/hooks'
import { removeExerciseFromLog } from '@/db/operations'
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

  // Extras = anything in the log that isn't part of the scheduled day
  const scheduledNames = useMemo(
    () => new Set(day.exercises.map((e) => e.name)),
    [day.exercises]
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

  const stats = useMemo(() => computeStats(log), [log])

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

      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Today's <span className="rainbow-text">session</span>
        </h2>
        {dayNum > 0 && (
          <span className="text-xs text-white/55 font-mono">
            W{weekNum} · D{dayNum} · {day.name}
          </span>
        )}
      </div>

      {(day.exercises.length > 0 || extras.length > 0) && stats.sets > 0 && (
        <Card className="!p-3">
          <div className="grid grid-cols-3 text-center">
            <Stat label="Sets" value={stats.sets} />
            <Stat label="Reps" value={stats.reps} />
            <Stat label="Volume kg" value={stats.volume} />
          </div>
        </Card>
      )}

      {/* Scheduled exercises */}
      {!day.isRest && day.exercises.length > 0 && (
        <div className="space-y-3">
          {day.exercises.map((e) => (
            <ExerciseCard
              key={e.name}
              exercise={e}
              date={selectedDate}
              dayIndex={day.index}
              log={log?.exercises.find((x) => x.name === e.name)}
              allWorkoutLogs={allLogs}
            />
          ))}
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
            return (
              <ExerciseCard
                key={e.name}
                exercise={def}
                date={selectedDate}
                dayIndex={day.index}
                log={e}
                allWorkoutLogs={allLogs}
                onRemove={async () => {
                  await removeExerciseFromLog(selectedDate, e.name)
                  toast(`Removed ${e.name}`)
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

      <AddExerciseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        date={selectedDate}
        dayIndex={day.index}
        excludedNames={allInSession}
      />

      <RestTimerOverlay />
    </div>
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
    | { exercises: { sets: { w: number | null; r: number | null }[] }[] }
    | null
) {
  let sets = 0,
    reps = 0,
    volume = 0
  if (!log) return { sets, reps, volume }
  for (const ex of log.exercises) {
    for (const s of ex.sets) {
      if (s.r != null && s.r > 0) {
        sets++
        reps += s.r
        if (s.w != null) volume += s.w * s.r
      }
    }
  }
  return { sets, reps, volume: Math.round(volume) }
}

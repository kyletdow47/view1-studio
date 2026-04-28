'use client'

import { useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { useAllWorkoutLogs, useSettings, useWorkoutLog } from '@/db/hooks'
import { useUIStore } from '@/store/ui'
import { todayISO } from '@/lib/date-utils'
import { getDayNumber, getProgramDay, getWeekNumber, daysUntilStart } from '@/lib/program-day'
import { calculateStreak } from '@/lib/streak'
import { DayPills } from './DayPills'
import { ExerciseCard } from './ExerciseCard'
import { RestTimerOverlay } from './RestTimerOverlay'

export function TrainView() {
  const settings = useSettings()
  const selectedDate = useUIStore((s) => s.selectedDate)
  const setSelectedDate = useUIStore((s) => s.setSelectedDate)
  const log = useWorkoutLog(selectedDate)
  const allLogs = useAllWorkoutLogs()

  // Reset to today if selected date drifts (e.g. day changed since open)
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
    () => calculateStreak(allLogs ?? [], todayISO()),
    [allLogs]
  )

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
          <span className="rainbow-bright-fill w-9 h-9 rounded-full flex items-center justify-center text-lg">🔥</span>
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

      {!day.isRest && day.exercises.length > 0 && stats.sets > 0 && (
        <Card className="!p-3">
          <div className="grid grid-cols-3 text-center">
            <Stat label="Sets" value={stats.sets} />
            <Stat label="Reps" value={stats.reps} />
            <Stat label="Volume kg" value={stats.volume} />
          </div>
        </Card>
      )}

      {day.isRest ? (
        <Card>
          <p className="font-display text-lg font-semibold">{day.name}</p>
          <p className="text-sm text-white/65 mt-1">{day.focus}</p>
          {day.name === 'Hike' && (
            <p className="text-xs text-white/45 mt-2">
              Active recovery — go outside.
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {day.exercises.map((e) => (
            <ExerciseCard
              key={e.name}
              exercise={e}
              date={selectedDate}
              dayIndex={day.index}
              log={log?.exercises.find((x) => x.name === e.name)}
              allWorkoutLogs={allLogs ?? []}
            />
          ))}
        </div>
      )}

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

function computeStats(log: { exercises: { sets: { w: number | null; r: number | null }[] }[] } | null) {
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

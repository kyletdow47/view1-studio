'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { EXERCISES, getExerciseDef } from '@/data/exercises'
import { useAllWorkoutLogs } from '@/db/hooks'
import { aggregateExercise } from '@/lib/analytics'
import { MUSCLES, type Muscle, type ExerciseDef } from '@/types'
import { cn } from '@/lib/cn'

export function LibraryView() {
  const [selected, setSelected] = useState<Muscle | null>(null)
  const [exercise, setExercise] = useState<ExerciseDef | null>(null)
  const allLogs = useAllWorkoutLogs()

  // Group exercises by primary muscle.
  const byMuscle = useMemo(() => {
    const map = new Map<Muscle, ExerciseDef[]>()
    for (const ex of Object.values(EXERCISES)) {
      const def = getExerciseDef(ex.name)
      for (const m of def.primaryMuscles ?? []) {
        if (!map.has(m)) map.set(m, [])
        map.get(m)!.push(def)
      }
    }
    map.forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)))
    return map
  }, [])

  if (exercise) {
    return (
      <ExerciseDetail
        exercise={exercise}
        onBack={() => setExercise(null)}
        agg={aggregateExercise(exercise.name, allLogs)}
      />
    )
  }

  if (selected) {
    const items = byMuscle.get(selected) ?? []
    return (
      <div className="space-y-3 pt-1">
        <BackHeader title={selected} onBack={() => setSelected(null)} />
        <p className="text-sm text-white/55">
          {items.length} exercise{items.length === 1 ? '' : 's'} target this
          muscle as a primary mover.
        </p>
        <ul className="space-y-2">
          {items.map((ex) => {
            const agg = aggregateExercise(ex.name, allLogs)
            return (
              <li key={ex.name}>
                <button
                  onClick={() => setExercise(ex)}
                  className="w-full glass-card p-3 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">
                      {ex.name}
                    </p>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      {ex.targetSets} × {ex.targetReps} · {ex.priority}
                    </p>
                    {agg.bestE1RM && (
                      <p className="text-[10px] text-pink-300 mt-0.5 font-mono">
                        1RM est: {Math.round(agg.bestE1RM.e1rm)}kg
                      </p>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/35">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-1">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        <span className="rainbow-text">Library</span>
      </h2>
      <p className="text-sm text-white/55">
        Pick a muscle to see the exercises that hit it.
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {MUSCLES.map((m) => {
          const count = byMuscle.get(m)?.length ?? 0
          return (
            <li key={m}>
              <button
                onClick={() => setSelected(m)}
                disabled={count === 0}
                className={cn(
                  'w-full glass-card p-3 text-left flex flex-col gap-0.5',
                  count === 0 && 'opacity-40 pointer-events-none'
                )}
              >
                <span className="text-sm font-semibold">{m}</span>
                <span className="text-[10px] text-white/55">
                  {count} exercise{count === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ExerciseDetail({
  exercise,
  agg,
  onBack,
}: {
  exercise: ExerciseDef
  agg: ReturnType<typeof aggregateExercise>
  onBack: () => void
}) {
  return (
    <div className="space-y-4 pt-1">
      <BackHeader title={exercise.name} onBack={onBack} />
      <div className="flex flex-wrap gap-1">
        {exercise.primaryMuscles?.map((m) => (
          <span
            key={m}
            className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-pill bg-pink-500/15 text-pink-200 border border-pink-500/30"
          >
            {m}
          </span>
        ))}
        {exercise.secondaryMuscles?.map((m) => (
          <span
            key={m}
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-pill bg-white/8 text-white/60 border border-white/10"
          >
            {m}
          </span>
        ))}
      </div>

      <Card className="space-y-2">
        <p className="text-xs text-white/55">
          Target: {exercise.targetSets} × {exercise.targetReps} @ RIR {exercise.targetRIR} · {exercise.priority}
        </p>
        {exercise.cues.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1">
              Cues
            </p>
            <ul className="text-sm text-white/85 space-y-1">
              {exercise.cues.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-white/40">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {exercise.commonErrors && exercise.commonErrors.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1">
              Avoid
            </p>
            <ul className="text-sm text-white/75 space-y-1">
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
          className="inline-flex items-center gap-1.5 text-xs text-pink-300 hover:text-pink-200 pt-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 16 24 12 24 12s0-4-.5-5.8ZM9.6 15.6V8.4l6.4 3.6-6.4 3.6Z" />
          </svg>
          Watch on YouTube
        </a>
      </Card>

      {agg.totalSets > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">Your version</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {agg.bestWeight && (
              <Stat
                label="Heaviest"
                value={`${agg.bestWeight.weight}kg × ${agg.bestWeight.reps}`}
                hint={agg.bestWeight.date}
              />
            )}
            {agg.bestE1RM && (
              <Stat
                label="Est. 1RM"
                value={`${Math.round(agg.bestE1RM.e1rm)}kg`}
                hint={agg.bestE1RM.date}
              />
            )}
            {agg.bestReps && (
              <Stat
                label="Most reps"
                value={`${agg.bestReps.reps}${agg.bestReps.weight ? ` @ ${agg.bestReps.weight}kg` : ''}`}
                hint={agg.bestReps.date}
              />
            )}
            <Stat
              label="Total volume"
              value={`${agg.totalVolume.toLocaleString()} kg`}
              hint={`${agg.totalSets} sets · ${agg.totalReps} reps`}
            />
          </div>
        </Card>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/55">{label}</p>
      <p className="font-mono text-base font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-white/40 mt-0.5">{hint}</p>}
    </div>
  )
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </button>
      <h2 className="font-display text-2xl font-semibold tracking-tight mt-1">
        {title}
      </h2>
    </div>
  )
}

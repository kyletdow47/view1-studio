'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/store/ui'
import { Card } from '@/components/ui/Card'
import { useAllPRs, useAllWorkoutLogs } from '@/db/hooks'
import {
  aggregateExercise,
  computeLifetimeStats,
  daysSinceMuscle,
  muscleVolumeWindow,
  predictedWeekVolume,
  recentSessionsFor,
  sortPRs,
  weeklyMuscleVolume,
} from '@/lib/analytics'
import { calculateStreak } from '@/lib/streak'
import { computeMilestones } from '@/lib/milestones'
import { sharePRCard } from '@/lib/pr-card'
import { todayISO } from '@/lib/date-utils'
import { fmtDuration } from '@/lib/duration'
import { getExerciseDef } from '@/data/exercises'
import { type Muscle } from '@/types'
import { cn } from '@/lib/cn'
import {
  BodyHeatmap,
  FilterChips,
  HeatmapModeToggle,
  musclesForFilter,
  type HeatmapMode,
  type MuscleFilter,
} from './BodyHeatmap'
import { YearHeatmap } from './YearHeatmap'
import { ExerciseChart } from './ExerciseChart'

type Section = 'home' | 'exercise' | 'muscle' | 'all-prs'

export function ProgressView() {
  const logs = useAllWorkoutLogs()
  const prs = useAllPRs()
  const [section, setSection] = useState<Section>('home')
  const [focusExercise, setFocusExercise] = useState<string | null>(null)
  const [focusMuscle, setFocusMuscle] = useState<Muscle | null>(null)
  const [filter, setFilter] = useState<MuscleFilter>('All')
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('last7')
  const router = useRouter()
  const setSelectedDate = useUIStore((s) => s.setSelectedDate)

  const lifetime = useMemo(() => computeLifetimeStats(logs), [logs])
  const streak = useMemo(() => calculateStreak(logs, todayISO()), [logs])
  const weekly = useMemo(() => weeklyMuscleVolume(logs), [logs])
  const lastFour = weekly.slice(-4)
  const weekVolume = useMemo(
    () => muscleVolumeWindow(logs, 7, todayISO()),
    [logs]
  )
  const predictedVolume = useMemo(
    () => predictedWeekVolume(logs, todayISO()),
    [logs]
  )
  const displayedVolume = heatmapMode === 'predict' ? predictedVolume : weekVolume
  const monthVolume = useMemo(
    () => muscleVolumeWindow(logs, 28, todayISO()),
    [logs]
  )
  const daysSince = useMemo(() => daysSinceMuscle(logs, todayISO()), [logs])

  const trainedExercises = useMemo(() => {
    const seen = new Set<string>()
    for (const log of logs) {
      for (const ex of log.exercises) {
        if (ex.sets.some((s) => s.r != null && s.r > 0)) seen.add(ex.name)
      }
    }
    return Array.from(seen).sort()
  }, [logs])

  const trainedExercisesSorted = useMemo(() => {
    return trainedExercises
      .map((name) => ({ name, agg: aggregateExercise(name, logs) }))
      .sort((a, b) => (b.agg.lastDate ?? '').localeCompare(a.agg.lastDate ?? ''))
  }, [trainedExercises, logs])

  const milestones = useMemo(() => computeMilestones(logs, prs), [logs, prs])

  // "Cold" muscles — primary mover muscles untouched for 10+ days
  const coldMuscles = useMemo(() => {
    const cold: { muscle: Muscle; days: number }[] = []
    daysSince.forEach((d, m) => {
      if (d > 10) cold.push({ muscle: m, days: d })
    })
    return cold.sort((a, b) => b.days - a.days).slice(0, 5)
  }, [daysSince])

  if (section === 'exercise' && focusExercise) {
    const agg = aggregateExercise(focusExercise, logs)
    const recent = recentSessionsFor(focusExercise, logs, 30)
    return (
      <div className="space-y-4 pt-1">
        <BackButton onBack={() => setSection('home')} />
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {focusExercise}
        </h2>
        <ExerciseChart sessions={recent} />
        {agg.bestE1RM && (
          <Card>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat
                label="Est. 1RM"
                value={`${Math.round(agg.bestE1RM.e1rm)}kg`}
                hint={agg.bestE1RM.date}
              />
              {agg.bestWeight && (
                <Stat
                  label="Heaviest"
                  value={`${agg.bestWeight.weight}kg × ${agg.bestWeight.reps}`}
                  hint={agg.bestWeight.date}
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
                label="Lifetime volume"
                value={`${agg.totalVolume.toLocaleString()} kg`}
                hint={`${agg.totalSets} sets`}
              />
            </div>
          </Card>
        )}
        <Card>
          <h3 className="text-sm font-semibold mb-2">Recent sessions</h3>
          <ul className="space-y-1.5">
            {recent.slice(0, 12).map((s) => (
              <li key={s.date} className="font-mono text-xs flex justify-between">
                <span className="text-white/70">{s.date}</span>
                <span className="text-white/90">
                  {s.sets[0].w} kg × {s.sets[0].r}
                  {s.sets.length > 1 && (
                    <span className="text-white/40"> · {s.sets.length} sets</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    )
  }

  if (section === 'muscle' && focusMuscle) {
    const weekVol = weekVolume.get(focusMuscle) ?? 0
    const monthVol = monthVolume.get(focusMuscle) ?? 0
    const days = daysSince.get(focusMuscle)
    // Exercises tagged with this muscle (primary or secondary), sorted by lifetime volume
    const exercises = trainedExercises
      .map((name) => {
        const def = getExerciseDef(name)
        const isPrimary = def.primaryMuscles?.includes(focusMuscle)
        const isSecondary = def.secondaryMuscles?.includes(focusMuscle)
        if (!isPrimary && !isSecondary) return null
        const agg = aggregateExercise(name, logs)
        return { name, agg, isPrimary: !!isPrimary }
      })
      .filter(
        (x): x is { name: string; agg: ReturnType<typeof aggregateExercise>; isPrimary: boolean } =>
          x !== null
      )
      .sort((a, b) => b.agg.totalVolume - a.agg.totalVolume)
    return (
      <div className="space-y-4 pt-1">
        <BackButton onBack={() => setSection('home')} />
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {focusMuscle}
        </h2>
        <Card>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="This week" value={`${weekVol}`} hint="weighted sets" />
            <Stat label="Last 4 weeks" value={`${monthVol}`} hint="weighted sets" />
            <Stat
              label="Last trained"
              value={days == null ? '—' : `${days}d`}
              hint="ago"
            />
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold mb-2">Your top lifts here</h3>
          {exercises.length === 0 ? (
            <p className="text-sm text-white/55">
              No logged exercises for this muscle yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {exercises.slice(0, 12).map(({ name, agg, isPrimary }) => (
                <li key={name}>
                  <button
                    onClick={() => {
                      setFocusExercise(name)
                      setSection('exercise')
                    }}
                    className="w-full flex items-center justify-between gap-2 py-1.5 text-left"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{name}</span>
                      {isPrimary && (
                        <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded-sm bg-pink-500/15 text-pink-200 shrink-0">
                          primary
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-white/55 font-mono shrink-0">
                      {agg.bestE1RM ? `${Math.round(agg.bestE1RM.e1rm)}kg 1RM` : '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    )
  }

  if (section === 'all-prs') {
    const sorted = sortPRs(prs)
    return (
      <div className="space-y-4 pt-1">
        <BackButton onBack={() => setSection('home')} />
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          All <span className="rainbow-text">PRs</span>
        </h2>
        {sorted.length === 0 ? (
          <Card>
            <p className="text-sm text-white/55">No PRs yet. Go hit one.</p>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-white/8">
              {sorted.map((pr) => (
                <li key={pr.exerciseName} className="flex items-center gap-2 py-3">
                  <button
                    onClick={() => {
                      setFocusExercise(pr.exerciseName)
                      setSection('exercise')
                    }}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <span>
                      <p className="text-sm font-semibold leading-tight">
                        {pr.exerciseName}
                      </p>
                      <p className="text-[11px] text-white/55 mt-0.5">{pr.date}</p>
                    </span>
                    <span className="font-mono text-base font-semibold tabular-nums text-pink-300">
                      {pr.weight} kg × {pr.reps}
                    </span>
                  </button>
                  <button
                    onClick={() => sharePRCard(pr)}
                    aria-label="Share PR card"
                    title="Share as image"
                    className="text-white/45 hover:text-pink-300 tap-target -mr-1"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    )
  }

  // Home view
  const recentPRs = sortPRs(prs).slice(0, 5)

  return (
    <div className="space-y-4 pt-1">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        <span className="rainbow-text">Progress</span>
      </h2>

      {/* Streak + lifetime counters */}
      <Card className="!p-3">
        <div className="grid grid-cols-4 text-center">
          <Stat label="Streak" value={`${streak.current}d`} />
          <Stat label="Sessions" value={`${lifetime.totalSessions}`} />
          <Stat label="Sets" value={`${lifetime.totalSets}`} />
          <Stat
            label="Tonnage"
            value={`${(lifetime.totalVolume / 1000).toFixed(1)}t`}
          />
        </div>
        {lifetime.totalDurationSec > 0 && (
          <p className="text-[10px] text-white/45 text-center mt-2">
            {fmtDuration(lifetime.totalDurationSec)} time under the bar · best streak {streak.best}d
          </p>
        )}
      </Card>

      {/* Body heatmap (this week / predict) */}
      <Card className="space-y-3 !p-3">
        <div className="flex items-center justify-center">
          <HeatmapModeToggle value={heatmapMode} onChange={setHeatmapMode} />
        </div>
        <p className="text-center text-xs text-white/60">
          {heatmapMode === 'last7'
            ? 'Number of sets per muscle in the last 7 days'
            : 'Projected end-of-week volume at your current pace'}
        </p>
        <BodyHeatmap
          volumeByMuscle={displayedVolume}
          onMuscleTap={(m) => {
            setFocusMuscle(m)
            setSection('muscle')
          }}
        />
        <FilterChips value={filter} onChange={setFilter} />
        <MuscleTargetList
          muscles={musclesForFilter(filter)}
          volume={displayedVolume}
          daysSince={daysSince}
          onTap={(m) => {
            setFocusMuscle(m)
            setSection('muscle')
          }}
          showProjection={heatmapMode === 'predict'}
        />
      </Card>

      {/* Volume per muscle — last 4 weeks */}
      {lastFour.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">Volume — last 4 weeks</h3>
          <WeeklyMuscleChart weeks={lastFour} />
        </Card>
      )}

      {/* Recent PRs */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Recent PRs</h3>
          {prs.length > 5 && (
            <button
              onClick={() => setSection('all-prs')}
              className="text-xs text-pink-300 hover:text-pink-200"
            >
              See all {prs.length} →
            </button>
          )}
        </div>
        {recentPRs.length === 0 ? (
          <p className="text-sm text-white/55">No PRs yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentPRs.map((pr) => (
              <li key={pr.exerciseName}>
                <button
                  onClick={() => {
                    setFocusExercise(pr.exerciseName)
                    setSection('exercise')
                  }}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span>
                    <p className="text-sm font-semibold leading-tight">
                      {pr.exerciseName}
                    </p>
                    <p className="text-[11px] text-white/55 mt-0.5">{pr.date}</p>
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-pink-300">
                    {pr.weight} kg × {pr.reps}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Year heatmap */}
      {logs.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">Year of training</h3>
          <YearHeatmap
            logs={logs}
            onDayTap={(date) => {
              setSelectedDate(date)
              router.push('/train')
            }}
          />
        </Card>
      )}

      {/* Cold muscles */}
      {coldMuscles.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">Cold muscles</h3>
          <p className="text-xs text-white/55 mb-2">
            Untouched for over 10 days. Maybe slot something in.
          </p>
          <div className="flex flex-wrap gap-1">
            {coldMuscles.map(({ muscle, days }) => (
              <button
                key={muscle}
                onClick={() => {
                  setFocusMuscle(muscle)
                  setSection('muscle')
                }}
                className="text-[10px] px-2 py-0.5 rounded-pill bg-amber-500/15 text-amber-200 border border-amber-500/30 tabular-nums"
              >
                {muscle} · {days}d
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Milestones */}
      {(milestones.earned.length > 0 || milestones.next.length > 0) && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">Milestones</h3>
          {milestones.earned.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1.5">
                Earned ({milestones.earned.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {milestones.earned.slice(0, 12).map((m) => (
                  <span
                    key={m.id}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-pill bg-pink-500/15 text-pink-200 border border-pink-500/30"
                    title={m.reachedOn ?? ''}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {milestones.next.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1.5">
                Up next
              </p>
              <div className="flex flex-wrap gap-1">
                {milestones.next.map((m) => (
                  <span
                    key={m.id}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-pill bg-white/6 text-white/55 border border-white/10"
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Trained exercises */}
      {trainedExercisesSorted.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">Exercises</h3>
          <ul className="space-y-1">
            {trainedExercisesSorted.slice(0, 20).map(({ name, agg }) => (
              <li key={name}>
                <button
                  onClick={() => {
                    setFocusExercise(name)
                    setSection('exercise')
                  }}
                  className="w-full flex items-center justify-between py-1.5 text-left"
                >
                  <span className="text-sm">{name}</span>
                  <span className="text-xs text-white/55 font-mono">
                    {agg.bestE1RM
                      ? `${Math.round(agg.bestE1RM.e1rm)}kg 1RM`
                      : `${agg.totalSets} sets`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

/**
 * Weekly-target list shown below the body diagram. Each muscle has a target
 * range (low → high "growth window"); we show "X of Y weekly sets · N to growth"
 * Hypertrophy lit follows ~10-20 sets/muscle/week for most groups.
 */
const WEEKLY_TARGETS: Record<string, { min: number; max: number }> = {
  Quads: { min: 10, max: 20 },
  Hamstrings: { min: 8, max: 16 },
  Glutes: { min: 8, max: 16 },
  Calves: { min: 8, max: 16 },
  Chest: { min: 10, max: 20 },
  Lats: { min: 10, max: 20 },
  'Upper Back': { min: 10, max: 20 },
  'Lower Back': { min: 4, max: 8 },
  Traps: { min: 6, max: 12 },
  'Front Delts': { min: 6, max: 12 },
  'Side Delts': { min: 10, max: 20 },
  'Rear Delts': { min: 10, max: 20 },
  Biceps: { min: 10, max: 20 },
  Triceps: { min: 8, max: 16 },
  Forearms: { min: 4, max: 8 },
  Abs: { min: 8, max: 16 },
  Obliques: { min: 4, max: 8 },
}

function MuscleTargetList({
  muscles,
  volume,
  daysSince,
  onTap,
  showProjection = false,
}: {
  muscles: Muscle[]
  volume: Map<Muscle, number>
  daysSince: Map<Muscle, number>
  onTap: (m: Muscle) => void
  showProjection?: boolean
}) {
  // Sort: most-trained first, untouched-but-due last
  const rows = muscles
    .map((m) => {
      const sets = volume.get(m) ?? 0
      const target = WEEKLY_TARGETS[m] ?? { min: 8, max: 16 }
      const ds = daysSince.get(m)
      return { muscle: m, sets, target, daysSince: ds }
    })
    .sort((a, b) => b.sets - a.sets)

  return (
    <ul className="space-y-1.5 pt-2 border-t border-white/8">
      {rows.map((r) => {
        const pct = Math.min(1, r.sets / r.target.max)
        const inWindow = r.sets >= r.target.min
        const toGrowth = Math.max(0, r.target.min - r.sets)
        const overshoot = r.sets > r.target.max
        return (
          <li key={r.muscle}>
            <button
              onClick={() => onTap(r.muscle)}
              className="w-full text-left flex flex-col gap-1 py-1 px-1"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{r.muscle}</span>
                <span className="text-[11px] text-white/55 font-mono tabular-nums">
                  {showProjection ? '~' : ''}{fmtSets(r.sets)} of {r.target.min}–{r.target.max} weekly sets
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    overshoot
                      ? 'bg-amber-400'
                      : inWindow
                      ? 'rainbow-fill'
                      : 'bg-pink-500/70'
                  )}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-white/55">
                {r.sets === 0 ? (
                  r.daysSince != null && r.daysSince > 7 ? (
                    <span className="text-amber-300">
                      Untouched · {r.daysSince}d ago
                    </span>
                  ) : (
                    <span>Not trained this week</span>
                  )
                ) : overshoot ? (
                  <span>
                    Above growth window ({r.sets - r.target.max} over) — recovery check
                  </span>
                ) : inWindow ? (
                  <span className="text-emerald-300">In growth window</span>
                ) : (
                  <span>{fmtSets(toGrowth)} sets to growth window</span>
                )}
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function fmtSets(n: number): string {
  return n % 1 === 0 ? `${n}` : n.toFixed(1)
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
      <p className="font-mono text-xl font-bold tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-white/55 mt-1">
        {label}
      </p>
      {hint && <p className="text-[10px] text-white/40 mt-0.5">{hint}</p>}
    </div>
  )
}

function WeeklyMuscleChart({
  weeks,
}: {
  weeks: { weekStart: string; byMuscle: Map<Muscle, number> }[]
}) {
  // Stack the top 6 muscles across weeks; merge the rest into "Other"
  const allMuscleTotals = new Map<Muscle, number>()
  for (const w of weeks) {
    w.byMuscle.forEach((v, m) => {
      allMuscleTotals.set(m, (allMuscleTotals.get(m) ?? 0) + v)
    })
  }
  const top = Array.from(allMuscleTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([m]) => m)
  const max = Math.max(
    1,
    ...weeks.map((w) =>
      Array.from(w.byMuscle.values()).reduce((a, b) => a + b, 0)
    )
  )

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-around gap-2 h-32">
        {weeks.map((w) => {
          const total = Array.from(w.byMuscle.values()).reduce((a, b) => a + b, 0)
          const heightPct = (total / max) * 100
          return (
            <div key={w.weekStart} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-pink-500 to-purple-500 transition-all"
                style={{ height: `${Math.max(2, heightPct)}%` }}
                title={`${w.weekStart}: ${total} weighted sets`}
              />
              <span className="text-[9px] text-white/55 font-mono">
                {w.weekStart.slice(5)}
              </span>
              <span className="text-[9px] text-white/85 font-mono tabular-nums">
                {total}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-1 pt-1">
        {top.map((m) => (
          <span
            key={m}
            className="text-[9px] uppercase tracking-wider text-white/55"
          >
            {m} {Math.round(allMuscleTotals.get(m) ?? 0)}
          </span>
        ))}
      </div>
    </div>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
      Back
    </button>
  )
}

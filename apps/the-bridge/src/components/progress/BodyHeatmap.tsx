'use client'

import { useMemo } from 'react'
import Model from 'react-body-highlighter'
import type { Muscle } from '@/types'
import { cn } from '@/lib/cn'

type Props = {
  /** Map of muscle → weighted set count over the window */
  volumeByMuscle: Map<Muscle, number>
  /** Optional tap handler — lets the parent open a muscle detail */
  onMuscleTap?: (m: Muscle) => void
}

/** Library's muscle taxonomy. */
type LibMuscle =
  | 'trapezius'
  | 'upper-back'
  | 'lower-back'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'back-deltoids'
  | 'front-deltoids'
  | 'abs'
  | 'obliques'
  | 'adductor'
  | 'abductors'
  | 'hamstring'
  | 'quadriceps'
  | 'calves'
  | 'gluteal'

/**
 * Our muscle → library muscle. Lats and Upper Back collapse to "upper-back"
 * (lib doesn't separate lats); Side Delts split across front + back delts.
 */
const TO_LIB: Record<Muscle, LibMuscle[]> = {
  Quads: ['quadriceps'],
  Hamstrings: ['hamstring'],
  Glutes: ['gluteal'],
  Calves: ['calves'],
  Chest: ['chest'],
  Lats: ['upper-back'],
  'Upper Back': ['upper-back', 'trapezius'],
  'Lower Back': ['lower-back'],
  Traps: ['trapezius'],
  'Front Delts': ['front-deltoids'],
  'Side Delts': ['front-deltoids', 'back-deltoids'],
  'Rear Delts': ['back-deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Forearms: ['forearm'],
  Abs: ['abs'],
  Obliques: ['obliques'],
}

const LIB_TO_OURS: Record<LibMuscle, Muscle[]> = (() => {
  const m: Partial<Record<LibMuscle, Muscle[]>> = {}
  ;(Object.entries(TO_LIB) as [Muscle, LibMuscle[]][]).forEach(([ours, libs]) => {
    for (const lib of libs) {
      if (!m[lib]) m[lib] = []
      m[lib]!.push(ours)
    }
  })
  return m as Record<LibMuscle, Muscle[]>
})()

// Color ramp: 0 sets = body color, then 5 tiers from soft → bright pink.
const BODY_COLOR = 'rgba(255,255,255,0.10)'
const RAMP = [
  'rgba(236, 72, 153, 0.25)',
  'rgba(236, 72, 153, 0.45)',
  'rgba(236, 72, 153, 0.65)',
  'rgba(236, 72, 153, 0.82)',
  'rgba(236, 72, 153, 1)',
]

export function BodyHeatmap({ volumeByMuscle, onMuscleTap }: Props) {
  // Aggregate our muscles → library muscle volume, then bucket into 1..5
  const data = useMemo(() => {
    const libVol = new Map<LibMuscle, number>()
    volumeByMuscle.forEach((vol, ours) => {
      const libs = TO_LIB[ours] ?? []
      const share = vol / Math.max(1, libs.length)
      for (const lib of libs) {
        libVol.set(lib, (libVol.get(lib) ?? 0) + share)
      }
    })
    const max = Math.max(1, ...Array.from(libVol.values()))
    const entries: { name: string; muscles: LibMuscle[]; frequency: number }[] =
      []
    libVol.forEach((vol, lib) => {
      if (vol <= 0) return
      const t = vol / max
      const tier = Math.min(5, Math.max(1, Math.ceil(t * 5)))
      entries.push({
        name: `${lib}-${tier}`,
        muscles: [lib],
        frequency: tier,
      })
    })
    return entries
  }, [volumeByMuscle])

  const handleClick = (stats: { muscle: LibMuscle }) => {
    if (!onMuscleTap) return
    const ours = LIB_TO_OURS[stats.muscle]?.[0]
    if (ours) onMuscleTap(ours)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <FigureCard title="Front">
        <Model
          data={data}
          type="anterior"
          bodyColor={BODY_COLOR}
          highlightedColors={RAMP}
          onClick={handleClick as any}
          style={{ width: '100%', padding: 0 }}
          svgStyle={{ width: '100%', height: 'auto' }}
        />
      </FigureCard>
      <FigureCard title="Back">
        <Model
          data={data}
          type="posterior"
          bodyColor={BODY_COLOR}
          highlightedColors={RAMP}
          onClick={handleClick as any}
          style={{ width: '100%', padding: 0 }}
          svgStyle={{ width: '100%', height: 'auto' }}
        />
      </FigureCard>
    </div>
  )
}

function FigureCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-2">
      <p className="text-[10px] uppercase tracking-wider text-white/55 text-center mb-1">
        {title}
      </p>
      {children}
    </div>
  )
}

// ---------- Filter chip helpers used by ProgressView ----------

export const MUSCLE_FILTERS = ['All', 'Upper', 'Arms', 'Back', 'Legs', 'Core'] as const
export type MuscleFilter = (typeof MUSCLE_FILTERS)[number]

const FILTER_MUSCLES: Record<MuscleFilter, Muscle[]> = {
  All: [
    'Quads',
    'Hamstrings',
    'Glutes',
    'Calves',
    'Chest',
    'Lats',
    'Upper Back',
    'Lower Back',
    'Traps',
    'Front Delts',
    'Side Delts',
    'Rear Delts',
    'Biceps',
    'Triceps',
    'Forearms',
    'Abs',
    'Obliques',
  ],
  Upper: ['Chest', 'Front Delts', 'Side Delts', 'Rear Delts', 'Traps'],
  Arms: ['Biceps', 'Triceps', 'Forearms'],
  Back: ['Lats', 'Upper Back', 'Lower Back', 'Traps'],
  Legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  Core: ['Abs', 'Obliques'],
}

export function musclesForFilter(f: MuscleFilter): Muscle[] {
  return FILTER_MUSCLES[f]
}

export function FilterChips({
  value,
  onChange,
}: {
  value: MuscleFilter
  onChange: (f: MuscleFilter) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 py-1" style={{ scrollbarWidth: 'none' }}>
      {MUSCLE_FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={cn(
            'shrink-0 px-3 py-1 rounded-pill text-xs font-medium whitespace-nowrap transition-all',
            value === f
              ? 'bg-white text-black'
              : 'bg-white/8 text-white/70 hover:bg-white/14'
          )}
        >
          {f}
        </button>
      ))}
    </div>
  )
}


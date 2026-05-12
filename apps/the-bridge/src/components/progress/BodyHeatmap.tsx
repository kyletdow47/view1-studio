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

// Color ramp with neon-pink → magenta hot palette. The lib paints these
// straight into fill; we add a glow filter via CSS on top.
const BODY_COLOR = '#1a1a22'
const RAMP = [
  '#ec489940', // dim
  '#ec489970',
  '#f472b6',
  '#ec4899',
  '#f43f5e',
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
    const entries: { name: string; muscles: LibMuscle[]; frequency: number }[] = []
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
    <div className="body-heatmap relative">
      {/* Radial spotlight behind both figures */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 45%, rgba(236,72,153,0.10), transparent 65%)',
        }}
      />
      <div className="grid grid-cols-2 gap-1 relative">
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
      {/* Heavy SVG dressing: cleaner stroke contrast, drop-shadow on the
          whole body, glow on highlighted muscles. */}
      <style jsx global>{`
        .body-heatmap svg {
          filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.5));
        }
        .body-heatmap svg path,
        .body-heatmap svg polygon {
          stroke: rgba(0, 0, 0, 0.55);
          stroke-width: 0.6;
          transition: filter 200ms ease, fill 200ms ease;
        }
        .body-heatmap svg path[fill='${RAMP[0]}'],
        .body-heatmap svg path[fill='${RAMP[1]}'],
        .body-heatmap svg path[fill='${RAMP[2]}'],
        .body-heatmap svg path[fill='${RAMP[3]}'],
        .body-heatmap svg path[fill='${RAMP[4]}'] {
          filter: drop-shadow(0 0 5px rgba(236, 72, 153, 0.85));
        }
        .body-heatmap svg path[fill='${RAMP[3]}'],
        .body-heatmap svg path[fill='${RAMP[4]}'] {
          filter: drop-shadow(0 0 10px rgba(244, 63, 94, 0.95))
            drop-shadow(0 0 22px rgba(236, 72, 153, 0.6));
        }
      `}</style>
    </div>
  )
}

function FigureCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-black/40 via-black/20 to-black/40 border border-white/10 p-2 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/55 text-center mb-1 font-semibold">
        {title}
      </p>
      {children}
    </div>
  )
}

// ---------- Filter chip helpers used by ProgressView ----------

export const MUSCLE_FILTERS = [
  'All',
  'Upper',
  'Arms',
  'Back',
  'Legs',
  'Core',
] as const
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
  Core: ['Abs', 'Obliques', 'Lower Back'],
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
    <div
      className="flex gap-1.5 overflow-x-auto -mx-1 px-1 py-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {MUSCLE_FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap transition-all',
            value === f
              ? 'bg-white text-black shadow-[0_4px_14px_rgba(255,255,255,0.25)]'
              : 'bg-white/8 text-white/70 hover:bg-white/14'
          )}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

// ---------- "Last 7 days" / "Predict" toggle ----------

export type HeatmapMode = 'last7' | 'predict'

export function HeatmapModeToggle({
  value,
  onChange,
}: {
  value: HeatmapMode
  onChange: (v: HeatmapMode) => void
}) {
  return (
    <div className="inline-flex items-center bg-white/8 rounded-pill p-0.5">
      <ToggleBtn active={value === 'last7'} onClick={() => onChange('last7')}>
        Last 7 days
      </ToggleBtn>
      <ToggleBtn active={value === 'predict'} onClick={() => onChange('predict')}>
        Predict
      </ToggleBtn>
    </div>
  )
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-xs font-semibold px-3 py-1.5 rounded-pill transition-all whitespace-nowrap',
        active ? 'bg-white text-black shadow-sm' : 'text-white/65 hover:text-white'
      )}
    >
      {children}
    </button>
  )
}

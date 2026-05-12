'use client'

import { useMemo } from 'react'
import type { Muscle } from '@/types'
import { cn } from '@/lib/cn'

type Props = {
  /** Map of muscle → weighted set count over the window */
  volumeByMuscle: Map<Muscle, number>
  /** Optional tap handler — lets the parent open a muscle detail */
  onMuscleTap?: (m: Muscle) => void
}

/**
 * Simple front+back anatomy diagram. Each muscle is a separate SVG path
 * keyed by its name. Color intensity is the fraction of the max-volume
 * muscle in the window (so it's relative, not absolute).
 */
export function BodyHeatmap({ volumeByMuscle, onMuscleTap }: Props) {
  const max = useMemo(() => {
    let m = 0
    volumeByMuscle.forEach((v) => {
      if (v > m) m = v
    })
    return m
  }, [volumeByMuscle])

  const fillFor = (muscle: Muscle): string => {
    const v = volumeByMuscle.get(muscle) ?? 0
    if (v === 0 || max === 0) return 'rgba(255,255,255,0.06)'
    const t = Math.min(1, v / max)
    // pink → bright pink gradient (matches brand)
    const alpha = 0.18 + t * 0.72
    return `rgba(236, 72, 153, ${alpha})`
  }

  const handle = (m: Muscle) => () => onMuscleTap?.(m)
  const props = (m: Muscle) => ({
    fill: fillFor(m),
    stroke: 'rgba(255,255,255,0.35)',
    strokeWidth: 0.5,
    onClick: handle(m),
    className: cn('transition-all', onMuscleTap && 'cursor-pointer hover:brightness-125'),
  })

  return (
    <div className="grid grid-cols-2 gap-2">
      <FigureCard title="Front">
        <svg viewBox="0 0 100 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="50" cy="14" rx="9" ry="11" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          {/* Neck */}
          <rect x="46" y="23" width="8" height="5" fill="rgba(255,255,255,0.08)" />
          {/* Traps (front sliver) */}
          <path d="M40 28 L60 28 L62 33 L38 33 Z" {...props('Traps')} />
          {/* Front Delts (shoulders) */}
          <path d="M30 30 Q26 36 28 44 L36 42 L38 32 Z" {...props('Front Delts')} />
          <path d="M70 30 Q74 36 72 44 L64 42 L62 32 Z" {...props('Front Delts')} />
          {/* Side Delts (small wedge — visible from front too) */}
          <path d="M26 36 Q22 40 22 48 L28 44 Z" {...props('Side Delts')} />
          <path d="M74 36 Q78 40 78 48 L72 44 Z" {...props('Side Delts')} />
          {/* Chest */}
          <path d="M38 34 L50 34 L62 34 L60 52 Q55 56 50 56 Q45 56 40 52 Z" {...props('Chest')} />
          {/* Biceps */}
          <path d="M26 44 L32 44 L33 58 L25 58 Z" {...props('Biceps')} />
          <path d="M74 44 L68 44 L67 58 L75 58 Z" {...props('Biceps')} />
          {/* Forearms (front) */}
          <path d="M24 58 L34 58 L34 76 L23 76 Z" {...props('Forearms')} />
          <path d="M76 58 L66 58 L66 76 L77 76 Z" {...props('Forearms')} />
          {/* Abs */}
          <path d="M42 56 L58 56 L57 92 L43 92 Z" {...props('Abs')} />
          {/* Obliques */}
          <path d="M37 60 L42 56 L43 92 L37 88 Z" {...props('Obliques')} />
          <path d="M63 60 L58 56 L57 92 L63 88 Z" {...props('Obliques')} />
          {/* Quads */}
          <path d="M37 94 L50 94 L50 138 L40 138 Z" {...props('Quads')} />
          <path d="M63 94 L50 94 L50 138 L60 138 Z" {...props('Quads')} />
          {/* Calves (front shin shows tibialis but show calves color anyway) */}
          <path d="M39 142 L48 142 L47 178 L40 178 Z" {...props('Calves')} />
          <path d="M61 142 L52 142 L53 178 L60 178 Z" {...props('Calves')} />
          {/* Hands */}
          <ellipse cx="28" cy="80" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
          <ellipse cx="72" cy="80" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
          {/* Feet */}
          <ellipse cx="43" cy="183" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
          <ellipse cx="57" cy="183" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
        </svg>
      </FigureCard>
      <FigureCard title="Back">
        <svg viewBox="0 0 100 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="14" rx="9" ry="11" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          <rect x="46" y="23" width="8" height="5" fill="rgba(255,255,255,0.08)" />
          {/* Traps */}
          <path d="M38 28 L62 28 L65 44 L50 50 L35 44 Z" {...props('Traps')} />
          {/* Rear Delts */}
          <path d="M28 30 Q22 38 28 48 L36 44 L38 30 Z" {...props('Rear Delts')} />
          <path d="M72 30 Q78 38 72 48 L64 44 L62 30 Z" {...props('Rear Delts')} />
          {/* Upper Back / Rhomboids */}
          <path d="M37 44 L63 44 L62 60 L38 60 Z" {...props('Upper Back')} />
          {/* Lats — broader V shape */}
          <path d="M36 48 L64 48 L70 76 L60 84 L40 84 L30 76 Z" {...props('Lats')} />
          {/* Triceps */}
          <path d="M26 44 L33 44 L34 58 L25 58 Z" {...props('Triceps')} />
          <path d="M74 44 L67 44 L66 58 L75 58 Z" {...props('Triceps')} />
          {/* Forearms */}
          <path d="M24 58 L34 58 L34 76 L23 76 Z" {...props('Forearms')} />
          <path d="M76 58 L66 58 L66 76 L77 76 Z" {...props('Forearms')} />
          {/* Lower Back */}
          <path d="M40 84 L60 84 L59 96 L41 96 Z" {...props('Lower Back')} />
          {/* Glutes */}
          <path d="M37 96 L63 96 L62 116 L38 116 Z" {...props('Glutes')} />
          {/* Hamstrings */}
          <path d="M38 116 L50 116 L50 138 L41 138 Z" {...props('Hamstrings')} />
          <path d="M62 116 L50 116 L50 138 L59 138 Z" {...props('Hamstrings')} />
          {/* Calves (back — proper calf bulge) */}
          <path d="M39 142 L48 142 L47 178 L40 178 Z" {...props('Calves')} />
          <path d="M61 142 L52 142 L53 178 L60 178 Z" {...props('Calves')} />
          <ellipse cx="28" cy="80" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
          <ellipse cx="72" cy="80" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
          <ellipse cx="43" cy="183" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
          <ellipse cx="57" cy="183" rx="4" ry="3" fill="rgba(255,255,255,0.08)" />
        </svg>
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

'use client'

import { useEffect, useState } from 'react'
import type { PersonalRecord } from '@/types'

type Props = {
  pr: PersonalRecord | null
  onDone: () => void
}

/**
 * Full-screen celebration when a PR lands. Auto-dismisses after 1.6s
 * (the toast already covers the longer-tail messaging). Pure CSS confetti —
 * no external lib needed.
 */
export function PRBurst({ pr, onDone }: Props) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!pr) return
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      // give the fade-out a beat before resetting parent state
      setTimeout(onDone, 250)
    }, 1600)
    return () => clearTimeout(t)
  }, [pr, onDone])

  if (!pr) return null

  // Generate 24 confetti pieces with random offsets / delays / colors
  const pieces = Array.from({ length: 24 }).map((_, i) => {
    const left = Math.random() * 100
    const delay = Math.random() * 200
    const duration = 1200 + Math.random() * 600
    const colors = ['#ec4899', '#a855f7', '#f59e0b', '#34d399', '#60a5fa']
    const color = colors[i % colors.length]
    const size = 6 + Math.random() * 6
    return { left, delay, duration, color, size, key: i }
  })

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="absolute inset-0 bg-pink-500/20 animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-pink-200 font-bold animate-bounce">
            New PR
          </p>
          <p className="font-display text-5xl font-black rainbow-text mt-1">
            {pr.weight}kg × {pr.reps}
          </p>
          <p className="text-sm text-white/75 mt-1 font-mono">{pr.exerciseName}</p>
        </div>
      </div>
      {pieces.map((p) => (
        <span
          key={p.key}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animation: `pr-fall ${p.duration}ms ease-in ${p.delay}ms forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pr-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(${Math.random() * 720}deg);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  )
}

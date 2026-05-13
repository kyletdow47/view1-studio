'use client'

import type { PersonalRecord } from '@/types'
import { e1RM } from './analytics'

const SIZE = 1080

/**
 * Renders a square (1080×1080) PR card image and returns it as a PNG Blob,
 * suitable for the Web Share API. Pure canvas — no external assets — so the
 * image generation works offline.
 */
export async function renderPRCard(pr: PersonalRecord): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  // Background — dark with a radial pink hotspot in the upper center
  const bg = ctx.createLinearGradient(0, 0, 0, SIZE)
  bg.addColorStop(0, '#16161e')
  bg.addColorStop(1, '#08080c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  const spot = ctx.createRadialGradient(SIZE / 2, SIZE * 0.32, 20, SIZE / 2, SIZE * 0.32, SIZE * 0.55)
  spot.addColorStop(0, 'rgba(236, 72, 153, 0.32)')
  spot.addColorStop(1, 'rgba(236, 72, 153, 0)')
  ctx.fillStyle = spot
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Top eyebrow: "NEW PERSONAL RECORD"
  ctx.fillStyle = 'rgba(244, 114, 182, 0.95)'
  ctx.font = '700 28px ui-sans-serif, system-ui, -apple-system, "Segoe UI"'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('NEW · PERSONAL · RECORD', SIZE / 2, 110, SIZE - 80)

  // Exercise name
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 56px ui-sans-serif, system-ui, -apple-system'
  ctx.fillText(pr.exerciseName, SIZE / 2, 178, SIZE - 80)

  // Big weight×reps — with a rainbow gradient stroke. For pure bodyweight
  // rep PRs (weight===0), render just "30 reps".
  const isRepPR = !pr.weight || pr.weight === 0
  const huge = isRepPR ? `${pr.reps} reps` : `${pr.weight} kg × ${pr.reps}`
  ctx.font = `900 ${isRepPR ? 220 : 200}px ui-monospace, "SF Mono", Menlo, monospace`
  ctx.textBaseline = 'middle'

  const grad = ctx.createLinearGradient(0, SIZE / 2 - 100, SIZE, SIZE / 2 + 100)
  grad.addColorStop(0, '#f59e0b')
  grad.addColorStop(0.3, '#ec4899')
  grad.addColorStop(0.6, '#a855f7')
  grad.addColorStop(1, '#60a5fa')
  ctx.fillStyle = grad

  // Outer glow
  ctx.shadowColor = 'rgba(236, 72, 153, 0.7)'
  ctx.shadowBlur = 60
  ctx.fillText(huge, SIZE / 2, SIZE / 2, SIZE - 60)
  ctx.shadowBlur = 0

  // Subhead — e1RM for weighted PRs, "bodyweight" for rep PRs
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = '500 36px ui-sans-serif, system-ui'
  ctx.textBaseline = 'top'
  if (isRepPR) {
    ctx.fillText('bodyweight', SIZE / 2, SIZE / 2 + 140)
  } else {
    const est = Math.round(e1RM(pr.weight, pr.reps))
    ctx.fillText(`Est. 1RM · ${est} kg`, SIZE / 2, SIZE / 2 + 140)
  }

  // Date
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.font = '500 28px ui-monospace, "SF Mono", Menlo, monospace'
  ctx.fillText(pr.date, SIZE / 2, SIZE / 2 + 195)

  // Bottom-right wordmark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.font = '700 26px ui-sans-serif, system-ui'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText('the bridge', SIZE - 60, SIZE - 60)

  // Bottom-left: tonnage for weighted PRs only
  if (!isRepPR) {
    const tonnage = pr.weight * pr.reps
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.font = '500 24px ui-monospace'
    ctx.fillText(`${tonnage.toLocaleString()} kg moved`, 60, SIZE - 60)
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas blob failed'))),
      'image/png',
      0.95
    )
  })
}

/**
 * Try to share the rendered PR card via the native share sheet. Falls back to
 * triggering a download if the platform doesn't support file shares.
 */
export async function sharePRCard(pr: PersonalRecord): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderPRCard(pr)
  const file = new File(
    [blob],
    `pr-${pr.exerciseName.toLowerCase().replace(/\s+/g, '-')}-${pr.date}.png`,
    { type: 'image/png' }
  )
  // navigator.canShare exists on Safari iOS 15+ / most modern browsers
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
  }
  if (nav.canShare && nav.canShare({ files: [file] }) && navigator.share) {
    try {
      const text =
        !pr.weight || pr.weight === 0
          ? `${pr.reps} reps · new PR`
          : `${pr.weight} kg × ${pr.reps} · new PR`
      await navigator.share({
        files: [file],
        title: `${pr.exerciseName} PR`,
        text,
      })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  // Fallback: download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

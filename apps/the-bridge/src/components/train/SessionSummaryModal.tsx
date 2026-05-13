'use client'

import { useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { computeSessionStats } from '@/lib/session-stats'
import { fmtDuration } from '@/lib/duration'
import { sendSessionToTrainer } from '@/lib/send-to-trainer'
import { syncWorkoutToHealth } from '@/lib/health-sync'
import { useAllPRs, useAllWeights } from '@/db/hooks'
import type { Settings, WorkoutLog } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  log: WorkoutLog | null
  settings: Settings
}

export function SessionSummaryModal({ open, onClose, log, settings }: Props) {
  const weights = useAllWeights()
  const stats = useMemo(() => computeSessionStats(log, weights), [log, weights])
  const prs = useAllPRs()
  const { toast } = useToast()

  const todayPRs = useMemo(
    () => (log ? prs.filter((p) => p.date === log.date) : []),
    [prs, log]
  )

  if (!log) return null

  const elapsedSec =
    log.startedAt && log.completedAt
      ? Math.max(
          0,
          Math.floor(
            (new Date(log.completedAt).getTime() -
              new Date(log.startedAt).getTime()) /
              1000
          )
        )
      : 0

  async function share() {
    if (!log) return
    const result = await sendSessionToTrainer(log.date, settings)
    if (result.status === 'sent') {
      toast('Copied — opening trainer project', 'success')
      onClose()
    } else if (result.status === 'copied') {
      toast(result.reason, 'success')
    } else {
      toast(`Failed: ${result.reason}`, 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Workout complete">
      <div className="space-y-3">
        <div className="text-center py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/55">
            Crushed it.
          </p>
          <p className="font-display text-3xl font-bold rainbow-text mt-1">
            {stats.volume.toLocaleString()} kg
          </p>
          <p className="text-xs text-white/55 mt-1">moved in {fmtDuration(elapsedSec)}</p>
        </div>

        <div className="grid grid-cols-3 text-center bg-white/5 rounded-md p-3">
          <div>
            <p className="font-mono text-xl font-bold">{stats.sets}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/55">Sets</p>
          </div>
          <div>
            <p className="font-mono text-xl font-bold">{stats.reps}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/55">Reps</p>
          </div>
          <div>
            <p className="font-mono text-xl font-bold">{log.exercises.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/55">Lifts</p>
          </div>
        </div>

        {todayPRs.length > 0 && (
          <div className="rounded-md bg-pink-500/15 border border-pink-500/30 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-pink-200 font-semibold">
              {todayPRs.length} PR{todayPRs.length === 1 ? '' : 's'} today
            </p>
            {todayPRs.map((pr) => (
              <p key={pr.exerciseName} className="text-xs text-white/90">
                <span className="font-semibold">{pr.exerciseName}:</span>{' '}
                <span className="font-mono">
                  {pr.weight} kg × {pr.reps}
                </span>
              </p>
            ))}
          </div>
        )}

        {stats.topMuscles.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1">
              Muscles worked
            </p>
            <div className="flex flex-wrap gap-1">
              {stats.topMuscles.map((m) => (
                <span
                  key={m.muscle}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-pill bg-pink-500/15 text-pink-200 border border-pink-500/30 tabular-nums"
                >
                  {m.muscle} ×{m.sets % 1 === 0 ? m.sets : m.sets.toFixed(1)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button onClick={share} className="flex-1">
              {settings.trainerProjectUrl ? 'Send to trainer' : 'Copy summary'}
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              const r = syncWorkoutToHealth(log)
              if (r === 'no-data') {
                toast('Workout has no start time yet', 'error')
              }
            }}
            className="w-full text-xs"
          >
            ❤️ Log to Apple Health (requires Shortcut — see More)
          </Button>
        </div>
      </div>
    </Modal>
  )
}

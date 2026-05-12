'use client'

import {
  getAllPRs,
  getAllWeights,
  getMeals,
  getWorkoutLog,
} from '@/db/operations'
import { formatSessionForTrainer } from '@/lib/trainer-export'
import type { Settings } from '@/types'

export type SendResult =
  | { status: 'sent'; markdown: string; openedUrl: string }
  | { status: 'copied'; markdown: string; reason: string }
  | { status: 'error'; reason: string }

/**
 * Generates a session markdown and hands it off to the user's Claude trainer
 * project. The flow:
 *
 *   1. Build the markdown from today's log + meals + weight + PRs
 *   2. Copy it to the clipboard
 *   3. If `settings.trainerProjectUrl` is set, open it in a new tab so the
 *      user can paste straight into the trainer conversation. On iOS the OS
 *      hands `claude.ai` links off to the Claude app if installed.
 *
 * Anthropic doesn't expose a public API for adding messages to Claude.ai
 * projects, so clipboard + URL handoff is the closest "connected" experience
 * that works for everyone.
 */
export async function sendSessionToTrainer(
  date: string,
  settings: Settings
): Promise<SendResult> {
  try {
    const [log, meals, weights, prs] = await Promise.all([
      getWorkoutLog(date),
      getMeals(date),
      getAllWeights(),
      getAllPRs(),
    ])
    const weight = weights.find((w) => w.date === date) ?? null
    const markdown = formatSessionForTrainer({
      date,
      startDate: settings.startDate,
      log,
      meals,
      weight,
      prs,
    })

    // 1. Always copy to clipboard — the universal fallback.
    try {
      await navigator.clipboard.writeText(markdown)
    } catch {
      // Continue even if clipboard fails (still useful to open the URL).
    }

    const url = settings.trainerProjectUrl?.trim()
    if (!url) {
      return {
        status: 'copied',
        markdown,
        reason: 'No trainer URL set — copied to clipboard. Add one in Settings.',
      }
    }

    // 2. Open the trainer project. Use _blank with a small delay so the
    //    clipboard write actually lands first on some browsers.
    window.open(url, '_blank', 'noopener,noreferrer')
    return { status: 'sent', markdown, openedUrl: url }
  } catch (err) {
    return {
      status: 'error',
      reason: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

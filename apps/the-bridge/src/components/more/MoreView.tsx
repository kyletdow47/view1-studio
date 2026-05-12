'use client'

import { useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PROGRAM } from '@/data/program'
import { resolveActiveProgram, toCustomShape } from '@/data/active-program'
import { searchExercises } from '@/data/exercises'
import { SUPPLEMENTS } from '@/data/supplements'
import { useSettings, useSupplementsTaken } from '@/db/hooks'
import {
  exportData,
  getAllPRs,
  getAllWeights,
  getMeals,
  getWorkoutLog,
  importData,
  importV3Backup,
  toggleSupplementTaken,
  updateSettings,
} from '@/db/operations'
import { todayISO } from '@/lib/date-utils'
import type { Backup } from '@/db/operations'
import type { CustomProgramDay } from '@/types'
import { cn } from '@/lib/cn'
import { formatSessionForTrainer } from '@/lib/trainer-export'
import { sendSessionToTrainer } from '@/lib/send-to-trainer'

type Section =
  | 'home'
  | 'program'
  | 'edit-program'
  | 'supplements'
  | 'coaching'
  | 'settings'
  | 'install'
  | 'trainer-export'
  | 'health-sync'

export function MoreView() {
  const [section, setSection] = useState<Section>('home')

  if (section === 'program') return <ProgramSection onBack={() => setSection('home')} />
  if (section === 'edit-program') return <EditProgramSection onBack={() => setSection('home')} />
  if (section === 'supplements') return <SupplementsSection onBack={() => setSection('home')} />
  if (section === 'coaching') return <CoachingSection onBack={() => setSection('home')} />
  if (section === 'settings') return <SettingsSection onBack={() => setSection('home')} />
  if (section === 'install') return <InstallSection onBack={() => setSection('home')} />
  if (section === 'trainer-export') return <TrainerExportSection onBack={() => setSection('home')} />
  if (section === 'health-sync') return <HealthSyncSection onBack={() => setSection('home')} />

  return (
    <div className="space-y-3 pt-1">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        <span className="rainbow-text">More</span>
      </h2>

      <Tile label="Send to trainer" hint="Copy session + open your Claude project" onClick={() => setSection('trainer-export')} />
      <Tile label="Apple Health sync" hint="One-time iOS Shortcut setup, then auto-log workouts" onClick={() => setSection('health-sync')} />
      <Tile label="Full program" hint="All 7 workout days at a glance" onClick={() => setSection('program')} />
      <Tile label="Edit program" hint="Customize exercises, days, focus" onClick={() => setSection('edit-program')} />
      <Tile label="Supplements" hint="Daily check-off" onClick={() => setSection('supplements')} />
      <Tile label="Coaching reference" hint="Volume ramp, RIR, macros" onClick={() => setSection('coaching')} />
      <Tile label="Settings & targets" hint="Macros, weight goals, start date" onClick={() => setSection('settings')} />
      <Tile label="Install on phone" hint="Add to home screen" onClick={() => setSection('install')} />

      <BackupTile />
    </div>
  )
}

function ProgramSection({ onBack }: { onBack: () => void }) {
  const settings = useSettings()
  const program = useMemo(() => resolveActiveProgram(settings), [settings])
  const isCustom = !!settings.customProgram && settings.customProgram.length > 0

  return (
    <div className="space-y-4 pt-1">
      <BackButton onBack={onBack} />
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Full <span className="rainbow-text">program</span>
        {isCustom && (
          <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 align-middle">
            Custom
          </span>
        )}
      </h2>
      <p className="text-sm text-white/55">
        7-day cycle. Repeats from Day 1 every Monday-equivalent.
      </p>

      <div className="space-y-3">
        {program.map((day, i) => (
          <Card key={day.index} className="!p-4">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display text-lg font-semibold">
                Day {i + 1} · <span className="rainbow-text">{day.name}</span>
              </h3>
            </div>
            <p className="text-xs text-white/55 mb-3">{day.focus}</p>
            {day.exercises.length === 0 ? (
              <p className="text-sm text-white/65 italic">No lifts scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {day.exercises.map((ex) => (
                  <li
                    key={ex.name}
                    className="flex items-center justify-between gap-3 py-1.5 border-t border-white/8 first:border-t-0 first:pt-0"
                  >
                    <span className="text-sm font-medium leading-tight">
                      {ex.name}
                    </span>
                    <span className="font-mono text-xs text-white/55 shrink-0">
                      {ex.targetSets} × {ex.targetReps}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

function Tile({
  label,
  hint,
  onClick,
}: {
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card p-4 w-full flex items-center gap-3 text-left"
    >
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-white/55">{hint}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/45">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  )
}

function BackupTile() {
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  async function download() {
    const data = await exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `the-bridge-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup downloaded', 'success')
  }

  async function restore(file: File) {
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (json && json.version === 1) {
        await importData(json as Backup)
      } else {
        const result = await importV3Backup(json)
        if (!result) throw new Error('Unrecognized backup format')
      }
      toast('Restore complete', 'success')
    } catch {
      toast('Restore failed — invalid file', 'error')
    }
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">Backup data</p>
        <p className="text-xs text-white/55">Download a JSON or restore from one</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={download} className="flex-1">
          Download
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()} className="flex-1">
          Restore
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) restore(f)
            e.target.value = ''
          }}
        />
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

function SupplementsSection({ onBack }: { onBack: () => void }) {
  const date = todayISO()
  const taken = useSupplementsTaken(date)

  return (
    <div className="space-y-4 pt-1">
      <BackButton onBack={onBack} />
      <h2 className="font-display text-xl font-semibold tracking-tight">
        <span className="rainbow-text">Supplements</span>
      </h2>

      <Card>
        <ul className="divide-y divide-white/8">
          {SUPPLEMENTS.map((s) => {
            const isTaken = taken.includes(s.name)
            return (
              <li key={s.name}>
                <button
                  onClick={() => toggleSupplementTaken(date, s.name)}
                  className="w-full flex items-center gap-3 py-3 text-left tap-target"
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                      isTaken
                        ? 'rainbow-bright-fill border-transparent'
                        : 'border-white/25 bg-white/5'
                    )}
                  >
                    {isTaken && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {s.name}{' '}
                      {!s.owned && (
                        <span className="text-[10px] uppercase tracking-wider text-amber-300/80 ml-1">
                          buy
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-white/55 mt-0.5">
                      {s.dose} · {s.time}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

function CoachingSection({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4 pt-1">
      <BackButton onBack={onBack} />
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Coaching <span className="rainbow-text">reference</span>
      </h2>

      <Card>
        <h3 className="text-sm font-semibold mb-2">4-week volume ramp</h3>
        <ul className="text-sm text-white/80 space-y-1.5">
          <li>Wk 1 — 8-10 working sets / muscle / week</li>
          <li>Wk 2 — 10-12 working sets / muscle / week</li>
          <li>Wk 3 — 12-14 working sets / muscle / week</li>
          <li>Wk 4 — 14-16 working sets / muscle / week (or deload if fried)</li>
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-2">RIR cheat sheet</h3>
        <ul className="text-sm text-white/80 space-y-1.5">
          <li><span className="font-mono text-pink-300">RIR 3-4</span> — could do 3-4 more reps; warm-up territory</li>
          <li><span className="font-mono text-amber-300">RIR 2-3</span> — main compounds; sustainable</li>
          <li><span className="font-mono text-purple-300">RIR 1-2</span> — secondary work; harder</li>
          <li><span className="font-mono text-blue-300">RIR 0-1</span> — finishers; near or to failure</li>
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-2">Macros at a glance</h3>
        <ul className="text-sm text-white/80 space-y-1.5">
          <li>Calories — surplus ~300-500 kcal over maintenance</li>
          <li>Protein — 1.6-2.2 g/kg bodyweight (160 g target for now)</li>
          <li>Carbs — 4-6 g/kg, prioritize around training</li>
          <li>Fat — 0.8-1.2 g/kg, fill the rest</li>
        </ul>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-2">If you're not gaining</h3>
        <p className="text-sm text-white/80">
          After 2 weeks, if scale weight isn't up 0.25-0.5 kg/week, bump
          calories by 200-300 kcal/day (extra carbs in the post-workout window).
          Hard-gainers under-eat by 20-30%.
        </p>
      </Card>
    </div>
  )
}

function SettingsSection({ onBack }: { onBack: () => void }) {
  const settings = useSettings()
  const [draft, setDraft] = useState(settings)
  const { toast } = useToast()

  async function save() {
    await updateSettings(draft)
    toast('Settings saved', 'success')
  }

  function field<K extends keyof typeof draft>(key: K, label: string, type: 'number' | 'date' = 'number') {
    return (
      <label>
        <span className="block text-xs text-white/55 mb-1">{label}</span>
        <input
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={String(draft[key])}
          onChange={(e) => {
            const raw = e.target.value
            setDraft((s) => ({
              ...s,
              [key]: type === 'number' ? Number(raw) || 0 : raw,
            }))
          }}
          className="set-input w-full"
        />
      </label>
    )
  }

  return (
    <div className="space-y-4 pt-1">
      <BackButton onBack={onBack} />
      <h2 className="font-display text-xl font-semibold tracking-tight">
        <span className="rainbow-text">Settings</span> & targets
      </h2>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Daily targets</h3>
        <div className="grid grid-cols-2 gap-3">
          {field('calorieTarget', 'Calories')}
          {field('proteinTarget', 'Protein g')}
          {field('carbsTarget', 'Carbs g')}
          {field('fatTarget', 'Fat g')}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Weight goals</h3>
        <div className="grid grid-cols-2 gap-3">
          {field('startWeight', 'Start kg')}
          {field('goalWeight', 'Goal kg')}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-3">Program</h3>
        {field('startDate', 'Start date', 'date')}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-1">Trainer project</h3>
        <p className="text-[11px] text-white/55 mb-3">
          Paste the URL of the Claude project that coaches you. "Send to
          trainer" will copy your session and open it in a new tab so you can
          paste straight in.
        </p>
        <label className="block">
          <span className="block text-xs text-white/55 mb-1">URL</span>
          <input
            type="url"
            value={draft.trainerProjectUrl ?? ''}
            onChange={(e) =>
              setDraft((s) => ({ ...s, trainerProjectUrl: e.target.value }))
            }
            placeholder="https://claude.ai/project/…"
            className="set-input w-full"
            style={{ color: 'white' }}
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
      </Card>

      <Button onClick={save} className="w-full">
        Save
      </Button>
    </div>
  )
}

function TrainerExportSection({ onBack }: { onBack: () => void }) {
  const settings = useSettings()
  const [date, setDate] = useState(todayISO())
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function generate() {
    setLoading(true)
    const [log, meals, weights, prs] = await Promise.all([
      getWorkoutLog(date),
      getMeals(date),
      getAllWeights(),
      getAllPRs(),
    ])
    const weight = weights.find((w) => w.date === date) ?? null
    const md = formatSessionForTrainer({
      date,
      startDate: settings.startDate,
      log,
      meals,
      weight,
      prs,
    })
    setMarkdown(md)
    setLoading(false)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown)
      toast('Copied to clipboard', 'success')
    } catch {
      toast('Copy failed', 'error')
    }
  }

  function download() {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bridge-${date}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function share() {
    if (!navigator.share) {
      copy()
      return
    }
    try {
      await navigator.share({
        title: `Bridge session ${date}`,
        text: markdown,
      })
    } catch {
      /* user cancelled */
    }
  }

  async function sendToProject() {
    const result = await sendSessionToTrainer(date, settings)
    if (result.status === 'sent') {
      toast('Copied — opening trainer project', 'success')
    } else if (result.status === 'copied') {
      toast(result.reason, 'success')
    } else {
      toast(`Failed: ${result.reason}`, 'error')
    }
  }

  return (
    <div className="space-y-4 pt-1">
      <BackButton onBack={onBack} />
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Send to <span className="rainbow-text">trainer</span>
      </h2>
      <p className="text-sm text-white/65">
        Generates a markdown summary of your session — lifts, sets, swaps,
        nutrition, bodyweight, PRs — to paste into the Claude project that
        coaches you.
      </p>

      <Card className="space-y-3">
        <label>
          <span className="block text-xs text-white/55 mb-1">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="set-input w-full"
          />
        </label>
        <Button onClick={sendToProject} className="w-full">
          {settings.trainerProjectUrl ? 'Send to project' : 'Copy (set URL in Settings)'}
        </Button>
        <Button onClick={generate} variant="ghost" className="w-full" disabled={loading}>
          {loading ? 'Generating…' : 'Preview markdown'}
        </Button>
      </Card>

      {markdown && (
        <Card className="space-y-3">
          <pre className="text-xs text-white/85 whitespace-pre-wrap break-words font-mono max-h-[40vh] overflow-y-auto bg-black/30 rounded-md p-3">
            {markdown}
          </pre>
          <div className="flex gap-2">
            <Button onClick={copy} variant="ghost" className="flex-1">
              Copy
            </Button>
            <Button onClick={share} variant="ghost" className="flex-1">
              Share
            </Button>
            <Button onClick={download} variant="ghost" className="flex-1">
              Download
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function HealthSyncSection({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4 pt-1">
      <BackButton onBack={onBack} />
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Apple <span className="rainbow-text">Health sync</span>
      </h2>

      <Card>
        <p className="text-sm text-white/85">
          Apple doesn't let websites write to HealthKit directly. The
          workaround is a one-time iOS Shortcut that takes Bridge's workout
          data and logs it into Health. 5 minutes of setup, then every
          completed workout is one tap to Health.
        </p>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-2">Setup (one time)</h3>
        <ol className="text-sm text-white/85 space-y-2 list-decimal pl-5">
          <li>Open the Shortcuts app on your iPhone.</li>
          <li>Tap the + in the top-right to create a new Shortcut.</li>
          <li>Tap the rename area at the top and call it exactly{' '}
            <span className="font-mono text-pink-300">Bridge Health</span>
            {' '}— this name has to match.
          </li>
          <li>Add a <span className="font-mono">Get Dictionary from Input</span> action.</li>
          <li>Add a <span className="font-mono">Log Workout</span> action.</li>
          <li>
            In the Log Workout action:
            <ul className="list-disc pl-5 mt-1 space-y-1 text-white/75">
              <li>Activity: <span className="font-mono">Functional Strength Training</span></li>
              <li>Start: tap → "Dictionary Value" → key <span className="font-mono">start</span></li>
              <li>End: tap → "Dictionary Value" → key <span className="font-mono">end</span></li>
              <li>Total Energy: tap → "Dictionary Value" → key <span className="font-mono">kcal</span></li>
            </ul>
          </li>
          <li>(Optional) Add a <span className="font-mono">Show Notification</span> with body "Logged to Health".</li>
          <li>Tap Done in the top-right to save.</li>
        </ol>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-2">How it works after setup</h3>
        <p className="text-sm text-white/85">
          When you tap "Log to Apple Health" in the session summary, Bridge
          opens the Shortcut and passes:
        </p>
        <pre className="mt-2 text-[11px] font-mono bg-black/40 rounded-md p-2 text-white/80 overflow-x-auto">
{`{
  "activityType": "functionalStrengthTraining",
  "start": "2026-05-12T18:30:00.000Z",
  "end":   "2026-05-12T19:25:00.000Z",
  "durationMinutes": 55,
  "kcal": 330,
  "workingSets": 22,
  "totalVolumeKg": 12450,
  "notes": "22 working sets · 12450 kg moved"
}`}
        </pre>
        <p className="text-[11px] text-white/55 mt-2">
          kcal is an estimate based on duration × 6 — typical for moderate
          resistance training.
        </p>
      </Card>

      <Card>
        <p className="text-xs text-white/55">
          Skip this if it's not worth the setup. The trainer-export and
          backup flows already capture everything; Health sync is purely
          for activity-ring credit + showing up in the broader Health
          dashboard.
        </p>
      </Card>
    </div>
  )
}

function EditProgramSection({ onBack }: { onBack: () => void }) {
  const settings = useSettings()
  const [draft, setDraft] = useState<CustomProgramDay[]>(() =>
    settings.customProgram && settings.customProgram.length > 0
      ? settings.customProgram
      : toCustomShape(PROGRAM)
  )
  const [openDay, setOpenDay] = useState<number | null>(null)
  const [addingTo, setAddingTo] = useState<number | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const { toast } = useToast()

  async function save() {
    await updateSettings({ customProgram: draft })
    toast('Program saved', 'success')
  }

  async function resetToDefault() {
    if (!confirm('Reset to the default program? Your custom edits will be lost.')) return
    setDraft(toCustomShape(PROGRAM))
    await updateSettings({ customProgram: undefined })
    toast('Reset to default', 'success')
  }

  function patchDay(i: number, patch: Partial<CustomProgramDay>) {
    setDraft((d) => d.map((day) => (day.index === i ? { ...day, ...patch } : day)))
  }

  function removeExercise(dayIdx: number, exName: string) {
    patchDay(dayIdx, {
      exerciseNames: draft
        .find((d) => d.index === dayIdx)!
        .exerciseNames.filter((n) => n !== exName),
    })
  }

  function moveExercise(dayIdx: number, exName: string, dir: 'up' | 'down') {
    const day = draft.find((d) => d.index === dayIdx)
    if (!day) return
    const i = day.exerciseNames.indexOf(exName)
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= day.exerciseNames.length) return
    const next = [...day.exerciseNames]
    ;[next[i], next[j]] = [next[j], next[i]]
    patchDay(dayIdx, { exerciseNames: next })
  }

  function addExercise(dayIdx: number, name: string) {
    const day = draft.find((d) => d.index === dayIdx)
    if (!day) return
    if (day.exerciseNames.includes(name)) {
      setAddingTo(null)
      setExerciseSearch('')
      return
    }
    patchDay(dayIdx, { exerciseNames: [...day.exerciseNames, name] })
    setAddingTo(null)
    setExerciseSearch('')
  }

  return (
    <div className="space-y-4 pt-1">
      <BackButton onBack={onBack} />
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Edit <span className="rainbow-text">program</span>
      </h2>
      <p className="text-sm text-white/55">
        Customize each day's exercises, name, or focus. Changes apply
        immediately on Today and across all future sessions.
      </p>

      <div className="space-y-3">
        {draft
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((day) => {
            const isOpen = openDay === day.index
            return (
              <Card key={day.index} className="!p-3">
                <button
                  onClick={() => setOpenDay(isOpen ? null : day.index)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div>
                    <p className="font-display text-base font-semibold">
                      Day {day.index + 1} ·{' '}
                      <span className="rainbow-text">{day.name}</span>
                    </p>
                    <p className="text-xs text-white/55 mt-0.5">
                      {day.focus} · {day.exerciseNames.length}{' '}
                      {day.exerciseNames.length === 1 ? 'exercise' : 'exercises'}
                    </p>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      'text-white/45 transition-transform',
                      isOpen && 'rotate-180'
                    )}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-3 border-t border-white/8 pt-3">
                    {/* Day name + focus */}
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="block text-[10px] uppercase tracking-wider text-white/55 mb-1">
                          Name
                        </span>
                        <input
                          value={day.name}
                          onChange={(e) =>
                            patchDay(day.index, { name: e.target.value })
                          }
                          className="set-input w-full"
                          style={{ color: 'white' }}
                        />
                      </label>
                      <label>
                        <span className="block text-[10px] uppercase tracking-wider text-white/55 mb-1">
                          Rest day?
                        </span>
                        <button
                          onClick={() =>
                            patchDay(day.index, { isRest: !day.isRest })
                          }
                          className={cn(
                            'w-full h-[44px] rounded-md text-sm font-semibold transition-all',
                            day.isRest
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                              : 'bg-white/8 text-white/65 border border-white/12'
                          )}
                        >
                          {day.isRest ? '✓ Rest day' : 'Lifting day'}
                        </button>
                      </label>
                    </div>
                    <label>
                      <span className="block text-[10px] uppercase tracking-wider text-white/55 mb-1">
                        Focus
                      </span>
                      <input
                        value={day.focus}
                        onChange={(e) =>
                          patchDay(day.index, { focus: e.target.value })
                        }
                        className="set-input w-full"
                        style={{ color: 'white' }}
                      />
                    </label>

                    {/* Exercise list */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1">
                        Exercises
                      </p>
                      {day.exerciseNames.length === 0 ? (
                        <p className="text-sm text-white/55 italic py-2">
                          No lifts scheduled.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {day.exerciseNames.map((name, idx) => (
                            <li
                              key={name}
                              className="flex items-center gap-2 py-1.5"
                            >
                              <div className="flex flex-col">
                                <button
                                  onClick={() =>
                                    moveExercise(day.index, name, 'up')
                                  }
                                  disabled={idx === 0}
                                  className="text-white/45 hover:text-white disabled:opacity-25 disabled:pointer-events-none px-1"
                                  aria-label="Move up"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m18 15-6-6-6 6" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() =>
                                    moveExercise(day.index, name, 'down')
                                  }
                                  disabled={idx === day.exerciseNames.length - 1}
                                  className="text-white/45 hover:text-white disabled:opacity-25 disabled:pointer-events-none px-1"
                                  aria-label="Move down"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                  </svg>
                                </button>
                              </div>
                              <span className="flex-1 text-sm">{name}</span>
                              <button
                                onClick={() => removeExercise(day.index, name)}
                                className="text-white/35 hover:text-red-300 tap-target -mr-2"
                                aria-label="Remove"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {addingTo === day.index ? (
                        <div className="mt-2 space-y-1.5 rounded-md bg-white/4 p-2">
                          <input
                            value={exerciseSearch}
                            onChange={(e) => setExerciseSearch(e.target.value)}
                            placeholder="Search exercise…"
                            autoFocus
                            className="set-input w-full"
                            style={{ color: 'white' }}
                          />
                          <ul className="max-h-[180px] overflow-y-auto">
                            {searchExercises(exerciseSearch)
                              .filter((e) => !day.exerciseNames.includes(e.name))
                              .slice(0, 30)
                              .map((e) => (
                                <li key={e.name}>
                                  <button
                                    onClick={() =>
                                      addExercise(day.index, e.name)
                                    }
                                    className="w-full flex items-center justify-between gap-2 py-1.5 px-1 text-left hover:bg-white/6 rounded-sm"
                                  >
                                    <span className="text-sm">{e.name}</span>
                                    <span className="text-[10px] text-white/55">
                                      {e.category}
                                    </span>
                                  </button>
                                </li>
                              ))}
                          </ul>
                          <button
                            onClick={() => {
                              setAddingTo(null)
                              setExerciseSearch('')
                            }}
                            className="text-[11px] text-white/55 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingTo(day.index)}
                          className="mt-2 w-full text-xs font-medium text-pink-300 hover:text-pink-200 py-1.5 rounded-md bg-pink-500/8 border border-pink-500/25"
                        >
                          + Add exercise
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={resetToDefault} className="flex-1">
          Reset to default
        </Button>
        <Button onClick={save} className="flex-1">
          Save program
        </Button>
      </div>
    </div>
  )
}

function InstallSection({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4 pt-1">
      <BackButton onBack={onBack} />
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Install on <span className="rainbow-text">phone</span>
      </h2>

      <Card>
        <h3 className="text-sm font-semibold mb-2">iOS Safari</h3>
        <ol className="text-sm text-white/80 space-y-1.5 list-decimal pl-5">
          <li>Open in Safari (not Chrome)</li>
          <li>Tap the Share icon</li>
          <li>Tap "Add to Home Screen"</li>
          <li>Open from the home screen for fullscreen, no browser chrome</li>
        </ol>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-2">Android Chrome</h3>
        <ol className="text-sm text-white/80 space-y-1.5 list-decimal pl-5">
          <li>Tap the menu (⋮)</li>
          <li>Tap "Install app"</li>
          <li>Confirm</li>
        </ol>
      </Card>

      <Card>
        <p className="text-sm text-white/75">
          The app stores everything locally on your phone. Use the Backup tile
          on the More page to download a JSON copy regularly so you don't lose
          data if the browser cache clears.
        </p>
      </Card>
    </div>
  )
}

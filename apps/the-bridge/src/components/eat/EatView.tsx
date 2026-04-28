'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { MEAL_PRESETS } from '@/data/meals'
import { addMeal, deleteMeal } from '@/db/operations'
import { useMeals, useSettings } from '@/db/hooks'
import { todayISO } from '@/lib/date-utils'
import { parseVoiceMeal } from '@/lib/voice-parser'
import { useUIStore } from '@/store/ui'
import type { MealEntry } from '@/types'
import { cn } from '@/lib/cn'

const RAINBOW_COLORS: Record<'cal' | 'p' | 'c' | 'f', string> = {
  cal: 'from-amber-400 to-amber-500',
  p: 'from-pink-400 to-pink-500',
  c: 'from-purple-400 to-purple-500',
  f: 'from-blue-400 to-blue-500',
}

export function EatView() {
  const settings = useSettings()
  const date = useUIStore((s) => s.selectedDate) || todayISO()
  const meals = useMeals(date)
  const [manualOpen, setManualOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)

  const totals = useMemo(
    () =>
      meals.reduce(
        (acc, m) => ({
          cal: acc.cal + m.cal,
          p: acc.p + m.p,
          c: acc.c + m.c,
          f: acc.f + m.f,
        }),
        { cal: 0, p: 0, c: 0, f: 0 }
      ),
    [meals]
  )

  return (
    <div className="space-y-4 pt-1">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Today's <span className="rainbow-text">macros</span>
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <MacroTile
          label="Calories"
          color={RAINBOW_COLORS.cal}
          value={totals.cal}
          target={settings.calorieTarget}
          unit="kcal"
        />
        <MacroTile
          label="Protein"
          color={RAINBOW_COLORS.p}
          value={totals.p}
          target={settings.proteinTarget}
          unit="g"
        />
        <MacroTile
          label="Carbs"
          color={RAINBOW_COLORS.c}
          value={totals.c}
          target={settings.carbsTarget}
          unit="g"
        />
        <MacroTile
          label="Fat"
          color={RAINBOW_COLORS.f}
          value={totals.f}
          target={settings.fatTarget}
          unit="g"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setManualOpen(true)} className="flex-1">
          Log meal
        </Button>
        <Button variant="ghost" onClick={() => setVoiceOpen(true)}>
          🎤 Voice
        </Button>
      </div>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-white/55 mb-2">
          Meal presets
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() =>
                addMeal(date, {
                  id: crypto.randomUUID(),
                  name: p.name,
                  cal: p.cal,
                  p: p.p,
                  c: p.c,
                  f: p.f,
                  time: now(),
                  presetId: p.id,
                })
              }
              className="glass-card p-3 text-left"
            >
              <p className="text-[11px] uppercase tracking-wider text-white/45">
                {p.type}
              </p>
              <p className="text-sm font-medium leading-tight mt-0.5">{p.name}</p>
              <p className="text-[11px] font-mono text-white/55 mt-1">
                {p.cal} · {p.p}g · {p.c}g · {p.f}g
              </p>
            </button>
          ))}
        </div>
      </section>

      {meals.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-white/55 mb-2">
            Today's meals
          </h3>
          <ul className="space-y-2">
            {meals.map((m) => (
              <li key={m.id} className="glass-card p-3 flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight">{m.name}</p>
                  <p className="text-[11px] font-mono text-white/55 mt-0.5">
                    {m.time} · {m.cal} kcal · {m.p}g P · {m.c}g C · {m.f}g F
                  </p>
                </div>
                <button
                  onClick={() => deleteMeal(date, m.id)}
                  className="text-white/40 hover:text-red-300 tap-target -mr-2"
                  aria-label="Delete meal"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ManualMealModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        date={date}
      />
      <VoiceMealModal
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        date={date}
      />
    </div>
  )
}

function MacroTile({
  label,
  color,
  value,
  target,
  unit,
}: {
  label: string
  color: string
  value: number
  target: number
  unit: string
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <Card className="!p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/55">
        {label}
      </p>
      <p className="font-mono text-2xl font-semibold mt-1">
        {Math.round(value)}
        <span className="text-xs text-white/45"> / {target}</span>
      </p>
      <p className="text-[10px] text-white/45 -mt-0.5">{unit}</p>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mt-2">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all',
            color
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  )
}

function ManualMealModal({
  open,
  onClose,
  date,
}: {
  open: boolean
  onClose: () => void
  date: string
}) {
  const [name, setName] = useState('')
  const [cal, setCal] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [f, setF] = useState('')

  function reset() {
    setName('')
    setCal('')
    setP('')
    setC('')
    setF('')
  }

  async function save() {
    if (!name.trim()) return
    const meal: MealEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      cal: Number(cal) || 0,
      p: Number(p) || 0,
      c: Number(c) || 0,
      f: Number(f) || 0,
      time: now(),
    }
    await addMeal(date, meal)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log meal">
      <div className="space-y-3">
        <input
          placeholder="Name (e.g. Lunch)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="set-input w-full text-left text-base font-normal !font-sans"
          style={{ paddingLeft: 12, paddingRight: 12 }}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Calories" value={cal} onChange={setCal} />
          <Field label="Protein g" value={p} onChange={setP} />
          <Field label="Carbs g" value={c} onChange={setC} />
          <Field label="Fat g" value={f} onChange={setF} />
        </div>
        <Button onClick={save} className="w-full">
          Add to today
        </Button>
      </div>
    </Modal>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (s: string) => void
}) {
  return (
    <label>
      <span className="block text-xs text-white/55 mb-1">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="set-input w-full"
      />
    </label>
  )
}

function VoiceMealModal({
  open,
  onClose,
  date,
}: {
  open: boolean
  onClose: () => void
  date: string
}) {
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const { toast } = useToast()

  function start() {
    const W = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition
      webkitSpeechRecognition?: new () => SpeechRecognition
    }
    const Rec = W.SpeechRecognition ?? W.webkitSpeechRecognition
    if (!Rec) {
      toast('Voice not supported in this browser', 'error')
      return
    }
    const r = new Rec()
    r.lang = 'en-US'
    r.continuous = false
    r.interimResults = false
    r.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join(' ')
      setTranscript(text)
      setListening(false)
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    setListening(true)
    r.start()
  }

  async function save() {
    const parsed = parseVoiceMeal(transcript)
    if (!parsed) {
      toast('Could not parse meal', 'error')
      return
    }
    await addMeal(date, {
      id: crypto.randomUUID(),
      ...parsed,
      time: now(),
    })
    setTranscript('')
    onClose()
    toast(`Added: ${parsed.name}`, 'success')
  }

  return (
    <Modal open={open} onClose={onClose} title="Voice log">
      <p className="text-xs text-white/55 mb-3">
        Try: "750 calories 40 grams protein 80 carbs 22 fat oatmeal"
      </p>
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={3}
        className="w-full rounded-md bg-white/8 border border-white/12 p-3 text-sm focus:outline-none focus:border-pink-400/50"
        placeholder="Tap mic or type..."
      />
      <div className="flex gap-2 mt-3">
        <Button variant="ghost" onClick={start} disabled={listening}>
          {listening ? '🎙️ Listening…' : '🎤 Speak'}
        </Button>
        <Button onClick={save} className="flex-1" disabled={!transcript.trim()}>
          Parse + add
        </Button>
      </div>
    </Modal>
  )
}

function now(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

'use client'

import { useRef } from 'react'
import { cn } from '@/lib/cn'
import { addDays, monthDayLabel, todayISO } from '@/lib/date-utils'
import { getProgramDay } from '@/lib/program-day'

type DayPillsProps = {
  startDate: string
  selectedDate: string
  onSelect: (date: string) => void
  /** how many days to render — defaults to 2 back + today + 4 ahead */
  count?: number
  /** how many of those are in the past (default 2) */
  back?: number
}

export function DayPills({
  startDate,
  selectedDate,
  onSelect,
  count = 7,
  back = 2,
}: DayPillsProps) {
  const today = todayISO()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const days: string[] = []
  for (let i = -back; i < count - back; i++) {
    days.push(addDays(today, i))
  }
  const showJumpedPill = !days.includes(selectedDate)

  return (
    <div className="flex items-stretch gap-2">
      <button
        onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
        className="shrink-0 rounded-pill bg-white/6 border border-white/10 text-white/70 hover:text-white px-2.5 flex items-center justify-center"
        aria-label="Jump to date"
        title="Jump to any date"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
        </svg>
        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value)
          }}
          className="sr-only absolute w-0 h-0"
          aria-hidden="true"
          tabIndex={-1}
        />
      </button>
      <div
        className="flex gap-2 overflow-x-auto py-1 scroll-smooth flex-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {showJumpedPill && (
          <Pill
            date={selectedDate}
            label={monthDayLabel(selectedDate)}
            sub={getProgramDay(startDate, selectedDate).name}
            isActive
            isToday={false}
            onSelect={onSelect}
          />
        )}
        {days.map((date) => {
          const isActive = date === selectedDate
          const isToday = date === today
          const day = getProgramDay(startDate, date)
          return (
            <Pill
              key={date}
              date={date}
              label={isToday ? 'Today' : monthDayLabel(date)}
              sub={day.name}
              isActive={isActive}
              isToday={isToday}
              onSelect={onSelect}
            />
          )
        })}
      </div>
    </div>
  )
}

function Pill({
  date,
  label,
  sub,
  isActive,
  isToday,
  onSelect,
}: {
  date: string
  label: string
  sub: string
  isActive: boolean
  isToday: boolean
  onSelect: (d: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(date)}
      className={cn(
        'shrink-0 px-3 py-2 rounded-pill border text-xs font-medium transition-all',
        'min-w-[72px] flex flex-col items-center gap-0.5',
        isActive
          ? 'rainbow-bright-fill text-white border-transparent shadow-[0_0_24px_rgba(236,72,153,0.5)]'
          : isToday
          ? 'bg-white/14 text-white border-white/20'
          : 'bg-white/6 text-white/70 border-white/10'
      )}
    >
      <span className="text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </span>
      <span className="text-[11px] font-semibold leading-tight">{sub}</span>
    </button>
  )
}

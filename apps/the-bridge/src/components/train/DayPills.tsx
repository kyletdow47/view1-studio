'use client'

import { cn } from '@/lib/cn'
import { addDays, monthDayLabel, todayISO } from '@/lib/date-utils'
import { getProgramDay } from '@/lib/program-day'

type DayPillsProps = {
  startDate: string
  selectedDate: string
  onSelect: (date: string) => void
  /** how many days forward to render including today */
  count?: number
}

export function DayPills({
  startDate,
  selectedDate,
  onSelect,
  count = 7,
}: DayPillsProps) {
  const today = todayISO()
  const days: string[] = []
  for (let i = 0; i < count; i++) {
    days.push(addDays(today, i))
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto -mx-4 px-4 py-1 scroll-smooth"
      style={{ scrollbarWidth: 'none' }}
    >
      {days.map((date) => {
        const isActive = date === selectedDate
        const isToday = date === today
        const day = getProgramDay(startDate, date)
        return (
          <button
            key={date}
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
              {isToday ? 'Today' : monthDayLabel(date)}
            </span>
            <span className="text-[11px] font-semibold leading-tight">
              {day.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

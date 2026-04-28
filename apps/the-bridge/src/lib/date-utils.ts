export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function isValidISO(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const d = fromISO(iso)
  return !isNaN(d.getTime())
}

/** b - a in calendar days (whole number, can be negative) */
export function daysBetween(a: string, b: string): number {
  const da = fromISO(a)
  const db = fromISO(b)
  const ms = db.getTime() - da.getTime()
  return Math.round(ms / 86400000)
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function shortDayLabel(iso: string): string {
  const d = fromISO(iso)
  return DAY_NAMES[d.getDay()]
}

export function monthDayLabel(iso: string): string {
  const d = fromISO(iso)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

/** "today", "yesterday", "3d ago", or month-day */
export function relativeLabel(iso: string, now = todayISO()): string {
  const days = daysBetween(iso, now)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days > 0 && days < 7) return `${days}d ago`
  return monthDayLabel(iso)
}

/** Month keys look like "2026-11". Month numbers are 1-12 everywhere in this file. */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (n: number) => String(n).padStart(2, '0')

export const monthKey = (year: number, month: number) => `${year}-${pad(month)}`

export function parseMonthKey(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, month: m }
}

export function currentMonthKey(now = new Date()): string {
  return monthKey(now.getFullYear(), now.getMonth() + 1)
}

/** Day 0 of the next month is the last day of this month, so leap years come for free. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function listDates(ym: string): string[] {
  const { year, month } = parseMonthKey(ym)
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => `${ym}-${pad(i + 1)}`)
}

export function shiftMonth(ym: string, delta: number): string {
  const { year, month } = parseMonthKey(ym)
  const index = year * 12 + (month - 1) + delta
  return monthKey(Math.floor(index / 12), (index % 12) + 1)
}

export const monthName = (month: number) => MONTHS[month - 1]
export const monthNames = () => MONTHS

export function formatMonthLabel(ym: string): string {
  const { year, month } = parseMonthKey(ym)
  return `${MONTHS[month - 1]} ${year}`
}

export function dayParts(date: string): { day: number; weekday: string; short: string } {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return { day: d, weekday, short: `${MONTHS[m - 1].slice(0, 3)} ${d}` }
}

export function todayString(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** A sensible default date for a new record in the selected month. */
export function defaultDateFor(ym: string, now = new Date()): string {
  return currentMonthKey(now) === ym ? todayString(now) : `${ym}-01`
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)
}

import type { AppData } from './types'
import { computeMonth } from './calc'
import { dayParts, formatMonthLabel, listDates } from './dates'

const esc = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const row = (cells: Array<string | number | null | undefined>) => cells.map(esc).join(',')
const r2 = (n: number) => Math.round(n * 100) / 100

/** One CSV with clearly titled sections. Opens cleanly in Excel. */
export function buildReportCsv(data: AppData, month: string): string {
  const s = computeMonth(data, month)
  const names = data.members.map((m) => m.name)
  const lines: string[] = []

  lines.push(row(['Flat Meal Manager report', formatMonthLabel(month)]))
  lines.push('')
  lines.push(row(['SUMMARY']))
  lines.push(row(['Total morning meals', s.totalMorning]))
  lines.push(row(['Total night meals', s.totalNight]))
  lines.push(row(['Total meals', s.totalMeals]))
  lines.push(row(['Total expenses (BDT)', r2(s.totalExpenses)]))
  lines.push(row(['Meal rate (BDT)', s.mealRate === null ? 'Not calculated' : r2(s.mealRate)]))
  lines.push(row(['Total deposits (BDT)', r2(s.totalDeposits)]))
  lines.push(row(['Total balance (BDT)', r2(s.totalBalance)]))
  lines.push('')
  lines.push(row(['MEMBER SUMMARY']))
  lines.push(row(['Member', 'Morning meals', 'Night meals', 'Total meals', 'Meal cost (BDT)', 'Deposited (BDT)', 'Balance (BDT)', 'Status']))
  for (const m of s.members)
    lines.push(row([m.name, m.morning, m.night, m.meals, r2(m.cost), r2(m.deposits), r2(m.balance), m.balance >= 0 ? 'Remaining' : 'Due']))
  lines.push('')
  lines.push(row(['DAILY MEAL RECORDS (1 = Yes, 0 = No, blank = not entered)']))
  lines.push(row(['Date', 'Session', ...names, 'Session total']))
  for (const date of listDates(month)) {
    const day = data.meals[date]
    for (const session of ['morning', 'night'] as const) {
      const vals = data.members.map((m) => day?.[session][m.id])
      const total = vals.reduce<number>((a, v) => a + (v === 1 ? 1 : 0), 0)
      lines.push(row([`${date} (${dayParts(date).weekday})`, session === 'morning' ? 'Morning' : 'Night', ...vals, total]))
    }
  }
  lines.push('')
  lines.push(row(['EXPENSES']))
  lines.push(row(['Date', 'Description', 'Category', 'Amount (BDT)']))
  for (const e of data.expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)))
    lines.push(row([e.date, e.title, e.category ?? '', e.amount]))
  lines.push('')
  lines.push(row(['DEPOSITS']))
  lines.push(row(['Date', 'Member', 'Note', 'Amount (BDT)']))
  for (const d of data.deposits.filter((d) => d.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)))
    lines.push(row([d.date, data.members.find((m) => m.id === d.memberId)?.name ?? 'Unknown', d.note ?? '', d.amount]))

  return lines.join('\r\n')
}

export function downloadFile(filename: string, content: string, mime: string, bom = false) {
  const blob = new Blob([bom ? '﻿' + content : content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

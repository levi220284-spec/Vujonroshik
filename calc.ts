import type { AppData, MealValue } from './types'
import { listDates } from './dates'

/**
 * The ONE place where numbers are computed. Every page reads from
 * computeMonth(); nothing else sums meals or money. Values stay unrounded here;
 * rounding only happens when something is displayed.
 */

export interface DayStat {
  date: string
  morning: number
  night: number
  total: number
}

export interface MemberStat {
  id: string
  name: string
  morning: number
  night: number
  meals: number
  /** meals x meal rate. 0 while the rate is not calculable. */
  cost: number
  deposits: number
  /** deposits - cost. Positive = remaining balance, negative = due. */
  balance: number
}

export interface MonthStats {
  month: string
  days: DayStat[]
  members: MemberStat[]
  totalMorning: number
  totalNight: number
  totalMeals: number
  totalExpenses: number
  /** null when nobody has a meal yet (never divide by zero). */
  mealRate: number | null
  totalDeposits: number
  totalCost: number
  /** Sum of every member's balance. */
  totalBalance: number
  /** totalCost - totalExpenses. Should be ~0 whenever mealRate is not null. */
  reconciliationGap: number
}

const one = (v: MealValue | undefined) => (v === 1 ? 1 : 0)

export function computeMonth(data: AppData, month: string): MonthStats {
  const dates = listDates(month)
  const memberIds = data.members.map((m) => m.id)

  const morningBy: Record<string, number> = {}
  const nightBy: Record<string, number> = {}
  for (const id of memberIds) {
    morningBy[id] = 0
    nightBy[id] = 0
  }

  const days: DayStat[] = dates.map((date) => {
    const day = data.meals[date]
    let morning = 0
    let night = 0
    if (day) {
      for (const id of memberIds) {
        const m = one(day.morning[id])
        const n = one(day.night[id])
        morning += m
        night += n
        morningBy[id] += m
        nightBy[id] += n
      }
    }
    return { date, morning, night, total: morning + night }
  })

  const totalMorning = days.reduce((s, d) => s + d.morning, 0)
  const totalNight = days.reduce((s, d) => s + d.night, 0)
  const totalMeals = totalMorning + totalNight

  const totalExpenses = data.expenses
    .filter((e) => e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0)

  const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : null

  const depositBy: Record<string, number> = {}
  for (const d of data.deposits) {
    if (d.date.startsWith(month)) depositBy[d.memberId] = (depositBy[d.memberId] ?? 0) + d.amount
  }

  const members: MemberStat[] = data.members.map((m) => {
    const morning = morningBy[m.id]
    const night = nightBy[m.id]
    const meals = morning + night
    const cost = mealRate === null ? 0 : meals * mealRate
    const deposits = depositBy[m.id] ?? 0
    return { id: m.id, name: m.name, morning, night, meals, cost, deposits, balance: deposits - cost }
  })

  const totalDeposits = members.reduce((s, m) => s + m.deposits, 0)
  const totalCost = members.reduce((s, m) => s + m.cost, 0)
  const totalBalance = members.reduce((s, m) => s + m.balance, 0)

  return {
    month,
    days,
    members,
    totalMorning,
    totalNight,
    totalMeals,
    totalExpenses,
    mealRate,
    totalDeposits,
    totalCost,
    totalBalance,
    reconciliationGap: mealRate === null ? 0 : totalCost - totalExpenses,
  }
}

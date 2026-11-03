import { describe, expect, it } from 'vitest'
import { computeMonth } from './calc'
import { daysInMonth, listDates, shiftMonth } from './dates'
import { defaultData } from './storage'
import { parseAmount, rate, taka } from './format'
import { parseBackup, validateData } from './storage'
import type { AppData } from './types'

/** Builds a month where member i eats `meals[i]` meals, split morning-first. */
function withMeals(counts: number[], month = '2026-11'): AppData {
  const data = defaultData()
  counts.forEach((count, i) => {
    const id = data.members[i].id
    for (let k = 0; k < count; k++) {
      const date = `${month}-${String((k >> 1) + 1).padStart(2, '0')}`
      const s = k % 2 === 0 ? 'morning' : 'night'
      data.meals[date] ??= { morning: {}, night: {} }
      data.meals[date][s][id] = 1
    }
  })
  return data
}

describe('meal rate', () => {
  it('matches the spec example: 21000 / 300 = 70', () => {
    const d = withMeals([45, 40, 42, 38, 43, 46, 46])
    d.expenses.push({ id: 'e', date: '2026-11-05', title: 'Bazar', amount: 21000 })
    const s = computeMonth(d, '2026-11')
    expect(s.totalMeals).toBe(300)
    expect(s.mealRate).toBe(70)
    expect(s.members[0].cost).toBe(3150)
    expect(s.members[3].cost).toBe(2660)
  })

  it('never divides by zero', () => {
    const d = defaultData()
    d.expenses.push({ id: 'e', date: '2026-11-05', title: 'Rice', amount: 500 })
    const s = computeMonth(d, '2026-11')
    expect(s.mealRate).toBeNull()
    expect(s.members.every((m) => m.cost === 0)).toBe(true)
    expect(rate(s.mealRate)).toBe('Not calculated')
  })

  it('member costs add up to total expenses even when the rate is a repeating decimal', () => {
    const d = withMeals([10, 11, 12, 13, 14, 15, 16])
    d.expenses.push({ id: 'e', date: '2026-11-02', title: 'x', amount: 15000 })
    const s = computeMonth(d, '2026-11')
    expect(s.mealRate).toBeCloseTo(15000 / 91, 10)
    expect(Math.abs(s.reconciliationGap)).toBeLessThan(1e-9)
  })
})

describe('balances and months', () => {
  it('balance = deposits - cost, negative means due', () => {
    const d = withMeals([45, 0, 0, 0, 0, 0, 0])
    d.expenses.push({ id: 'e', date: '2026-11-02', title: 'x', amount: 3150 })
    d.deposits.push({ id: 'a', memberId: 'm1', date: '2026-11-03', amount: 2000 })
    d.deposits.push({ id: 'b', memberId: 'm1', date: '2026-11-20', amount: 1000 })
    const s = computeMonth(d, '2026-11')
    expect(s.members[0].deposits).toBe(3000)
    expect(s.members[0].balance).toBe(-150)
  })

  it('keeps months separate', () => {
    const d = withMeals([4], '2026-10')
    d.expenses.push({ id: 'e', date: '2026-10-31', title: 'x', amount: 400 })
    expect(computeMonth(d, '2026-11').totalMeals).toBe(0)
    expect(computeMonth(d, '2026-11').totalExpenses).toBe(0)
    expect(computeMonth(d, '2026-10').totalMeals).toBe(4)
    expect(computeMonth(d, '2026-10').mealRate).toBe(100)
  })

  it('ignores NO and unselected as zero meals', () => {
    const d = defaultData()
    d.meals['2026-11-01'] = { morning: { m1: 0, m2: 1 }, night: {} }
    const s = computeMonth(d, '2026-11')
    expect(s.totalMorning).toBe(1)
    expect(s.days[0].total).toBe(1)
  })
})

describe('dates', () => {
  it('handles leap years and month lengths', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2100, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
    expect(listDates('2024-02')).toHaveLength(29)
    expect(listDates('2026-11')[29]).toBe('2026-11-30')
  })
  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-11', -11)).toBe('2025-12')
  })
})

describe('format and backup', () => {
  it('formats taka', () => {
    expect(taka(3150)).toBe('৳3,150')
    expect(taka(73.8916)).toBe('৳73.89')
    expect(taka(-150)).toBe('-৳150')
    expect(rate(70)).toBe('৳70.00')
  })
  it('parses amounts strictly', () => {
    expect(parseAmount('2,500')).toBe(2500)
    expect(parseAmount('12.345')).toBe(12.35)
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('0')).toBeNull()
  })
  it('round-trips a backup and rejects junk', () => {
    const d = withMeals([3, 2])
    d.expenses.push({ id: 'e', date: '2026-11-02', title: 'x', amount: 10 })
    expect(parseBackup(JSON.stringify(d))).toEqual(d)
    expect(() => parseBackup('nope')).toThrow()
    expect(() => validateData({ version: 1, members: [], meals: {} })).toThrow()
    expect(() => validateData({ ...d, expenses: [{ id: 'x', title: 't', date: 'bad', amount: 1 }] })).toThrow()
  })
})

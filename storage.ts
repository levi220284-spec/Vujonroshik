import type { AppData, DayMeals, Deposit, Expense, MealValue, Member } from './types'

const KEY = 'flat-meal-manager:v1'

/**
 * Storage is hidden behind this tiny interface. To move to Supabase later,
 * write another Repository and hand it to the store; no page needs to change.
 */
export interface Repository {
  load(): AppData
  save(data: AppData): void
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export function defaultData(): AppData {
  return {
    version: 1,
    members: Array.from({ length: 7 }, (_, i) => ({ id: `m${i + 1}`, name: `Member ${i + 1}` })),
    meals: {},
    expenses: [],
    deposits: [],
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

/** Validates unknown JSON and returns clean AppData, or throws an Error with a readable reason. */
export function validateData(raw: unknown): AppData {
  if (!isObj(raw)) throw new Error('Backup file is not a valid object.')
  if (raw.version !== 1) throw new Error('Unsupported backup version.')
  if (!Array.isArray(raw.members) || raw.members.length === 0) throw new Error('Backup has no members.')

  const members: Member[] = raw.members.map((m, i) => {
    if (!isObj(m) || typeof m.id !== 'string' || typeof m.name !== 'string') throw new Error(`Member #${i + 1} is invalid.`)
    return { id: m.id, name: m.name }
  })
  const ids = new Set(members.map((m) => m.id))
  if (ids.size !== members.length) throw new Error('Backup has duplicate member ids.')

  const meals: Record<string, DayMeals> = {}
  if (!isObj(raw.meals)) throw new Error('Backup meals are invalid.')
  for (const [date, day] of Object.entries(raw.meals)) {
    if (!isDate(date) || !isObj(day)) throw new Error(`Meal record "${date}" is invalid.`)
    const clean: DayMeals = { morning: {}, night: {} }
    for (const s of ['morning', 'night'] as const) {
      const src = day[s]
      if (!isObj(src)) continue
      for (const [id, v] of Object.entries(src)) if (ids.has(id) && (v === 0 || v === 1)) clean[s][id] = v as MealValue
    }
    meals[date] = clean
  }

  const expenses: Expense[] = (Array.isArray(raw.expenses) ? raw.expenses : []).map((e, i) => {
    if (!isObj(e) || typeof e.id !== 'string' || typeof e.title !== 'string' || !isDate(e.date) || !isAmount(e.amount))
      throw new Error(`Expense #${i + 1} is invalid.`)
    return { id: e.id, title: e.title, date: e.date, amount: e.amount, category: typeof e.category === 'string' ? e.category : undefined }
  })

  const deposits: Deposit[] = (Array.isArray(raw.deposits) ? raw.deposits : []).map((d, i) => {
    if (!isObj(d) || typeof d.id !== 'string' || typeof d.memberId !== 'string' || !ids.has(d.memberId) || !isDate(d.date) || !isAmount(d.amount))
      throw new Error(`Deposit #${i + 1} is invalid.`)
    return { id: d.id, memberId: d.memberId, date: d.date, amount: d.amount, note: typeof d.note === 'string' ? d.note : undefined }
  })

  return { version: 1, members, meals, expenses, deposits }
}

export function parseBackup(text: string): AppData {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  return validateData(json)
}

export const localStorageRepository: Repository = {
  load() {
    try {
      const text = localStorage.getItem(KEY)
      if (!text) return defaultData()
      return validateData(JSON.parse(text))
    } catch {
      return defaultData()
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* storage can be blocked or full; the app keeps working in memory */
    }
  },
}

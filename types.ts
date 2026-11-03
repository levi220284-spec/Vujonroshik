export type Session = 'morning' | 'night'
export const SESSIONS: Session[] = ['morning', 'night']

/** 1 = YES (a meal), 0 = NO. A missing key means "not entered yet" (neutral). */
export type MealValue = 0 | 1

export interface Member {
  id: string
  name: string
}

export interface DayMeals {
  morning: Record<string, MealValue>
  night: Record<string, MealValue>
}

export interface Expense {
  id: string
  date: string // YYYY-MM-DD
  title: string
  amount: number
  category?: string
}

export interface Deposit {
  id: string
  memberId: string
  date: string // YYYY-MM-DD
  amount: number
  note?: string
}

/**
 * Everything the app stores. Months are never stored separately: every record
 * carries a full date, and a month is just a filter over dates. That is what
 * keeps months independent and makes a future database move easy.
 */
export interface AppData {
  version: 1
  members: Member[]
  meals: Record<string, DayMeals> // key: YYYY-MM-DD
  expenses: Expense[]
  deposits: Deposit[]
}

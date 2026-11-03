const TAKA = '৳' // ৳

const plain = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const fixed2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ৳3,150 or ৳3,150.43. Only for display; never feed this back into math. */
export function taka(n: number): string {
  const rounded = Math.round(n * 100) / 100
  const sign = rounded < 0 ? '-' : ''
  return `${sign}${TAKA}${plain.format(Math.abs(rounded))}`
}

/** Meal rate is always shown with two decimals, or "Not calculated". */
export function rate(n: number | null): string {
  return n === null ? 'Not calculated' : `${TAKA}${fixed2.format(n)}`
}

export const num = (n: number) => plain.format(n)

/** Parse a user-typed amount. Returns null for empty, negative, zero or non-numeric input. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s৳]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

import clsx from 'clsx'
import { Check, Minus, Moon, Sun, X } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { Card, PageHeader } from '../components/ui'
import { dayParts, todayString } from '../lib/dates'
import { num } from '../lib/format'
import { useStore } from '../lib/store'
import type { MealValue, Session } from '../lib/types'

/** Click cycles: not entered -> Yes -> No -> not entered. */
const next = (v: MealValue | undefined): MealValue | null => (v === undefined ? 1 : v === 1 ? 0 : null)

function Cell({ value, label, onClick, r, c, date, session, id }: {
  value: MealValue | undefined
  label: string
  onClick: () => void
  r: number
  c: number
  date: string
  session: Session
  id: string
}) {
  return (
    <button
      data-cell
      data-r={r}
      data-c={c}
      data-date={date}
      data-s={session}
      data-id={id}
      onClick={onClick}
      aria-label={`${label}: ${value === 1 ? 'Yes' : value === 0 ? 'No' : 'not entered'}`}
      className={clsx(
        'mx-auto flex h-10 w-11 items-center justify-center rounded-md border text-xs font-semibold select-none',
        value === 1 && 'border-emerald-200 bg-emerald-100 text-emerald-700',
        value === 0 && 'border-rose-100 bg-rose-50 text-rose-500',
        value === undefined && 'border-dashed border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      {value === 1 ? (
        <span className="flex items-center gap-0.5"><Check size={13} strokeWidth={3} />Yes</span>
      ) : value === 0 ? (
        <span className="flex items-center gap-0.5"><X size={13} strokeWidth={3} />No</span>
      ) : (
        <Minus size={13} />
      )}
    </button>
  )
}

export default function MealEntry() {
  const { data, stats, setMeal, setRow } = useStore()
  const tableRef = useRef<HTMLTableElement>(null)
  const today = todayString()
  const members = data.members

  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const el = e.target as HTMLElement
    if (el.dataset.cell === undefined) return
    const r = Number(el.dataset.r)
    const c = Number(el.dataset.c)
    const { date, s, id } = el.dataset as { date: string; s: Session; id: string }
    const move = (dr: number, dc: number) => {
      const target = tableRef.current?.querySelector<HTMLElement>(`[data-r="${r + dr}"][data-c="${c + dc}"]`)
      if (target) target.focus()
      e.preventDefault()
    }
    switch (e.key) {
      case 'ArrowUp': return move(-1, 0)
      case 'ArrowDown': return move(1, 0)
      case 'ArrowLeft': return move(0, -1)
      case 'ArrowRight': return move(0, 1)
      case 'y': case 'Y': case '1': e.preventDefault(); return setMeal(date, s, id, 1)
      case 'n': case 'N': case '0': e.preventDefault(); return setMeal(date, s, id, 0)
      case 'Backspace': case 'Delete': e.preventDefault(); return setMeal(date, s, id, null)
    }
  }

  const sessionTotals = (s: Session) => members.map((m) => stats.members.find((x) => x.id === m.id)![s])
  const headCell = 'sticky top-0 z-20 border-b border-line bg-slate-50 px-1 py-2.5 text-center text-xs font-medium text-slate-500'

  return (
    <>
      <PageHeader title="Daily Meal Entry" subtitle="Tap a cell to cycle Yes, No, empty. Saved automatically." />

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">Morning {num(stats.totalMorning)}</span>
        <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">Night {num(stats.totalNight)}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">Total {num(stats.totalMeals)}</span>
        <span className="hidden px-1 py-1 text-slate-400 md:inline">Keyboard: arrows move, Y = Yes, N = No, Backspace clears</span>
      </div>

      <Card className="overflow-hidden">
        <div className="scroll-thin max-h-[calc(100vh-230px)] min-h-[320px] overflow-auto">
          <table ref={tableRef} onKeyDown={onKeyDown} className="w-full min-w-max border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={clsx(headCell, 'left-0 z-30 w-[92px] min-w-[92px] text-left pl-3')}>Date</th>
                {members.map((m) => (
                  <th key={m.id} className={clsx(headCell, 'min-w-[52px] max-w-[72px]')} title={m.name}>
                    <div className="mx-auto max-w-[64px] truncate">{m.name}</div>
                  </th>
                ))}
                <th className={clsx(headCell, 'min-w-[64px]')}>Session total</th>
                <th className={clsx(headCell, 'min-w-[64px]')}>Day total</th>
                <th className={clsx(headCell, 'min-w-[52px]')}>All</th>
              </tr>
            </thead>
            <tbody>
              {stats.days.map((day, di) => {
                const parts = dayParts(day.date)
                const isToday = day.date === today
                return (['morning', 'night'] as const).map((session, si) => {
                  const r = di * 2 + si
                  const vals = data.meals[day.date]?.[session] ?? {}
                  const allYes = members.every((m) => vals[m.id] === 1)
                  const rowBg = isToday ? 'bg-brand-50/60' : 'bg-white'
                  const edge = si === 1 ? 'border-b border-line' : 'border-b border-slate-100'
                  return (
                    <tr key={day.date + session} className={rowBg}>
                      <td className={clsx('sticky left-0 z-10 py-1 pl-3 pr-1', rowBg, edge)}>
                        <div className="flex items-center gap-2">
                          <div className="w-[44px] leading-tight">
                            {si === 0 && (
                              <>
                                <div className={clsx('text-[13px] font-semibold', isToday ? 'text-brand-700' : 'text-slate-800')}>{parts.short}</div>
                                <div className="text-[11px] text-slate-400">{parts.weekday}</div>
                              </>
                            )}
                          </div>
                          {session === 'morning' ? <Sun size={15} className="text-amber-500" aria-label="Morning" /> : <Moon size={15} className="text-brand-500" aria-label="Night" />}
                        </div>
                      </td>
                      {members.map((m, ci) => (
                        <td key={m.id} className={clsx('px-0.5 py-1', edge)}>
                          <Cell
                            value={vals[m.id]}
                            r={r}
                            c={ci}
                            date={day.date}
                            session={session}
                            id={m.id}
                            label={`${m.name}, ${parts.short}, ${session}`}
                            onClick={() => setMeal(day.date, session, m.id, next(vals[m.id]))}
                          />
                        </td>
                      ))}
                      <td className={clsx('text-center text-sm font-semibold tabular-nums text-slate-700', edge)}>{session === 'morning' ? day.morning : day.night}</td>
                      {si === 0 ? (
                        <td rowSpan={2} className="border-b border-line bg-slate-50/70 text-center align-middle">
                          <div className="text-sm font-semibold tabular-nums text-slate-900">{day.total}</div>
                          <div className="text-[10px] text-slate-400">{day.morning} + {day.night}</div>
                        </td>
                      ) : null}
                      <td className={clsx('px-1 text-center', edge)}>
                        <button
                          title={allYes ? 'Clear this row' : 'Mark everyone Yes'}
                          aria-label={allYes ? `Clear ${session} on ${parts.short}` : `Mark everyone Yes for ${session} on ${parts.short}`}
                          onClick={() => setRow(day.date, session, allYes ? null : 1)}
                          className={clsx('h-8 rounded-md px-2 text-[11px] font-medium', allYes ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'text-brand-600 hover:bg-brand-50')}
                        >
                          {allYes ? 'Clear' : 'All yes'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
            <tfoot>
              {(['morning', 'night'] as const).map((s) => (
                <tr key={s} className="bg-slate-50 text-sm tabular-nums">
                  <td className="sticky left-0 z-10 bg-slate-50 py-2 pl-3 text-xs font-medium text-slate-500">{s === 'morning' ? 'Morning meals' : 'Night meals'}</td>
                  {sessionTotals(s).map((t, i) => (
                    <td key={members[i].id} className="py-2 text-center font-medium text-slate-700">{t}</td>
                  ))}
                  <td className="text-center font-semibold text-slate-900">{s === 'morning' ? stats.totalMorning : stats.totalNight}</td>
                  <td colSpan={2} />
                </tr>
              ))}
              <tr className="bg-slate-100 text-sm font-semibold tabular-nums text-slate-900">
                <td className="sticky left-0 z-10 bg-slate-100 py-2.5 pl-3 text-xs">Month total</td>
                {stats.members.map((m) => (
                  <td key={m.id} className="py-2.5 text-center">{m.meals}</td>
                ))}
                <td className="text-center">{stats.totalMeals}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  )
}

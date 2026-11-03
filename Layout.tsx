import clsx from 'clsx'
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Lock, LayoutDashboard, LockOpen, Menu, Settings, Table2, Users, Wallet, Receipt, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { formatMonthLabel, monthNames, parseMonthKey, monthKey, shiftMonth } from '../lib/dates'
import { useStore } from '../lib/store'
import { Button } from './ui'

export type RouteId = 'dashboard' | 'meals' | 'summary' | 'expenses' | 'deposits' | 'reports' | 'settings'

export const NAV: { id: RouteId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'meals', label: 'Daily Meal Entry', icon: Table2 },
  { id: 'summary', label: 'Member Summary', icon: Users },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'deposits', label: 'Deposits', icon: Wallet },
  { id: 'reports', label: 'Monthly Reports', icon: FileText },
  { id: 'settings', label: 'Members / Settings', icon: Settings },
]

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">F</div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold text-slate-900">Flat Meal Manager</div>
        <div className="text-xs text-slate-400">Meals and money, sorted</div>
      </div>
    </div>
  )
}

function NavList({ route, onNavigate }: { route: RouteId; onNavigate: (r: RouteId) => void }) {
  return (
    <nav className="mt-6 flex flex-col gap-0.5">
      {NAV.map(({ id, label, icon: Icon }) => (
        <a
          key={id}
          href={`#/${id}`}
          onClick={() => onNavigate(id)}
          aria-current={route === id ? 'page' : undefined}
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
            route === id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          <Icon size={18} strokeWidth={route === id ? 2.2 : 1.8} />
          {label}
        </a>
      ))}
    </nav>
  )
}

export function MonthPicker() {
  const { month, setMonth } = useStore()
  const { year, month: m } = parseMonthKey(month)
  const [yearText, setYearText] = useState(String(year))
  useEffect(() => setYearText(String(year)), [year])

  const commitYear = () => {
    const y = Number(yearText)
    if (Number.isInteger(y) && y >= 2000 && y <= 2100) setMonth(monthKey(y, m))
    else setYearText(String(year))
  }
  const box = 'h-9 rounded-lg border border-line bg-white text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100'

  return (
    <div className="flex items-center gap-1.5">
      <button aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-slate-600 hover:bg-slate-50" onClick={() => setMonth(shiftMonth(month, -1))}>
        <ChevronLeft size={18} />
      </button>
      <select aria-label="Month" value={m} onChange={(e) => setMonth(monthKey(year, Number(e.target.value)))} className={clsx(box, 'px-2')}>
        {monthNames().map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>
      <input
        aria-label="Year"
        inputMode="numeric"
        value={yearText}
        onChange={(e) => setYearText(e.target.value.replace(/\D/g, '').slice(0, 4))}
        onBlur={commitYear}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={clsx(box, 'w-[64px] px-2 text-center tabular-nums')}
      />
      <button aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-slate-600 hover:bg-slate-50" onClick={() => setMonth(shiftMonth(month, 1))}>
        <ChevronRight size={18} />
      </button>
    </div>
  )
}


/** Shared-database mode only: shows who can edit, and lets the manager unlock with the password. */
function AccessBar() {
  const { shared, canEdit, loadState, saveState, unlock, lock, notify } = useStore()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!shared) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pw || busy) return
    setBusy(true)
    setError('')
    const r = await unlock(pw)
    setBusy(false)
    if (r === 'ok') {
      setOpen(false)
      setPw('')
      notify('Editing unlocked')
    } else setError(r === 'wrong' ? 'Wrong password.' : 'Could not reach the database. Try again.')
  }

  if (canEdit) {
    const status = saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved, retrying…' : saveState === 'saved' ? 'All changes saved' : 'Editing'
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className={saveState === 'error' ? 'font-medium text-rose-600' : 'text-slate-500'}>{status}</span>
        <Button size="sm" variant="secondary" onClick={lock}><Lock size={14} />Lock</Button>
      </div>
    )
  }

  return open ? (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        type="password"
        autoFocus
        aria-label="Manager password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Manager password"
        className="h-9 w-44 rounded-lg border border-line bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <Button size="sm" type="submit" disabled={busy || !pw}>{busy ? 'Checking…' : 'Unlock'}</Button>
      <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setError(''); setPw('') }}>Cancel</Button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </form>
  ) : (
    <Button size="sm" variant="secondary" disabled={loadState !== 'ready'} onClick={() => setOpen(true)}>
      <LockOpen size={14} />Unlock editing
    </Button>
  )
}

export function Layout({ route, onNavigate, children }: { route: RouteId; onNavigate: (r: RouteId) => void; children: ReactNode }) {
  const { month, toast, shared, canEdit, loadState, reload } = useStore()
  const [open, setOpen] = useState(false)
  const current = NAV.find((n) => n.id === route)!
  const go = (r: RouteId) => {
    setOpen(false)
    onNavigate(r)
  }

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
        <Brand />
        <NavList route={route} onNavigate={go} />
        <div className="mt-auto rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          {shared ? 'Data is stored in the shared database. Only the manager can change it.' : 'Everything saves automatically in this browser. Use Settings to download a backup.'}
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white px-4 py-5 shadow-xl">
            <div className="flex items-start justify-between">
              <Brand />
              <button aria-label="Close menu" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <NavList route={route} onNavigate={go} />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <current.icon size={18} className="text-slate-400" />
              <span className="lg:hidden">{current.label}</span>
              <span className="hidden items-center gap-2 text-slate-500 lg:flex">
                <CalendarDays size={16} /> {formatMonthLabel(month)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <AccessBar />
            {route !== 'settings' && <MonthPicker />}
          </div>
        </header>

        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          {shared && loadState === 'loading' && <div className="py-24 text-center text-sm text-slate-400">Loading the latest data…</div>}
          {shared && loadState === 'error' && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <span>Could not reach the database, so no data is shown. Editing is switched off until it loads.</span>
              <Button size="sm" variant="secondary" onClick={reload}>Try again</Button>
            </div>
          )}
          {shared && loadState === 'ready' && !canEdit && (
            <div className="mb-5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-slate-500">
              View only. Only the manager can change anything. This page refreshes by itself.
            </div>
          )}
          {(!shared || loadState === 'ready') && children}
        </main>
      </div>

      {toast && (
        <div
          role="status"
          className={clsx(
            'fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg',
            toast.kind === 'error' ? 'bg-rose-600' : 'bg-slate-900',
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

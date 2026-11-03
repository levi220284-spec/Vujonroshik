import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Deposit, Expense, MealValue, Session } from './types'
import { computeMonth, type MonthStats } from './calc'
import { currentMonthKey } from './dates'
import { checkPassword, fetchRemote, remoteConfigured, saveRemote } from './remote'
import { defaultData, localStorageRepository, uid, type Repository } from './storage'

type MealInput = MealValue | null // null clears the cell back to "not entered"

interface Toast {
  id: number
  message: string
  kind: 'ok' | 'error'
}

export type LoadState = 'loading' | 'ready' | 'error'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Store {
  data: AppData
  month: string
  setMonth: (m: string) => void
  /** The single source of every number shown in the app. */
  stats: MonthStats

  /** true = shared database mode (view-only until the manager unlocks). false = this-browser mode. */
  shared: boolean
  canEdit: boolean
  loadState: LoadState
  saveState: SaveState
  unlock: (password: string) => Promise<'ok' | 'wrong' | 'network'>
  lock: () => void
  reload: () => void

  setMeal: (date: string, session: Session, memberId: string, value: MealInput) => void
  setRow: (date: string, session: Session, value: MealInput) => void

  renameMember: (id: string, name: string) => void
  addMember: () => void
  memberHasData: (id: string) => boolean
  removeMember: (id: string) => void

  addExpense: (e: Omit<Expense, 'id'>) => void
  updateExpense: (id: string, e: Omit<Expense, 'id'>) => void
  deleteExpense: (id: string) => void

  addDeposit: (d: Omit<Deposit, 'id'>) => void
  updateDeposit: (id: string, d: Omit<Deposit, 'id'>) => void
  deleteDeposit: (id: string) => void

  replaceAll: (data: AppData) => void
  resetAll: () => void

  toast: Toast | null
  notify: (message: string, kind?: 'ok' | 'error') => void
}

const Ctx = createContext<Store | null>(null)

const PW_KEY = 'flat-meal-manager:pw'
const readPw = (): string | null => {
  try {
    return sessionStorage.getItem(PW_KEY)
  } catch {
    return null
  }
}
const writePw = (pw: string | null) => {
  try {
    if (pw === null) sessionStorage.removeItem(PW_KEY)
    else sessionStorage.setItem(PW_KEY, pw)
  } catch {
    /* ignore: the manager just has to unlock again after a refresh */
  }
}

export function StoreProvider({ children, repository = localStorageRepository }: { children: ReactNode; repository?: Repository }) {
  const shared = remoteConfigured
  const [data, setData] = useState<AppData>(() => (shared ? defaultData() : repository.load()))
  const [month, setMonth] = useState<string>(() => currentMonthKey())
  const [toast, setToast] = useState<Toast | null>(null)
  const [loadState, setLoadState] = useState<LoadState>(shared ? 'loading' : 'ready')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [password, setPassword] = useState<string | null>(() => (shared ? readPw() : null))
  const [retryTick, setRetryTick] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)

  const toastTimer = useRef<number | undefined>(undefined)
  const dirty = useRef(false) // true only when the USER changed something that still needs saving
  const lastSeen = useRef<string | null>(null) // updated_at of the remote copy we are showing

  // Editing is allowed in this-browser mode always; in shared mode only after unlocking AND after a successful load.
  // (Requiring a successful load stops an empty fallback from ever overwriting the real data.)
  const canEdit = shared ? password !== null && loadState === 'ready' : true
  const canEditRef = useRef(canEdit)
  canEditRef.current = canEdit

  const notify = useCallback((message: string, kind: 'ok' | 'error' = 'ok') => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, kind })
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  /** Every change goes through here, so view-only mode can never change anything. */
  const mutate = useCallback(
    (fn: (d: AppData) => AppData) => {
      if (!canEditRef.current) {
        notify('View only. Unlock editing first.', 'error')
        return
      }
      dirty.current = true
      setData(fn)
    },
    [notify],
  )

  // --- this-browser mode: save every change straight away
  useEffect(() => {
    if (!shared) repository.save(data)
  }, [data, repository, shared])

  // --- shared mode: load on start (and when asked to reload)
  useEffect(() => {
    if (!shared) return
    let cancelled = false
    ;(async () => {
      const r = await fetchRemote()
      if (cancelled) return
      if (!r.ok) return setLoadState('error')
      if (r.data) {
        dirty.current = false
        lastSeen.current = r.updatedAt
        setData(r.data)
      }
      setLoadState('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [shared, reloadTick])

  // --- shared mode, viewers: pick up the manager's changes every 30 s and when the tab comes back into view
  useEffect(() => {
    if (!shared || canEdit || loadState !== 'ready') return
    const refresh = async () => {
      const r = await fetchRemote()
      if (r.ok && r.data && r.updatedAt !== lastSeen.current) {
        lastSeen.current = r.updatedAt
        dirty.current = false
        setData(r.data)
      }
    }
    const t = window.setInterval(refresh, 30000)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [shared, canEdit, loadState])

  // --- shared mode, manager: save a moment after the last change
  useEffect(() => {
    if (!shared || !dirty.current || password === null) return
    setSaveState('saving')
    const t = window.setTimeout(async () => {
      const result = await saveRemote(password, data)
      if (result === 'ok') {
        dirty.current = false
        setSaveState('saved')
      } else if (result === 'wrong_password') {
        writePw(null)
        setPassword(null)
        setSaveState('idle')
        notify('Password was rejected. Editing is locked. Your last change was not saved.', 'error')
      } else {
        setSaveState('error')
        window.setTimeout(() => setRetryTick((n) => n + 1), 5000) // try again automatically
      }
    }, 600)
    return () => window.clearTimeout(t)
  }, [data, password, shared, retryTick, notify])

  const unlock: Store['unlock'] = useCallback(
    async (pw) => {
      if (loadState !== 'ready') return 'network'
      const ok = await checkPassword(pw)
      if (ok === 'error') return 'network'
      if (ok === 'no') return 'wrong'
      // Pull the newest copy first so we never save on top of an older one.
      const r = await fetchRemote()
      if (!r.ok) return 'network'
      if (r.data) {
        lastSeen.current = r.updatedAt
        setData(r.data)
      }
      dirty.current = false
      writePw(pw)
      setPassword(pw)
      setSaveState('idle')
      return 'ok'
    },
    [loadState],
  )

  const lock = useCallback(() => {
    writePw(null)
    setPassword(null)
    setSaveState('idle')
  }, [])

  const reload = useCallback(() => {
    setLoadState('loading')
    setReloadTick((n) => n + 1)
  }, [])

  const stats = useMemo(() => computeMonth(data, month), [data, month])

  const setMeal: Store['setMeal'] = useCallback(
    (date, session, memberId, value) => {
      mutate((d) => {
        const day = d.meals[date] ?? { morning: {}, night: {} }
        const sessionMap = { ...day[session] }
        if (value === null) delete sessionMap[memberId]
        else sessionMap[memberId] = value
        return { ...d, meals: { ...d.meals, [date]: { ...day, [session]: sessionMap } } }
      })
    },
    [mutate],
  )

  const setRow: Store['setRow'] = useCallback(
    (date, session, value) => {
      mutate((d) => {
        const day = d.meals[date] ?? { morning: {}, night: {} }
        const sessionMap: Record<string, MealValue> = {}
        if (value !== null) for (const m of d.members) sessionMap[m.id] = value
        return { ...d, meals: { ...d.meals, [date]: { ...day, [session]: sessionMap } } }
      })
    },
    [mutate],
  )

  const renameMember: Store['renameMember'] = useCallback(
    (id, name) => mutate((d) => ({ ...d, members: d.members.map((m) => (m.id === id ? { ...m, name } : m)) })),
    [mutate],
  )

  const addMember = useCallback(
    () => mutate((d) => ({ ...d, members: [...d.members, { id: uid(), name: `Member ${d.members.length + 1}` }] })),
    [mutate],
  )

  const memberHasData = useCallback(
    (id: string) =>
      data.deposits.some((x) => x.memberId === id) ||
      Object.values(data.meals).some((day) => id in day.morning || id in day.night),
    [data],
  )

  const removeMember = useCallback(
    (id: string) =>
      mutate((d) => {
        const used = d.deposits.some((x) => x.memberId === id) || Object.values(d.meals).some((day) => id in day.morning || id in day.night)
        if (used || d.members.length <= 1) return d // never silently destroy history
        return { ...d, members: d.members.filter((m) => m.id !== id) }
      }),
    [mutate],
  )

  const addExpense: Store['addExpense'] = useCallback((e) => mutate((d) => ({ ...d, expenses: [...d.expenses, { ...e, id: uid() }] })), [mutate])
  const updateExpense: Store['updateExpense'] = useCallback(
    (id, e) => mutate((d) => ({ ...d, expenses: d.expenses.map((x) => (x.id === id ? { ...e, id } : x)) })),
    [mutate],
  )
  const deleteExpense = useCallback((id: string) => mutate((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== id) })), [mutate])

  const addDeposit: Store['addDeposit'] = useCallback((x) => mutate((d) => ({ ...d, deposits: [...d.deposits, { ...x, id: uid() }] })), [mutate])
  const updateDeposit: Store['updateDeposit'] = useCallback(
    (id, x) => mutate((d) => ({ ...d, deposits: d.deposits.map((y) => (y.id === id ? { ...x, id } : y)) })),
    [mutate],
  )
  const deleteDeposit = useCallback((id: string) => mutate((d) => ({ ...d, deposits: d.deposits.filter((x) => x.id !== id) })), [mutate])

  const replaceAll = useCallback((next: AppData) => mutate(() => next), [mutate])
  const resetAll = useCallback(() => mutate(() => defaultData()), [mutate])

  const value: Store = {
    data, month, setMonth, stats,
    shared, canEdit, loadState, saveState, unlock, lock, reload,
    setMeal, setRow,
    renameMember, addMember, memberHasData, removeMember,
    addExpense, updateExpense, deleteExpense,
    addDeposit, updateDeposit, deleteDeposit,
    replaceAll, resetAll,
    toast, notify,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside <StoreProvider>')
  return s
}

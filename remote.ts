import type { AppData } from './types'
import { validateData } from './storage'

/**
 * Talks to Supabase over plain REST (no extra library).
 * Set these two values at build time (Vercel: Project Settings > Environment Variables):
 *   VITE_SUPABASE_URL              e.g. https://abcdxyz.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY  the key that starts with sb_publishable_ (safe to expose)
 * If they are missing, the app runs in "this browser only" mode instead.
 */
const BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/+$/, '')
const KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()

export const remoteConfigured = Boolean(BASE && KEY)

function headers(): Record<string, string> {
  const h: Record<string, string> = { apikey: KEY!, 'Content-Type': 'application/json' }
  // New publishable keys (sb_publishable_...) go in `apikey` only. Old anon keys are JWTs and also go in Authorization.
  if (!KEY!.startsWith('sb_')) h.Authorization = `Bearer ${KEY}`
  return h
}

async function timed(url: string, init: RequestInit, ms = 12000): Promise<Response> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

export type FetchResult = { ok: true; data: AppData | null; updatedAt: string | null } | { ok: false }

/** data === null with ok === true means "connected fine, nothing saved yet". */
export async function fetchRemote(): Promise<FetchResult> {
  try {
    const res = await timed(`${BASE}/rest/v1/app_state?id=eq.1&select=data,updated_at`, { headers: headers() })
    if (!res.ok) return { ok: false }
    const rows = (await res.json()) as Array<{ data: unknown; updated_at: string }>
    if (!rows.length) return { ok: true, data: null, updatedAt: null }
    return { ok: true, data: validateData(rows[0].data), updatedAt: rows[0].updated_at }
  } catch {
    return { ok: false }
  }
}

export async function checkPassword(password: string): Promise<'yes' | 'no' | 'error'> {
  try {
    const res = await timed(`${BASE}/rest/v1/rpc/check_password`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ p_password: password }),
    })
    if (!res.ok) return 'error'
    return (await res.json()) === true ? 'yes' : 'no'
  } catch {
    return 'error'
  }
}

export async function saveRemote(password: string, data: AppData): Promise<'ok' | 'wrong_password' | 'error'> {
  try {
    const res = await timed(`${BASE}/rest/v1/rpc/save_state`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ p_password: password, p_data: data }),
    })
    if (res.ok) return 'ok'
    const text = await res.text()
    return text.includes('wrong_password') ? 'wrong_password' : 'error'
  } catch {
    return 'error'
  }
}

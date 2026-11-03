import clsx from 'clsx'
import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx('rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>{children}</section>
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-line hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
}
export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    />
  )
}

const fieldClass =
  'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx(fieldClass, className)} {...rest} />
})

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(fieldClass, 'pr-8', className)} {...rest} />
}

export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-slate-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}

type Tone = 'default' | 'brand' | 'good' | 'bad'
export function StatCard({ label, value, hint, icon, tone = 'default' }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; tone?: Tone }) {
  const brand = tone === 'brand'
  return (
    <div
      className={clsx(
        'rounded-2xl border p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5',
        brand ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={clsx('text-[13px] font-medium', brand ? 'text-brand-100' : 'text-slate-500')}>{label}</span>
        {icon && <span className={brand ? 'text-brand-100' : 'text-slate-400'}>{icon}</span>}
      </div>
      <div
        className={clsx(
          'mt-2 text-2xl font-semibold tabular-nums tracking-tight',
          tone === 'good' && 'text-emerald-600',
          tone === 'bad' && 'text-rose-600',
        )}
      >
        {value}
      </div>
      {hint && <div className={clsx('mt-1 text-xs', brand ? 'text-brand-100' : 'text-slate-400')}>{hint}</div>}
    </div>
  )
}

/** Two-step delete that works everywhere (window.confirm is blocked in some embedded pages). */
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Sure?', className, disabled, title }: {
  onConfirm: () => void
  children: ReactNode
  confirmLabel?: string
  className?: string
  disabled?: boolean
  title?: string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(t)
  }, [armed])
  return (
    <Button
      size="sm"
      variant={armed ? 'danger' : 'ghost'}
      className={className}
      disabled={disabled}
      title={title}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmLabel : children}
    </Button>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-400">{children}</div>
}

/** Shared table styling so every table in the app looks the same. */
export const th = 'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500'
export const thr = th + ' text-right'
export const td = 'px-4 py-3 text-sm text-slate-700'
export const tdr = td + ' text-right tabular-nums'

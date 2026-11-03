import { Pencil, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button, Card, CardHeader, ConfirmButton, Empty, Field, Input, PageHeader, td, tdr, th, thr } from '../components/ui'
import { defaultDateFor, dayParts, formatMonthLabel, isValidDate } from '../lib/dates'
import { parseAmount, rate, taka } from '../lib/format'
import { useStore } from '../lib/store'

const CATEGORIES = ['Rice', 'Fish', 'Vegetables', 'Meat', 'Grocery', 'Other']

export default function Expenses() {
  const { data, month, stats, addExpense, updateExpense, deleteExpense, notify, canEdit } = useStore()
  const blank = () => ({ title: '', date: defaultDateFor(month), amount: '', category: '' })
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ title?: string; date?: string; amount?: string }>({})

  const list = useMemo(
    () => data.expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)),
    [data.expenses, month],
  )

  const reset = () => {
    setForm(blank())
    setEditing(null)
    setErrors({})
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    const title = form.title.trim()
    const amount = parseAmount(form.amount)
    if (!title) next.title = 'Enter a description.'
    if (!isValidDate(form.date) || !form.date.startsWith(month)) next.date = `Pick a date in ${formatMonthLabel(month)}.`
    if (amount === null) next.amount = 'Enter an amount above 0.'
    setErrors(next)
    if (Object.keys(next).length || amount === null) return
    const payload = { title, date: form.date, amount, category: form.category.trim() || undefined }
    if (editing) {
      updateExpense(editing, payload)
      notify('Expense updated')
    } else {
      addExpense(payload)
      notify('Expense added')
    }
    reset()
  }

  const startEdit = (id: string) => {
    const x = data.expenses.find((e) => e.id === id)
    if (!x) return
    setEditing(id)
    setErrors({})
    setForm({ title: x.title, date: x.date, amount: String(x.amount), category: x.category ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <PageHeader title="Expenses" subtitle={`Bazar and kitchen costs for ${formatMonthLabel(month)}. The meal rate updates as soon as you save.`} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-[13px] font-medium text-slate-500">Total expenses</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{taka(stats.totalExpenses)}</div>
          <div className="mt-1 text-xs text-slate-400">{list.length} {list.length === 1 ? 'entry' : 'entries'}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-medium text-slate-500">Resulting meal rate</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-brand-600">{rate(stats.mealRate)}</div>
          <div className="mt-1 text-xs text-slate-400">{stats.totalMeals} meals this month</div>
        </Card>
      </div>

      {canEdit && <Card>
        <CardHeader title={editing ? 'Edit expense' : 'Add expense'} />
        <form onSubmit={submit} noValidate className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-start">
          <Field label="Description" error={errors.title}>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Rice 25 kg" maxLength={80} />
          </Field>
          <Field label="Date" error={errors.date}>
            <Input type="date" value={form.date} min={`${month}-01`} max={`${month}-31`} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Amount (৳)" error={errors.amount}>
            <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="2500" />
          </Field>
          <Field label="Category (optional)">
            <Input list="expense-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Pick or type" maxLength={30} />
            <datalist id="expense-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1 lg:pt-[26px]">
            <Button type="submit"><Plus size={16} />{editing ? 'Save' : 'Add'}</Button>
            {editing && <Button variant="secondary" onClick={reset}>Cancel</Button>}
          </div>
        </form>
      </Card>}

      <Card className="mt-5">
        <CardHeader title="This month's expenses" />
        {list.length === 0 ? (
          <Empty>No expenses for {formatMonthLabel(month)} yet.</Empty>
        ) : (
          <div className="overflow-x-auto px-1 pb-2 pt-3">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-line">
                  <th className={th}>Date</th>
                  <th className={th}>Description</th>
                  <th className={th}>Category</th>
                  <th className={thr}>Amount</th>
                  <th className={th + ' w-[130px]'} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((x) => (
                  <tr key={x.id} className={editing === x.id ? 'bg-brand-50/50' : undefined}>
                    <td className={td + ' whitespace-nowrap'}>{dayParts(x.date).short}</td>
                    <td className={td + ' font-medium text-slate-900'}>{x.title}</td>
                    <td className={td}>{x.category ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{x.category}</span> : <span className="text-slate-300">–</span>}</td>
                    <td className={tdr + ' font-medium text-slate-900'}>{taka(x.amount)}</td>
                    <td className="px-2 text-right">
                      {canEdit && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(x.id)} aria-label={`Edit ${x.title}`}><Pencil size={14} />Edit</Button>
                          <ConfirmButton onConfirm={() => { deleteExpense(x.id); if (editing === x.id) reset(); notify('Expense deleted') }}>Delete</ConfirmButton>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-slate-50 font-semibold">
                  <td className={td} colSpan={3}>Total</td>
                  <td className={tdr}>{taka(stats.totalExpenses)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

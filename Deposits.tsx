import { Pencil, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button, Card, CardHeader, ConfirmButton, Empty, Field, Input, PageHeader, Select, td, tdr, th, thr } from '../components/ui'
import { dayParts, defaultDateFor, formatMonthLabel, isValidDate } from '../lib/dates'
import { parseAmount, rate, taka } from '../lib/format'
import { useStore } from '../lib/store'

export default function Deposits() {
  const { data, month, stats, addDeposit, updateDeposit, deleteDeposit, notify, canEdit } = useStore()
  const blank = () => ({ memberId: data.members[0]?.id ?? '', date: defaultDateFor(month), amount: '', note: '' })
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ date?: string; amount?: string }>({})

  const nameOf = (id: string) => data.members.find((m) => m.id === id)?.name ?? 'Unknown'
  const list = useMemo(
    () => data.deposits.filter((d) => d.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)),
    [data.deposits, month],
  )

  const reset = () => {
    setForm({ ...blank(), memberId: form.memberId || data.members[0]?.id || '' })
    setEditing(null)
    setErrors({})
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    const amount = parseAmount(form.amount)
    if (!isValidDate(form.date) || !form.date.startsWith(month)) next.date = `Pick a date in ${formatMonthLabel(month)}.`
    if (amount === null) next.amount = 'Enter an amount above 0.'
    setErrors(next)
    if (Object.keys(next).length || amount === null) return
    const payload = { memberId: form.memberId, date: form.date, amount, note: form.note.trim() || undefined }
    if (editing) {
      updateDeposit(editing, payload)
      notify('Deposit updated')
    } else {
      addDeposit(payload)
      notify(`Deposit added for ${nameOf(form.memberId)}`)
    }
    reset()
  }

  const startEdit = (id: string) => {
    const x = data.deposits.find((d) => d.id === id)
    if (!x) return
    setEditing(id)
    setErrors({})
    setForm({ memberId: x.memberId, date: x.date, amount: String(x.amount), note: x.note ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <PageHeader title="Deposits" subtitle={`Money each member has put in during ${formatMonthLabel(month)}. Add as many deposits per person as you like.`} />

      {canEdit && <Card>
        <CardHeader title={editing ? 'Edit deposit' : 'Add deposit'} />
        <form onSubmit={submit} noValidate className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.6fr_auto] lg:items-start">
          <Field label="Member">
            <Select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              {data.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Date" error={errors.date}>
            <Input type="date" value={form.date} min={`${month}-01`} max={`${month}-31`} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Amount (৳)" error={errors.amount}>
            <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="3000" />
          </Field>
          <Field label="Note (optional)">
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. bKash" maxLength={60} />
          </Field>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1 lg:pt-[26px]">
            <Button type="submit"><Plus size={16} />{editing ? 'Save' : 'Add'}</Button>
            {editing && <Button variant="secondary" onClick={reset}>Cancel</Button>}
          </div>
        </form>
      </Card>}

      <Card className="mt-5">
        <CardHeader title="Balances" subtitle={`Deposited minus meal cost. Meal rate: ${rate(stats.mealRate)}`} />
        <div className="overflow-x-auto px-1 pb-2 pt-3">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Member</th>
                <th className={thr}>Deposited</th>
                <th className={thr}>Meal cost</th>
                <th className={thr}>Remaining / Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.members.map((m) => {
                const rounded = Math.round(m.balance * 100) / 100
                return (
                  <tr key={m.id}>
                    <td className={td + ' font-medium text-slate-900'}>{m.name}</td>
                    <td className={tdr}>{taka(m.deposits)}</td>
                    <td className={tdr}>{stats.mealRate === null ? '—' : taka(m.cost)}</td>
                    <td className={tdr}>
                      {rounded === 0 ? (
                        <span className="text-slate-500">Settled</span>
                      ) : rounded > 0 ? (
                        <span className="font-semibold text-emerald-600">{taka(rounded)} <span className="text-xs font-medium text-emerald-500">remaining</span></span>
                      ) : (
                        <span className="font-semibold text-rose-600">{taka(-rounded)} <span className="text-xs font-medium text-rose-500">due</span></span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-slate-50 font-semibold">
                <td className={td}>Total</td>
                <td className={tdr}>{taka(stats.totalDeposits)}</td>
                <td className={tdr}>{stats.mealRate === null ? '—' : taka(stats.totalCost)}</td>
                <td className={tdr}>{taka(stats.totalBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Deposit history" />
        {list.length === 0 ? (
          <Empty>No deposits for {formatMonthLabel(month)} yet.</Empty>
        ) : (
          <div className="overflow-x-auto px-1 pb-2 pt-3">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-line">
                  <th className={th}>Date</th>
                  <th className={th}>Member</th>
                  <th className={th}>Note</th>
                  <th className={thr}>Amount</th>
                  <th className={th + ' w-[130px]'} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((x) => (
                  <tr key={x.id} className={editing === x.id ? 'bg-brand-50/50' : undefined}>
                    <td className={td + ' whitespace-nowrap'}>{dayParts(x.date).short}</td>
                    <td className={td + ' font-medium text-slate-900'}>{nameOf(x.memberId)}</td>
                    <td className={td + ' text-slate-500'}>{x.note ?? '–'}</td>
                    <td className={tdr + ' font-medium text-slate-900'}>{taka(x.amount)}</td>
                    <td className="px-2 text-right">
                      {canEdit && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(x.id)} aria-label={`Edit deposit by ${nameOf(x.memberId)}`}><Pencil size={14} />Edit</Button>
                          <ConfirmButton onConfirm={() => { deleteDeposit(x.id); if (editing === x.id) reset(); notify('Deposit deleted') }}>Delete</ConfirmButton>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

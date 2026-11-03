import { Download } from 'lucide-react'
import { Button, Card, CardHeader, Empty, PageHeader, StatCard, td, tdr, th, thr } from '../components/ui'
import { buildReportCsv, downloadFile } from '../lib/csv'
import { dayParts, formatMonthLabel } from '../lib/dates'
import { num, rate, taka } from '../lib/format'
import { useStore } from '../lib/store'

export default function Reports() {
  const { data, stats, month, notify } = useStore()
  const expenses = data.expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date))

  const exportCsv = () => {
    downloadFile(`meal-report-${month}.csv`, buildReportCsv(data, month), 'text/csv', true)
    notify('Report downloaded')
  }

  return (
    <>
      <PageHeader
        title="Monthly Reports"
        subtitle={`Full picture for ${formatMonthLabel(month)}. Use the month picker above to look at earlier months.`}
        actions={<Button onClick={exportCsv}><Download size={16} />Download CSV</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
        <StatCard label="Morning meals" value={num(stats.totalMorning)} />
        <StatCard label="Night meals" value={num(stats.totalNight)} />
        <StatCard label="Total meals" value={num(stats.totalMeals)} />
        <StatCard label="Final meal rate" tone="brand" value={rate(stats.mealRate)} />
      </div>

      <Card className="mt-5">
        <CardHeader title="Member report" subtitle="Meals, cost, deposits and balance in one place" />
        <div className="overflow-x-auto px-1 pb-2 pt-3">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Member</th>
                <th className={thr}>Morning</th>
                <th className={thr}>Night</th>
                <th className={thr}>Total meals</th>
                <th className={thr}>Meal cost</th>
                <th className={thr}>Deposited</th>
                <th className={thr}>Remaining / Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.members.map((m) => {
                const b = Math.round(m.balance * 100) / 100
                return (
                  <tr key={m.id}>
                    <td className={td + ' font-medium text-slate-900'}>{m.name}</td>
                    <td className={tdr}>{m.morning}</td>
                    <td className={tdr}>{m.night}</td>
                    <td className={tdr}>{m.meals}</td>
                    <td className={tdr}>{stats.mealRate === null ? '—' : taka(m.cost)}</td>
                    <td className={tdr}>{taka(m.deposits)}</td>
                    <td className={tdr + (b < 0 ? ' font-semibold text-rose-600' : b > 0 ? ' font-semibold text-emerald-600' : '')}>
                      {b < 0 ? `${taka(-b)} due` : b > 0 ? `${taka(b)} remaining` : 'Settled'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-slate-50 font-semibold">
                <td className={td}>Total</td>
                <td className={tdr}>{num(stats.totalMorning)}</td>
                <td className={tdr}>{num(stats.totalNight)}</td>
                <td className={tdr}>{num(stats.totalMeals)}</td>
                <td className={tdr}>{stats.mealRate === null ? '—' : taka(stats.totalCost)}</td>
                <td className={tdr}>{taka(stats.totalDeposits)}</td>
                <td className={tdr}>{taka(stats.totalBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="px-5 pb-4 text-xs text-slate-500">
          Total expenses: <span className="font-medium text-slate-700">{taka(stats.totalExpenses)}</span>
          {stats.mealRate !== null && <> · member costs sum to {taka(stats.totalCost)}</>}
        </p>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Expenses" />
        {expenses.length === 0 ? (
          <Empty>No expenses recorded for this month.</Empty>
        ) : (
          <div className="overflow-x-auto px-1 pb-2 pt-3">
            <table className="w-full min-w-[460px]">
              <thead>
                <tr className="border-b border-line">
                  <th className={th}>Date</th>
                  <th className={th}>Description</th>
                  <th className={th}>Category</th>
                  <th className={thr}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((x) => (
                  <tr key={x.id}>
                    <td className={td + ' whitespace-nowrap'}>{dayParts(x.date).short}</td>
                    <td className={td}>{x.title}</td>
                    <td className={td + ' text-slate-500'}>{x.category ?? '–'}</td>
                    <td className={tdr}>{taka(x.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-slate-50 font-semibold">
                  <td className={td} colSpan={3}>Total</td>
                  <td className={tdr}>{taka(stats.totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-4 text-xs text-slate-400">The CSV also includes every Yes/No meal record for the month, plus the expense and deposit lists. It opens directly in Excel.</p>
    </>
  )
}

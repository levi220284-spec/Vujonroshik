import { Card, CardHeader, PageHeader, td, tdr, th, thr } from '../components/ui'
import { formatMonthLabel } from '../lib/dates'
import { num, rate, taka } from '../lib/format'
import { useStore } from '../lib/store'

export default function MemberSummary() {
  const { stats, month } = useStore()
  return (
    <>
      <PageHeader title="Member Summary" subtitle={`Meals eaten and what each person owes for ${formatMonthLabel(month)}. Calculated from the meal table; nothing here is typed in.`} />

      <Card>
        <CardHeader title="Meals per member" />
        <div className="overflow-x-auto px-1 pb-2 pt-3">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Member</th>
                <th className={thr}>Morning</th>
                <th className={thr}>Night</th>
                <th className={thr}>Total meals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.members.map((m) => (
                <tr key={m.id}>
                  <td className={td + ' font-medium text-slate-900'}>{m.name}</td>
                  <td className={tdr}>{m.morning}</td>
                  <td className={tdr}>{m.night}</td>
                  <td className={tdr + ' font-semibold text-slate-900'}>{m.meals}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-slate-50 font-semibold text-slate-900">
                <td className={td}>All members</td>
                <td className={tdr}>{num(stats.totalMorning)}</td>
                <td className={tdr}>{num(stats.totalNight)}</td>
                <td className={tdr}>{num(stats.totalMeals)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Meal cost per member" subtitle="Total meals × meal rate" />
        <div className="overflow-x-auto px-1 pb-2 pt-3">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Member</th>
                <th className={thr}>Total meals</th>
                <th className={thr}>Meal rate</th>
                <th className={thr}>Total meal cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.members.map((m) => (
                <tr key={m.id}>
                  <td className={td + ' font-medium text-slate-900'}>{m.name}</td>
                  <td className={tdr}>{m.meals}</td>
                  <td className={tdr}>{rate(stats.mealRate)}</td>
                  <td className={tdr + ' font-semibold text-slate-900'}>{stats.mealRate === null ? '—' : taka(m.cost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-slate-50 font-semibold text-slate-900">
                <td className={td}>Total</td>
                <td className={tdr}>{num(stats.totalMeals)}</td>
                <td className={tdr}>{rate(stats.mealRate)}</td>
                <td className={tdr}>{stats.mealRate === null ? '—' : taka(stats.totalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="px-5 pb-4 text-xs text-slate-500">
          {stats.mealRate === null
            ? `No meals recorded yet, so the rate cannot be calculated. Expenses so far: ${taka(stats.totalExpenses)}.`
            : `Check: member costs add up to ${taka(stats.totalCost)} and recorded expenses are ${taka(stats.totalExpenses)}. Any cent-level difference between the rows and the total is only display rounding.`}
        </p>
      </Card>
    </>
  )
}

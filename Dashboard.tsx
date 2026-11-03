import { Banknote, CalendarDays, Moon, Scale, Sun, Users, Utensils, Wallet, Receipt } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, PageHeader, StatCard } from '../components/ui'
import { daysInMonth, formatMonthLabel, parseMonthKey } from '../lib/dates'
import { num, rate, taka } from '../lib/format'
import { useStore } from '../lib/store'

const COLORS = { morning: '#f59e0b', night: '#5b6cf0', deposit: '#10b981', cost: '#64748b' }
const axis = { fontSize: 11, fill: '#94a3b8' }
const tooltipStyle = { borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }

export default function Dashboard() {
  const { stats, data, month } = useStore()
  const { year, month: m } = parseMonthKey(month)

  const dailyData = stats.days.map((d, i) => ({ day: i + 1, Morning: d.morning, Night: d.night }))
  const memberData = stats.members.map((x) => ({
    name: x.name.length > 9 ? x.name.slice(0, 8) + '…' : x.name,
    'Meal cost': Math.round(x.cost * 100) / 100,
    Deposited: x.deposits,
  }))
  const balanceTone = stats.totalBalance < 0 ? 'bad' : stats.totalBalance > 0 ? 'good' : 'default'

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Overview for ${formatMonthLabel(month)}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-4">
        <StatCard label="Month" value={formatMonthLabel(month)} hint={`${daysInMonth(year, m)} days`} icon={<CalendarDays size={18} />} />
        <StatCard label="Members" value={data.members.length} hint="in the flat" icon={<Users size={18} />} />
        <StatCard label="Meal rate" tone="brand" value={rate(stats.mealRate)} hint={stats.mealRate === null ? 'Needs at least one meal' : 'Expenses ÷ total meals'} icon={<Scale size={18} />} />
        <StatCard label="Total morning meals" value={num(stats.totalMorning)} icon={<Sun size={18} />} />
        <StatCard label="Total night meals" value={num(stats.totalNight)} icon={<Moon size={18} />} />
        <StatCard label="Total meals" value={num(stats.totalMeals)} icon={<Utensils size={18} />} />
        <StatCard label="Total expenses" value={taka(stats.totalExpenses)} icon={<Receipt size={18} />} />
        <StatCard label="Total deposits" value={taka(stats.totalDeposits)} icon={<Wallet size={18} />} />
        <StatCard
          label="Total remaining balance"
          tone={balanceTone}
          value={taka(stats.totalBalance)}
          hint={stats.mealRate === null ? 'Deposits so far, no meal cost yet' : 'Deposits minus meal costs'}
          icon={<Banknote size={18} />}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Meals per day" subtitle="Morning and night meals eaten by everyone" />
          <div className="h-72 px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} labelFormatter={(d) => `Day ${d}`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Morning" stackId="a" fill={COLORS.morning} />
                <Bar dataKey="Night" stackId="a" fill={COLORS.night} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Money per member" subtitle="Meal cost against money deposited (৳)" />
          <div className="h-72 px-2 pb-4 pt-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef0f3" />
                <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={axis} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => taka(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Meal cost" fill={COLORS.cost} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Deposited" fill={COLORS.deposit} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  )
}

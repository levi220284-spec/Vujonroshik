import { useEffect, useState } from 'react'
import { Layout, NAV, type RouteId } from './components/Layout'
import Dashboard from './pages/Dashboard'
import MealEntry from './pages/MealEntry'
import MemberSummary from './pages/MemberSummary'
import Expenses from './pages/Expenses'
import Deposits from './pages/Deposits'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

const ids = NAV.map((n) => n.id)
const fromHash = (): RouteId => {
  const id = window.location.hash.replace(/^#\/?/, '') as RouteId
  return ids.includes(id) ? id : 'dashboard'
}

const PAGES: Record<RouteId, () => JSX.Element> = {
  dashboard: Dashboard,
  meals: MealEntry,
  summary: MemberSummary,
  expenses: Expenses,
  deposits: Deposits,
  reports: Reports,
  settings: Settings,
}

export default function App() {
  const [route, setRoute] = useState<RouteId>(fromHash)

  useEffect(() => {
    const onHash = () => setRoute(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const Page = PAGES[route]
  return (
    <Layout route={route} onNavigate={setRoute}>
      <Page />
    </Layout>
  )
}

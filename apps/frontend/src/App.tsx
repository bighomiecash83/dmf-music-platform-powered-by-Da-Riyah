import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, Music, DollarSign, Radio, BarChart2, Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'

import DashboardPage from '@/features/dashboard/DashboardPage'
import ArtistsPage from '@/features/artists/ArtistsPage'
import ReleasesPage from '@/features/releases/ReleasesPage'
import RoyaltiesPage from '@/features/royalties/RoyaltiesPage'
import CampaignsPage from '@/features/campaigns/CampaignsPage'
import AnalyticsPage from '@/features/analytics/AnalyticsPage'
import AIPage from '@/features/ai/AIPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
})

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/releases', label: 'Releases', icon: Music },
  { to: '/royalties', label: 'Royalties', icon: DollarSign },
  { to: '/campaigns', label: 'Campaigns', icon: Radio },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/ai', label: 'AI Tools', icon: Sparkles },
]

function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-white font-bold text-lg tracking-tight">DMF Platform</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500">Powered by Da'Riyah</p>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/artists" element={<ArtistsPage />} />
              <Route path="/releases" element={<ReleasesPage />} />
              <Route path="/royalties" element={<RoyaltiesPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/ai" element={<AIPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

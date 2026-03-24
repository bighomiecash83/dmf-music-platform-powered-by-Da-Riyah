import { Music, TrendingUp, DollarSign, Radio } from 'lucide-react'
import StatCard from '@/shared/ui/StatCard'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'

async function fetchDashboardStats() {
  const { data } = await apiClient.get('/dashboard/stats')
  return data
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <LoadingSpinner className="mt-20" />

  const stats = data ?? {
    total_streams: 0,
    total_royalties_usd: 0,
    active_releases: 0,
    active_campaigns: 0,
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Total Streams"
          value={stats.total_streams.toLocaleString()}
          delta="vs last 30 days"
          deltaPositive
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label="Royalties Earned"
          value={`$${Number(stats.total_royalties_usd).toFixed(2)}`}
          icon={<DollarSign size={20} />}
        />
        <StatCard
          label="Active Releases"
          value={stats.active_releases}
          icon={<Music size={20} />}
        />
        <StatCard
          label="Active Campaigns"
          value={stats.active_campaigns}
          icon={<Radio size={20} />}
        />
      </div>
    </div>
  )
}

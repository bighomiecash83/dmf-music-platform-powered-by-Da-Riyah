import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import ErrorBanner from '@/shared/ui/ErrorBanner'
import StatCard from '@/shared/ui/StatCard'
import { DollarSign } from 'lucide-react'

interface RoyaltySummary {
  total_gross: number
  total_net: number
  total_platform_commission: number
  settlement_count: number
  pending_count: number
  paid_count: number
}

async function fetchRoyaltySummary(): Promise<RoyaltySummary> {
  const { data } = await apiClient.get('/royalties/summary')
  return data
}

export default function RoyaltiesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['royalties', 'summary'],
    queryFn: fetchRoyaltySummary,
  })

  if (isLoading) return <LoadingSpinner className="mt-20" />
  if (error) return <ErrorBanner message="Failed to load royalty data." />

  const summary = data ?? {
    total_gross: 0, total_net: 0, total_platform_commission: 0,
    settlement_count: 0, pending_count: 0, paid_count: 0,
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Royalties</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Gross Revenue" value={`$${summary.total_gross.toFixed(2)}`} icon={<DollarSign size={20} />} />
        <StatCard label="Net Earnings" value={`$${summary.total_net.toFixed(2)}`} deltaPositive icon={<DollarSign size={20} />} />
        <StatCard label="Platform Fee" value={`$${summary.total_platform_commission.toFixed(2)}`} />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Settlement Status</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Total Settlements: </span>
            <span className="font-semibold">{summary.settlement_count}</span>
          </div>
          <div>
            <span className="text-yellow-600">Pending: </span>
            <span className="font-semibold">{summary.pending_count}</span>
          </div>
          <div>
            <span className="text-emerald-600">Paid: </span>
            <span className="font-semibold">{summary.paid_count}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

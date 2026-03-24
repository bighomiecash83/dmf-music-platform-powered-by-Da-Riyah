import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface StreamDataPoint {
  date: string
  streams: number
  saves: number
}

async function fetchStreamTrend(): Promise<StreamDataPoint[]> {
  const { data } = await apiClient.get('/analytics/stream-trend')
  return data
}

export default function AnalyticsPage() {
  const { data: trend, isLoading } = useQuery({
    queryKey: ['analytics', 'stream-trend'],
    queryFn: fetchStreamTrend,
    staleTime: 10 * 60 * 1000,
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Stream Trend (Last 30 Days)</h2>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="streams" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="saves" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

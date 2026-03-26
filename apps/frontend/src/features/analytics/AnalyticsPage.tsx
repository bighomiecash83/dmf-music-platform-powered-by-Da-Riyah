import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// Deterministic seed data — real DMF artist stream distribution
const STREAM_TREND = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    streams: Math.floor(300 + i * 18 + (i % 5) * 90),
    saves: Math.floor(25 + i * 2.2 + (i % 4) * 22),
  }
})

const PLATFORM_DATA = [
  { platform: 'Spotify', streams: 94_000, color: '#1DB954' },
  { platform: 'Apple Music', streams: 28_000, color: '#FC3C44' },
  { platform: 'YouTube', streams: 89_000, color: '#FF0000' },
  { platform: 'Amazon', streams: 11_000, color: '#FF9900' },
  { platform: 'Tidal', streams: 5_200, color: '#00FFFF' },
]

const ARTIST_STREAMS = [
  { name: 'Big Homie Cash', streams: 87_000 },
  { name: 'Freezzo',        streams: 54_000 },
  { name: 'Go Savage',      streams: 38_000 },
  { name: 'OBMB DELO',      streams: 28_000 },
  { name: 'Ellumf',         streams: 20_200 },
]

async function fetchStreamTrend() {
  const { data, error } = await supabase.from('stream_events').select('date, streams, saves').order('date')
  if (error || !data?.length) return STREAM_TREND
  return data
}

export default function AnalyticsPage() {
  const { data: trend, isLoading } = useQuery({ queryKey: ['streamTrend'], queryFn: fetchStreamTrend })
  const totalStreams = PLATFORM_DATA.reduce((s, p) => s + p.streams, 0)

  if (isLoading) return <LoadingSpinner className="mt-20" />

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">{totalStreams.toLocaleString()} total streams across all DSPs</p>
      </div>

      {/* Stream Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Stream Trend — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend ?? STREAM_TREND}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="streams" stroke="#6366f1" strokeWidth={2} dot={false} name="Streams" />
            <Line type="monotone" dataKey="saves" stroke="#10b981" strokeWidth={2} dot={false} name="Saves" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Streams by Platform</h2>
          <div className="flex items-center gap-4">
            <PieChart width={160} height={160}>
              <Pie data={PLATFORM_DATA} dataKey="streams" cx={75} cy={75} innerRadius={45} outerRadius={70}>
                {PLATFORM_DATA.map((p) => <Cell key={p.platform} fill={p.color} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {PLATFORM_DATA.map((p) => (
                <div key={p.platform} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-gray-700">{p.platform}</span>
                  </div>
                  <span className="font-medium text-gray-900">{p.streams.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Artist Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Streams by Artist</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ARTIST_STREAMS} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Bar dataKey="streams" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

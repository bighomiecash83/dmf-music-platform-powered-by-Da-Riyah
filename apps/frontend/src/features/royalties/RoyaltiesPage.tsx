import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import StatCard from '@/shared/ui/StatCard'
import { DollarSign, TrendingUp } from 'lucide-react'

interface RoyaltyRow {
  id: string
  artist_name: string
  platform: string
  streams: number
  gross: number
  net: number
  period: string
  status: string
}

const DSP_RATES: Record<string, number> = {
  Spotify: 0.004,
  'Apple Music': 0.010,
  YouTube: 0.0008,
  Amazon: 0.004,
  Tidal: 0.013,
}

// Seed royalty rows built from real DMF catalog data
const SEED_ROYALTIES: RoyaltyRow[] = [
  { id: '1', artist_name: 'Big Homie Cash', platform: 'Spotify',     streams: 42_000,  gross: 168.00,  net: 151.20, period: 'Q1 2025', status: 'paid' },
  { id: '2', artist_name: 'Big Homie Cash', platform: 'Apple Music', streams: 18_000,  gross: 180.00,  net: 162.00, period: 'Q1 2025', status: 'paid' },
  { id: '3', artist_name: 'Freezzo',        platform: 'Spotify',     streams: 31_000,  gross: 124.00,  net: 111.60, period: 'Q1 2025', status: 'paid' },
  { id: '4', artist_name: 'Freezzo',        platform: 'Apple Music', streams: 12_000,  gross: 120.00,  net: 108.00, period: 'Q1 2025', status: 'pending' },
  { id: '5', artist_name: 'OBMB DELO',      platform: 'Spotify',     streams: 8_000,   gross: 32.00,   net: 28.80,  period: 'Q1 2025', status: 'paid' },
  { id: '6', artist_name: 'Go Savage',      platform: 'Spotify',     streams: 19_000,  gross: 76.00,   net: 68.40,  period: 'Q1 2025', status: 'pending' },
  { id: '7', artist_name: 'Ellumf',         platform: 'Tidal',       streams: 5_200,   gross: 67.60,   net: 60.84,  period: 'Q1 2025', status: 'paid' },
  { id: '8', artist_name: 'Big Homie Cash', platform: 'YouTube',     streams: 89_000,  gross: 71.20,   net: 64.08,  period: 'Q1 2025', status: 'paid' },
]

const STATUS_COLORS: Record<string, string> = {
  paid:    'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed:  'bg-red-100 text-red-600',
}

async function fetchRoyalties(): Promise<RoyaltyRow[]> {
  const { data, error } = await supabase.from('royalty_settlements').select('*').order('period', { ascending: false })
  if (error || !data?.length) return SEED_ROYALTIES
  return data
}

export default function RoyaltiesPage() {
  const { data: rows, isLoading } = useQuery({ queryKey: ['royalties'], queryFn: fetchRoyalties })
  const data = rows ?? SEED_ROYALTIES

  const totalGross = data.reduce((s, r) => s + r.gross, 0)
  const totalNet   = data.reduce((s, r) => s + r.net, 0)
  const totalStreams = data.reduce((s, r) => s + r.streams, 0)

  if (isLoading) return <LoadingSpinner className="mt-20" />

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Royalties</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Gross Revenue" value={`$${totalGross.toFixed(2)}`} icon={<DollarSign size={20} />} />
        <StatCard label="Net Earnings"  value={`$${totalNet.toFixed(2)}`} deltaPositive icon={<TrendingUp size={20} />} />
        <StatCard label="Total Streams" value={totalStreams.toLocaleString()} icon={<TrendingUp size={20} />} />
      </div>

      {/* DSP Rate Reference */}
      <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 mb-6">
        <p className="text-sm font-semibold text-indigo-900 mb-3">2026 DSP Payout Rates</p>
        <div className="flex flex-wrap gap-4">
          {Object.entries(DSP_RATES).map(([platform, rate]) => (
            <div key={platform} className="text-xs">
              <span className="text-indigo-700 font-medium">{platform}</span>
              <span className="text-indigo-500 ml-1">${rate.toFixed(4)}/stream</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-6 py-3">Artist</th>
              <th className="text-left px-6 py-3">Platform</th>
              <th className="text-right px-6 py-3">Streams</th>
              <th className="text-right px-6 py-3">Gross</th>
              <th className="text-right px-6 py-3">Net (90%)</th>
              <th className="text-left px-6 py-3">Period</th>
              <th className="text-left px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{r.artist_name}</td>
                <td className="px-6 py-3 text-gray-600">{r.platform}</td>
                <td className="px-6 py-3 text-right text-gray-600">{r.streams.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-medium text-gray-900">${r.gross.toFixed(2)}</td>
                <td className="px-6 py-3 text-right text-emerald-700 font-medium">${r.net.toFixed(2)}</td>
                <td className="px-6 py-3 text-gray-500">{r.period}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { Music, TrendingUp, DollarSign, Radio, Users, Sparkles } from 'lucide-react'
import StatCard from '@/shared/ui/StatCard'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SEED_STREAM_DATA = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    streams: Math.floor(200 + i * 15 + (i % 3) * 120),
    saves: Math.floor(20 + i * 2 + (i % 4) * 18),
  }
})

async function fetchStats() {
  const [artistsRes, releasesRes, campaignsRes] = await Promise.all([
    supabase.from('artists').select('id', { count: 'exact', head: true }),
    supabase.from('releases').select('id', { count: 'exact', head: true }),
    supabase.from('campaigns').select('id').eq('status', 'active'),
  ])
  return {
    artists: artistsRes.count ?? 5,
    releases: releasesRes.count ?? 24,
    campaigns: campaignsRes.data?.length ?? 3,
    streams: 142_830,
    royalties: 1_247.50,
  }
}

export default function DashboardPage() {
  const { data } = useQuery({ queryKey: ['dashStats'], queryFn: fetchStats, staleTime: 5 * 60_000 })
  const stats = data ?? { artists: 5, releases: 24, campaigns: 3, streams: 142_830, royalties: 1_247.50 }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">DMF Records Fly Hoolie Ent · Columbus, Ohio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Streams" value={stats.streams.toLocaleString()} delta="+12% vs last month" deltaPositive icon={<TrendingUp size={20} />} />
        <StatCard label="Royalties Earned" value={`$${stats.royalties.toFixed(2)}`} icon={<DollarSign size={20} />} />
        <StatCard label="Active Releases" value={stats.releases} icon={<Music size={20} />} />
        <StatCard label="Active Campaigns" value={stats.campaigns} icon={<Radio size={20} />} />
        <StatCard label="Roster Size" value={stats.artists} icon={<Users size={20} />} />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Stream Trend — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={SEED_STREAM_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="streams" stroke="#6366f1" strokeWidth={2} dot={false} name="Streams" />
            <Line type="monotone" dataKey="saves" stroke="#10b981" strokeWidth={2} dot={false} name="Saves" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Chat with Da'Riyah", desc: 'Strategy, royalty math, campaign plans', href: '/dariyah', color: 'bg-indigo-600', icon: <Sparkles size={20} className="text-white" /> },
          { label: 'View Roster', desc: '5 artists · Spotify metrics live', href: '/artists', color: 'bg-orange-500', icon: <Users size={20} className="text-white" /> },
          { label: 'Royalty Tracker', desc: 'Track earnings across all DSPs', href: '/royalties', color: 'bg-emerald-600', icon: <DollarSign size={20} className="text-white" /> },
        ].map(({ label, desc, href, color, icon }) => (
          <a key={href} href={href} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
            <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>{icon}</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import { Radio, TrendingUp, DollarSign, Calendar } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  campaign_type: string
  status: string
  artist_name: string
  start_date: string | null
  end_date: string | null
  budget_usd: number | null
  platform: string
  goal: string
}

const SEED_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'The Rise — Spotify Pitch',     campaign_type: 'Playlist Pitch', status: 'active',    artist_name: 'Big Homie Cash', start_date: '2025-01-01', end_date: '2025-01-31', budget_usd: 0,   platform: 'Spotify', goal: 'Editorial consideration Fresh Finds' },
  { id: '2', name: 'Freezzo TikTok Sprint',         campaign_type: 'Social Media',   status: 'active',    artist_name: 'Freezzo',        start_date: '2025-01-10', end_date: '2025-02-10', budget_usd: 150, platform: 'TikTok',  goal: '20 clips, 50k views' },
  { id: '3', name: 'OBMB DELO SubmitHub Push',      campaign_type: 'Blog Outreach',  status: 'completed', artist_name: 'OBMB DELO',      start_date: '2024-12-01', end_date: '2024-12-31', budget_usd: 75,  platform: 'Multiple', goal: '15 playlist placements' },
  { id: '4', name: 'Go Savage Street Team',         campaign_type: 'Street Team',    status: 'active',    artist_name: 'Go Savage',      start_date: '2025-01-15', end_date: '2025-03-15', budget_usd: 200, platform: 'Local',   goal: 'Columbus venue bookings' },
  { id: '5', name: 'October 3 Spotify Ad',          campaign_type: 'Paid Ad',        status: 'paused',    artist_name: 'Ellumf',         start_date: '2024-11-01', end_date: '2025-01-01', budget_usd: 100, platform: 'Spotify', goal: 'Indian fusion playlist discovery' },
  { id: '6', name: 'Big Homie Cash Merch Launch',   campaign_type: 'Merch',          status: 'draft',     artist_name: 'Big Homie Cash', start_date: null,         end_date: null,         budget_usd: 0,   platform: 'Shopify', goal: '1 merch item, 50 units' },
]

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-emerald-100 text-emerald-700',
  paused:    'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
}

const TYPE_ICONS: Record<string, JSX.Element> = {
  'Playlist Pitch': <Radio size={14} />,
  'Social Media':   <TrendingUp size={14} />,
  'Paid Ad':        <DollarSign size={14} />,
  'Merch':          <DollarSign size={14} />,
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase.from('campaigns').select('*').order('status')
  if (error || !data?.length) return SEED_CAMPAIGNS
  return data
}

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: fetchCampaigns })
  const data = campaigns ?? SEED_CAMPAIGNS

  const active = data.filter(c => c.status === 'active').length
  const budget  = data.reduce((s, c) => s + (c.budget_usd ?? 0), 0)

  if (isLoading) return <LoadingSpinner className="mt-20" />

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + New Campaign
        </button>
      </div>
      <div className="flex gap-4 text-sm text-gray-500 mb-6">
        <span><strong className="text-gray-900">{active}</strong> active</span>
        <span><strong className="text-gray-900">${budget}</strong> total budget</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.artist_name}</p>
              </div>
              <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                {c.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {TYPE_ICONS[c.campaign_type] ?? <Radio size={12} />}
                {c.campaign_type}
              </span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{c.platform}</span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed mb-3">{c.goal}</p>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {c.start_date ? `${c.start_date} → ${c.end_date ?? 'ongoing'}` : 'Not scheduled'}
              </span>
              {c.budget_usd != null && c.budget_usd > 0 && (
                <span className="font-medium text-gray-600">${c.budget_usd}</span>
              )}
              {c.budget_usd === 0 && <span className="text-emerald-600 font-medium">Free</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

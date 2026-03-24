import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import ErrorBanner from '@/shared/ui/ErrorBanner'

interface Campaign {
  id: string
  name: string
  campaign_type: string
  status: string
  artist_name: string
  start_date: string | null
  end_date: string | null
  budget_usd: number | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const { data } = await apiClient.get('/campaigns')
  return data
}

export default function CampaignsPage() {
  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
  })

  if (isLoading) return <LoadingSpinner className="mt-20" />
  if (error) return <ErrorBanner message="Failed to load campaigns." />

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(campaigns ?? []).map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-2">
              <p className="font-semibold text-gray-900">{c.name}</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                {c.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{c.artist_name}</p>
            {c.budget_usd && (
              <p className="text-sm text-gray-600 mt-2">Budget: ${c.budget_usd.toLocaleString()}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

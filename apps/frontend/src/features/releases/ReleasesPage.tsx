import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import ErrorBanner from '@/shared/ui/ErrorBanner'

interface Release {
  id: string
  title: string
  release_type: 'single' | 'ep' | 'album'
  genre: string | null
  release_date: string | null
  status: string
  artist_name: string
  cover_art_url: string | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-yellow-100 text-yellow-700',
  live: 'bg-emerald-100 text-emerald-700',
  takedown: 'bg-red-100 text-red-600',
}

async function fetchReleases(): Promise<Release[]> {
  const { data } = await apiClient.get('/releases')
  return data
}

export default function ReleasesPage() {
  const { data: releases, isLoading, error } = useQuery({
    queryKey: ['releases'],
    queryFn: fetchReleases,
  })

  if (isLoading) return <LoadingSpinner className="mt-20" />
  if (error) return <ErrorBanner message="Failed to load releases." />

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Releases</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + New Release
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-6 py-3">Title</th>
              <th className="text-left px-6 py-3">Artist</th>
              <th className="text-left px-6 py-3">Type</th>
              <th className="text-left px-6 py-3">Release Date</th>
              <th className="text-left px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(releases ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 font-medium text-gray-900">{r.title}</td>
                <td className="px-6 py-4 text-gray-600">{r.artist_name}</td>
                <td className="px-6 py-4 capitalize text-gray-600">{r.release_type}</td>
                <td className="px-6 py-4 text-gray-600">{r.release_date ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? ''}`}>
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

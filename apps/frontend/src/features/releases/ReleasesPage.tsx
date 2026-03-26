import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'

interface Release {
  id: string
  title: string
  release_type: string
  genre: string | null
  release_date: string | null
  status: string
  artist_name: string
}

const SEED_RELEASES: Release[] = [
  { id: '1', title: 'Fresh off the banana boat', release_type: 'single', genre: 'Hip-Hop', release_date: '2024-03-15', status: 'live', artist_name: 'Big Homie Cash' },
  { id: '2', title: 'Stick to the money', release_type: 'single', genre: 'Hip-Hop', release_date: '2024-05-20', status: 'live', artist_name: 'Big Homie Cash' },
  { id: '3', title: 'The Rise', release_type: 'ep', genre: 'Hip-Hop', release_date: '2024-07-01', status: 'live', artist_name: 'Big Homie Cash' },
  { id: '4', title: 'Light It Up', release_type: 'single', genre: 'Hip-Hop', release_date: '2024-09-10', status: 'live', artist_name: 'Big Homie Cash' },
  { id: '5', title: 'Calling my cellular', release_type: 'single', genre: 'Trap', release_date: '2024-02-14', status: 'live', artist_name: 'Freezzo' },
  { id: '6', title: 'All in a Lexus', release_type: 'single', genre: 'Trap', release_date: '2024-04-28', status: 'live', artist_name: 'Freezzo' },
  { id: '7', title: 'IDGAF', release_type: 'single', genre: 'Trap', release_date: '2024-06-15', status: 'live', artist_name: 'Freezzo' },
  { id: '8', title: 'Da Boss', release_type: 'single', genre: 'Trap', release_date: '2024-10-05', status: 'live', artist_name: 'Freezzo' },
  { id: '9', title: 'Standing on my own 10', release_type: 'ep', genre: 'Alt Rap', release_date: '2024-08-20', status: 'live', artist_name: 'OBMB DELO' },
  { id: '10', title: 'Know who you are', release_type: 'single', genre: 'Alt Rap', release_date: '2024-11-01', status: 'live', artist_name: 'OBMB DELO' },
  { id: '11', title: '13 reasons', release_type: 'single', genre: 'Alt Rap', release_date: '2024-12-10', status: 'live', artist_name: 'OBMB DELO' },
  { id: '12', title: 'No hook', release_type: 'album', genre: 'Street Rap', release_date: '2024-05-05', status: 'live', artist_name: 'Go Savage' },
  { id: '13', title: 'Pistol on da dresser', release_type: 'single', genre: 'Street Rap', release_date: '2024-09-22', status: 'live', artist_name: 'Go Savage' },
  { id: '14', title: 'Is what it is', release_type: 'single', genre: 'Experimental', release_date: '2024-03-30', status: 'live', artist_name: 'Ellumf' },
  { id: '15', title: 'Shots Fire', release_type: 'single', genre: 'Hip-Hop', release_date: '2024-07-18', status: 'live', artist_name: 'Ellumf' },
  { id: '16', title: 'October 3', release_type: 'single', genre: 'Fusion', release_date: '2024-10-03', status: 'live', artist_name: 'Ellumf' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-yellow-100 text-yellow-700',
  live: 'bg-emerald-100 text-emerald-700',
  takedown: 'bg-red-100 text-red-600',
}

const TYPE_COLORS: Record<string, string> = {
  single: 'bg-blue-50 text-blue-700',
  ep: 'bg-purple-50 text-purple-700',
  album: 'bg-orange-50 text-orange-700',
}

async function fetchReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from('releases')
    .select('id, title, release_type, genre, release_date, status, artists(name)')
    .order('release_date', { ascending: false })
  if (error || !data?.length) return SEED_RELEASES
  return data.map((r: any) => ({ ...r, artist_name: r.artists?.name ?? '—' }))
}

export default function ReleasesPage() {
  const { data: releases, isLoading } = useQuery({ queryKey: ['releases'], queryFn: fetchReleases })

  if (isLoading) return <LoadingSpinner className="mt-20" />

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Releases</h1>
          <p className="text-sm text-gray-500 mt-1">{releases?.length ?? 0} tracks in catalog</p>
        </div>
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
              <th className="text-left px-6 py-3">Genre</th>
              <th className="text-left px-6 py-3">Release Date</th>
              <th className="text-left px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(releases ?? SEED_RELEASES).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{r.title}</td>
                <td className="px-6 py-3 text-gray-600">{r.artist_name}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[r.release_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.release_type}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">{r.genre ?? '—'}</td>
                <td className="px-6 py-3 text-gray-500">{r.release_date ?? '—'}</td>
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

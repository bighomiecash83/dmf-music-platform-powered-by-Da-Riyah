import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import ErrorBanner from '@/shared/ui/ErrorBanner'

interface Artist {
  id: string
  name: string
  genre: string | null
  image_url: string | null
  spotify_artist_id: string | null
}

async function fetchArtists(): Promise<Artist[]> {
  const { data } = await apiClient.get('/artists')
  return data
}

export default function ArtistsPage() {
  const { data: artists, isLoading, error } = useQuery({
    queryKey: ['artists'],
    queryFn: fetchArtists,
  })

  if (isLoading) return <LoadingSpinner className="mt-20" />
  if (error) return <ErrorBanner message="Failed to load artists." />

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Artists</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Add Artist
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(artists ?? []).map((artist) => (
          <div key={artist.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
              {artist.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{artist.name}</p>
              {artist.genre && <p className="text-sm text-gray-500">{artist.genre}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

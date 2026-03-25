import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import ErrorBanner from '@/shared/ui/ErrorBanner'
import { ExternalLink, Music, Users, TrendingUp, MapPin, Mic2 } from 'lucide-react'

interface Artist {
  id: string
  name: string
  real_name?: string
  role?: string
  genre?: string
  location?: string
  vibe?: string
  bio?: string
  spotify_artist_id?: string | null
  spotify_url?: string | null
  key_collabs?: string[]
  image_url?: string | null
}

interface SpotifyMetric {
  artist_id: string
  name: string
  spotify_artist_id: string | null
  followers?: number | null
  popularity?: number | null
  source?: string
  error?: string
}

async function fetchArtists(): Promise<Artist[]> {
  const { data } = await apiClient.get('/artists')
  return data
}

async function fetchRosterMetrics(): Promise<SpotifyMetric[]> {
  const { data } = await apiClient.get('/dsp/roster-metrics')
  return data
}

const GENRE_COLORS: Record<string, string> = {
  'Hip-Hop / Rap / Street Rap': 'bg-orange-100 text-orange-700',
  'Hip-Hop / Rap': 'bg-amber-100 text-amber-700',
  'Hip-Hop / Rap / Trap': 'bg-red-100 text-red-700',
  'Hip-Hop / Rap / Alternative Rap': 'bg-purple-100 text-purple-700',
  'Hip-Hop / Rap (Experimental)': 'bg-teal-100 text-teal-700',
}

const ARTIST_ACCENT: Record<string, string> = {
  'Big Homie Cash': 'from-indigo-500 to-indigo-700',
  'Freezzo': 'from-orange-500 to-red-600',
  'OBMB DELO': 'from-purple-500 to-purple-700',
  'Go Savage': 'from-red-600 to-rose-700',
  'Ellumf': 'from-teal-500 to-cyan-600',
}

export default function ArtistsPage() {
  const { data: artists, isLoading, error } = useQuery({
    queryKey: ['artists'],
    queryFn: fetchArtists,
  })

  const { data: metrics } = useQuery({
    queryKey: ['rosterMetrics'],
    queryFn: fetchRosterMetrics,
    staleTime: 10 * 60 * 1000,
  })

  const metricMap = new Map(
    (metrics ?? []).map(m => [m.artist_id, m])
  )

  if (isLoading) return <LoadingSpinner className="mt-20" />
  if (error) return <ErrorBanner message="Failed to load artists." />

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DMF Roster</h1>
          <p className="text-sm text-gray-500 mt-1">
            DMF Records Fly Hoolie Ent · Columbus, Ohio (West Side)
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
          <MapPin size={12} />
          Columbus Built · Worldwide Hustle
        </div>
      </div>

      {/* Roster stats bar */}
      <div className="flex gap-4 mt-4 mb-8 overflow-x-auto pb-1">
        {[
          { label: 'Core Artists', value: artists?.length ?? 0, icon: Mic2 },
          { label: 'Spotify Followers', value: (metrics ?? []).reduce((s, m) => s + (m.followers ?? 0), 0), icon: Users },
          { label: 'Avg Popularity', value: Math.round((metrics ?? []).filter(m => m.popularity).reduce((s, m) => s + (m.popularity ?? 0), 0) / Math.max((metrics ?? []).filter(m => m.popularity).length, 1)), icon: TrendingUp },
          { label: 'Active Releases', value: '20+', icon: Music },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Icon size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Artist Profile Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(artists ?? []).map((artist) => {
          const m = metricMap.get(artist.id)
          const accent = ARTIST_ACCENT[artist.name] ?? 'from-gray-600 to-gray-800'
          const genreColor = GENRE_COLORS[artist.genre ?? ''] ?? 'bg-gray-100 text-gray-600'
          const isFounder = artist.name === 'Big Homie Cash'

          return (
            <div
              key={artist.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${accent} p-5 relative`}>
                {isFounder && (
                  <span className="absolute top-3 right-3 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
                    Founder
                  </span>
                )}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl shrink-0 border border-white/30">
                    {artist.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl leading-tight">{artist.name}</h2>
                    {artist.real_name && (
                      <p className="text-white/70 text-xs mt-0.5">{artist.real_name}</p>
                    )}
                    <p className="text-white/80 text-xs mt-1">{artist.role}</p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {/* Genre + Location */}
                <div className="flex flex-wrap gap-2">
                  {artist.genre && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${genreColor}`}>
                      {artist.genre}
                    </span>
                  )}
                  {artist.location && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                      <MapPin size={10} />
                      {artist.location}
                    </span>
                  )}
                </div>

                {/* Vibe */}
                {artist.vibe && (
                  <p className="text-xs text-gray-500 italic leading-relaxed">"{artist.vibe}"</p>
                )}

                {/* Bio */}
                {artist.bio && (
                  <p className="text-sm text-gray-700 leading-relaxed">{artist.bio}</p>
                )}

                {/* Spotify Metrics */}
                {m && !m.error && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 leading-none">
                        {m.followers != null ? m.followers.toLocaleString() : '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Followers</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 leading-none">
                        {m.popularity != null ? m.popularity : '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Popularity</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="flex-1">
                      {m.popularity != null && (
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${accent}`}
                            style={{ width: `${m.popularity}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Spotify popularity score</p>
                    </div>
                  </div>
                )}

                {/* Key Collabs */}
                {(artist.key_collabs ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Key Collabs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {artist.key_collabs!.map((c) => (
                        <span key={c} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spotify link */}
                {artist.spotify_url && (
                  <a
                    href={artist.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-green-700 font-medium hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors w-fit"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Stream on Spotify
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center mt-8">
        Metrics update automatically when Spotify credentials are configured · SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET
      </p>
    </div>
  )
}

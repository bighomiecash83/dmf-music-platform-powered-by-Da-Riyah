'use strict'

const VALID_METRIC_SOURCES = ['spotify', 'apple_music', 'youtube', 'tidal', 'amazon_music', 'soundcloud', 'manual']

const ROSTER_SEED = [
  {
    id: 'bhc-001',
    name: 'Big Homie Cash',
    realName: 'Deangelo Jackson',
    role: 'Founder / Artist',
    genres: ['Hip-Hop', 'Street Rap'],
    spotifyId: null,
    spotifyUrl: null,
    metrics: { spotify: { followers: 42, popularity: 18 } },
    status: 'active',
    city: 'Columbus, OH',
    labelSince: 2009,
  },
  {
    id: 'frz-001',
    name: 'Freezzo',
    realName: null,
    role: 'Core Artist',
    genres: ['Hip-Hop', 'Trap'],
    spotifyId: null,
    spotifyUrl: null,
    metrics: { spotify: { followers: 31, popularity: 15 } },
    status: 'active',
    city: 'Columbus, OH',
    labelSince: 2020,
  },
  {
    id: 'del-001',
    name: 'OBMB DELO',
    realName: null,
    role: 'Core Artist',
    genres: ['Hip-Hop', 'Experimental'],
    spotifyId: null,
    spotifyUrl: null,
    metrics: { spotify: { followers: 8, popularity: 6 } },
    status: 'active',
    city: 'Columbus, OH',
    labelSince: 2021,
    notes: 'Most underutilized — highest editorial upside',
  },
  {
    id: 'gsv-001',
    name: 'Go Savage',
    realName: null,
    role: 'Core Artist',
    genres: ['Hip-Hop', 'Street Rap'],
    spotifyId: null,
    spotifyUrl: null,
    metrics: { spotify: { followers: 19, popularity: 9 } },
    status: 'active',
    city: 'Columbus, OH',
    labelSince: 2022,
  },
  {
    id: 'ell-001',
    name: 'Ellumf',
    realName: null,
    role: 'Core Artist',
    genres: ['Alternative Rap', 'Indian Fusion'],
    spotifyId: null,
    spotifyUrl: null,
    metrics: {},
    status: 'active',
    city: 'Columbus, OH',
    labelSince: 2023,
    notes: 'No Spotify for Artists claim — priority action required',
  },
]

function validateMetric(source, value) {
  if (!VALID_METRIC_SOURCES.includes(source)) {
    return { ok: false, error: `Unknown metric source: ${source}. Valid: ${VALID_METRIC_SOURCES.join(', ')}` }
  }
  if (typeof value !== 'object' || value === null) {
    return { ok: false, error: 'Metric value must be an object' }
  }
  return { ok: true, source, value }
}

function parseSpotifyArtistUrl(url) {
  const m = url.match(/open\.spotify\.com\/artist\/([A-Za-z0-9]+)/)
  if (!m) return { ok: false, error: 'Not a valid Spotify artist URL' }
  return { ok: true, artistId: m[1], url }
}

class Roster {
  constructor(seed) {
    this._artists = (seed || ROSTER_SEED).map(a => ({ ...a }))
  }

  list() { return [...this._artists] }

  get(id) { return this._artists.find(a => a.id === id) || null }

  find(name) {
    const q = name.toLowerCase()
    return this._artists.find(a => a.name.toLowerCase().includes(q)) || null
  }

  updateMetric(id, source, value) {
    const artist = this.get(id)
    if (!artist) return { ok: false, error: `Artist not found: ${id}` }
    const v = validateMetric(source, value)
    if (!v.ok) return v
    artist.metrics = artist.metrics || {}
    artist.metrics[source] = { ...artist.metrics[source], ...value }
    return { ok: true, artist }
  }
}

module.exports = { Roster, validateMetric, parseSpotifyArtistUrl, ROSTER_SEED, VALID_METRIC_SOURCES }

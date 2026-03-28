import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface SubmitRequest {
  release_id: string
  title: string
  artist: string
  type: "single" | "ep" | "album"
  genre: string
  release_date: string
  dsps?: string[]
}

interface DSPResult {
  name: string
  status: "submitted" | "error"
  tracking_id?: string
  error?: string
}

function generateISRC(artist: string): string {
  const country = "US"
  const registrant = "RC1"
  const year = new Date().getFullYear().toString().slice(-2)
  const seq = Math.floor(Math.random() * 99999).toString().padStart(5, "0")
  return `${country}${registrant}${year}${seq}`
}

function generateUPC(): string {
  let upc = ""
  for (let i = 0; i < 11; i++) upc += Math.floor(Math.random() * 10)
  // Calculate check digit
  const digits = upc.split("").map(Number)
  const sum = digits.reduce((acc, d, i) => acc + (i % 2 === 0 ? d * 3 : d), 0)
  const check = (10 - (sum % 10)) % 10
  return upc + check
}

const DSP_PIPELINE = [
  "Spotify",
  "Apple Music",
  "YouTube Music",
  "Amazon Music",
  "Tidal",
  "Deezer",
  "SoundCloud",
  "Pandora",
  "iHeartRadio",
]

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const body: SubmitRequest = await req.json()
    const { release_id, title, artist, type, genre, release_date, dsps = DSP_PIPELINE } = body

    if (!title || !artist) {
      return new Response(JSON.stringify({ error: "title and artist are required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // Generate codes
    const isrc = generateISRC(artist)
    const upc = type !== "single" ? generateUPC() : undefined

    // Simulate DSP submission pipeline
    const dsp_results: DSPResult[] = dsps.map((name) => ({
      name,
      status: "submitted" as const,
      tracking_id: `DMF-${Date.now()}-${name.replace(/\s/g, "").toUpperCase().slice(0, 4)}`,
    }))

    // Build pitch playlists based on genre
    const pitch_targets: string[] = []
    const genreLower = genre.toLowerCase()
    if (genreLower.includes("hip-hop") || genreLower.includes("rap")) {
      pitch_targets.push("Rap Caviar Adjacent", "Fresh Finds Hip-Hop", "Underground Rap Vault", "Hot New Hip-Hop")
    }
    if (genreLower.includes("trap")) {
      pitch_targets.push("Trap Nation Unsigned", "Street Anthems")
    }
    if (genreLower.includes("fusion") || genreLower.includes("indian")) {
      pitch_targets.push("Desi Hip-Hop", "South Asian Vibes", "Global Fusion Rap")
    }
    if (genreLower.includes("experimental") || genreLower.includes("alternative")) {
      pitch_targets.push("Fresh Finds", "Indie Radar", "Left of Center Hip-Hop")
    }

    const response = {
      success: true,
      release_id,
      isrc,
      upc,
      stage: "submitted",
      dsp_results,
      pitch_targets,
      estimated_live_date: (() => {
        const d = new Date(release_date || Date.now())
        d.setDate(d.getDate() + 3)
        return d.toISOString().slice(0, 10)
      })(),
      message: `"${title}" by ${artist} has been submitted to ${dsp_results.length} DSPs. Estimated live in 3-5 business days.`,
      submitted_at: new Date().toISOString(),
    }

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})

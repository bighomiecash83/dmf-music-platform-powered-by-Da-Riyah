import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const DARIYAH_SYSTEM_PROMPT = `You are Da'Riyah, the AI strategist for DMF Records Fly Hoolie Ent — built by and for the label.

LABEL: DMF Records Fly Hoolie Ent
FOUNDER: Deangelo Jackson (Big Homie Cash) — Columbus, Ohio, West Side
YOUR ROLE: Label intelligence — streaming strategy, royalty optimization, release planning, roster development

ROSTER (as of 2026):
- Big Homie Cash (Deangelo Jackson) — Founder. Hip-Hop/Street Rap. Spotify: 42 followers, popularity 18. Key releases: "The Rise", "Grind Season". Key collabs: Freezzo, Ellumf, B Hus from da bus.
- Freezzo — Core Artist. Hip-Hop/Trap. Spotify: 31 followers, popularity 15. Most prolific collab artist. Key collabs: Big Homie Cash, Go Savage, Chef Lo.
- OBMB DELO — Core Artist. Hip-Hop/Experimental. Spotify: 8 followers, popularity 6. "Standing on my own 10" showed editorial potential. Most underutilized — high upside. Key collabs: Big Homie Cash, Yogi Bear.
- Go Savage — Core Artist. Hip-Hop/Street Rap. Spotify: 19 followers, popularity 9. "Pistol on da dresser" hook has viral TikTok potential. Key collabs: Ellumf, Freezzo.
- Ellumf — Core Artist. Alternative Rap. No Spotify ID yet. "October 3" Indian fusion is a DSP niche play. Key collabs: Go Savage, Big Homie Cash.

2026 DSP ROYALTY RATES (per stream):
- Spotify: ~$0.004
- Apple Music: ~$0.010
- YouTube Music: ~$0.0008
- Amazon Music: ~$0.005
- Tidal: ~$0.013

CATALOG HIGHLIGHTS:
- Big Homie Cash: "The Rise", "Grind Season", "West Side Story", "No Cap"
- Freezzo: Multiple collabs with Big Homie Cash, Go Savage
- OBMB DELO: "Standing on my own 10" (editorial potential), experimental catalog
- Go Savage: "Pistol on da dresser" (viral hook potential)
- Ellumf: "October 3" (Indian fusion), "Shots Fire"

5-STEP REASONING FRAMEWORK:
1. ASSESS current numbers and position
2. IDENTIFY the highest-leverage opportunity
3. RECOMMEND a specific, actionable move
4. EXPLAIN the DSP/platform mechanics behind it
5. PROJECT realistic outcomes at current scale

TONE: Direct, data-driven, street-smart. You know the music industry AND the streets. No fluff — real talk, real numbers, real strategy. Speak to Deangelo and the team like you're in the room.

FOCUS AREAS: Spotify playlist pitching, TikTok content strategy, DSP rate optimization, royalty collection, catalog strategy, release timing, collab opportunities, editorial playlist targeting.`

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ChatRequest {
  message: string
  history?: ChatMessage[]
  model?: string
}

function standaloneResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes("royalt") || lower.includes("stream") || lower.includes("money") || lower.includes("rate")) {
    return `Real talk on royalties at our current scale:

At DMF's streaming numbers, here's what actually matters:

**DSP Rate Breakdown (2026):**
- Apple Music: $0.010/stream — best rate, prioritize pitching here
- Tidal: $0.013/stream — highest rate but smallest audience
- Spotify: $0.004/stream — most volume, lower rate
- Amazon: $0.005/stream — underrated, less competition
- YouTube: $0.0008/stream — exposure play, not a money play

**The Move:** With Big Homie Cash at 42 Spotify followers, we're pre-editorial. The play right now is Apple Music playlist pitching (SubmitHub + direct pitch via Apple Music for Artists) — they pay 2.5x Spotify rate and have curated playlists for independent artists in the hip-hop/street rap lane.

For Ellumf's "October 3" (Indian fusion), Spotify has niche editorial playlists like "Desi Hip-Hop" with less competition and better discovery rates for crossover acts.

**Realistic numbers:** At 10,000 streams/month on Apple Music = $100/month. Doesn't sound huge but compound that across 5 artists releasing consistently — it builds.

What specific track or artist you want to strategize on?`
  }

  if (lower.includes("tiktok") || lower.includes("viral") || lower.includes("social")) {
    return `TikTok is the play right now — here's the breakdown:

**Go Savage — "Pistol on da dresser"**
That hook is built for TikTok. Short, punchy, quotable. Strategy:
1. Post the hook isolated — no intro, straight to the line
2. Challenge format: "What's on your dresser?" transition trend
3. Tag Columbus creators first, then expand to Ohio hip-hop community
4. 3-5 posts per week minimum during the sprint

**Freezzo TikTok Sprint (active campaign):**
Goal is 20 clips, 50k views. At $150 budget:
- Use $75 for TikTok Spark Ads on your best-performing organic clip
- Save $75 for creator seeding (micro-influencers in the Columbus/Ohio rap scene)

**Big Homie Cash — Founder Content:**
Document the label-building process. "Building DMF from the West Side" as a content series. Authenticity converts — people want to see the real come-up story.

What artist or track you want a specific TikTok game plan for?`
  }

  if (lower.includes("roster") || lower.includes("artist") || lower.includes("delo") || lower.includes("ellumf") || lower.includes("freezzo") || lower.includes("savage")) {
    return `DMF Roster breakdown — where everyone stands and the move for each:

**Big Homie Cash** (Founder) — 42 Spotify followers, pop 18
→ Move: Consistent release cadence (1 single/month), document the journey on TikTok/IG

**Freezzo** — 31 followers, pop 15 — Most active collaborator
→ Move: Capitalize on collab catalog, create "Freezzo x DMF" playlist on Spotify

**OBMB DELO** — 8 followers, pop 6 — MOST UNDERUTILIZED
→ Move: "Standing on my own 10" needs an editorial push NOW. Submit to Spotify Fresh Finds and Apple Music New in Hip-Hop. This is a sleeper — experimental acts get more editorial love than straight street rap.

**Go Savage** — 19 followers, pop 9
→ Move: "Pistol on da dresser" viral TikTok hook push. One breakout clip can move the needle fast.

**Ellumf** — No Spotify ID yet — PRIORITY TASK
→ Move: Get Spotify for Artists claimed immediately. "October 3" Indian fusion can hit Desi Hip-Hop playlists — that's a niche with real engagement and less competition.

Who you want to deep-dive on?`
  }

  return `Da'Riyah here. DMF Records Fly Hoolie Ent — Columbus West Side.

I'm your label intelligence. I know the roster, the catalog, the DSP rates, and the moves.

Right now the highest-leverage areas for DMF:
1. **OBMB DELO** — most underutilized artist with editorial potential ("Standing on my own 10")
2. **Ellumf Spotify claim** — no Spotify ID is leaving money and discovery on the table
3. **Go Savage TikTok** — "Pistol on da dresser" hook is built for virality
4. **Apple Music pitching** — 2.5x Spotify royalty rate, less competitive for independent artists

What do you want to strategize on? Royalties, a specific artist, a release, campaigns, or the label roadmap?`
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const body: ChatRequest = await req.json()
    const { message, history = [], model = "claude-opus-4-6" } = body

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
    const googleKey = Deno.env.get("GOOGLE_AI_API_KEY")

    // Build messages array
    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ]

    // --- Path 1: Anthropic Claude ---
    if (anthropicKey && model.startsWith("claude")) {
      const isOpus = model.includes("opus")
      const payload: Record<string, unknown> = {
        model,
        max_tokens: 1024,
        system: DARIYAH_SYSTEM_PROMPT,
        messages,
      }
      if (isOpus) {
        payload.thinking = { type: "adaptive" }
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-beta": isOpus ? "interleaved-thinking-2025-05-14" : undefined,
        } as HeadersInit,
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        const textBlock = data.content?.find((b: { type: string }) => b.type === "text")
        const reply = textBlock?.text ?? "No response from Claude."
        return new Response(JSON.stringify({ reply, model_used: model, source: "anthropic" }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        })
      }
    }

    // --- Path 2: Google Gemini ---
    if (googleKey && model.startsWith("gemini")) {
      const geminiMessages = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }))

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: DARIYAH_SYSTEM_PROMPT }] },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 1024 },
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini."
        return new Response(JSON.stringify({ reply, model_used: model, source: "gemini" }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        })
      }
    }

    // --- Path 3: Smart standalone fallback ---
    const reply = standaloneResponse(message)
    return new Response(JSON.stringify({ reply, model_used: "standalone", source: "local" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})

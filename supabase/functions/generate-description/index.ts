import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface GenerateRequest {
  artist_name: string
  title: string
  genre?: string
  mood?: string
  themes?: string
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const body: GenerateRequest = await req.json()
    const { artist_name, title, genre = "Hip-Hop", mood = "", themes = "" } = body

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")

    if (anthropicKey) {
      const prompt = `Write a press-ready release description for a music release. Keep it under 150 words. Make it compelling and professional.

Artist: ${artist_name}
Title: "${title}"
Genre: ${genre}
${mood ? `Mood/Vibe: ${mood}` : ""}
${themes ? `Themes: ${themes}` : ""}

Write only the description, no headers or labels.`

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const description = data.content?.[0]?.text ?? ""
        return new Response(JSON.stringify({ description }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        })
      }
    }

    // Fallback: generate locally
    const description =
      `${artist_name} returns with "${title}," a bold new ${genre} offering ` +
      `that pushes creative boundaries. ` +
      `${themes ? `Drawing on themes of ${themes}, the project` : "The project"} ` +
      `delivers ${mood ? `a ${mood} atmosphere` : "an immersive sonic experience"} ` +
      `that demands repeat listens.\n\n` +
      `From the opening bars, it's clear this isn't just music — it's a statement. ` +
      `${artist_name} channels raw emotion into every track, blending ` +
      `${genre.toLowerCase()} traditions with forward-thinking production ` +
      `that feels both timeless and cutting-edge.\n\n` +
      `"I wanted to create something that hits different," says ${artist_name}. ` +
      `"Every bar, every beat — it all means something." ` +
      `"${title}" is available now on all major streaming platforms.`

    return new Response(JSON.stringify({ description }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  const anthropicKeySet = !!Deno.env.get("ANTHROPIC_API_KEY")
  const googleKeySet = !!Deno.env.get("GOOGLE_AI_API_KEY")

  const models = [
    {
      id: "claude-opus-4-6",
      name: "Claude Opus 4.6",
      provider: "Anthropic",
      description: "Most powerful — adaptive thinking enabled",
      available: anthropicKeySet,
      badge: "BEST",
    },
    {
      id: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      provider: "Anthropic",
      description: "Fast + smart balance",
      available: anthropicKeySet,
      badge: null,
    },
    {
      id: "claude-haiku-4-5",
      name: "Claude Haiku 4.5",
      provider: "Anthropic",
      description: "Fastest response",
      available: anthropicKeySet,
      badge: null,
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "Google",
      description: "Google's fast multimodal model",
      available: googleKeySet,
      badge: null,
    },
  ]

  return new Response(JSON.stringify({ models }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
})

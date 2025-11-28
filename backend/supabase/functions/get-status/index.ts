/**
 * DMF-MUSIC-PLATFORM - Supabase Edge Function: Get Task Status
 * 
 * Query the status of submitted tasks.
 * Requires API key authentication.
 * 
 * This is boilerplate only - no secrets included.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
};

/**
 * Validate API key format
 */
function validateAPIKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  const pattern = /^dmf_[A-Za-z0-9_-]{43}$/;
  return pattern.test(apiKey);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate API key
  const apiKey = req.headers.get('x-api-key');
  if (!validateAPIKey(apiKey)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing API key' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Missing taskId parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Placeholder - would fetch from Da'Riyah
    const data = {
      success: true,
      taskId,
      status: 'completed',
      result: {
        processedAt: new Date().toISOString(),
        botId: 'bot_distribution_001',
      },
    };

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

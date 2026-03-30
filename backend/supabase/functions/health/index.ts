/**
 * DMF-MUSIC-PLATFORM - Supabase Edge Function: Health Check
 * 
 * Simple health check endpoint for the platform.
 * 
 * This is boilerplate only - no secrets included.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const data = {
      status: 'healthy',
      service: 'dmf-music-platform-supabase',
      timestamp: new Date().toISOString(),
      region: Deno.env.get('DENO_REGION') ?? 'unknown',
    };

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

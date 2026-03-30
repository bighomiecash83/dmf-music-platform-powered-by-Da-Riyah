/**
 * DMF-MUSIC-PLATFORM - Supabase Edge Function: Submit Task
 * 
 * Submit tasks to the Da'Riyah master brain for processing.
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

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
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
    const body = await req.json();
    const { type, priority, payload } = body;

    if (!type || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Placeholder - would submit to Da'Riyah master brain
    const data = {
      success: true,
      taskId,
      status: 'pending',
      type,
      priority: priority ?? 3,
      createdAt: new Date().toISOString(),
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

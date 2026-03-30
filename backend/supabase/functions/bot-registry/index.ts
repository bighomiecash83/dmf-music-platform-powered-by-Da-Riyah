/**
 * DMF-MUSIC-PLATFORM - Supabase Edge Function: Bot Registry
 * 
 * Query and manage the 500-bot workforce.
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

/**
 * Bot categories
 */
const BOT_CATEGORIES = [
  'distribution',
  'analytics',
  'marketing',
  'royalties',
  'operations',
  'content',
  'legal',
  'social',
  'audio',
  'artist',
];

/**
 * Generate sample bots for a category
 */
function generateSampleBots(category: string, count: number) {
  const bots = [];
  for (let i = 1; i <= count; i++) {
    bots.push({
      id: `bot_${category}_${String(i).padStart(3, '0')}`,
      name: `${category.charAt(0).toUpperCase() + category.slice(1)} Bot ${i}`,
      category,
      status: i % 10 === 0 ? 'busy' : 'idle',
    });
  }
  return bots;
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
    const category = url.searchParams.get('category');
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '50');

    // Bot distribution per category
    const botCounts: Record<string, number> = {
      distribution: 50,
      analytics: 50,
      marketing: 75,
      royalties: 50,
      operations: 50,
      content: 50,
      legal: 25,
      social: 75,
      audio: 50,
      artist: 25,
    };

    let bots: any[] = [];
    
    if (category && BOT_CATEGORIES.includes(category)) {
      bots = generateSampleBots(category, botCounts[category] ?? 50);
    } else {
      // Return all bots with pagination
      for (const cat of BOT_CATEGORIES) {
        bots.push(...generateSampleBots(cat, botCounts[cat] ?? 50));
      }
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const paginatedBots = bots.slice(start, start + limit);

    const data = {
      success: true,
      total: bots.length,
      page,
      limit,
      totalPages: Math.ceil(bots.length / limit),
      categories: BOT_CATEGORIES,
      bots: paginatedBots,
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

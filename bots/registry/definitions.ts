/**
 * DMF-MUSIC-PLATFORM - Bot Definitions
 * 
 * Definitions for all 500 specialized music-industry bots.
 * Each bot has a unique ID, name, category, and set of capabilities.
 * 
 * Bot Categories:
 * - distribution: Music distribution and platform management
 * - analytics: Data analysis, metrics, and reporting
 * - marketing: Promotion, advertising, and audience engagement
 * - royalties: Payment processing and revenue tracking
 * - operations: Internal operations and workflow management
 * - content: Content creation and management
 * - legal: Legal compliance and rights management
 * - social: Social media management
 * - audio: Audio processing and mastering
 * - artist: Artist relations and development
 */

/**
 * Bot categories
 */
export const BOT_CATEGORIES = [
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
] as const;

export type BotCategory = typeof BOT_CATEGORIES[number];

/**
 * Bot definition interface
 */
export interface BotDefinition {
  id: string;
  name: string;
  category: BotCategory;
  description: string;
  capabilities: string[];
}

/**
 * Generate bot definitions for a category
 */
function generateBotDefinitions(
  category: BotCategory,
  startIndex: number,
  count: number,
  namePrefix: string,
  capabilities: string[]
): BotDefinition[] {
  const definitions: BotDefinition[] = [];
  
  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    definitions.push({
      id: `bot_${category}_${String(index).padStart(3, '0')}`,
      name: `${namePrefix} Bot ${index}`,
      category,
      description: `Specialized ${category} bot #${index}`,
      capabilities: capabilities.map(cap => `${cap}_${Math.floor(i / 10)}`),
    });
  }
  
  return definitions;
}

/**
 * All 500 bot definitions
 * 
 * Distribution: 50 bots (distribution to streaming platforms)
 * Analytics: 50 bots (data analysis and reporting)
 * Marketing: 75 bots (promotion and advertising)
 * Royalties: 50 bots (payment processing)
 * Operations: 50 bots (internal workflows)
 * Content: 50 bots (content creation)
 * Legal: 25 bots (compliance and rights)
 * Social: 75 bots (social media management)
 * Audio: 50 bots (audio processing)
 * Artist: 25 bots (artist relations)
 */
export const BotDefinitions: BotDefinition[] = [
  // Distribution Bots (50)
  ...generateBotDefinitions('distribution', 1, 50, 'Distributor', [
    'spotify_upload', 'apple_music_sync', 'youtube_music_publish',
    'tidal_distribution', 'amazon_music_deploy', 'deezer_push',
  ]),

  // Analytics Bots (50)
  ...generateBotDefinitions('analytics', 1, 50, 'Analyzer', [
    'stream_tracking', 'audience_insights', 'revenue_analysis',
    'trend_detection', 'performance_metrics', 'playlist_tracking',
  ]),

  // Marketing Bots (75)
  ...generateBotDefinitions('marketing', 1, 75, 'Marketer', [
    'campaign_management', 'ad_optimization', 'audience_targeting',
    'influencer_outreach', 'email_campaigns', 'brand_partnerships',
  ]),

  // Royalties Bots (50)
  ...generateBotDefinitions('royalties', 1, 50, 'Royalty', [
    'payment_processing', 'revenue_tracking', 'split_calculation',
    'payout_management', 'tax_reporting', 'invoice_generation',
  ]),

  // Operations Bots (50)
  ...generateBotDefinitions('operations', 1, 50, 'Operator', [
    'workflow_automation', 'task_scheduling', 'resource_allocation',
    'quality_assurance', 'system_monitoring', 'backup_management',
  ]),

  // Content Bots (50)
  ...generateBotDefinitions('content', 1, 50, 'Creator', [
    'artwork_generation', 'metadata_management', 'video_creation',
    'lyric_formatting', 'press_release', 'biography_writing',
  ]),

  // Legal Bots (25)
  ...generateBotDefinitions('legal', 1, 25, 'Legal', [
    'copyright_registration', 'contract_analysis', 'rights_management',
    'dmca_handling', 'licensing_negotiation', 'compliance_audit',
  ]),

  // Social Media Bots (75)
  ...generateBotDefinitions('social', 1, 75, 'Social', [
    'instagram_management', 'twitter_engagement', 'tiktok_content',
    'facebook_publishing', 'youtube_community', 'discord_moderation',
  ]),

  // Audio Processing Bots (50)
  ...generateBotDefinitions('audio', 1, 50, 'Audio', [
    'mastering', 'mixing', 'stem_separation',
    'format_conversion', 'loudness_normalization', 'quality_check',
  ]),

  // Artist Relations Bots (25)
  ...generateBotDefinitions('artist', 1, 25, 'Artist', [
    'talent_scouting', 'career_development', 'collaboration_matching',
    'booking_management', 'fan_engagement', 'merchandise_coordination',
  ]),
];

// Verify we have exactly 500 bots
if (BotDefinitions.length !== 500) {
  console.warn(`Warning: Expected 500 bots but got ${BotDefinitions.length}`);
}

export default BotDefinitions;

/**
 * DMF-MUSIC-PLATFORM - Database Schemas
 * 
 * TypeScript interfaces and JSON schemas for all database collections.
 * 
 * This is boilerplate only - no secrets included.
 */

/**
 * Base document interface with common fields
 */
export interface BaseDocument {
  _id?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Artist schema
 */
export interface Artist extends BaseDocument {
  name: string;
  slug: string;
  bio?: string;
  genres: string[];
  socialLinks: {
    spotify?: string;
    appleMusic?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  imageUrl?: string;
  bannerUrl?: string;
  isVerified: boolean;
  labelId?: string;
  stats: {
    totalStreams: number;
    monthlyListeners: number;
    followers: number;
  };
}

/**
 * Track schema
 */
export interface Track extends BaseDocument {
  title: string;
  slug: string;
  artistId: string;
  albumId?: string;
  duration: number; // in seconds
  isrc?: string;
  genres: string[];
  releaseDate: Date;
  audioUrl?: string;
  previewUrl?: string;
  lyrics?: string;
  credits: {
    writers: string[];
    producers: string[];
    engineers?: string[];
  };
  stats: {
    streams: number;
    saves: number;
    shares: number;
  };
  metadata: {
    bpm?: number;
    key?: string;
    explicitContent: boolean;
  };
}

/**
 * Album schema
 */
export interface Album extends BaseDocument {
  title: string;
  slug: string;
  artistId: string;
  type: 'album' | 'ep' | 'single' | 'compilation';
  trackIds: string[];
  releaseDate: Date;
  coverUrl?: string;
  upc?: string;
  genres: string[];
  label?: string;
  copyright?: string;
  stats: {
    totalStreams: number;
    saves: number;
  };
}

/**
 * Release schema (distribution)
 */
export interface Release extends BaseDocument {
  albumId: string;
  artistId: string;
  status: 'draft' | 'pending' | 'processing' | 'live' | 'taken_down';
  platforms: {
    name: string;
    status: 'pending' | 'processing' | 'live' | 'failed';
    releaseId?: string;
    releaseUrl?: string;
    releasedAt?: Date;
  }[];
  scheduledDate?: Date;
  territories: string[];
  pricingTier?: string;
}

/**
 * Bot schema
 */
export interface Bot extends BaseDocument {
  botId: string;
  name: string;
  category: string;
  description: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline' | 'error';
  currentTaskId?: string;
  stats: {
    tasksCompleted: number;
    tasksFailed: number;
    avgExecutionTime: number;
  };
  config: Record<string, unknown>;
}

/**
 * Task schema
 */
export interface Task extends BaseDocument {
  taskId: string;
  type: string;
  priority: 1 | 2 | 3 | 4 | 5;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  assignedBotId?: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * Royalty schema
 */
export interface Royalty extends BaseDocument {
  artistId: string;
  trackId: string;
  platform: string;
  period: {
    start: Date;
    end: Date;
  };
  streams: number;
  revenue: {
    gross: number;
    net: number;
    currency: string;
  };
  splits: {
    recipientId: string;
    percentage: number;
    amount: number;
  }[];
  status: 'pending' | 'calculated' | 'paid';
  paidAt?: Date;
}

/**
 * Analytics event schema
 */
export interface AnalyticsEvent extends BaseDocument {
  eventType: string;
  entityType: 'artist' | 'track' | 'album' | 'release' | 'user';
  entityId: string;
  platform?: string;
  country?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * User schema
 */
export interface User extends BaseDocument {
  email: string;
  hashedPassword?: string;
  name: string;
  role: 'admin' | 'manager' | 'artist' | 'user';
  artistIds?: string[];
  permissions: string[];
  lastLoginAt?: Date;
  isActive: boolean;
  preferences: Record<string, unknown>;
}

/**
 * API Key schema
 */
export interface APIKey extends BaseDocument {
  keyHash: string; // Never store raw API keys
  keyPrefix: string; // First few chars for identification
  name: string;
  userId: string;
  permissions: string[];
  rateLimit: number;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

/**
 * Audit Log schema
 */
export interface AuditLog extends BaseDocument {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
}

/**
 * JSON Schema exports for validation
 */
export const SCHEMAS = {
  artist: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['name', 'slug', 'genres', 'isVerified', 'stats'],
    properties: {
      name: { type: 'string', minLength: 1 },
      slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
      bio: { type: 'string' },
      genres: { type: 'array', items: { type: 'string' } },
      isVerified: { type: 'boolean' },
    },
  },
  track: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['title', 'slug', 'artistId', 'duration', 'releaseDate'],
    properties: {
      title: { type: 'string', minLength: 1 },
      slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
      artistId: { type: 'string' },
      duration: { type: 'number', minimum: 0 },
      releaseDate: { type: 'string', format: 'date-time' },
    },
  },
  task: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['type', 'priority', 'payload'],
    properties: {
      type: { type: 'string' },
      priority: { type: 'number', minimum: 1, maximum: 5 },
      payload: { type: 'object' },
    },
  },
};

export default SCHEMAS;

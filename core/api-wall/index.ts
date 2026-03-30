/**
 * DMF-MUSIC-PLATFORM - Encrypted API Wall
 * 
 * Portless, API-key-only architecture for secure communication.
 * All external requests are validated and encrypted through this wall.
 * 
 * This is boilerplate only - no secrets or API keys included.
 */

import * as crypto from 'crypto';

/**
 * API Wall configuration
 */
export interface APIWallConfig {
  /** Encryption algorithm to use */
  encryptionAlgorithm: string;
  /** Rate limit per minute */
  rateLimitPerMinute: number;
  /** Enable request logging */
  enableLogging: boolean;
}

/**
 * Default API Wall configuration
 */
export const DEFAULT_API_WALL_CONFIG: APIWallConfig = {
  encryptionAlgorithm: 'aes-256-gcm',
  rateLimitPerMinute: 1000,
  enableLogging: false,
};

/**
 * API Key metadata
 */
export interface APIKeyMeta {
  keyId: string;
  permissions: string[];
  rateLimit: number;
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * Request context for validation
 */
export interface RequestContext {
  apiKey: string;
  endpoint: string;
  method: string;
  timestamp: number;
  signature?: string;
  payload?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  keyMeta?: APIKeyMeta;
}

/**
 * Encrypted API Wall
 * 
 * Provides:
 * - API key validation without exposing ports
 * - Request encryption/decryption
 * - Rate limiting
 * - Request signing and verification
 */
export class APIWall {
  private config: APIWallConfig;
  private rateLimitMap: Map<string, number[]> = new Map();
  private initialized: boolean = false;

  constructor(config: Partial<APIWallConfig> = {}) {
    this.config = { ...DEFAULT_API_WALL_CONFIG, ...config };
  }

  /**
   * Initialize the API wall
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('API Wall is already initialized');
    }

    // Setup rate limit cleanup interval
    setInterval(() => this.cleanupRateLimits(), 60000);

    this.initialized = true;
    this.log('API Wall initialized');
  }

  /**
   * Validate an incoming request
   */
  async validateRequest(context: RequestContext): Promise<ValidationResult> {
    this.ensureInitialized();

    // Check API key format
    if (!this.isValidKeyFormat(context.apiKey)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    // Check rate limit
    if (!this.checkRateLimit(context.apiKey)) {
      return { valid: false, error: 'Rate limit exceeded' };
    }

    // Verify request signature if provided
    if (context.signature && !this.verifySignature(context)) {
      return { valid: false, error: 'Invalid request signature' };
    }

    // Check timestamp freshness (prevent replay attacks)
    const now = Date.now();
    if (Math.abs(now - context.timestamp) > 300000) { // 5 minutes
      return { valid: false, error: 'Request timestamp expired' };
    }

    // Record rate limit
    this.recordRequest(context.apiKey);

    return {
      valid: true,
      keyMeta: {
        keyId: this.hashKeyId(context.apiKey),
        permissions: ['read', 'write'], // Would be loaded from database
        rateLimit: this.config.rateLimitPerMinute,
        createdAt: new Date(),
      },
    };
  }

  /**
   * Encrypt data for transmission
   */
  encrypt(data: string, secretKey: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const cipher = crypto.createCipheriv(this.config.encryptionAlgorithm, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = (cipher as crypto.CipherGCM).getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  /**
   * Decrypt received data
   */
  decrypt(encrypted: string, iv: string, tag: string, secretKey: string): string {
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv(
      this.config.encryptionAlgorithm,
      key,
      Buffer.from(iv, 'hex')
    );

    (decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a new API key
   */
  generateAPIKey(prefix: string = 'dmf'): string {
    const randomPart = crypto.randomBytes(32).toString('base64url');
    return `${prefix}_${randomPart}`;
  }

  /**
   * Create request signature
   */
  createSignature(payload: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');
  }

  /**
   * Shutdown the API wall
   */
  async shutdown(): Promise<void> {
    this.log('API Wall shutting down');
    this.rateLimitMap.clear();
    this.initialized = false;
  }

  private isValidKeyFormat(apiKey: string): boolean {
    // Format: prefix_base64urlsafestring
    const pattern = /^[a-z]+_[A-Za-z0-9_-]{43}$/;
    return pattern.test(apiKey);
  }

  private checkRateLimit(apiKey: string): boolean {
    const keyHash = this.hashKeyId(apiKey);
    const requests = this.rateLimitMap.get(keyHash) ?? [];
    const now = Date.now();
    const recentRequests = requests.filter(t => now - t < 60000);
    return recentRequests.length < this.config.rateLimitPerMinute;
  }

  private recordRequest(apiKey: string): void {
    const keyHash = this.hashKeyId(apiKey);
    const requests = this.rateLimitMap.get(keyHash) ?? [];
    requests.push(Date.now());
    this.rateLimitMap.set(keyHash, requests);
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, requests] of this.rateLimitMap.entries()) {
      const recentRequests = requests.filter(t => now - t < 60000);
      if (recentRequests.length === 0) {
        this.rateLimitMap.delete(key);
      } else {
        this.rateLimitMap.set(key, recentRequests);
      }
    }
  }

  private verifySignature(context: RequestContext): boolean {
    // In production, this would verify against stored secrets
    // This is boilerplate - signature verification logic would be implemented
    return context.signature !== undefined && context.signature.length > 0;
  }

  private hashKeyId(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('API Wall is not initialized. Call initialize() first.');
    }
  }

  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[APIWall] ${message}`);
    }
  }
}

// Re-export for convenience
export { APIWall as default };

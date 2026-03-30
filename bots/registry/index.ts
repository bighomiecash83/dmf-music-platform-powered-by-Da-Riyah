/**
 * DMF-MUSIC-PLATFORM - Bot Registry
 * 
 * Central registry for all 500 specialized music-industry bots.
 * Manages bot lifecycle, assignment, and coordination.
 * 
 * This is boilerplate only - no secrets or API keys included.
 */

import { BotDefinitions, BOT_CATEGORIES, BotCategory } from './definitions';

/**
 * Bot status enumeration
 */
export enum BotStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ERROR = 'error',
}

/**
 * Bot interface
 */
export interface Bot {
  id: string;
  name: string;
  category: BotCategory;
  description: string;
  capabilities: string[];
  status: BotStatus;
  currentTask?: string;
  execute: (task: unknown) => Promise<void>;
}

/**
 * Bot registration info
 */
export interface BotRegistrationInfo {
  id: string;
  name: string;
  category: BotCategory;
  description: string;
  capabilities: string[];
}

/**
 * Bot Registry - Manages all 500 specialized bots
 */
export class BotRegistry {
  private bots: Map<string, Bot> = new Map();
  private categoryIndex: Map<BotCategory, Set<string>> = new Map();
  private capabilityIndex: Map<string, Set<string>> = new Map();
  private initialized: boolean = false;

  constructor() {
    // Initialize category index
    for (const category of BOT_CATEGORIES) {
      this.categoryIndex.set(category, new Set());
    }
  }

  /**
   * Initialize the registry with all 500 bots
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Bot Registry is already initialized');
    }

    // Register all bots from definitions
    for (const definition of BotDefinitions) {
      await this.registerBot({
        id: definition.id,
        name: definition.name,
        category: definition.category,
        description: definition.description,
        capabilities: definition.capabilities,
      });
    }

    this.initialized = true;
    console.log(`[BotRegistry] Initialized with ${this.bots.size} bots`);
  }

  /**
   * Register a new bot
   */
  async registerBot(info: BotRegistrationInfo): Promise<void> {
    const bot: Bot = {
      ...info,
      status: BotStatus.IDLE,
      execute: async (task: unknown) => {
        // Default execution logic - would be overridden by specific bot implementations
        console.log(`[Bot:${info.id}] Executing task:`, task);
      },
    };

    this.bots.set(bot.id, bot);

    // Update category index
    const categorySet = this.categoryIndex.get(bot.category);
    categorySet?.add(bot.id);

    // Update capability index
    for (const capability of bot.capabilities) {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability)?.add(bot.id);
    }
  }

  /**
   * Find a bot suitable for a given task type
   */
  async findBotForTask(taskType: string): Promise<Bot | null> {
    // Try to find by capability
    const botIds = this.capabilityIndex.get(taskType);
    if (botIds && botIds.size > 0) {
      // Find an idle bot with this capability
      for (const botId of botIds) {
        const bot = this.bots.get(botId);
        if (bot && bot.status === BotStatus.IDLE) {
          return bot;
        }
      }
    }

    // No suitable bot found
    return null;
  }

  /**
   * Get bot by ID
   */
  getBot(botId: string): Bot | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get all bots in a category
   */
  getBotsByCategory(category: BotCategory): Bot[] {
    const botIds = this.categoryIndex.get(category) ?? new Set();
    return Array.from(botIds).map(id => this.bots.get(id)!).filter(Boolean);
  }

  /**
   * Get count of active (non-offline) bots
   */
  async getActiveBotCount(): Promise<number> {
    let count = 0;
    for (const bot of this.bots.values()) {
      if (bot.status !== BotStatus.OFFLINE) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all bots
   */
  getAllBots(): Bot[] {
    return Array.from(this.bots.values());
  }

  /**
   * Update bot status
   */
  updateBotStatus(botId: string, status: BotStatus): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.status = status;
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): Record<string, unknown> {
    const statsByCategory: Record<string, number> = {};
    for (const [category, botIds] of this.categoryIndex) {
      statsByCategory[category] = botIds.size;
    }

    const statusCounts: Record<string, number> = {
      idle: 0,
      busy: 0,
      offline: 0,
      error: 0,
    };

    for (const bot of this.bots.values()) {
      statusCounts[bot.status]++;
    }

    return {
      totalBots: this.bots.size,
      byCategory: statsByCategory,
      byStatus: statusCounts,
      capabilitiesCount: this.capabilityIndex.size,
    };
  }
}

export default BotRegistry;

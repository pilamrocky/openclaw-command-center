/**
 * Provider Registry — Auto-discovers and manages data providers
 *
 * Loads all .js files from the providers/ directory (except this file),
 * manages refresh intervals, and caches provider data.
 */

const fs = require('fs');
const path = require('path');

class ProviderRegistry {
  constructor(config) {
    this.config = config;
    this.providers = new Map();
    this.cache = new Map();
    this.intervals = new Map();
  }

  /**
   * Auto-discover and load all providers from the providers/ directory
   */
  discover() {
    const dir = __dirname;
    const files = fs.readdirSync(dir).filter(
      (f) => f.endsWith('.js') && f !== 'registry.js'
    );

    for (const file of files) {
      try {
        const provider = require(path.join(dir, file));
        if (provider.id && typeof provider.getData === 'function') {
          this.register(provider);
          console.log(`[Registry] Loaded provider: ${provider.id} (${provider.name})`);
        }
      } catch (e) {
        console.error(`[Registry] Failed to load ${file}:`, e.message);
      }
    }

    console.log(`[Registry] ${this.providers.size} providers loaded`);
  }

  /**
   * Register a single provider
   */
  register(provider) {
    this.providers.set(provider.id, provider);

    // Set up refresh interval if specified
    if (provider.refreshInterval) {
      this.startRefresh(provider.id, provider.refreshInterval);
    }
  }

  /**
   * Start auto-refresh for a provider
   */
  startRefresh(id, intervalMs) {
    if (this.intervals.has(id)) {
      clearInterval(this.intervals.get(id));
    }

    const interval = setInterval(() => this.refresh(id), intervalMs);
    this.intervals.set(id, interval);
  }

  /**
   * Refresh a single provider's cached data
   */
  async refresh(id) {
    const provider = this.providers.get(id);
    if (!provider) return null;

    try {
      const data = await provider.getData({ config: this.config });
      this.cache.set(id, {
        data,
        timestamp: Date.now(),
        provider: {
          id: provider.id,
          name: provider.name,
          icon: provider.icon,
          category: provider.category,
        },
      });
      return data;
    } catch (e) {
      console.error(`[Registry] Refresh failed for ${id}:`, e.message);
      return this.cache.get(id)?.data || null;
    }
  }

  /**
   * Get data for a single provider (from cache or fresh)
   */
  async getData(id) {
    const cached = this.cache.get(id);
    const provider = this.providers.get(id);

    if (!provider) return null;

    // Return cache if fresh enough
    if (cached && provider.refreshInterval) {
      const age = Date.now() - cached.timestamp;
      if (age < provider.refreshInterval) return cached;
    }

    // Refresh and return
    await this.refresh(id);
    return this.cache.get(id) || null;
  }

  /**
   * Get all provider data — the unified state endpoint
   */
  async getAllData() {
    // Refresh all providers in parallel
    const ids = Array.from(this.providers.keys());
    await Promise.all(ids.map((id) => this.refresh(id)));

    // Build response grouped by category
    const result = {
      providers: {},
      categories: {},
      timestamp: Date.now(),
    };

    for (const [id, cached] of this.cache) {
      result.providers[id] = cached;

      // Group by category
      const category = cached.provider.category || 'other';
      if (!result.categories[category]) {
        result.categories[category] = [];
      }
      result.categories[category].push(id);
    }

    return result;
  }

  /**
   * Get the category configuration for the frontend
   */
  getCategoryConfig() {
    return {
      system:    { title: 'System',          icon: '📡', order: 1 },
      ai:        { title: 'AI Sessions',     icon: '🧠', order: 2 },
      tasks:     { title: 'Scheduled Tasks', icon: '⏰', order: 3 },
      knowledge: { title: 'Knowledge',       icon: '📝', order: 4 },
      metrics:   { title: 'Metrics',         icon: '📊', order: 5 },
      actions:   { title: 'Actions',         icon: '🎮', order: 6 },
      other:     { title: 'Other',           icon: '📦', order: 99 },
    };
  }

  /**
   * Get list of registered providers (for API discovery)
   */
  listProviders() {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      category: p.category,
      refreshInterval: p.refreshInterval,
    }));
  }

  /**
   * Stop all refresh intervals
   */
  shutdown() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
}

module.exports = { ProviderRegistry };

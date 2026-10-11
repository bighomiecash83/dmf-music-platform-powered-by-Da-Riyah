'use strict'

const PROVIDER_CONTRACT = Object.freeze({
  // Required methods a real provider must implement
  render: 'async render(jobSpec) -> { ok, outputPath, metadata }',
  status: 'async status(jobId) -> { state, progress, error }',
  cancel: 'async cancel(jobId) -> { ok }',
})

const stubProvider = {
  name: 'stub',
  available: false,
  render: async (_spec) => ({ ok: false, error: 'No video provider configured. Implement PROVIDER_CONTRACT to enable rendering.' }),
  status: async (_id) => ({ state: 'unavailable', progress: 0 }),
  cancel: async (_id) => ({ ok: false }),
}

class ProviderRegistry {
  constructor() {
    this._providers = new Map()
    this._default = null
    this.register('stub', stubProvider)
    this._default = 'stub'
  }

  register(name, provider) {
    const missing = ['render', 'status', 'cancel'].filter(m => typeof provider[m] !== 'function')
    if (missing.length) throw new Error(`Provider "${name}" missing required methods: ${missing.join(', ')}`)
    this._providers.set(name, provider)
    if (provider.available && !this._default) this._default = name
    return this
  }

  get(name) { return this._providers.get(name) || null }

  getDefault() {
    // Return first available provider, falling back to stub
    for (const [, p] of this._providers) {
      if (p.available && p.name !== 'stub') return p
    }
    return this._providers.get('stub')
  }

  list() {
    return [...this._providers.values()].map(p => ({ name: p.name, available: !!p.available }))
  }
}

module.exports = { ProviderRegistry, stubProvider, PROVIDER_CONTRACT }

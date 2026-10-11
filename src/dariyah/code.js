'use strict'

const { AuditLog, AUDIT_EVENTS } = require('./audit')

const CODE_PROVIDER_CONTRACT = Object.freeze({
  complete: 'async complete(prompt, opts) -> { ok, text, model, usage }',
  stream:   'async* stream(prompt, opts) -> yields { token } chunks',
})

const stubCodeProvider = {
  name: 'stub',
  available: false,
  complete: async (_prompt, _opts) => ({
    ok: false,
    error: 'No code provider configured. Set ANTHROPIC_API_KEY or implement CODE_PROVIDER_CONTRACT.',
  }),
  stream: async function* (_prompt, _opts) {
    yield { token: '[No code provider configured]' }
  },
}

function validateCodeProvider(name, provider) {
  const missing = ['complete', 'stream'].filter(m => typeof provider[m] !== 'function')
  if (missing.length) throw new Error(`Code provider "${name}" missing: ${missing.join(', ')}`)
  return true
}

class CodeProviderRegistry {
  constructor() {
    this._providers = new Map()
    this._default = null
    this.register('stub', stubCodeProvider)
    this._default = 'stub'
  }

  register(name, provider) {
    validateCodeProvider(name, provider)
    this._providers.set(name, provider)
    if (provider.available && !this._default) this._default = name
    return this
  }

  get(name) { return this._providers.get(name) || null }

  getDefault() {
    for (const [, p] of this._providers) {
      if (p.available && p.name !== 'stub') return p
    }
    return this._providers.get('stub')
  }

  list() {
    return [...this._providers.values()].map(p => ({ name: p.name, available: !!p.available }))
  }
}

function buildCodeRequest(prompt, { mode = 'complete', language, context, maxTokens = 2048 } = {}) {
  if (!prompt || typeof prompt !== 'string') throw new Error('prompt required')
  return {
    prompt: prompt.trim(),
    mode,
    language: language || null,
    context: context || null,
    maxTokens,
    requestedAt: new Date().toISOString(),
  }
}

async function requestCode(prompt, opts = {}, { registry, audit } = {}) {
  const _audit = audit || new AuditLog()
  const _registry = registry || new CodeProviderRegistry()
  const req = buildCodeRequest(prompt, opts)
  _audit.append(AUDIT_EVENTS.CODE_REQUESTED, { prompt: prompt.slice(0, 120), mode: req.mode })
  const provider = _registry.getDefault()
  const result = await provider.complete(req.prompt, req)
  return result
}

module.exports = { CodeProviderRegistry, stubCodeProvider, CODE_PROVIDER_CONTRACT, buildCodeRequest, requestCode, validateCodeProvider }

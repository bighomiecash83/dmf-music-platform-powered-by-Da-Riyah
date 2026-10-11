'use strict'

const { AuditLog, AUDIT_EVENTS } = require('./audit')

const SUPPORTED_RUNTIMES = Object.freeze(['node', 'python', 'shell'])
const DEFAULT_TIMEOUT_MS = 5000
const MAX_OUTPUT_BYTES = 64 * 1024

function buildRunSpec(code, { runtime = 'node', timeoutMs = DEFAULT_TIMEOUT_MS, env = {} } = {}) {
  if (!code || typeof code !== 'string') throw new Error('code required')
  if (!SUPPORTED_RUNTIMES.includes(runtime)) {
    throw new Error(`Unsupported runtime: ${runtime}. Supported: ${SUPPORTED_RUNTIMES.join(', ')}`)
  }
  return {
    code: code.trim(),
    runtime,
    timeoutMs: Math.min(timeoutMs, 30000),
    env: { ...env },
    specId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  }
}

// No-op sandbox — real execution disabled until a secure container is wired up.
// Replace run() with a child_process / containerised runtime when ready.
const NoSandbox = {
  name: 'no-sandbox',
  available: false,
  run: async (spec) => ({
    ok: false,
    specId: spec.specId,
    error: 'Sandbox execution not configured. Implement SandboxRunner.run() with a secure container.',
    stdout: '',
    stderr: '',
    exitCode: null,
    runtime: spec.runtime,
  }),
}

class SandboxRunner {
  constructor({ sandbox, audit } = {}) {
    this._sandbox = sandbox || NoSandbox
    this._audit = audit || new AuditLog()
  }

  async run(code, opts = {}) {
    const spec = buildRunSpec(code, opts)
    this._audit.append(AUDIT_EVENTS.SANDBOX_RUN, {
      specId: spec.specId,
      runtime: spec.runtime,
      codeLen: spec.code.length,
    })
    const result = await this._sandbox.run(spec)
    if (result.stdout && result.stdout.length > MAX_OUTPUT_BYTES) {
      result.stdout = result.stdout.slice(0, MAX_OUTPUT_BYTES) + '\n[output truncated]'
    }
    return result
  }

  isAvailable() {
    return !!this._sandbox.available
  }
}

module.exports = { SandboxRunner, NoSandbox, buildRunSpec, SUPPORTED_RUNTIMES, DEFAULT_TIMEOUT_MS }

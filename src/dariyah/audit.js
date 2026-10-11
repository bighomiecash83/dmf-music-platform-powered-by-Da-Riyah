'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { getConfig } = require('../config')

const AUDIT_EVENTS = Object.freeze({
  DELIVERY_ATTEMPT:   'DELIVERY_ATTEMPT',
  DELIVERY_SUCCESS:   'DELIVERY_SUCCESS',
  DELIVERY_DENIED:    'DELIVERY_DENIED',
  APPROVAL_CHECKED:   'APPROVAL_CHECKED',
  APPROVAL_GRANTED:   'APPROVAL_GRANTED',
  APPROVAL_DENIED:    'APPROVAL_DENIED',
  IDENTIFIER_VALID:   'IDENTIFIER_VALID',
  IDENTIFIER_INVALID: 'IDENTIFIER_INVALID',
  ERN_GENERATED:      'ERN_GENERATED',
  ERN_VALIDATED:      'ERN_VALIDATED',
  MIGRATION_ANALYSED: 'MIGRATION_ANALYSED',
  MIGRATION_APPROVED: 'MIGRATION_APPROVED',
  MIGRATION_DENIED:   'MIGRATION_DENIED',
  CODE_REQUESTED:     'CODE_REQUESTED',
  SANDBOX_RUN:        'SANDBOX_RUN',
  SESSION_CREATED:    'SESSION_CREATED',
  VIDEO_JOB_QUEUED:   'VIDEO_JOB_QUEUED',
})

class AuditLog {
  constructor(filePath) {
    this._path = filePath || path.join(getConfig().dataDir, 'audit.ndjson')
    this._ensureDir()
  }

  _ensureDir() {
    const dir = path.dirname(this._path)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  append(event, payload = {}) {
    if (!AUDIT_EVENTS[event]) throw new Error(`Unknown audit event: ${event}`)
    const record = JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...payload,
    })
    fs.appendFileSync(this._path, record + '\n', 'utf8')
    return record
  }

  readAll() {
    if (!fs.existsSync(this._path)) return []
    return fs.readFileSync(this._path, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line) } catch { return null } })
      .filter(Boolean)
  }

  tail(n = 50) {
    return this.readAll().slice(-n)
  }
}

module.exports = { AuditLog, AUDIT_EVENTS }

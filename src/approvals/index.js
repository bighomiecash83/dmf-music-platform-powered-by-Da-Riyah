'use strict'

const fs = require('node:fs')
const { getConfig } = require('../config')
const { AuditLog, AUDIT_EVENTS } = require('../dariyah/audit')

const DENY_REASONS = Object.freeze({
  NO_FILE:       'NO_APPROVAL_FILE',
  NOT_FOUND:     'RELEASE_NOT_IN_APPROVAL_FILE',
  PENDING:       'APPROVAL_PENDING',
  REJECTED:      'APPROVAL_REJECTED',
  EXPIRED:       'APPROVAL_EXPIRED',
  INVALID_ENTRY: 'INVALID_APPROVAL_ENTRY',
})

class FileApprovalStore {
  constructor(filePath) {
    this._path = filePath || getConfig().approvalFile
    this._cache = null
    this._mtime = null
  }

  _load() {
    if (!fs.existsSync(this._path)) return null
    const stat = fs.statSync(this._path)
    if (this._cache && this._mtime === stat.mtimeMs) return this._cache
    try {
      this._cache = JSON.parse(fs.readFileSync(this._path, 'utf8'))
      this._mtime = stat.mtimeMs
      return this._cache
    } catch {
      return null
    }
  }

  get(releaseId) {
    const data = this._load()
    if (!data) return null
    const releases = Array.isArray(data) ? data : (data.releases || [])
    return releases.find(r => r.releaseId === releaseId || r.isrc === releaseId) || null
  }
}

class ApprovalGate {
  constructor({ store, audit } = {}) {
    this._store = store || new FileApprovalStore()
    this._audit = audit || new AuditLog()
  }

  check(releaseId) {
    const base = { releaseId }

    // Rule 1: No approval file → DENY
    const entry = this._store.get(releaseId)
    if (!fs.existsSync(this._store._path)) {
      this._audit.append(AUDIT_EVENTS.APPROVAL_DENIED, { ...base, reason: DENY_REASONS.NO_FILE })
      return { allowed: false, reason: DENY_REASONS.NO_FILE }
    }

    // Rule 2: Missing record → DENY
    if (!entry) {
      this._audit.append(AUDIT_EVENTS.APPROVAL_DENIED, { ...base, reason: DENY_REASONS.NOT_FOUND })
      return { allowed: false, reason: DENY_REASONS.NOT_FOUND }
    }

    // Rule 3: Invalid entry → DENY
    if (!entry.status || !entry.releaseId) {
      this._audit.append(AUDIT_EVENTS.APPROVAL_DENIED, { ...base, reason: DENY_REASONS.INVALID_ENTRY })
      return { allowed: false, reason: DENY_REASONS.INVALID_ENTRY }
    }

    // Rule 4: Pending → DENY
    if (entry.status === 'pending') {
      this._audit.append(AUDIT_EVENTS.APPROVAL_DENIED, { ...base, reason: DENY_REASONS.PENDING })
      return { allowed: false, reason: DENY_REASONS.PENDING }
    }

    // Rule 5: Rejected → DENY
    if (entry.status === 'rejected') {
      this._audit.append(AUDIT_EVENTS.APPROVAL_DENIED, { ...base, reason: DENY_REASONS.REJECTED })
      return { allowed: false, reason: DENY_REASONS.REJECTED }
    }

    // Rule 6: Expired → DENY
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      this._audit.append(AUDIT_EVENTS.APPROVAL_DENIED, { ...base, reason: DENY_REASONS.EXPIRED })
      return { allowed: false, reason: DENY_REASONS.EXPIRED }
    }

    // All checks passed → ALLOW
    this._audit.append(AUDIT_EVENTS.APPROVAL_GRANTED, { ...base, approvedBy: entry.approvedBy })
    return { allowed: true, entry }
  }
}

module.exports = { FileApprovalStore, ApprovalGate, DENY_REASONS }

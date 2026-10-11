'use strict'

const crypto = require('node:crypto')
const { AuditLog, AUDIT_EVENTS } = require('./audit')

const MIGRATION_KINDS = Object.freeze({
  CREATE_TABLE:   'CREATE_TABLE',
  ALTER_TABLE:    'ALTER_TABLE',
  DROP_TABLE:     'DROP_TABLE',
  CREATE_INDEX:   'CREATE_INDEX',
  DROP_INDEX:     'DROP_INDEX',
  INSERT:         'INSERT',
  UPDATE:         'UPDATE',
  DELETE:         'DELETE',
  FUNCTION:       'FUNCTION',
  VIEW:           'VIEW',
  OTHER:          'OTHER',
})

const RISK_MAP = {
  DROP_TABLE:   'HIGH',
  DROP_INDEX:   'MEDIUM',
  ALTER_TABLE:  'MEDIUM',
  DELETE:       'MEDIUM',
  UPDATE:       'LOW',
  CREATE_TABLE: 'LOW',
  CREATE_INDEX: 'LOW',
  INSERT:       'LOW',
  FUNCTION:     'LOW',
  VIEW:         'LOW',
  OTHER:        'MEDIUM',
}

const KIND_PATTERNS = [
  [/^\s*CREATE\s+TABLE/i,  MIGRATION_KINDS.CREATE_TABLE],
  [/^\s*ALTER\s+TABLE/i,   MIGRATION_KINDS.ALTER_TABLE],
  [/^\s*DROP\s+TABLE/i,    MIGRATION_KINDS.DROP_TABLE],
  [/^\s*CREATE\s+INDEX/i,  MIGRATION_KINDS.CREATE_INDEX],
  [/^\s*DROP\s+INDEX/i,    MIGRATION_KINDS.DROP_INDEX],
  [/^\s*INSERT\s+INTO/i,   MIGRATION_KINDS.INSERT],
  [/^\s*UPDATE\s+/i,       MIGRATION_KINDS.UPDATE],
  [/^\s*DELETE\s+FROM/i,   MIGRATION_KINDS.DELETE],
  [/^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i, MIGRATION_KINDS.FUNCTION],
  [/^\s*CREATE\s+(OR\s+REPLACE\s+)?VIEW/i,     MIGRATION_KINDS.VIEW],
]

function digestSql(sql) {
  return crypto.createHash('sha256').update(sql.trim()).digest('hex').slice(0, 16)
}

function detectKind(sql) {
  for (const [pattern, kind] of KIND_PATTERNS) {
    if (pattern.test(sql)) return kind
  }
  return MIGRATION_KINDS.OTHER
}

function analyseMigration(sql, { name = 'unnamed' } = {}) {
  if (!sql || typeof sql !== 'string') return { ok: false, error: 'sql required' }
  const trimmed = sql.trim()
  if (!trimmed) return { ok: false, error: 'sql is empty' }

  const statements = trimmed.split(/;\s*\n/).filter(s => s.trim())
  const kinds = [...new Set(statements.map(detectKind))]
  const risk = kinds.reduce((acc, k) => {
    const r = RISK_MAP[k] || 'MEDIUM'
    if (r === 'HIGH') return 'HIGH'
    if (r === 'MEDIUM' && acc !== 'HIGH') return 'MEDIUM'
    return acc
  }, 'LOW')

  const warnings = []
  if (kinds.includes(MIGRATION_KINDS.DROP_TABLE)) warnings.push('Drops a table — data loss is irreversible')
  if (kinds.includes(MIGRATION_KINDS.DELETE)) warnings.push('Bulk DELETE detected — ensure WHERE clause is scoped')
  if (/WITHOUT\s+ROWID/i.test(sql)) warnings.push('WITHOUT ROWID table — limited ALTER support')
  if (/TRUNCATE/i.test(sql)) warnings.push('TRUNCATE detected — destructive operation')

  return {
    ok: true,
    name,
    digest: digestSql(trimmed),
    statementCount: statements.length,
    kinds,
    risk,
    warnings,
    analysedAt: new Date().toISOString(),
  }
}

class MigrationGate {
  constructor({ audit } = {}) {
    this._audit = audit || new AuditLog()
    this._approved = new Set()
  }

  approve(digest) {
    this._approved.add(digest)
    this._audit.append(AUDIT_EVENTS.MIGRATION_APPROVED, { digest })
  }

  check(analysis) {
    if (!analysis || !analysis.ok) return { allowed: false, reason: 'INVALID_ANALYSIS' }
    if (analysis.risk === 'HIGH' && !this._approved.has(analysis.digest)) {
      this._audit.append(AUDIT_EVENTS.MIGRATION_BLOCKED, { digest: analysis.digest, risk: analysis.risk })
      return { allowed: false, reason: 'HIGH_RISK_REQUIRES_APPROVAL', digest: analysis.digest }
    }
    this._audit.append(AUDIT_EVENTS.MIGRATION_ALLOWED, { digest: analysis.digest, risk: analysis.risk })
    return { allowed: true, analysis }
  }
}

module.exports = { MigrationGate, analyseMigration, digestSql, MIGRATION_KINDS, RISK_MAP }

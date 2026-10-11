'use strict'

const { generateErn, validateErnXml } = require('./index')
const { ApprovalGate } = require('../approvals/index')
const { AuditLog, AUDIT_EVENTS } = require('../dariyah/audit')
const { validateReleaseIdentifiers } = require('../identifiers/index')

// Single delivery boundary — fail-closed.
// Nothing reaches DSPs without passing every gate.
async function deliverErn(release, { gate, audit, dryRun = false } = {}) {
  const _audit = audit || new AuditLog()
  const _gate = gate || new ApprovalGate({ audit: _audit })
  const releaseId = release.isrc || release.upc || release.messageId

  _audit.append(AUDIT_EVENTS.DELIVERY_ATTEMPT, { releaseId, dryRun })

  // 1. Validate identifiers
  const idResult = validateReleaseIdentifiers({
    isrc: release.isrc,
    upc: release.upc,
  })
  if (!idResult.ok) {
    _audit.append(AUDIT_EVENTS.DELIVERY_DENIED, { releaseId, reason: 'INVALID_IDENTIFIERS', errors: idResult.errors })
    return { ok: false, reason: 'INVALID_IDENTIFIERS', errors: idResult.errors }
  }

  // 2. Check approval gate (fail-closed)
  const approval = _gate.check(releaseId)
  if (!approval.allowed) {
    _audit.append(AUDIT_EVENTS.DELIVERY_DENIED, { releaseId, reason: approval.reason })
    return { ok: false, reason: approval.reason }
  }

  // 3. Generate ERN XML
  let xml
  try {
    xml = generateErn(release)
  } catch (err) {
    _audit.append(AUDIT_EVENTS.DELIVERY_DENIED, { releaseId, reason: 'ERN_GENERATION_FAILED', error: err.message })
    return { ok: false, reason: 'ERN_GENERATION_FAILED', error: err.message }
  }

  // 4. Validate ERN structure
  const ernResult = validateErnXml(xml)
  if (!ernResult.ok) {
    _audit.append(AUDIT_EVENTS.DELIVERY_DENIED, { releaseId, reason: 'ERN_VALIDATION_FAILED', errors: ernResult.errors })
    return { ok: false, reason: 'ERN_VALIDATION_FAILED', errors: ernResult.errors }
  }

  _audit.append(AUDIT_EVENTS.ERN_VALIDATED, { releaseId })

  // 5. Deliver (or dry-run)
  if (dryRun) {
    _audit.append(AUDIT_EVENTS.DELIVERY_SUCCESS, { releaseId, dryRun: true })
    return { ok: true, dryRun: true, xml, releaseId }
  }

  // Real delivery hook — currently stubs DSP submission
  const result = await _dispatchToDsps(xml, release)
  if (!result.ok) {
    _audit.append(AUDIT_EVENTS.DELIVERY_DENIED, { releaseId, reason: 'DSP_DISPATCH_FAILED', error: result.error })
    return { ok: false, reason: 'DSP_DISPATCH_FAILED', error: result.error }
  }

  _audit.append(AUDIT_EVENTS.DELIVERY_SUCCESS, { releaseId, dsps: result.dsps })
  return { ok: true, xml, releaseId, dsps: result.dsps }
}

// Stub — pluggable DSP dispatch. Replace with real DDEX delivery client.
async function _dispatchToDsps(_xml, release) {
  const dsps = ['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Tidal', 'Deezer']
  return {
    ok: true,
    dsps: dsps.map(name => ({
      name,
      status: 'submitted',
      trackingId: `DMF-${Date.now()}-${name.replace(/\s/g, '').slice(0, 4).toUpperCase()}`,
    })),
  }
}

module.exports = { deliverErn }

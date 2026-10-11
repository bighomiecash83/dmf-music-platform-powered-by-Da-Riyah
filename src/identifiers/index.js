'use strict'

// ISRC: CC-XXX-YY-NNNNN  (ISO 3901)
const ISRC_RE = /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/

function validateIsrc(isrc) {
  if (typeof isrc !== 'string') return { ok: false, error: 'ISRC must be a string' }
  const clean = isrc.replace(/-/g, '').toUpperCase()
  if (!ISRC_RE.test(clean)) return { ok: false, error: `Invalid ISRC format: ${isrc}` }
  return { ok: true, value: clean }
}

// UPC: 12-digit EAN/UPC-A with check digit
function validateUpc(upc) {
  if (typeof upc !== 'string' && typeof upc !== 'number') return { ok: false, error: 'UPC must be a string or number' }
  const s = String(upc).replace(/\D/g, '')
  if (s.length !== 12) return { ok: false, error: `UPC must be 12 digits, got ${s.length}` }
  const digits = s.split('').map(Number)
  const sum = digits.slice(0, 11).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  const check = (10 - (sum % 10)) % 10
  if (check !== digits[11]) return { ok: false, error: `UPC check digit mismatch (expected ${check})` }
  return { ok: true, value: s }
}

// ISNI: 16-digit ISO 27729 (with optional spaces / hyphens)
function validateIsni(isni) {
  if (typeof isni !== 'string') return { ok: false, error: 'ISNI must be a string' }
  const clean = isni.replace(/[\s-]/g, '').toUpperCase()
  if (!/^\d{15}[\dX]$/.test(clean)) return { ok: false, error: `Invalid ISNI format: ${isni}` }
  return { ok: true, value: clean }
}

// GRid: A1-XXXXX-XXXXXXXXXXXXXXXX-X  (ISO 2022)
const GRID_RE = /^A1[A-Z0-9]{5}[A-Z0-9]{17}[A-Z0-9]$/i

function validateGrid(grid) {
  if (typeof grid !== 'string') return { ok: false, error: 'GRid must be a string' }
  const clean = grid.replace(/-/g, '').toUpperCase()
  if (!GRID_RE.test(clean)) return { ok: false, error: `Invalid GRid format: ${grid}` }
  return { ok: true, value: clean }
}

function validateReleaseIdentifiers({ isrc, upc, isni, grid } = {}) {
  const errors = []
  const values = {}

  if (isrc) {
    const r = validateIsrc(isrc)
    if (!r.ok) errors.push(r.error); else values.isrc = r.value
  }
  if (upc) {
    const r = validateUpc(upc)
    if (!r.ok) errors.push(r.error); else values.upc = r.value
  }
  if (isni) {
    const r = validateIsni(isni)
    if (!r.ok) errors.push(r.error); else values.isni = r.value
  }
  if (grid) {
    const r = validateGrid(grid)
    if (!r.ok) errors.push(r.error); else values.grid = r.value
  }

  return { ok: errors.length === 0, errors, values }
}

module.exports = { validateIsrc, validateUpc, validateIsni, validateGrid, validateReleaseIdentifiers }

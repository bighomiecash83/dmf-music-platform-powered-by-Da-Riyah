'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { getConfig } = require('../config')
const { AuditLog, AUDIT_EVENTS } = require('../dariyah/audit')

const SESSION_STATUSES = Object.freeze(['active', 'mixing', 'ready', 'delivered'])

const SUPPORTED_FORMATS = ['wav', 'flac', 'aiff', 'mp3', 'aac', 'm4a']
const TARGET_SAMPLE_RATE = 44100
const TARGET_BIT_DEPTH = 24

function normaliseTrack(track) {
  const format = (track.format || '').toLowerCase()
  const warnings = []
  if (!SUPPORTED_FORMATS.includes(format)) warnings.push(`Format ${format} may not be supported`)
  if (track.sampleRate && track.sampleRate < TARGET_SAMPLE_RATE) warnings.push(`Sample rate ${track.sampleRate} < ${TARGET_SAMPLE_RATE}Hz`)
  if (track.bitDepth && track.bitDepth < TARGET_BIT_DEPTH) warnings.push(`Bit depth ${track.bitDepth} < ${TARGET_BIT_DEPTH}-bit`)
  return {
    ...track,
    format: format || 'unknown',
    sampleRate: track.sampleRate || TARGET_SAMPLE_RATE,
    bitDepth: track.bitDepth || TARGET_BIT_DEPTH,
    normalised: true,
    warnings,
  }
}

function processAudio(session) {
  const errors = []
  if (!session.tracks || !session.tracks.length) errors.push('Session has no tracks')
  session.tracks?.forEach((t, i) => {
    if (!t.title) errors.push(`Track ${i + 1} missing title`)
    if (!t.isrc) errors.push(`Track ${i + 1} missing ISRC`)
  })
  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    manifest: {
      sessionId: session.id,
      trackCount: session.tracks.length,
      exportedAt: new Date().toISOString(),
      tracks: session.tracks.map(normaliseTrack),
    },
  }
}

function createSession({ artistId, title, tracks = [] }) {
  if (!artistId) throw new Error('artistId required')
  if (!title) throw new Error('title required')
  return {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    artistId,
    title,
    status: 'active',
    tracks: tracks.map(normaliseTrack),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

class StudioStore {
  constructor(filePath, audit) {
    this._path = filePath || path.join(getConfig().dataDir, 'studio.json')
    this._audit = audit || new AuditLog()
    this._sessions = this._load()
  }

  _load() {
    const dir = path.dirname(this._path)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(this._path)) return []
    try { return JSON.parse(fs.readFileSync(this._path, 'utf8')) } catch { return [] }
  }

  _save() {
    fs.writeFileSync(this._path, JSON.stringify(this._sessions, null, 2), 'utf8')
  }

  list() { return [...this._sessions] }

  get(id) { return this._sessions.find(s => s.id === id) || null }

  create(params) {
    const session = createSession(params)
    this._sessions.push(session)
    this._save()
    this._audit.append(AUDIT_EVENTS.SESSION_CREATED, { sessionId: session.id, artistId: session.artistId })
    return session
  }

  updateStatus(id, status) {
    if (!SESSION_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`)
    const session = this.get(id)
    if (!session) return null
    session.status = status
    session.updatedAt = new Date().toISOString()
    this._save()
    return session
  }
}

module.exports = { StudioStore, createSession, normaliseTrack, processAudio, SESSION_STATUSES, SUPPORTED_FORMATS }

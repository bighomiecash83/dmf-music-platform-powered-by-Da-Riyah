'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { getConfig } = require('../config')
const { AuditLog, AUDIT_EVENTS } = require('../dariyah/audit')

const WORKSHOP_STATUSES = Object.freeze(['draft', 'in_progress', 'review', 'complete', 'archived'])

const ITEM_TYPES = Object.freeze(['code', 'data', 'migration', 'script', 'template', 'note'])

function createWorkshopItem({ title, type = 'code', content = '', artistId, tags = [] } = {}) {
  if (!title) throw new Error('title required')
  if (!ITEM_TYPES.includes(type)) throw new Error(`Invalid type: ${type}. Valid: ${ITEM_TYPES.join(', ')}`)
  return {
    id: `wk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    type,
    content,
    artistId: artistId || null,
    tags: Array.isArray(tags) ? [...tags] : [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

class WorkshopStore {
  constructor(filePath, audit) {
    this._path = filePath || path.join(getConfig().dataDir, 'workshop.json')
    this._audit = audit || new AuditLog()
    this._items = this._load()
  }

  _load() {
    const dir = path.dirname(this._path)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(this._path)) return []
    try { return JSON.parse(fs.readFileSync(this._path, 'utf8')) } catch { return [] }
  }

  _save() {
    fs.writeFileSync(this._path, JSON.stringify(this._items, null, 2), 'utf8')
  }

  list({ type, status, artistId } = {}) {
    return this._items.filter(item => {
      if (type && item.type !== type) return false
      if (status && item.status !== status) return false
      if (artistId && item.artistId !== artistId) return false
      return true
    })
  }

  get(id) { return this._items.find(i => i.id === id) || null }

  create(params) {
    const item = createWorkshopItem(params)
    this._items.push(item)
    this._save()
    return item
  }

  update(id, { title, content, tags, status } = {}) {
    const item = this.get(id)
    if (!item) return null
    if (title !== undefined) item.title = title
    if (content !== undefined) item.content = content
    if (tags !== undefined) item.tags = Array.isArray(tags) ? [...tags] : item.tags
    if (status !== undefined) {
      if (!WORKSHOP_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`)
      item.status = status
    }
    item.updatedAt = new Date().toISOString()
    this._save()
    return item
  }

  delete(id) {
    const idx = this._items.findIndex(i => i.id === id)
    if (idx === -1) return false
    this._items.splice(idx, 1)
    this._save()
    return true
  }
}

module.exports = { WorkshopStore, createWorkshopItem, WORKSHOP_STATUSES, ITEM_TYPES }

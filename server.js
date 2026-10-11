'use strict'

const http   = require('node:http')
const fs     = require('node:fs')
const path   = require('node:path')
const url    = require('node:url')

const { getConfig }              = require('./src/config')
const { Roster }                 = require('./src/roster/index')
const { StudioStore }            = require('./src/studio/index')
const { RenderQueue }            = require('./src/video/index')
const { WorkshopStore }          = require('./src/workshop/index')
const { deliverErn }             = require('./src/ern/deliver')
const { AuditLog, AUDIT_EVENTS } = require('./src/dariyah/audit')
const { engineStatus }           = require('./src/dariyah/index')

const PORT = parseInt(process.env.PORT || '3001', 10)
const PUBLIC = path.join(__dirname, 'public')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
}

// ── Singletons ────────────────────────────────────────────────────────────────
const cfg      = getConfig()
const audit    = new AuditLog()
const roster   = new Roster()
const studio   = new StudioStore(null, audit)
const queue    = new RenderQueue(null, audit)
const workshop = new WorkshopStore(null, audit)

// ── Helpers ───────────────────────────────────────────────────────────────────
function send(res, status, body) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  const ct = typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8'
  res.writeHead(status, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath)
  if (!fs.existsSync(filePath)) return false
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(filePath).pipe(res)
  return true
}

// ── Router ────────────────────────────────────────────────────────────────────
async function route(req, res) {
  const parsed = url.parse(req.url, true)
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
  const method = req.method.toUpperCase()

  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE', 'Access-Control-Allow-Headers': 'Content-Type' })
    return res.end()
  }

  // ── Static files ─────────────────────────────────────────────────────────
  if (method === 'GET' && !pathname.startsWith('/api/')) {
    const file = pathname === '/' ? 'index.html' : pathname.slice(1)
    if (serveStatic(res, path.join(PUBLIC, file))) return
    if (serveStatic(res, path.join(PUBLIC, 'index.html'))) return
    return send(res, 404, 'Not found')
  }

  // ── API ───────────────────────────────────────────────────────────────────
  try {
    // Status
    if (method === 'GET' && pathname === '/api/status') {
      return send(res, 200, engineStatus())
    }

    // Roster
    if (method === 'GET' && pathname === '/api/roster') {
      return send(res, 200, roster.list())
    }
    if (method === 'GET' && pathname.startsWith('/api/roster/')) {
      const id = pathname.split('/')[3]
      const artist = roster.get(id)
      if (!artist) return send(res, 404, { error: 'Artist not found' })
      return send(res, 200, artist)
    }

    // Studio sessions
    if (method === 'GET' && pathname === '/api/studio') {
      return send(res, 200, studio.list())
    }
    if (method === 'POST' && pathname === '/api/studio') {
      const body = await readBody(req)
      const session = studio.create(body)
      return send(res, 201, session)
    }
    if (method === 'GET' && pathname.startsWith('/api/studio/')) {
      const id = pathname.split('/')[3]
      const session = studio.get(id)
      if (!session) return send(res, 404, { error: 'Session not found' })
      return send(res, 200, session)
    }
    if (method === 'PATCH' && pathname.startsWith('/api/studio/')) {
      const id = pathname.split('/')[3]
      const body = await readBody(req)
      const session = studio.updateStatus(id, body.status)
      if (!session) return send(res, 404, { error: 'Session not found' })
      return send(res, 200, session)
    }

    // Video queue
    if (method === 'GET' && pathname === '/api/video') {
      return send(res, 200, queue.list())
    }
    if (method === 'POST' && pathname === '/api/video') {
      const body = await readBody(req)
      const job = await queue.enqueue(body)
      return send(res, 201, job)
    }
    if (method === 'GET' && pathname.startsWith('/api/video/')) {
      const id = pathname.split('/')[3]
      const job = queue.get(id)
      if (!job) return send(res, 404, { error: 'Job not found' })
      return send(res, 200, job)
    }
    if (method === 'POST' && pathname.startsWith('/api/video/') && pathname.endsWith('/dispatch')) {
      const id = pathname.split('/')[3]
      const result = await queue.dispatch(id)
      return send(res, result.ok ? 200 : 422, result)
    }

    // Workshop
    if (method === 'GET' && pathname === '/api/workshop') {
      const { type, status, artistId } = parsed.query
      return send(res, 200, workshop.list({ type, status, artistId }))
    }
    if (method === 'POST' && pathname === '/api/workshop') {
      const body = await readBody(req)
      const item = workshop.create(body)
      return send(res, 201, item)
    }
    if (method === 'PATCH' && pathname.startsWith('/api/workshop/')) {
      const id = pathname.split('/')[3]
      const body = await readBody(req)
      const item = workshop.update(id, body)
      if (!item) return send(res, 404, { error: 'Item not found' })
      return send(res, 200, item)
    }
    if (method === 'DELETE' && pathname.startsWith('/api/workshop/')) {
      const id = pathname.split('/')[3]
      const ok = workshop.delete(id)
      return send(res, ok ? 204 : 404, ok ? '' : { error: 'Item not found' })
    }

    // Deliver
    if (method === 'POST' && pathname === '/api/deliver') {
      const body = await readBody(req)
      const result = await deliverErn(body, { audit, dryRun: body.dryRun || false })
      return send(res, result.ok ? 200 : 422, result)
    }

    // Audit tail
    if (method === 'GET' && pathname === '/api/audit') {
      const n = parseInt(parsed.query.n || '50', 10)
      return send(res, 200, audit.tail(n))
    }

    send(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error(err)
    send(res, 500, { error: err.message })
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
const server = http.createServer(route)
server.listen(PORT, () => {
  console.log(`DMF Distribution Engine  ·  http://localhost:${PORT}`)
  console.log(`Data dir: ${cfg.dataDir}`)
})

module.exports = server

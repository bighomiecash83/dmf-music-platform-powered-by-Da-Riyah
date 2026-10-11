/* DMF Studio Sessions */
const API = ''

async function api(path, opts = {}) {
  const res = await fetch(API + path, opts)
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  if (res.status === 204) return null
  return res.json()
}

function toast(msg, type = 'info') {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = type === 'error' ? 'badge-red' : ''
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.add('hidden'), 3000)
}

const STATUS_BADGE = {
  active:    'badge-blue',
  mixing:    'badge-yellow',
  ready:     'badge-green',
  delivered: 'badge-gold',
}

function statusBadge(s) {
  return `<span class="badge ${STATUS_BADGE[s] || 'badge-muted'}">${s}</span>`
}

const STATUS_NEXT = { active: 'mixing', mixing: 'ready', ready: 'delivered' }

async function advanceStatus(id, current) {
  const next = STATUS_NEXT[current]
  if (!next) return toast('Session already delivered', 'info')
  try {
    await api(`/api/studio/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    toast(`Status → ${next}`)
    loadSessions()
  } catch (err) { toast(err.message, 'error') }
}

async function loadSessions() {
  try {
    const sessions = await api('/api/studio')
    const tbody = document.getElementById('sessions-body')

    if (!sessions.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted)">No sessions yet. Create one above.</td></tr>'
    } else {
      tbody.innerHTML = sessions.map(s => `<tr>
        <td><strong>${s.title}</strong></td>
        <td class="text-muted font-mono" style="font-size:12px">${s.artistId}</td>
        <td>${s.tracks?.length || 0}</td>
        <td>${statusBadge(s.status)}</td>
        <td class="text-muted text-sm">${new Date(s.createdAt).toLocaleDateString()}</td>
        <td>
          ${STATUS_NEXT[s.status] ? `<button class="btn btn-outline btn-sm" onclick="advanceStatus('${s.id}','${s.status}')">→ ${STATUS_NEXT[s.status]}</button>` : ''}
        </td>
      </tr>`).join('')
    }

    const counts = { active: 0, mixing: 0, ready: 0, delivered: 0 }
    sessions.forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++ })
    document.getElementById('s-total').textContent = sessions.length
    document.getElementById('s-active').textContent = counts.active
    document.getElementById('s-ready').textContent = counts.ready
    document.getElementById('s-delivered').textContent = counts.delivered
  } catch (err) {
    toast('Failed to load sessions: ' + err.message, 'error')
    document.getElementById('sessions-body').innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted)">Could not connect to engine.</td></tr>'
  }
}

function showNewSession() {
  document.getElementById('modal').removeAttribute('hidden')
  document.getElementById('modal').style.display = 'flex'
  document.getElementById('m-title').focus()
}

function closeModal() {
  document.getElementById('modal').setAttribute('hidden', '')
  document.getElementById('modal').style.display = 'none'
}

async function createSession() {
  const artistId = document.getElementById('m-artist').value.trim()
  const title    = document.getElementById('m-title').value.trim()
  if (!artistId || !title) return toast('Artist ID and title required', 'error')
  try {
    await api('/api/studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistId, title, tracks: [] }),
    })
    closeModal()
    toast('Session created')
    loadSessions()
  } catch (err) { toast(err.message, 'error') }
}

loadSessions()

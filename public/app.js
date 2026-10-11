/* DMF Roster Dashboard */
const API = ''  // same-origin

let allArtists = []

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
  el.style.borderColor = type === 'error' ? 'var(--red)' : 'var(--border)'
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.add('hidden'), 3000)
}

function statusBadge(status) {
  const cls = { active: 'badge-green', inactive: 'badge-muted', hiatus: 'badge-yellow' }[status] || 'badge-muted'
  return `<span class="badge ${cls}">${status}</span>`
}

function renderRoster(artists) {
  const tbody = document.getElementById('roster-body')
  if (!artists.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No artists found.</td></tr>'
    return
  }
  tbody.innerHTML = artists.map(a => {
    const sf = a.metrics?.spotify?.followers ?? '—'
    const sp = a.metrics?.spotify?.popularity ?? '—'
    return `<tr>
      <td><strong>${a.name}</strong>${a.realName ? `<br><span class="text-muted text-sm">${a.realName}</span>` : ''}</td>
      <td class="text-muted">${a.role}</td>
      <td>${(a.genres || []).map(g => `<span class="badge badge-blue" style="margin:1px">${g}</span>`).join('')}</td>
      <td>${sf}</td>
      <td>${sp}</td>
      <td>${a.labelSince || '—'}</td>
      <td>${statusBadge(a.status)}</td>
    </tr>`
  }).join('')
}

function filterRoster() {
  const q = document.getElementById('search').value.toLowerCase()
  const filtered = q ? allArtists.filter(a =>
    a.name.toLowerCase().includes(q) ||
    (a.realName || '').toLowerCase().includes(q) ||
    (a.genres || []).join(' ').toLowerCase().includes(q)
  ) : allArtists
  renderRoster(filtered)
}

async function refreshRoster() {
  try {
    allArtists = await api('/api/roster')
    renderRoster(allArtists)

    const totalFollowers = allArtists.reduce((s, a) => s + (a.metrics?.spotify?.followers || 0), 0)
    const activeCount = allArtists.filter(a => a.status === 'active').length
    document.getElementById('stat-total').textContent = allArtists.length
    document.getElementById('stat-active').textContent = activeCount
    document.getElementById('stat-followers').textContent = totalFollowers
  } catch (err) {
    toast('Failed to load roster: ' + err.message, 'error')
    document.getElementById('roster-body').innerHTML =
      '<tr><td colspan="7" class="text-muted" style="text-align:center;padding:32px">Could not connect to engine. Is the server running?</td></tr>'
  }
}

refreshRoster()

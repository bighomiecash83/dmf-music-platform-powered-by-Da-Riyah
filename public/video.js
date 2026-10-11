/* DMF Video Render Queue */
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
  el._t = setTimeout(() => el.classList.add('hidden'), 3500)
}

const STATUS_BADGE = {
  queued:    'badge-blue',
  rendering: 'badge-yellow',
  complete:  'badge-green',
  failed:    'badge-red',
}

async function dispatch(id) {
  try {
    toast('Dispatching render…')
    const res = await api(`/api/video/${id}/dispatch`, { method: 'POST' })
    toast(res.ok ? 'Render dispatched' : ('Render error: ' + (res.error || 'unknown')), res.ok ? 'info' : 'error')
    loadJobs()
  } catch (err) { toast(err.message, 'error') }
}

async function loadJobs() {
  try {
    const jobs = await api('/api/video')
    const tbody = document.getElementById('jobs-body')
    if (!jobs.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">No projects yet.</td></tr>'
    } else {
      tbody.innerHTML = jobs.map(j => `<tr>
        <td><strong>${j.title}</strong></td>
        <td class="text-muted">${j.artist}</td>
        <td><span class="badge badge-blue">${j.style}</span></td>
        <td>${j.sceneCount || 0}</td>
        <td>${j.estimatedDuration}s</td>
        <td><span class="badge ${STATUS_BADGE[j.status] || 'badge-muted'}">${j.status}</span></td>
        <td>
          ${j.status === 'queued' ? `<button class="btn btn-outline btn-sm" onclick="dispatch('${j.id}')">▶ Dispatch</button>` : ''}
        </td>
      </tr>`).join('')
    }

    const counts = { queued: 0, rendering: 0, complete: 0 }
    jobs.forEach(j => { if (counts[j.status] !== undefined) counts[j.status]++ })
    document.getElementById('v-total').textContent = jobs.length
    document.getElementById('v-queued').textContent = counts.queued
    document.getElementById('v-rendering').textContent = counts.rendering
    document.getElementById('v-complete').textContent = counts.complete
  } catch (err) {
    toast('Could not connect to engine', 'error')
    document.getElementById('jobs-body').innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">Could not connect to engine.</td></tr>'
  }
}

function showNewJob() {
  document.getElementById('modal').removeAttribute('hidden')
  document.getElementById('modal').style.display = 'flex'
  document.getElementById('m-title').focus()
}

function closeModal() {
  document.getElementById('modal').setAttribute('hidden', '')
  document.getElementById('modal').style.display = 'none'
}

async function enqueueJob() {
  const title    = document.getElementById('m-title').value.trim()
  const artist   = document.getElementById('m-artist').value.trim()
  const style    = document.getElementById('m-style').value
  const bpm      = parseInt(document.getElementById('m-bpm').value || '90', 10)
  const duration = parseInt(document.getElementById('m-duration').value || '180', 10)
  const audioUrl = document.getElementById('m-audio').value.trim() || null
  if (!title || !artist) return toast('Title and artist required', 'error')
  try {
    await api('/api/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist, style, bpm, durationSeconds: duration, audioUrl }),
    })
    closeModal()
    toast('Project queued')
    loadJobs()
  } catch (err) { toast(err.message, 'error') }
}

loadJobs()

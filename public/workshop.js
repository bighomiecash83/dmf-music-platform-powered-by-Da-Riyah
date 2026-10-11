/* DMF Workshop */
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

const TYPE_ICON = { code: '💻', data: '📊', migration: '🗄️', script: '📜', template: '📐', note: '📝' }
const STATUS_BADGE = {
  draft:       'badge-muted',
  in_progress: 'badge-yellow',
  review:      'badge-blue',
  complete:    'badge-green',
  archived:    'badge-muted',
}

function renderItems(items) {
  const grid = document.getElementById('items-grid')
  if (!items.length) {
    grid.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)">
      <div style="font-size:40px;margin-bottom:12px">🔧</div>
      <h3>No items yet</h3>
      <p>Create your first workshop item above.</p>
    </div>`
    return
  }
  grid.innerHTML = items.map(item => `
    <div class="card" style="cursor:pointer" onclick="editItem(${JSON.stringify(JSON.stringify(item))})">
      <div class="flex items-center justify-between mb-2">
        <span style="font-size:20px">${TYPE_ICON[item.type] || '📄'}</span>
        <span class="badge ${STATUS_BADGE[item.status] || 'badge-muted'}">${item.status.replace('_', ' ')}</span>
      </div>
      <div style="font-weight:600;margin-bottom:4px">${item.title}</div>
      <div class="text-muted text-sm">${item.type}${item.artistId ? ' · ' + item.artistId : ''}</div>
      ${item.tags?.length ? `<div style="margin-top:8px">${item.tags.map(t => `<span class="badge badge-blue" style="margin:1px;font-size:10px">${t}</span>`).join('')}</div>` : ''}
      ${item.content ? `<pre style="margin-top:10px;max-height:80px;overflow:hidden;font-size:11px">${item.content.slice(0, 200)}${item.content.length > 200 ? '…' : ''}</pre>` : ''}
      <div class="text-muted text-sm mt-1">${new Date(item.updatedAt).toLocaleDateString()}</div>
    </div>
  `).join('')
}

async function loadItems() {
  const type = document.getElementById('filter-type').value
  try {
    const items = await api('/api/workshop' + (type ? `?type=${type}` : ''))
    renderItems(items)
  } catch (err) {
    toast('Could not connect to engine', 'error')
    document.getElementById('items-grid').innerHTML =
      '<div class="card" style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)">Could not connect to engine.</div>'
  }
}

function showNew() {
  document.getElementById('m-id').value = ''
  document.getElementById('m-heading').textContent = 'New Workshop Item'
  document.getElementById('m-title').value = ''
  document.getElementById('m-type').value = 'code'
  document.getElementById('m-artist').value = ''
  document.getElementById('m-tags').value = ''
  document.getElementById('m-content').value = ''
  document.getElementById('m-status').value = 'draft'
  document.getElementById('m-delete').setAttribute('hidden', '')
  openModal()
}

function editItem(jsonStr) {
  const item = JSON.parse(jsonStr)
  document.getElementById('m-id').value = item.id
  document.getElementById('m-heading').textContent = 'Edit: ' + item.title
  document.getElementById('m-title').value = item.title
  document.getElementById('m-type').value = item.type
  document.getElementById('m-artist').value = item.artistId || ''
  document.getElementById('m-tags').value = (item.tags || []).join(', ')
  document.getElementById('m-content').value = item.content || ''
  document.getElementById('m-status').value = item.status
  document.getElementById('m-delete').removeAttribute('hidden')
  openModal()
}

function openModal() {
  document.getElementById('modal').removeAttribute('hidden')
  document.getElementById('modal').style.display = 'flex'
  document.getElementById('m-title').focus()
}

function closeModal() {
  document.getElementById('modal').setAttribute('hidden', '')
  document.getElementById('modal').style.display = 'none'
}

async function saveItem() {
  const id      = document.getElementById('m-id').value
  const title   = document.getElementById('m-title').value.trim()
  const type    = document.getElementById('m-type').value
  const artistId = document.getElementById('m-artist').value.trim() || undefined
  const tags    = document.getElementById('m-tags').value.split(',').map(t => t.trim()).filter(Boolean)
  const content = document.getElementById('m-content').value
  const status  = document.getElementById('m-status').value
  if (!title) return toast('Title required', 'error')
  try {
    if (id) {
      await api(`/api/workshop/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tags, content, status }),
      })
      toast('Item updated')
    } else {
      await api('/api/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, artistId, tags, content }),
      })
      toast('Item created')
    }
    closeModal()
    loadItems()
  } catch (err) { toast(err.message, 'error') }
}

async function deleteItem() {
  const id = document.getElementById('m-id').value
  if (!id) return
  if (!confirm('Delete this item permanently?')) return
  try {
    await api(`/api/workshop/${id}`, { method: 'DELETE' })
    closeModal()
    toast('Item deleted')
    loadItems()
  } catch (err) { toast(err.message, 'error') }
}

loadItems()

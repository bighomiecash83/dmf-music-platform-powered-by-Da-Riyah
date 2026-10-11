'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { getConfig } = require('../config')
const { ProviderRegistry } = require('./providers')
const { AuditLog, AUDIT_EVENTS } = require('../dariyah/audit')

const STYLE_PRESETS = Object.freeze({
  cinematic:  { fps: 24, resolution: '1920x1080', colorGrade: 'filmic',    transition: 'cross-dissolve' },
  hype:       { fps: 30, resolution: '1920x1080', colorGrade: 'saturated', transition: 'hard-cut' },
  lyric:      { fps: 24, resolution: '1920x1080', colorGrade: 'minimal',   transition: 'fade' },
  vertical:   { fps: 30, resolution: '1080x1920', colorGrade: 'vibrant',   transition: 'slide' },
  visualizer: { fps: 60, resolution: '1920x1080', colorGrade: 'dark',      transition: 'waveform' },
})

function planCuts(audioLengthSeconds, bpm = 90) {
  const beatDuration = 60 / bpm
  const bars = Math.floor(audioLengthSeconds / (beatDuration * 4))
  const cuts = []
  for (let bar = 0; bar < bars; bar++) {
    cuts.push(Math.round(bar * beatDuration * 4 * 1000) / 1000)
  }
  return cuts
}

function buildScenes(cuts, style = 'cinematic') {
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.cinematic
  return cuts.map((startTime, i) => ({
    index: i,
    startTime,
    endTime: cuts[i + 1] || null,
    preset,
    transition: i === 0 ? 'fade-in' : preset.transition,
  }))
}

function createVideoProject({ title, artist, audioUrl, style = 'hype', bpm, durationSeconds }) {
  if (!title) throw new Error('title required')
  if (!artist) throw new Error('artist required')
  const cuts = planCuts(durationSeconds || 180, bpm || 90)
  const scenes = buildScenes(cuts, style)
  return {
    id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    artist,
    audioUrl: audioUrl || null,
    style,
    preset: STYLE_PRESETS[style] || STYLE_PRESETS.cinematic,
    scenes,
    sceneCount: scenes.length,
    estimatedDuration: durationSeconds || 180,
    createdAt: new Date().toISOString(),
  }
}

async function renderFrames(project, provider) {
  return provider.render({ projectId: project.id, scenes: project.scenes, preset: project.preset })
}

class RenderQueue {
  constructor(filePath, audit) {
    this._path = filePath || path.join(getConfig().dataDir, 'video.json')
    this._audit = audit || new AuditLog()
    this._providers = new ProviderRegistry()
    this._jobs = this._load()
  }

  _load() {
    const dir = path.dirname(this._path)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(this._path)) return []
    try { return JSON.parse(fs.readFileSync(this._path, 'utf8')) } catch { return [] }
  }

  _save() {
    fs.writeFileSync(this._path, JSON.stringify(this._jobs, null, 2), 'utf8')
  }

  list() { return [...this._jobs] }

  get(id) { return this._jobs.find(j => j.id === id) || null }

  async enqueue(params) {
    const project = createVideoProject(params)
    const job = { ...project, status: 'queued', queuedAt: new Date().toISOString() }
    this._jobs.push(job)
    this._save()
    this._audit.append(AUDIT_EVENTS.VIDEO_JOB_QUEUED, { jobId: job.id, title: job.title })
    return job
  }

  async dispatch(jobId) {
    const job = this.get(jobId)
    if (!job) return { ok: false, error: 'Job not found' }
    const provider = this._providers.getDefault()
    job.status = 'rendering'
    job.provider = provider.name
    this._save()
    const result = await renderFrames(job, provider)
    job.status = result.ok ? 'complete' : 'failed'
    job.result = result
    job.completedAt = new Date().toISOString()
    this._save()
    return result
  }
}

module.exports = { RenderQueue, createVideoProject, planCuts, buildScenes, renderFrames, STYLE_PRESETS }

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Send, Music2, CheckCircle2, Clock, AlertCircle, Globe, Zap,
  BarChart2, ChevronRight, Plus, Upload, Copy, RefreshCw,
  TrendingUp, DollarSign, Radio, Shield, Lock, FileText,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type PipelineStage = 'draft' | 'metadata' | 'artwork' | 'submitted' | 'processing' | 'live' | 'rejected'

interface DistroRelease {
  id: string
  title: string
  artist: string
  type: 'single' | 'ep' | 'album'
  genre: string
  release_date: string
  stage: PipelineStage
  upc?: string
  isrc?: string
  artwork_url?: string
  dsps: DSPStatus[]
  splits: RoyaltySplit[]
  pitch?: PitchStatus
  created_at: string
}

interface DSPStatus {
  name: string
  icon: string
  color: string
  status: 'pending' | 'submitted' | 'processing' | 'live' | 'error'
  live_url?: string
  streams?: number
  revenue?: number
}

interface RoyaltySplit {
  name: string
  role: string
  percent: number
}

interface PitchStatus {
  submitted: boolean
  playlists_targeted: string[]
  response?: string
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const SEED_RELEASES: DistroRelease[] = [
  {
    id: 'd1',
    title: 'Standing on My Own 10',
    artist: 'OBMB DELO',
    type: 'single',
    genre: 'Hip-Hop / Experimental',
    release_date: '2024-03-15',
    stage: 'live',
    upc: '196922847301',
    isrc: 'USRC12401234',
    dsps: [
      { name: 'Spotify', icon: '🎵', color: 'bg-green-500', status: 'live', streams: 1842, revenue: 7.37 },
      { name: 'Apple Music', icon: '🍎', color: 'bg-pink-500', status: 'live', streams: 634, revenue: 3.17 },
      { name: 'YouTube Music', icon: '▶️', color: 'bg-red-500', status: 'live', streams: 2910, revenue: 2.91 },
      { name: 'Amazon Music', icon: '🎧', color: 'bg-blue-500', status: 'live', streams: 287, revenue: 1.44 },
      { name: 'Tidal', icon: '🌊', color: 'bg-cyan-500', status: 'live', streams: 91, revenue: 0.91 },
      { name: 'Deezer', icon: '🎶', color: 'bg-purple-500', status: 'live', streams: 143, revenue: 0.57 },
    ],
    splits: [
      { name: 'OBMB DELO', role: 'Artist', percent: 70 },
      { name: 'Big Homie Cash', role: 'Label (DMF)', percent: 20 },
      { name: 'Producer', role: 'Beat Licensing', percent: 10 },
    ],
    pitch: { submitted: true, playlists_targeted: ['Rap Caviar Adjacent', 'Fresh Finds Hip-Hop', 'Underground Rap Vault'], response: 'Added to Fresh Finds Hip-Hop' },
    created_at: '2024-02-28',
  },
  {
    id: 'd2',
    title: 'Pistol on da Dresser',
    artist: 'Go Savage',
    type: 'single',
    genre: 'Hip-Hop / Street Rap',
    release_date: '2024-05-01',
    stage: 'processing',
    upc: '196922847418',
    isrc: 'USRC12401891',
    dsps: [
      { name: 'Spotify', icon: '🎵', color: 'bg-green-500', status: 'processing' },
      { name: 'Apple Music', icon: '🍎', color: 'bg-pink-500', status: 'processing' },
      { name: 'YouTube Music', icon: '▶️', color: 'bg-red-500', status: 'submitted' },
      { name: 'Amazon Music', icon: '🎧', color: 'bg-blue-500', status: 'submitted' },
      { name: 'Tidal', icon: '🌊', color: 'bg-cyan-500', status: 'pending' },
      { name: 'Deezer', icon: '🎶', color: 'bg-purple-500', status: 'pending' },
    ],
    splits: [
      { name: 'Go Savage', role: 'Artist', percent: 75 },
      { name: 'Big Homie Cash', role: 'Label (DMF)', percent: 15 },
      { name: 'Freezzo', role: 'Featured Artist', percent: 10 },
    ],
    pitch: { submitted: true, playlists_targeted: ['TikTok Viral Rap', 'Street Rap Now', 'Hot New Hip-Hop'] },
    created_at: '2024-04-10',
  },
  {
    id: 'd3',
    title: 'October 3',
    artist: 'Ellumf',
    type: 'single',
    genre: 'Hip-Hop / Indian Fusion',
    release_date: '2024-06-15',
    stage: 'submitted',
    upc: '196922847502',
    isrc: 'USRC12402100',
    dsps: [
      { name: 'Spotify', icon: '🎵', color: 'bg-green-500', status: 'submitted' },
      { name: 'Apple Music', icon: '🍎', color: 'bg-pink-500', status: 'submitted' },
      { name: 'YouTube Music', icon: '▶️', color: 'bg-red-500', status: 'pending' },
      { name: 'Amazon Music', icon: '🎧', color: 'bg-blue-500', status: 'pending' },
      { name: 'Tidal', icon: '🌊', color: 'bg-cyan-500', status: 'pending' },
      { name: 'Deezer', icon: '🎶', color: 'bg-purple-500', status: 'pending' },
    ],
    splits: [
      { name: 'Ellumf', role: 'Artist', percent: 80 },
      { name: 'Big Homie Cash', role: 'Label (DMF)', percent: 20 },
    ],
    pitch: { submitted: false, playlists_targeted: ['Desi Hip-Hop', 'Fusion Rap', 'South Asian Vibes'] },
    created_at: '2024-05-20',
  },
  {
    id: 'd4',
    title: 'The Come-Up Chronicles',
    artist: 'Big Homie Cash',
    type: 'ep',
    genre: 'Hip-Hop / Street Rap',
    release_date: '2024-07-04',
    stage: 'artwork',
    upc: undefined,
    isrc: undefined,
    dsps: [
      { name: 'Spotify', icon: '🎵', color: 'bg-green-500', status: 'pending' },
      { name: 'Apple Music', icon: '🍎', color: 'bg-pink-500', status: 'pending' },
      { name: 'YouTube Music', icon: '▶️', color: 'bg-red-500', status: 'pending' },
      { name: 'Amazon Music', icon: '🎧', color: 'bg-blue-500', status: 'pending' },
      { name: 'Tidal', icon: '🌊', color: 'bg-cyan-500', status: 'pending' },
      { name: 'Deezer', icon: '🎶', color: 'bg-purple-500', status: 'pending' },
    ],
    splits: [
      { name: 'Big Homie Cash', role: 'Artist / Label', percent: 90 },
      { name: 'Freezzo', role: 'Featured Artist', percent: 10 },
    ],
    pitch: { submitted: false, playlists_targeted: [] },
    created_at: '2024-06-01',
  },
  {
    id: 'd5',
    title: 'Shots Fire',
    artist: 'Ellumf',
    type: 'single',
    genre: 'Hip-Hop / Alternative Rap',
    release_date: '2024-08-20',
    stage: 'draft',
    dsps: [
      { name: 'Spotify', icon: '🎵', color: 'bg-green-500', status: 'pending' },
      { name: 'Apple Music', icon: '🍎', color: 'bg-pink-500', status: 'pending' },
      { name: 'YouTube Music', icon: '▶️', color: 'bg-red-500', status: 'pending' },
      { name: 'Amazon Music', icon: '🎧', color: 'bg-blue-500', status: 'pending' },
      { name: 'Tidal', icon: '🌊', color: 'bg-cyan-500', status: 'pending' },
      { name: 'Deezer', icon: '🎶', color: 'bg-purple-500', status: 'pending' },
    ],
    splits: [
      { name: 'Ellumf', role: 'Artist', percent: 80 },
      { name: 'Big Homie Cash', role: 'Label (DMF)', percent: 20 },
    ],
    pitch: { submitted: false, playlists_targeted: [] },
    created_at: '2024-07-10',
  },
]

// ─── Pipeline Stage Config ────────────────────────────────────────────────────

const STAGES: { key: PipelineStage; label: string; short: string; color: string; bg: string }[] = [
  { key: 'draft',      label: 'Draft',           short: '1',  color: 'text-gray-500',  bg: 'bg-gray-100' },
  { key: 'metadata',   label: 'Metadata',         short: '2',  color: 'text-blue-600',  bg: 'bg-blue-100' },
  { key: 'artwork',    label: 'Artwork',           short: '3',  color: 'text-violet-600',bg: 'bg-violet-100' },
  { key: 'submitted',  label: 'Submitted',         short: '4',  color: 'text-amber-600', bg: 'bg-amber-100' },
  { key: 'processing', label: 'Processing',        short: '5',  color: 'text-orange-600',bg: 'bg-orange-100' },
  { key: 'live',       label: 'Live',              short: '✓',  color: 'text-green-600', bg: 'bg-green-100' },
]

const STAGE_ORDER: PipelineStage[] = ['draft','metadata','artwork','submitted','processing','live']

function stageIndex(s: PipelineStage) { return STAGE_ORDER.indexOf(s) }

function stageConfig(s: PipelineStage) {
  return STAGES.find(x => x.key === s) ?? STAGES[0]
}

// ─── DSP status badge ────────────────────────────────────────────────────────

function DSPBadge({ status }: { status: DSPStatus['status'] }) {
  const map: Record<DSPStatus['status'], string> = {
    pending:    'bg-gray-100 text-gray-500',
    submitted:  'bg-blue-100 text-blue-700',
    processing: 'bg-amber-100 text-amber-700',
    live:       'bg-green-100 text-green-700',
    error:      'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${map[status]}`}>
      {status}
    </span>
  )
}

// ─── Pipeline Progress Bar ────────────────────────────────────────────────────

function PipelineBar({ stage }: { stage: PipelineStage }) {
  const idx = stageIndex(stage)
  return (
    <div className="flex items-center gap-0 w-full">
      {STAGES.map((s, i) => {
        const done = i < idx
        const active = i === idx
        const cfg = stageConfig(s.key)
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className={clsx(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2',
              done   ? 'bg-green-500 border-green-500 text-white' :
              active ? `${cfg.bg} border-current ${cfg.color}` :
                       'bg-gray-100 border-gray-200 text-gray-400'
            )}>
              {done ? <CheckCircle2 size={14} /> : s.short}
            </div>
            {i < STAGES.length - 1 && (
              <div className={clsx('h-0.5 flex-1', done ? 'bg-green-400' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Release Card ─────────────────────────────────────────────────────────────

function ReleaseCard({ release, onClick, active }: { release: DistroRelease; onClick: () => void; active: boolean }) {
  const cfg = stageConfig(release.stage)
  const liveCount = release.dsps.filter(d => d.status === 'live').length
  const totalStreams = release.dsps.reduce((s, d) => s + (d.streams ?? 0), 0)
  const totalRev = release.dsps.reduce((s, d) => s + (d.revenue ?? 0), 0)

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left bg-white rounded-xl border transition-all p-4 group',
        active ? 'border-indigo-500 shadow-md ring-1 ring-indigo-200' : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">{release.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{release.artist} · {release.type.toUpperCase()}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <PipelineBar stage={release.stage} />

      {release.stage === 'live' && (
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><BarChart2 size={11} />{totalStreams.toLocaleString()} streams</span>
          <span className="flex items-center gap-1"><DollarSign size={11} />${totalRev.toFixed(2)}</span>
          <span className="flex items-center gap-1"><Globe size={11} />{liveCount} DSPs</span>
        </div>
      )}
    </button>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ release }: { release: DistroRelease }) {
  const [copied, setCopied] = useState<string | null>(null)
  const cfg = stageConfig(release.stage)
  const totalStreams = release.dsps.reduce((s, d) => s + (d.streams ?? 0), 0)
  const totalRev = release.dsps.reduce((s, d) => s + (d.revenue ?? 0), 0)

  function copy(val: string, key: string) {
    navigator.clipboard.writeText(val)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white`}>
                {release.type.toUpperCase()}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-1">{release.title}</h2>
            <p className="text-white/70 text-sm mt-0.5">{release.artist}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50">Target Release</p>
            <p className="text-sm font-semibold">{release.release_date}</p>
          </div>
        </div>

        {release.stage === 'live' && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Total Streams', value: totalStreams.toLocaleString(), icon: BarChart2 },
              { label: 'Revenue', value: `$${totalRev.toFixed(2)}`, icon: DollarSign },
              { label: 'Live DSPs', value: release.dsps.filter(d=>d.status==='live').length, icon: Globe },
            ].map(({label,value,icon:Icon}) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <Icon size={14} className="text-white/60 mb-1" />
                <p className="text-xl font-bold leading-none">{value}</p>
                <p className="text-xs text-white/60 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline Progress */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribution Pipeline</h3>
        <PipelineBar stage={release.stage} />
        <div className="flex justify-between mt-2">
          {STAGES.map(s => (
            <p key={s.key} className="text-xs text-gray-400 flex-1 text-center first:text-left last:text-right">
              {s.label}
            </p>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FileText size={15} className="text-indigo-500" /> Release Metadata
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Genre', value: release.genre },
            { label: 'Type', value: release.type.toUpperCase() },
            {
              label: 'UPC',
              value: release.upc ?? '— Pending generation',
              copy: release.upc,
            },
            {
              label: 'ISRC',
              value: release.isrc ?? '— Pending generation',
              copy: release.isrc,
            },
          ].map(({ label, value, copy: copyVal }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-mono font-medium text-gray-800 truncate">{value}</p>
                {copyVal && (
                  <button onClick={() => copy(copyVal, label)} className="text-gray-400 hover:text-gray-600 shrink-0">
                    {copied === label ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DSP Delivery Status */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Globe size={15} className="text-indigo-500" /> DSP Delivery Status
        </h3>
        <div className="space-y-2">
          {release.dsps.map((dsp) => (
            <div key={dsp.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-base">{dsp.icon}</span>
                <span className="text-sm font-medium text-gray-800">{dsp.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {dsp.streams != null && (
                  <span className="text-xs text-gray-500">{dsp.streams.toLocaleString()} streams</span>
                )}
                {dsp.revenue != null && (
                  <span className="text-xs text-gray-500">${dsp.revenue.toFixed(2)}</span>
                )}
                <DSPBadge status={dsp.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Royalty Splits */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <DollarSign size={15} className="text-indigo-500" /> Royalty Splits
        </h3>
        <div className="space-y-3">
          {release.splits.map((split) => (
            <div key={split.name}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-medium text-gray-800">{split.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{split.role}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{split.percent}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                  style={{ width: `${split.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {release.stage === 'live' && totalRev > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Estimated payouts from ${totalRev.toFixed(2)} total</p>
            <div className="space-y-1">
              {release.splits.map(s => (
                <div key={s.name} className="flex justify-between text-xs">
                  <span className="text-gray-600">{s.name}</span>
                  <span className="font-semibold text-gray-900">${(totalRev * s.percent / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Playlist Pitching */}
      {release.pitch && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Radio size={15} className="text-indigo-500" /> Playlist Pitching
          </h3>
          {release.pitch.playlists_targeted.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No playlists targeted yet.</p>
          ) : (
            <div className="space-y-2">
              {release.pitch.playlists_targeted.map(p => (
                <div key={p} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{p}</span>
                  {release.pitch?.response?.includes(p) ? (
                    <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Accepted
                    </span>
                  ) : release.pitch?.submitted ? (
                    <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      <Clock size={12} /> Pending
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Not submitted</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content ID / Protection */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Shield size={15} className="text-indigo-500" /> Content Protection
        </h3>
        <div className="space-y-2">
          {[
            { label: 'YouTube Content ID', status: release.stage === 'live' ? 'active' : 'pending' },
            { label: 'Copyright Registration', status: release.upc ? 'registered' : 'pending' },
            { label: 'Neighboring Rights', status: 'active' },
          ].map(({ label, status }) => (
            <div key={label} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <Lock size={13} className="text-gray-400" />
                <span className="text-sm text-gray-700">{label}</span>
              </div>
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                status === 'active' || status === 'registered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── New Release Modal ────────────────────────────────────────────────────────

function NewReleaseModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    title: '', artist: 'Big Homie Cash', type: 'single', genre: 'Hip-Hop / Rap', release_date: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    setDone(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">New Distribution Release</h2>
          <p className="text-xs text-gray-500 mt-0.5">Start the pipeline — metadata, artwork, DSP submission</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Release title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Artist *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.artist}
                onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
              >
                {['Big Homie Cash','Freezzo','OBMB DELO','Go Savage','Ellumf'].map(a => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="single">Single</option>
                <option value="ep">EP</option>
                <option value="album">Album</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Genre</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.genre}
              onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Target Release Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.release_date}
              onChange={e => setForm(f => ({ ...f, release_date: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || done}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {done ? <><CheckCircle2 size={15} /> Created!</> :
               submitting ? <><RefreshCw size={15} className="animate-spin" /> Creating…</> :
               <><Plus size={15} /> Create Release</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

async function fetchDistroReleases(): Promise<DistroRelease[]> {
  const { data, error } = await supabase.from('distribution_releases').select('*').order('created_at', { ascending: false })
  if (error || !data?.length) return SEED_RELEASES
  return data
}

export default function DistributionPage() {
  const [selected, setSelected] = useState<string>(SEED_RELEASES[0].id)
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState<PipelineStage | 'all'>('all')

  const { data: releases = SEED_RELEASES } = useQuery({
    queryKey: ['distroReleases'],
    queryFn: fetchDistroReleases,
    staleTime: 5 * 60 * 1000,
  })

  const filtered = filter === 'all' ? releases : releases.filter(r => r.stage === filter)
  const selectedRelease = releases.find(r => r.id === selected) ?? releases[0]

  const liveCount = releases.filter(r => r.stage === 'live').length
  const totalStreams = releases.flatMap(r => r.dsps).reduce((s, d) => s + (d.streams ?? 0), 0)
  const totalRev = releases.flatMap(r => r.dsps).reduce((s, d) => s + (d.revenue ?? 0), 0)
  const inFlightCount = releases.filter(r => ['submitted','processing'].includes(r.stage)).length

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left Panel */}
      <div className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Zap size={16} className="text-indigo-500" /> Distribution
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">DMF Records · Global Pipeline</p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Live', value: liveCount, color: 'text-green-600' },
              { label: 'In-Flight', value: inFlightCount, color: 'text-amber-600' },
              { label: 'Streams', value: totalStreams > 999 ? `${(totalStreams/1000).toFixed(1)}k` : totalStreams, color: 'text-indigo-600' },
              { label: 'Revenue', value: `$${totalRev.toFixed(0)}`, color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                <p className={`text-sm font-bold ${color} leading-none`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stage Filter */}
        <div className="px-3 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={clsx('text-xs px-2.5 py-1 rounded-full font-medium shrink-0 transition-colors',
              filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            All ({releases.length})
          </button>
          {STAGES.map(s => {
            const count = releases.filter(r => r.stage === s.key).length
            if (!count) return null
            return (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                className={clsx('text-xs px-2.5 py-1 rounded-full font-medium shrink-0 transition-colors',
                  filter === s.key ? `${s.bg} ${s.color} ring-1 ring-current` : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              >
                {s.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Release List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map(r => (
            <ReleaseCard
              key={r.id}
              release={r}
              onClick={() => setSelected(r.id)}
              active={selected === r.id}
            />
          ))}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedRelease && <DetailPanel release={selectedRelease} />}
      </div>

      {showNew && <NewReleaseModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

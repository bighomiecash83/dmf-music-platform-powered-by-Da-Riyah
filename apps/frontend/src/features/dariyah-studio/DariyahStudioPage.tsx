import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import LoadingSpinner from '@/shared/ui/LoadingSpinner'
import ErrorBanner from '@/shared/ui/ErrorBanner'
import { Film, Plus, Clapperboard, Music2, UserSquare2, Wand2, Play } from 'lucide-react'
import { clsx } from 'clsx'

const ORG_ID_STORAGE_KEY = 'dmf_dariyah_studio_org_id'

const API = '/v2/dariyah-studio'

interface Project {
  id: string
  org_id: string
  title: string
  vision: string | null
  status: string
}

interface Shot {
  id: string
  order_index: number
  camera_movement: string | null
  description: string | null
  duration_seconds: number | null
  status: string
}

interface Scene {
  id: string
  order_index: number
  title: string | null
  description: string | null
  shots: Shot[]
}

interface CharacterRef {
  id: string
  storage_path: string
  url: string | null
  extra: { character_name?: string | null }
}

interface Timeline {
  id: string
  name: string
  tracks: { shot_id: string; start_seconds: number; end_seconds: number }[]
}

interface Generation {
  id: string
  generation_type: string
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  ready_to_render: 'bg-yellow-100 text-yellow-700',
  rendered: 'bg-emerald-100 text-emerald-700',
  published: 'bg-indigo-100 text-indigo-700',
  queued: 'bg-gray-100 text-gray-600',
  queued_no_provider: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-600',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default function DariyahStudioPage() {
  const queryClient = useQueryClient()
  const [orgId, setOrgId] = useState(() => localStorage.getItem(ORG_ID_STORAGE_KEY) ?? '')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newVision, setNewVision] = useState('')

  const updateOrgId = (value: string) => {
    setOrgId(value)
    localStorage.setItem(ORG_ID_STORAGE_KEY, value)
  }

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['dariyahStudioProjects', orgId],
    queryFn: async (): Promise<Project[]> => {
      const { data } = await apiClient.get(`${API}/projects`, { params: { org_id: orgId } })
      return data
    },
    enabled: !!orgId,
  })

  const createProject = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`${API}/projects`, {
        org_id: orgId,
        title: newTitle,
        vision: newVision || null,
      })
      return data as Project
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['dariyahStudioProjects', orgId] })
      setNewTitle('')
      setNewVision('')
      setSelectedProjectId(project.id)
    },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Film size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Da'Riyah Studio</h1>
            <p className="text-xs text-gray-500">Photo + song + vision → synced, cinematic music video</p>
          </div>
        </div>
        <input
          value={orgId}
          onChange={(e) => updateOrgId(e.target.value)}
          placeholder="Org ID"
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-indigo-400"
        />
      </div>

      {!orgId && (
        <ErrorBanner message="Enter your org ID above to load or create Da'Riyah Studio projects." />
      )}

      {orgId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Projects list ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">New Project</h2>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-400"
              />
              <textarea
                value={newVision}
                onChange={(e) => setNewVision(e.target.value)}
                placeholder="Vision — describe the video you want"
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:border-indigo-400"
              />
              <button
                onClick={() => createProject.mutate()}
                disabled={!newTitle.trim() || createProject.isPending}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
              >
                <Plus size={14} /> Create Project
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Projects</h2>
              {isLoading && <LoadingSpinner size="sm" />}
              {error && <ErrorBanner message="Failed to load projects." />}
              <div className="space-y-2">
                {(projects ?? []).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={clsx(
                      'w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors',
                      selectedProjectId === p.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{p.title}</span>
                      <StatusPill status={p.status} />
                    </div>
                  </button>
                ))}
                {projects?.length === 0 && (
                  <p className="text-xs text-gray-400">No projects yet — create one above.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Project workspace ── */}
          <div className="lg:col-span-2">
            {selectedProjectId ? (
              <ProjectWorkspace projectId={selectedProjectId} />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
                Select or create a project to start building scenes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectWorkspace({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [sourceText, setSourceText] = useState('')
  const [charName, setCharName] = useState('')
  const [charStoragePath, setCharStoragePath] = useState('')
  const [shotIdsInput, setShotIdsInput] = useState('')
  const [beatMarkersInput, setBeatMarkersInput] = useState('')
  const [timelineId, setTimelineId] = useState('')
  const [generationType, setGenerationType] = useState('image_to_video')

  const storyboardKey = ['dariyahStudioStoryboard', projectId]
  const charRefsKey = ['dariyahStudioCharRefs', projectId]

  const { data: storyboard, isLoading: loadingStoryboard } = useQuery({
    queryKey: storyboardKey,
    queryFn: async (): Promise<{ scenes: Scene[] }> => {
      const { data } = await apiClient.get(`${API}/projects/${projectId}/storyboard`)
      return data
    },
  })

  const { data: charRefs } = useQuery({
    queryKey: charRefsKey,
    queryFn: async (): Promise<CharacterRef[]> => {
      const { data } = await apiClient.get(`${API}/projects/${projectId}/character-references`)
      return data
    },
  })

  const buildScenes = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`${API}/projects/${projectId}/scenes`, { source_text: sourceText })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyboardKey })
      setSourceText('')
    },
  })

  const addCharRef = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`${API}/projects/${projectId}/character-references`, {
        storage_path: charStoragePath,
        character_name: charName || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: charRefsKey })
      setCharName('')
      setCharStoragePath('')
    },
  })

  const syncAudio = useMutation({
    mutationFn: async (): Promise<Timeline> => {
      const { data } = await apiClient.post(`${API}/projects/${projectId}/audio-sync`, {
        shot_ids: shotIdsInput.split(',').map((s) => s.trim()).filter(Boolean),
        beat_markers: beatMarkersInput.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)),
      })
      return data
    },
    onSuccess: (timeline) => setTimelineId(timeline.id),
  })

  const render = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`${API}/projects/${projectId}/render`, { timeline_id: timelineId })
      return data
    },
  })

  const [generationResult, setGenerationResult] = useState<Generation | null>(null)
  const generate = useMutation({
    mutationFn: async (): Promise<Generation> => {
      const { data } = await apiClient.post(`${API}/generate`, {
        project_id: projectId,
        generation_type: generationType,
        parameters: {},
      })
      return data
    },
    onSuccess: setGenerationResult,
  })

  return (
    <div className="space-y-6">
      {/* ── Scene builder ── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clapperboard size={16} className="text-indigo-600" /> Scene Builder
        </h2>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder={'Paste lyrics or a script — separate scenes with a blank line'}
          rows={4}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:border-indigo-400"
        />
        <button
          onClick={() => buildScenes.mutate()}
          disabled={!sourceText.trim() || buildScenes.isPending}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
        >
          Build Scenes
        </button>
      </section>

      {/* ── Storyboard ── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Storyboard</h2>
        {loadingStoryboard && <LoadingSpinner size="sm" />}
        <div className="space-y-3">
          {(storyboard?.scenes ?? []).map((scene) => (
            <div key={scene.id} className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Scene {scene.order_index + 1}</p>
              <p className="text-sm text-gray-700 mb-2">{scene.description || scene.title || '—'}</p>
              {scene.shots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {scene.shots.map((shot) => (
                    <span key={shot.id} className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                      {shot.camera_movement ?? 'shot'} <StatusPill status={shot.status} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {storyboard?.scenes.length === 0 && (
            <p className="text-xs text-gray-400">No scenes yet — build them above.</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Character references ── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UserSquare2 size={16} className="text-indigo-600" /> Character References
          </h2>
          <input
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
            placeholder="Character name"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-400"
          />
          <input
            value={charStoragePath}
            onChange={(e) => setCharStoragePath(e.target.value)}
            placeholder="Storage path / URL"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={() => addCharRef.mutate()}
            disabled={!charStoragePath.trim() || addCharRef.isPending}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 mb-3"
          >
            Add Reference
          </button>
          <div className="space-y-1">
            {(charRefs ?? []).map((ref) => (
              <p key={ref.id} className="text-xs text-gray-600">
                {ref.extra?.character_name ?? 'Unnamed'} — {ref.storage_path}
              </p>
            ))}
          </div>
        </section>

        {/* ── Generate ── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Wand2 size={16} className="text-indigo-600" /> Generate
          </h2>
          <select
            value={generationType}
            onChange={(e) => setGenerationType(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-400"
          >
            <option value="image_to_video">Image → Video</option>
            <option value="text_to_video">Text → Video</option>
            <option value="cover_animation">Cover Art → Animated Visual</option>
            <option value="variation">Variation</option>
          </select>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
          >
            Dispatch Generation
          </button>
          {generationResult && (
            <p className="text-xs text-gray-500 mt-2">
              Job {generationResult.id.slice(0, 8)} — <StatusPill status={generationResult.status} />
            </p>
          )}
        </section>
      </div>

      {/* ── Audio sync + render ── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Music2 size={16} className="text-indigo-600" /> Audio Sync &amp; Render
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            value={shotIdsInput}
            onChange={(e) => setShotIdsInput(e.target.value)}
            placeholder="Shot IDs, comma-separated"
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          />
          <input
            value={beatMarkersInput}
            onChange={(e) => setBeatMarkersInput(e.target.value)}
            placeholder="Beat markers (seconds), comma-separated"
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
        <button
          onClick={() => syncAudio.mutate()}
          disabled={!shotIdsInput.trim() || !beatMarkersInput.trim() || syncAudio.isPending}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 mr-3"
        >
          Build Timeline
        </button>
        {timelineId && (
          <button
            onClick={() => render.mutate()}
            disabled={render.isPending}
            className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-40"
          >
            <Play size={14} /> Render Timeline
          </button>
        )}
        {render.data && (
          <p className="text-xs text-gray-500 mt-2">
            Render {render.data.render.id.slice(0, 8)} — <StatusPill status={render.data.render.status} /> ·
            Version {render.data.version.version_number}
          </p>
        )}
      </section>
    </div>
  )
}

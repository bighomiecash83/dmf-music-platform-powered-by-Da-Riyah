import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import {
  Sparkles, Send, Copy, CheckCheck, RotateCcw, ChevronDown,
  Code2, FileText, BarChart2, Wand2, X, Download, MessageSquare,
} from 'lucide-react'
import { clsx } from 'clsx'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'chat' | 'build' | 'analyze' | 'create'
type ArtifactKind = 'code' | 'table' | 'document'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: Date
  model?: string
}

interface Artifact {
  id: string
  kind: ArtifactKind
  title: string
  lang?: string
  content: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'claude-opus-4-6',   label: 'Opus 4.6',   badge: 'BEST' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', badge: null   },
  { id: 'claude-haiku-4-5',  label: 'Haiku 4.5',  badge: 'FAST' },
  { id: 'gemini-2.0-flash',  label: 'Gemini 2.0', badge: null   },
]

const MODES: { key: Mode; label: string; icon: React.ElementType; color: string; thinking: string }[] = [
  { key: 'chat',    label: 'Chat',    icon: MessageSquare, color: 'text-indigo-400', thinking: 'thinking'     },
  { key: 'build',   label: 'Build',   icon: Code2,         color: 'text-blue-400',  thinking: 'architecting' },
  { key: 'analyze', label: 'Analyze', icon: BarChart2,     color: 'text-green-400', thinking: 'analyzing'    },
  { key: 'create',  label: 'Create',  icon: Wand2,         color: 'text-purple-400',thinking: 'writing'      },
]

const QUICK_PROMPTS: Record<Mode, string[]> = {
  chat: [
    'Give me a 90-day growth plan for the DMF roster',
    'Calculate royalties: 50k Spotify + 20k Apple streams',
    'What playlist strategies work best for Columbus hip-hop?',
    'Compare DistroKid vs UnitedMasters for DMF in 2026',
  ],
  build: [
    'Build a streaming revenue calculator component',
    'Create a release timeline tracker with status stages',
    'Build a royalty split calculator for 5 artists',
    'Generate a TikTok campaign metrics dashboard',
  ],
  analyze: [
    'Analyze the DMF roster and rank by growth potential',
    'Compare revenue across all 5 DSP platforms',
    'Find the best release window for Q4 2026',
    'Break down where we lose streams in the funnel',
  ],
  create: [
    'Write a press release for a new Big Homie Cash single',
    "Generate Freezzo's TikTok bio and 5 caption hooks",
    'Write an EPK template for DMF artists',
    'Create 10 social posts for the next release campaign',
  ],
}

// ─── Local fallback ───────────────────────────────────────────────────────────

function localFallback(msg: string, mode: Mode): string {
  const m = msg.toLowerCase()
  if (mode === 'build') return "```tsx\n// Revenue Calculator — DMF Records\nimport { useState } from 'react'\n\nconst RATES: Record<string, number> = {\n  spotify: 0.004, apple: 0.010, youtube: 0.0008, amazon: 0.005, tidal: 0.013,\n}\n\nexport function RevenueCalculator() {\n  const [streams, setStreams] = useState<Record<string, number>>(\n    Object.fromEntries(Object.keys(RATES).map(k => [k, 0]))\n  )\n  const total = Object.entries(streams).reduce((s, [k, v]) => s + v * RATES[k], 0)\n  return (\n    <div className=\"bg-white rounded-2xl border p-6 space-y-4\">\n      <h2 className=\"text-xl font-bold\">Revenue Calculator</h2>\n      {Object.entries(RATES).map(([dsp, rate]) => (\n        <div key={dsp} className=\"flex items-center gap-4\">\n          <span className=\"w-28 capitalize text-sm\">{dsp}</span>\n          <input type=\"number\" min=\"0\" placeholder=\"streams\"\n            className=\"flex-1 border rounded-lg px-3 py-1.5 text-sm\"\n            onChange={e => setStreams(s => ({ ...s, [dsp]: +e.target.value }))}\n          />\n          <span className=\"w-20 text-right text-sm font-mono\">${(streams[dsp] * rate).toFixed(2)}</span>\n        </div>\n      ))}\n      <div className=\"border-t pt-4 flex justify-between\">\n        <span className=\"font-semibold\">Total</span>\n        <span className=\"text-2xl font-bold text-indigo-600\">${total.toFixed(2)}</span>\n      </div>\n    </div>\n  )\n}\n```\n\nDrop in `src/features/royalties/RevenueCalculator.tsx`. Set `ANTHROPIC_API_KEY` in Supabase secrets to unlock full AI code generation."
  if (mode === 'create') return "**PRESS RELEASE — FOR IMMEDIATE RELEASE**\n\n---\n\n**DMF RECORDS FLY HOOLIE ENT — WEST SIDE BUILT, WORLDWIDE REACHING**\n\n**COLUMBUS, OH — 2026** — DMF Records Fly Hoolie Ent, founded by Deangelo \"Big Homie Cash\" Jackson, announces its latest drop. With Big Homie Cash, Freezzo, OBMB DELO, Go Savage, and Ellumf — street rap, trap, experimental, and Indian fusion — DMF is the most versatile independent roster out of Ohio.\n\n*\"Built on ownership. Powered by innovation. No middlemen.\"*\n\n**Stream everywhere:** Spotify · Apple Music · YouTube Music · Amazon · Tidal\n\n**Contact:** bighomiecash8346@gmail.com\n\n*Set `ANTHROPIC_API_KEY` in Supabase secrets for AI-generated press releases and EPKs.*"
  if (mode === 'analyze') return "**DMF Roster Analysis — September 2026**\n\n| Artist | Followers | Popularity | Priority | Action |\n|---|---|---|---|---|\n| Big Homie Cash | 42 | 18 | Medium | Monthly single + founder story TikTok |\n| Freezzo | 31 | 15 | High | Solo campaign push |\n| OBMB DELO | 8 | 6 | **URGENT** | Submit to Spotify Fresh Finds now |\n| Go Savage | 19 | 9 | High | 30-day TikTok sprint |\n| Ellumf | 0 | 0 | **CRITICAL** | Claim Spotify for Artists TODAY |\n\n**Top 3 ROI moves:**\n1. Claim Ellumf Spotify (free, 10 min, unlocks editorial)\n2. Pitch OBMB DELO to Fresh Finds Hip-Hop (biggest catalog upside)\n3. Go Savage TikTok sprint (\"Pistol on da dresser\" = viral hook)\n\n*Set `ANTHROPIC_API_KEY` for live AI analysis.*"
  if (m.includes('royalt') || m.includes('stream') || m.includes('rate') || m.includes('earn') || m.includes('money'))
    return "**2026 DSP Royalty Rates:**\n\n| Platform | Rate/Stream | 50k | 200k | 1M |\n|---|---|---|---|---|\n| Tidal | $0.013 | $650 | $2,600 | $13,000 |\n| Apple Music | $0.010 | $500 | $2,000 | $10,000 |\n| Amazon | $0.005 | $250 | $1,000 | $5,000 |\n| Spotify | $0.004 | $200 | $800 | $4,000 |\n| YouTube | $0.0008 | $40 | $160 | $800 |\n\n**The Move:** Apple Music pays 2.5x Spotify. Pitch there first.\n\n**Path to $1k/month:** 250k Spotify OR 100k Apple Music.\n\n*West Side built, worldwide hustle. — Da'Riyah*"
  if (m.includes('roster') || m.includes('artist') || m.includes('freezzo') || m.includes('delo') || m.includes('savage') || m.includes('ellumf'))
    return "**DMF Roster Priority:**\n\n🔴 **OBMB DELO** — Biggest upside. Submit \"Standing on my own 10\" to Fresh Finds.\n🟡 **Go Savage** — \"Pistol on da dresser\" = TikTok gold. 20 clips in 30 days.\n🟢 **Freezzo** — Most active. Build collab playlist to consolidate fanbase.\n🔵 **Big Homie Cash** — Anchor. Release cadence + founder story.\n⚪ **Ellumf** — Claim Spotify for Artists. It's free. Do it now.\n\n*West Side built, worldwide hustle. — Da'Riyah*"
  return "**Da'Riyah — DMF Label Intelligence**\n\nLocked in. Here's what I can do:\n\n**💬 Chat** — Strategy, royalties, label ops\n**🔨 Build** — React components, dashboards, features\n**📊 Analyze** — Data deep-dives, ranked recommendations\n**✍️ Create** — Press releases, EPKs, marketing copy\n\n**Top moves right now:**\n- Claim Ellumf Spotify (free, today)\n- Pitch OBMB DELO to editorial (highest upside)\n- Go Savage TikTok sprint (viral hook potential)\n\n*West Side built, worldwide hustle. — Da'Riyah*"
}

// ─── Artifact extraction ──────────────────────────────────────────────────────

function extractArtifacts(content: string): Artifact[] {
  const arts: Artifact[] = []
  const codeRe = /```(\w+)?\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = codeRe.exec(content)) !== null) {
    const lang = m[1] || 'text'
    arts.push({
      id: `art-code-${arts.length}`,
      kind: 'code',
      title: lang === 'tsx' || lang === 'jsx' ? 'React Component' : lang === 'ts' || lang === 'js' ? 'Script' : lang === 'sql' ? 'SQL' : 'Code',
      lang,
      content: m[2].trimEnd(),
    })
  }
  const tableRe = /(\|[^\n]+\|\n(?:\|[-: |]+\|\n)(?:\|[^\n]+\|\n?)*)/g
  while ((m = tableRe.exec(content)) !== null) {
    arts.push({ id: `art-table-${arts.length}`, kind: 'table', title: 'Data Table', content: m[1] })
  }
  if (content.includes('PRESS RELEASE') || content.includes('FOR IMMEDIATE RELEASE')) {
    arts.push({ id: 'art-doc', kind: 'document', title: 'Press Release', content })
  }
  return arts
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="text-white font-semibold">{p.slice(2,-2)}</strong>
        : p.startsWith('`') && p.endsWith('`')  ? <code key={i} className="bg-gray-700 text-green-300 px-1 rounded text-xs font-mono">{p.slice(1,-1)}</code>
        : <span key={i}>{p}</span>
      )}
    </>
  )
}

function MessageBody({ content }: { content: string }) {
  const lines = content.split('\n')
  const els: React.ReactElement[] = []
  let inCode = false, codeLines: string[] = [], codeLang = ''
  const flush = (key: string) => {
    els.push(
      <div key={key} className="my-2 rounded-lg overflow-hidden border border-gray-700">
        {codeLang && <div className="bg-gray-800 text-gray-400 text-xs px-3 py-1 font-mono border-b border-gray-700">{codeLang}</div>}
        <pre className="bg-gray-950 text-green-400 text-xs p-3 overflow-x-auto leading-relaxed"><code>{codeLines.join('\n')}</code></pre>
      </div>
    )
    codeLines = []; codeLang = ''
  }
  lines.forEach((line, i) => {
    if (line.startsWith('```')) { if (!inCode) { inCode = true; codeLang = line.slice(3).trim() } else { inCode = false; flush(`c${i}`) } return }
    if (inCode) { codeLines.push(line); return }
    if (line.startsWith('# '))      els.push(<p key={i} className="font-bold text-lg mt-3 mb-1 text-white">{line.slice(2)}</p>)
    else if (line.startsWith('## ')) els.push(<p key={i} className="font-bold text-base mt-3 mb-1 text-gray-100">{line.slice(3)}</p>)
    else if (line.startsWith('### '))els.push(<p key={i} className="font-semibold text-sm mt-2 mb-1 text-gray-200">{line.slice(4)}</p>)
    else if (line.startsWith('- ') || line.startsWith('* '))
      els.push(<li key={i} className="ml-4 list-disc text-gray-200"><Inline text={line.slice(2)} /></li>)
    else if (/^\d+\. /.test(line))
      els.push(<li key={i} className="ml-4 list-decimal text-gray-200"><Inline text={line.replace(/^\d+\. /,'')} /></li>)
    else if (line.trim() === '---') els.push(<hr key={i} className="my-3 border-gray-700" />)
    else if (line.trim() === '')    els.push(<br key={i} />)
    else els.push(<p key={i} className="text-gray-200"><Inline text={line} /></p>)
  })
  return <div className="space-y-0.5 text-sm leading-relaxed">{els}</div>
}

// ─── Table renderer ───────────────────────────────────────────────────────────

function TableViewer({ content }: { content: string }) {
  const rows = content.trim().split('\n').filter(r => !/^\|[-: |]+\|$/.test(r.trim()))
  const headers = rows[0]?.split('|').filter(Boolean).map(h => h.trim()) ?? []
  const body = rows.slice(1).map(r => r.split('|').filter(Boolean).map(c => c.trim()))
  return (
    <div className="overflow-auto p-4">
      <table className="w-full text-sm border-collapse">
        <thead><tr className="border-b border-gray-700">
          {headers.map((h, i) => <th key={i} className="text-left px-4 py-2 text-gray-300 font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
              {row.map((cell, j) => <td key={j} className="px-4 py-2 text-gray-200">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Artifact viewer ──────────────────────────────────────────────────────────

function ArtifactViewer({ artifact }: { artifact: Artifact }) {
  if (artifact.kind === 'code')
    return <pre className="text-xs font-mono text-green-300 bg-gray-950 p-4 overflow-auto h-full leading-relaxed whitespace-pre-wrap">{artifact.content}</pre>
  if (artifact.kind === 'table')
    return <TableViewer content={artifact.content} />
  return <div className="p-6 h-full overflow-auto"><MessageBody content={artifact.content} /></div>
}

// ─── Thinking animation ───────────────────────────────────────────────────────

function ThinkingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-500 text-sm">
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
      <span>{label}…</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DaRiyahPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [mode, setMode] = useState<Mode>('chat')
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-6')
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [activeArtifact, setActiveArtifact] = useState(0)
  const [input, setInput] = useState('')
  const [modelOpen, setModelOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamText])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setModelOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function downloadArtifact(a: Artifact) {
    const ext = a.lang === 'tsx' ? 'tsx' : a.lang === 'ts' ? 'ts' : a.lang === 'sql' ? 'sql' : a.kind === 'document' ? 'md' : 'txt'
    const blob = new Blob([a.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a'); el.href = url; el.download = `dmf-${a.kind}.${ext}`; el.click()
    URL.revokeObjectURL(url)
  }

  function finalize(content: string, model: string) {
    const arts = extractArtifacts(content)
    setMessages(prev => [...prev, { id: `a-${uid()}`, role: 'assistant', content, ts: new Date(), model }])
    setStreamText('')
    setIsStreaming(false)
    if (arts.length) { setArtifacts(arts); setActiveArtifact(0) }
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || isStreaming) return
    setInput('')
    setMessages(prev => [...prev, { id: `u-${uid()}`, role: 'user', content: msg, ts: new Date() }])
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setIsStreaming(true)
    setStreamText('')
    let fullText = '', usedModel = selectedModel

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/dariyah-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ message: msg, history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })), model: selectedModel, mode, stream: true }),
        signal: abortRef.current.signal,
      })
      const ct = res.headers.get('content-type') ?? ''
      if (res.ok && ct.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n'); buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') { finalize(fullText, usedModel); return }
            try { const c = JSON.parse(raw); if (c.token) { fullText += c.token; setStreamText(fullText) }; if (c.model) usedModel = c.model } catch { /* skip */ }
          }
        }
        finalize(fullText || localFallback(msg, mode), usedModel)
      } else if (res.ok) {
        const data = await res.json()
        finalize(data.reply ?? data.response ?? localFallback(msg, mode), usedModel)
      } else { throw new Error('failed') }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      finalize(localFallback(msg, mode), 'da-riyah-local')
    }
  }

  function reset() {
    abortRef.current?.abort()
    setMessages([]); setStreamText(''); setIsStreaming(false); setArtifacts([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const currentMode = MODES.find(m => m.key === mode)!
  const currentModel = MODELS.find(m => m.id === selectedModel)!
  const hasArtifacts = artifacts.length > 0

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-gray-800 flex items-center px-4 py-2.5 gap-3 bg-gray-950/95 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 mr-1">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none tracking-tight">Da'Riyah</p>
            <p className="text-xs text-gray-600 leading-none mt-0.5">DMF Label AI</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-0.5 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {MODES.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => setMode(key)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                mode === key ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
              )}>
              <Icon size={12} className={mode === key ? color : ''} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Model picker */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setModelOpen(v => !v)}
            className="flex items-center gap-2 bg-gray-900 border border-gray-700 hover:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors">
            {currentModel.badge && <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded font-semibold">{currentModel.badge}</span>}
            <span>{currentModel.label}</span>
            <ChevronDown size={12} className={clsx('transition-transform', modelOpen && 'rotate-180')} />
          </button>
          {modelOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 p-1.5">
              {MODELS.map(m => (
                <button key={m.id} onClick={() => { setSelectedModel(m.id); setModelOpen(false) }}
                  className={clsx('w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedModel === m.id ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800')}>
                  <span className="font-medium">{m.label}</span>
                  {m.badge && <span className={clsx('text-xs px-1.5 py-0.5 rounded font-semibold', selectedModel === m.id ? 'bg-white/20' : 'bg-gray-700 text-gray-400')}>{m.badge}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <button onClick={reset}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            <RotateCcw size={11} /> New
          </button>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Artifact canvas */}
        {hasArtifacts && (
          <div className="w-1/2 flex flex-col border-r border-gray-800 overflow-hidden">
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-gray-800 bg-gray-900/60">
              <span className="text-xs text-gray-600 mr-0.5">Artifacts</span>
              {artifacts.map((a, i) => {
                const Icon = a.kind === 'code' ? Code2 : a.kind === 'table' ? BarChart2 : FileText
                return (
                  <button key={a.id} onClick={() => setActiveArtifact(i)}
                    className={clsx('flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
                      activeArtifact === i ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')}>
                    <Icon size={11} />{a.title}
                  </button>
                )
              })}
              <div className="flex-1" />
              <button onClick={() => copyText(artifacts[activeArtifact]?.content ?? '', 'artifact')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800 transition-colors">
                {copiedId === 'artifact' ? <CheckCheck size={11} className="text-green-400" /> : <Copy size={11} />} Copy
              </button>
              <button onClick={() => artifacts[activeArtifact] && downloadArtifact(artifacts[activeArtifact])}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800 transition-colors">
                <Download size={11} /> Save
              </button>
              <button onClick={() => setArtifacts([])} className="text-gray-600 hover:text-gray-300 p-1 rounded hover:bg-gray-800 ml-1">
                <X size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {artifacts[activeArtifact] && <ArtifactViewer artifact={artifacts[activeArtifact]} />}
            </div>
          </div>
        )}

        {/* Chat panel */}
        <div className={clsx('flex flex-col overflow-hidden', hasArtifacts ? 'w-1/2' : 'flex-1')}>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-5">

              {/* Welcome screen */}
              {messages.length === 0 && !isStreaming && (
                <div className="text-center py-8">
                  {/* DMF Logo */}
                  <div className="flex justify-center mb-5">
                    <img
                      src="/logo.png"
                      alt="DMF Records"
                      className="h-32 w-32 object-contain opacity-80 drop-shadow-2xl"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/30">
                    <Sparkles size={28} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">What's up, Big Homie?</h2>
                  <p className="text-gray-500 text-sm mb-1 max-w-sm mx-auto">
                    Da'Riyah — DMF Label Intelligence. Strategy, code, copy, data.
                  </p>
                  <p className="text-xs text-gray-700 mb-8">
                    Mode: <span className={clsx('font-semibold', currentMode.color)}>{currentMode.label}</span>
                    {' · '}Model: <span className="text-gray-500">{currentModel.label}</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                    {QUICK_PROMPTS[mode].map(p => (
                      <button key={p} onClick={() => send(p)}
                        className="text-left bg-gray-900 border border-gray-800 hover:border-indigo-500 hover:bg-gray-800/60 rounded-xl px-4 py-3 text-sm text-gray-300 transition-all">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map(msg => (
                <div key={msg.id} className={clsx('flex gap-3 group', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow shadow-indigo-500/20">
                      <Sparkles size={12} className="text-white" />
                    </div>
                  )}
                  <div className={clsx('relative max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                    msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-900 border border-gray-800 rounded-tl-sm')}>
                    {msg.role === 'user'
                      ? <p className="leading-relaxed">{msg.content}</p>
                      : <MessageBody content={msg.content} />}
                    <div className={clsx('flex items-center gap-2 mt-2', msg.role === 'user' ? 'justify-end text-indigo-300' : 'text-gray-700')}>
                      <span className="text-xs">{msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.role === 'assistant' && msg.model && msg.model !== 'da-riyah-local' && (
                        <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">{msg.model.split('-').slice(0,2).join(' ')}</span>
                      )}
                      <button onClick={() => copyText(msg.content, msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                        {copiedId === msg.id ? <CheckCheck size={12} className="text-green-400" /> : <Copy size={12} className="hover:text-gray-300" />}
                      </button>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-7 w-7 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">BHC</div>
                  )}
                </div>
              ))}

              {/* Streaming */}
              {isStreaming && streamText && (
                <div className="flex gap-3 justify-start">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={12} className="text-white animate-pulse" />
                  </div>
                  <div className="max-w-[80%] bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                    <MessageBody content={streamText} />
                    <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                  </div>
                </div>
              )}

              {/* Thinking (before first token) */}
              {isStreaming && !streamText && (
                <div className="flex gap-3 justify-start">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={12} className="text-white animate-pulse" />
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <ThinkingDots label={currentMode.thinking} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-gray-800 p-4 bg-gray-950">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-end gap-3 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={
                    mode === 'build' ? 'Describe what to build…' :
                    mode === 'analyze' ? 'What do you want to analyze…' :
                    mode === 'create' ? 'What do you want to create…' :
                    "Ask Da'Riyah anything…"
                  }
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none min-h-[24px] max-h-32"
                  onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 128) + 'px' }}
                />
                <button onClick={() => send()} disabled={isStreaming || !input.trim()}
                  className="shrink-0 h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow shadow-indigo-600/30">
                  <Send size={15} className="text-white" />
                </button>
              </div>
              <p className="text-xs text-gray-700 text-center mt-2">
                Enter to send · Shift+Enter for newline ·{' '}
                <span className={clsx('font-medium', currentMode.color)}>{currentMode.label}</span>
                {' · '}{currentModel.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

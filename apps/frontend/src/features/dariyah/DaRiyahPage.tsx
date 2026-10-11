import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { Send, Sparkles, Loader2, Copy, CheckCheck, RotateCcw, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: Date
  model?: string
}

interface ModelInfo {
  id: string
  label: string
  provider: string
  requires_key: string
  key_set: boolean
}

interface ChatRequest {
  message: string
  history: { role: string; content: string }[]
  model: string
}

async function fetchModels(): Promise<ModelInfo[]> {
  const { data } = await apiClient.get('/dariyah/models')
  return data
}

async function chat(req: ChatRequest) {
  const { data } = await apiClient.post('/dariyah/chat', req)
  return data as { response: string; model: string; provider: string }
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-100 text-orange-700 border-orange-200',
  google:    'bg-blue-100 text-blue-700 border-blue-200',
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  google:    'Google',
}

// Which model gets a "BEST" badge
const BEST_MODEL = 'claude-opus-4-6'

const STARTERS = [
  'Analyze my roster and give a 90-day growth plan',
  'Calculate royalties: 50k Spotify streams + 20k Apple',
  'Write a press release for a new Big Homie Cash single',
  'What playlist strategies work best for Columbus hip-hop artists?',
  'Compare DistroKid vs UnitedMasters for DMF in 2026',
  "Build a TikTok campaign strategy for Freezzo's next drop",
]

export default function DaRiyahPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-6')
  const [modelOpen, setModelOpen] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: models = [] } = useQuery({
    queryKey: ['dariyahModels'],
    queryFn: fetchModels,
    staleTime: 60_000,
  })

  const currentModel = models.find(m => m.id === selectedModel)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const mutation = useMutation({
    mutationFn: chat,
    onSuccess: ({ response, model }) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        ts: new Date(),
        model,
      }])
    },
    onError: (err: any) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${err?.response?.data?.detail || err.message || "Failed to reach Da'Riyah. Make sure the backend is running."}`,
        ts: new Date(),
      }])
    },
  })

  const send = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || mutation.isPending) return
    setMessages(prev => [...prev, { role: 'user', content: msg, ts: new Date() }])
    setInput('')
    mutation.mutate({
      message: msg,
      history: messages.map(m => ({ role: m.role, content: m.content })),
      model: selectedModel,
    })
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const reset = () => {
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const copyMsg = (idx: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">Da'Riyah</h1>
            <p className="text-xs text-gray-500 mt-0.5">DMF Label Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ── Model Picker ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setModelOpen(v => !v)}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-indigo-400 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors"
            >
              {currentModel && (
                <span className={clsx(
                  'text-xs px-1.5 py-0.5 rounded-md border font-medium',
                  PROVIDER_COLORS[currentModel.provider]
                )}>
                  {PROVIDER_LABELS[currentModel.provider]}
                </span>
              )}
              <span>{currentModel?.label ?? selectedModel}</span>
              <ChevronDown size={14} className={clsx('transition-transform', modelOpen && 'rotate-180')} />
            </button>

            {modelOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
                <div className="p-2">
                  {models.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-2">Loading models…</p>
                  )}
                  {/* Group by provider */}
                  {(['anthropic', 'google'] as const).map(provider => {
                    const group = models.filter(m => m.provider === provider)
                    if (!group.length) return null
                    return (
                      <div key={provider} className="mb-2 last:mb-0">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-1">
                          {PROVIDER_LABELS[provider]}
                        </p>
                        {group.map(m => (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedModel(m.id); setModelOpen(false) }}
                            className={clsx(
                              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors',
                              selectedModel === m.id
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{m.label}</span>
                              {m.id === BEST_MODEL && (
                                <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-medium">
                                  BEST
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {m.key_set
                                ? <span className="w-2 h-2 rounded-full bg-green-500" title="API key set" />
                                : <span className="w-2 h-2 rounded-full bg-yellow-400" title="No API key — uses fallback" />
                              }
                              {selectedModel === m.id && (
                                <CheckCheck size={14} className="text-indigo-600" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
                <div className="border-t border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-400 flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> API key set
                    <span className="ml-2 w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Uses smart fallback
                  </p>
                </div>
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RotateCcw size={13} />
              New chat
            </button>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="h-20 w-20 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Sparkles size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What's up, Big Homie?</h2>
              <p className="text-gray-500 mb-2 max-w-md mx-auto">
                Da'Riyah — your DMF label intelligence. Music business, royalties,
                artist strategy, code, campaigns — ask anything.
              </p>
              {currentModel && (
                <p className="text-xs text-gray-400 mb-8">
                  Using <span className="font-medium text-gray-600">{currentModel.label}</span>
                  {!currentModel.key_set && (
                    <> · <span className="text-yellow-600">No API key — smart fallback active</span></>
                  )}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={clsx('flex gap-3 group', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                  <Sparkles size={14} className="text-white" />
                </div>
              )}

              <div className={clsx(
                'relative max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
              )}>
                <MessageBody content={msg.content} />

                <div className={clsx(
                  'flex items-center justify-between mt-2 gap-2',
                  msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                )}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">
                      {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.model && msg.role === 'assistant' && (
                      <ModelBadge modelId={msg.model} models={models} />
                    )}
                  </div>
                  <button
                    onClick={() => copyMsg(idx, msg.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy"
                  >
                    {copiedIdx === idx
                      ? <CheckCheck size={13} className="text-green-500" />
                      : <Copy size={13} />
                    }
                  </button>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 mt-1 text-white text-xs font-bold">
                  BHC
                </div>
              )}
            </div>
          ))}

          {mutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 size={14} className="animate-spin text-indigo-500" />
                <span>Da'Riyah thinking with <strong>{currentModel?.label ?? selectedModel}</strong>…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Da'Riyah anything — strategy, royalties, code, campaigns…"
              rows={1}
              disabled={mutation.isPending}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none min-h-[24px] max-h-32"
              onInput={(e) => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 128) + 'px'
              }}
            />
            <button
              onClick={() => send()}
              disabled={mutation.isPending || !input.trim()}
              className="shrink-0 h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Shift+Enter for new line · Enter to send ·{' '}
            {currentModel && (
              <span className={currentModel.key_set ? 'text-green-600' : 'text-yellow-600'}>
                {currentModel.key_set
                  ? `${currentModel.label} active`
                  : `${currentModel.label} — set ${currentModel.requires_key} for live AI`}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function ModelBadge({ modelId, models }: { modelId: string; models: ModelInfo[] }) {
  const m = models.find(x => x.id === modelId)
  if (!m) return null
  const colors = PROVIDER_COLORS[m.provider] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={clsx('text-xs px-1.5 py-0.5 rounded border font-medium', colors)}>
      {m.label}
    </span>
  )
}

/** Lightweight inline markdown (bold, code blocks, lists, headings, hr) */
function MessageBody({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let inCode = false
  let codeLines: string[] = []
  let codeLang = ''

  const flushCode = (key: string) => {
    elements.push(
      <div key={key} className="my-2 rounded-lg overflow-hidden border border-gray-200">
        {codeLang && (
          <div className="bg-gray-800 text-gray-400 text-xs px-3 py-1 font-mono">{codeLang}</div>
        )}
        <pre className="bg-gray-900 text-green-400 text-xs p-3 overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>
      </div>
    )
    codeLines = []
    codeLang = ''
  }

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (!inCode) { inCode = true; codeLang = line.slice(3).trim() }
      else { inCode = false; flushCode(`code-${i}`) }
      return
    }
    if (inCode) { codeLines.push(line); return }

    if (line.startsWith('### '))      elements.push(<p key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</p>)
    else if (line.startsWith('## ')) elements.push(<p key={i} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</p>)
    else if (line.startsWith('# '))  elements.push(<p key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</p>)
    else if (line.startsWith('- ') || line.startsWith('* '))
      elements.push(<li key={i} className="ml-4 list-disc"><Inline text={line.slice(2)} /></li>)
    else if (/^\d+\. /.test(line))
      elements.push(<li key={i} className="ml-4 list-decimal"><Inline text={line.replace(/^\d+\. /, '')} /></li>)
    else if (line.trim() === '---') elements.push(<hr key={i} className="my-3 border-gray-200" />)
    else if (line.trim() === '')     elements.push(<br key={i} />)
    else elements.push(<p key={i}><Inline text={line} /></p>)
  })

  return <div className="space-y-0.5">{elements}</div>
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

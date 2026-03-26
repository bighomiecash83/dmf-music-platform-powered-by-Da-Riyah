import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { callEdgeFunction } from '@/lib/supabase'
import { Sparkles, Loader2 } from 'lucide-react'

interface GenerateRequest {
  artist_name: string
  title: string
  genre: string
  mood: string
  themes: string
}

// Smart standalone generator — no API key needed
function generateLocal(req: GenerateRequest): string {
  return (
    `${req.artist_name} returns with "${req.title}," a bold new ${req.genre || 'hip-hop'} offering ` +
    `that pushes creative boundaries. ` +
    `${req.themes ? `Drawing on themes of ${req.themes}, the project` : 'The project'} ` +
    `delivers ${req.mood ? `a ${req.mood} atmosphere` : 'an immersive sonic experience'} ` +
    `that demands repeat listens.\n\n` +
    `From the opening bars, it's clear this isn't just music — it's a statement. ` +
    `${req.artist_name} channels raw emotion into every track, blending ` +
    `${(req.genre || 'hip-hop').toLowerCase()} traditions with forward-thinking production ` +
    `that feels both timeless and cutting-edge.\n\n` +
    `"I wanted to create something that hits different," says ${req.artist_name}. ` +
    `"Every bar, every beat — it all means something." ` +
    `"${req.title}" is available now on all major streaming platforms.`
  )
}

async function generateDescription(req: GenerateRequest): Promise<{ description: string }> {
  try {
    return await callEdgeFunction<{ description: string }>('generate-description', req)
  } catch {
    return { description: generateLocal(req) }
  }
}

const FIELDS: { key: keyof GenerateRequest; label: string; placeholder: string }[] = [
  { key: 'artist_name', label: 'Artist Name', placeholder: 'Big Homie Cash' },
  { key: 'title',       label: 'Release Title', placeholder: 'The Rise' },
  { key: 'genre',       label: 'Genre', placeholder: 'Hip-Hop / Street Rap' },
  { key: 'mood',        label: 'Mood / Vibe', placeholder: 'Aggressive, triumphant, raw' },
  { key: 'themes',      label: 'Themes', placeholder: 'Hustle, loyalty, West Side Columbus' },
]

export default function AIPage() {
  const [form, setForm] = useState<GenerateRequest>({ artist_name: '', title: '', genre: '', mood: '', themes: '' })
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const mutation = useMutation({
    mutationFn: generateDescription,
    onSuccess: ({ description }) => setResult(description),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.artist_name || !form.title) return
    mutation.mutate(form)
  }

  const copy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={24} className="text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">AI Tools</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Generate press-ready release descriptions powered by Da'Riyah.{' '}
        <a href="/dariyah" className="text-indigo-600 hover:underline">Chat with Da'Riyah →</a>
      </p>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Release Description Generator</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={mutation.isPending || !form.artist_name || !form.title}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : 'Generate Description'}
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-indigo-900">Generated Description</h3>
            <button onClick={copy} className="text-xs text-indigo-600 hover:text-indigo-800">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  )
}

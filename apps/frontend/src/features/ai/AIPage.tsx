import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import ErrorBanner from '@/shared/ui/ErrorBanner'
import { Sparkles } from 'lucide-react'

interface GenerateDescriptionRequest {
  release_id: string
  artist_name: string
  title: string
  genre: string
  mood: string
  themes: string
}

async function generateDescription(req: GenerateDescriptionRequest) {
  const { data } = await apiClient.post('/ai/generate-description', req)
  return data as { description: string; generated_at: string }
}

export default function AIPage() {
  const [form, setForm] = useState({
    release_id: '',
    artist_name: '',
    title: '',
    genre: '',
    mood: '',
    themes: '',
  })
  const [result, setResult] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: generateDescription,
    onSuccess: (data) => setResult(data.description),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles size={24} className="text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">AI Tools</h1>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Release Description Generator</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(['artist_name', 'title', 'genre', 'mood', 'themes'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                {field.replace('_', ' ')}
              </label>
              <input
                type="text"
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Generating…' : 'Generate Description'}
          </button>
        </form>
      </div>

      {mutation.isError && <ErrorBanner message="Generation failed. Check your API key and try again." />}

      {result && (
        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
          <h3 className="font-semibold text-indigo-900 mb-2">Generated Description</h3>
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  )
}

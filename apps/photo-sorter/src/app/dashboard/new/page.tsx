'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const PRESETS = [
  { value: 'real_estate', label: 'Real Estate', icon: '🏠', desc: 'Property listings, interiors, aerials' },
  { value: 'wedding', label: 'Wedding', icon: '💒', desc: 'Ceremony, reception, portraits' },
  { value: 'travel', label: 'Travel', icon: '✈️', desc: 'Landmarks, food, street photography' },
  { value: 'general', label: 'General', icon: '📷', desc: 'People, places, objects, nature' },
] as const

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [preset, setPreset] = useState<string>('general')
  const [shootDate, setShootDate] = useState('')
  const [location, setLocation] = useState('')
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        name,
        preset,
        status: 'draft',
        metadata: {
          core: {
            shoot_date: shootDate || null,
            location: location || null,
            client_name: clientName || null,
          },
        },
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900">New Project</h1>
      <p className="mt-1 text-sm text-gray-500">Set up your project, then upload photos.</p>

      <form onSubmit={handleCreate} className="mt-8 space-y-6">
        {/* Project name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Project name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Smith Wedding, 123 Main St Listing..."
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Preset selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Category preset</label>
          <p className="text-xs text-gray-500">Determines how AI sorts your photos.</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={`flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                  preset === p.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <span className="mt-2 text-sm font-semibold text-gray-900">{p.label}</span>
                <span className="text-xs text-gray-500">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional metadata */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Shoot date
            </label>
            <input
              id="date"
              type="date"
              value={shootDate}
              onChange={(e) => setShootDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="client" className="block text-sm font-medium text-gray-700">
              Client name
            </label>
            <input
              id="client"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Optional"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !name}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

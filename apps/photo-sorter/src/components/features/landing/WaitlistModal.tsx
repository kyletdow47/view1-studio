'use client'

import { useState } from 'react'
import { X, CheckCircle } from 'lucide-react'

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
}

interface WaitlistResponse {
  error?: string
  count?: number
  success?: boolean
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [count, setCount] = useState<number | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json() as WaitlistResponse

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Something went wrong')
        return
      }

      setStatus('success')
      if (typeof data.count === 'number') setCount(data.count)
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  function handleClose() {
    onClose()
    // Reset form after closing
    setTimeout(() => {
      setEmail('')
      setStatus('idle')
      setErrorMsg('')
      setCount(null)
    }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative bg-surface border border-view1-border rounded-2xl p-8 w-full max-w-md shadow-2xl"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-accent" size={32} />
            </div>
            <h3 id="modal-title" className="text-white text-xl font-semibold mb-2">
              You&apos;re on the list!
            </h3>
            <p className="text-muted mb-4">
              We&apos;ll email you the moment View1 Studio is ready.
            </p>
            {count !== null && (
              <p className="text-accent font-medium text-sm">
                {count.toLocaleString()} photographers already waiting
              </p>
            )}
            <button
              onClick={handleClose}
              className="mt-6 text-muted hover:text-white transition-colors text-sm underline underline-offset-2"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 id="modal-title" className="text-white text-xl font-semibold mb-2">
              Join the Waitlist
            </h3>
            <p className="text-muted mb-6">
              Be the first to know when View1 Studio launches.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full bg-background border border-view1-border rounded-lg px-4 py-3 text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              {status === 'error' && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-accent text-black font-semibold rounded-lg px-4 py-3 hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

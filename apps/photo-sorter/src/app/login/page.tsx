'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const { signInWithEmail, signUpWithEmail, signInWithOAuth } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isSignUp) {
      const { error: err } = await signUpWithEmail(email, password, fullName)
      if (err) {
        setError(err.message)
      } else {
        setCheckEmail(true)
      }
    } else {
      const { error: err } = await signInWithEmail(email, password)
      if (err) {
        setError(err.message)
      } else {
        router.push(redirect)
      }
    }

    setLoading(false)
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="mt-2 text-gray-600">
            We sent a confirmation link to <strong>{email}</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold">
          {isSignUp ? 'Create your account' : 'Sign in to View1'}
        </h1>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => signInWithOAuth('google')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
          >
            Continue with Google
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            className="font-medium text-blue-600 hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}

import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-center mb-4">View1 Studio</h1>
      <p className="text-lg text-gray-600 text-center mb-8">
        AI-powered photo sorting and client delivery for professional photographers
      </p>
      <div className="flex gap-4">
        <Link
          href="/auth/login"
          className="rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800 transition-colors"
        >
          Get Started
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-6 py-3 hover:border-gray-400 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </main>
  )
}

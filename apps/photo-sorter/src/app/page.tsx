import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          View1 Studio
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          AI-powered photo sorting for professional photographers
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/gallery"
          className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50"
        >
          View Gallery
        </Link>
      </div>
    </div>
  )
}

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-gray-600">The page you are looking for does not exist.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Go home
      </Link>
    </div>
  )
}

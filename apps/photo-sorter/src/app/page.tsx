import type { Metadata } from 'next'
import { LandingPage } from '@/components/features/landing/LandingPage'

export const metadata: Metadata = {
  title: 'View1 Studio — AI Photo Sorting for Professional Photographers',
  description:
    'Sort, deliver, and get paid for your photography. AI-powered platform for wedding and event photographers.',
  openGraph: {
    title: 'View1 Studio — AI Photo Sorting for Professional Photographers',
    description:
      'Sort, deliver, and get paid for your photography. AI-powered platform for wedding and event photographers.',
    type: 'website',
  },
}

export default function HomePage() {
  return <LandingPage />
}

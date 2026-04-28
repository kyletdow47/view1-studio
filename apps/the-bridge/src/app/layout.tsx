import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { TabBar } from '@/components/shell/TabBar'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Bridge',
  description: '4-week gym + nutrition tracking',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'The Bridge',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <ToastProvider>
          <main
            className="px-4"
            style={{
              paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 88px)',
              minHeight: '100dvh',
            }}
          >
            {children}
          </main>
          <TabBar />
        </ToastProvider>
      </body>
    </html>
  )
}

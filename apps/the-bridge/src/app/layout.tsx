import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { AppHeader } from '@/components/shell/AppHeader'
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
          <div className="flex flex-col min-h-[100dvh] pt-[env(safe-area-inset-top)]">
            <AppHeader />
            <main className="flex-1 px-4 pb-32">{children}</main>
            <TabBar />
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}

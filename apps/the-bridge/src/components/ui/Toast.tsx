'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

type ToastVariant = 'default' | 'success' | 'error' | 'pr'

type Toast = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContext = {
  toast: (message: string, variant?: ToastVariant) => void
}

const Ctx = createContext<ToastContext | null>(null)

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>')
  return ctx
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2400)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <ToastViewport toasts={toasts} />
    </Ctx.Provider>
  )
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 inset-x-4 z-50 flex flex-col gap-2 pointer-events-none items-center"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {toasts.map((t) => (
        <ToastBubble key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastBubble({ toast }: { toast: Toast }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setShown(true))
  }, [])

  const isRainbow = toast.variant === 'pr' || toast.variant === 'success'

  return (
    <div
      className={[
        'pointer-events-auto px-4 py-2.5 rounded-pill text-sm font-medium shadow-2xl',
        'transition-all duration-300 ease-out',
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
        isRainbow
          ? 'rainbow-bright-fill text-white'
          : toast.variant === 'error'
          ? 'bg-red-500/90 text-white'
          : 'bg-white/12 text-white backdrop-blur-md',
      ].join(' ')}
    >
      {toast.message}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

type Props = {
  value: number | null
  onChange: (v: number | null) => void
  onNext: () => void
  onDone: () => void
  /** which field this pad is editing — used in the header label */
  fieldLabel: string
  /** "next" vs "done" — last field of the row uses "done" */
  mode: 'next' | 'done'
  /** allow decimals (weight) — reps/RIR are integers */
  decimal?: boolean
  onClose: () => void
}

/**
 * Bottom-sheet keypad. Slides up from the bottom of the screen, covering
 * the tab bar with a rounded-top sheet. Tapping the dimmed backdrop closes
 * the pad. All button press handlers preventDefault so focus stays on the
 * field being edited.
 */
export function NumberPad({
  value,
  onChange,
  onNext,
  onDone,
  fieldLabel,
  mode,
  decimal = true,
  onClose,
}: Props) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const str = value == null ? '' : String(value)

  function append(s: string) {
    let next = str
    if (s === '.') {
      if (!decimal || next.includes('.')) return
      if (next === '') next = '0'
      next = next + '.'
    } else {
      next = next + s
    }
    const n = Number(next)
    if (Number.isFinite(n)) onChange(n)
  }

  function backspace() {
    if (str === '') return
    const next = str.slice(0, -1)
    if (next === '' || next === '-') {
      onChange(null)
      return
    }
    const n = Number(next)
    if (Number.isFinite(n)) onChange(n)
  }

  function plusMinus(delta: number) {
    const base = value ?? 0
    const next = Math.max(0, Math.round((base + delta) * 10) / 10)
    onChange(next)
  }

  function handleClose() {
    setEntered(false)
    // brief delay so the slide-out animation can play before the parent
    // unmounts the component
    setTimeout(onClose, 180)
  }

  // Buttons share a base style; mouse/touch-start preventDefault keeps the
  // focused input from losing focus (which would close the pad).
  const Btn = ({
    children,
    onClick,
    className,
    ariaLabel,
  }: {
    children: React.ReactNode
    onClick: () => void
    className?: string
    ariaLabel?: string
  }) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'h-[60px] rounded-2xl font-mono font-semibold text-2xl text-white',
        'bg-white/[0.07] active:bg-white/16 active:scale-95 transition-all duration-100',
        'flex items-center justify-center select-none',
        className
      )}
    >
      {children}
    </button>
  )

  return (
    <>
      {/* Dimmed backdrop — tap to close, sits below the sheet */}
      <button
        aria-label="Close keypad"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-200',
          entered ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Sheet */}
      <div
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          'fixed left-0 right-0 bottom-0 z-50',
          'bg-[#0d0d14] border-t border-white/10 rounded-t-3xl',
          'shadow-[0_-12px_40px_rgba(0,0,0,0.55)]',
          'transition-transform duration-200 ease-out',
          entered ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header — current field + value preview + primary action */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55 font-bold">
              {fieldLabel}
            </p>
            <p className="font-mono text-3xl font-bold tabular-nums text-white leading-tight mt-0.5">
              {value ?? <span className="text-white/30">—</span>}
            </p>
          </div>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={mode === 'done' ? onDone : onNext}
            className="rainbow-bright-fill text-white font-semibold px-5 py-2.5 rounded-pill text-sm shadow-[0_4px_16px_rgba(236,72,153,0.35)] active:scale-95 transition-transform"
          >
            {mode === 'done' ? '✓ Log set' : 'Next →'}
          </button>
        </div>

        {/* Quick adjust row */}
        <div className="grid grid-cols-4 gap-2 px-3 pb-2">
          {decimal ? (
            <>
              <Btn onClick={() => plusMinus(-5)} className="!h-[44px] !text-sm !bg-white/[0.04]">−5</Btn>
              <Btn onClick={() => plusMinus(-2.5)} className="!h-[44px] !text-sm !bg-white/[0.04]">−2.5</Btn>
              <Btn onClick={() => plusMinus(2.5)} className="!h-[44px] !text-sm !bg-white/[0.04]">+2.5</Btn>
              <Btn onClick={() => plusMinus(5)} className="!h-[44px] !text-sm !bg-white/[0.04]">+5</Btn>
            </>
          ) : (
            <>
              <Btn onClick={() => plusMinus(-1)} className="!h-[44px] !text-sm !bg-white/[0.04]">−1</Btn>
              <Btn onClick={() => plusMinus(1)} className="!h-[44px] !text-sm !bg-white/[0.04]">+1</Btn>
              <Btn onClick={() => plusMinus(2)} className="!h-[44px] !text-sm !bg-white/[0.04]">+2</Btn>
              <Btn onClick={() => plusMinus(5)} className="!h-[44px] !text-sm !bg-white/[0.04]">+5</Btn>
            </>
          )}
        </div>

        {/* Digit grid */}
        <div className="grid grid-cols-3 gap-2 px-3 pb-3">
          <Btn onClick={() => append('1')}>1</Btn>
          <Btn onClick={() => append('2')}>2</Btn>
          <Btn onClick={() => append('3')}>3</Btn>
          <Btn onClick={() => append('4')}>4</Btn>
          <Btn onClick={() => append('5')}>5</Btn>
          <Btn onClick={() => append('6')}>6</Btn>
          <Btn onClick={() => append('7')}>7</Btn>
          <Btn onClick={() => append('8')}>8</Btn>
          <Btn onClick={() => append('9')}>9</Btn>
          <Btn
            onClick={() => append('.')}
            className={!decimal ? 'opacity-25 pointer-events-none' : ''}
            ariaLabel="decimal"
          >
            .
          </Btn>
          <Btn onClick={() => append('0')}>0</Btn>
          <Btn onClick={backspace} ariaLabel="backspace">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </Btn>
        </div>
      </div>
    </>
  )
}

'use client'

import { cn } from '@/lib/cn'

type Props = {
  value: number | null
  onChange: (v: number | null) => void
  onNext: () => void
  onDone: () => void
  /** which field this pad is editing (just for the action button label) */
  fieldLabel: string
  /** "next" vs "done" — last field of the row uses "done" */
  mode: 'next' | 'done'
  /** allow decimals (weight) — reps/RIR are integers */
  decimal?: boolean
  onClose: () => void
}

/**
 * Bottom-anchored custom keypad. Inputs that mount with this should also set
 * `inputMode="none"` so iOS doesn't show its native keyboard.
 *
 * All button presses use onMouseDown + preventDefault to avoid stealing focus
 * from the field they're editing.
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
    // Sanitize: allow trailing decimal as in-progress entry
    if (next.endsWith('.')) {
      // Keep as-is — number coercion will drop it but we want the user to see it.
      // Store as-is via onChange — caller sees parseFloat
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
        'h-[58px] rounded-xl font-mono font-semibold text-xl text-white',
        'bg-white/8 active:bg-white/16 active:scale-[0.97] transition-all',
        'flex items-center justify-center select-none',
        className
      )}
    >
      {children}
    </button>
  )

  return (
    <div
      className="fixed left-0 right-0 z-40 bg-black/85 backdrop-blur-2xl border-t border-white/12 px-2 pt-2"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[10px] uppercase tracking-wider text-white/55 font-semibold">
          {fieldLabel}
          <span className="ml-2 font-mono text-white text-base normal-case">
            {value ?? '—'}
          </span>
        </span>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
          className="text-xs text-white/55 hover:text-white px-2 py-1"
        >
          Close
        </button>
      </div>

      {/* Quick +/- row for decimal fields (weight). Reps/RIR get +1/-1. */}
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        {decimal ? (
          <>
            <Btn onClick={() => plusMinus(-5)} className="!text-sm">−5</Btn>
            <Btn onClick={() => plusMinus(-2.5)} className="!text-sm">−2.5</Btn>
            <Btn onClick={() => plusMinus(2.5)} className="!text-sm">+2.5</Btn>
            <Btn onClick={() => plusMinus(5)} className="!text-sm">+5</Btn>
          </>
        ) : (
          <>
            <Btn onClick={() => plusMinus(-1)} className="!text-sm">−1</Btn>
            <Btn onClick={() => plusMinus(1)} className="!text-sm">+1</Btn>
            <Btn onClick={() => plusMinus(2)} className="!text-sm">+2</Btn>
            <Btn onClick={() => plusMinus(5)} className="!text-sm">+5</Btn>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
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
          className={!decimal ? 'opacity-30 pointer-events-none' : ''}
          ariaLabel="decimal"
        >
          .
        </Btn>
        <Btn onClick={() => append('0')}>0</Btn>
        <Btn onClick={backspace} ariaLabel="backspace" className="!text-base">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </Btn>
      </div>

      <div className="grid grid-cols-1 gap-1.5 mt-1.5">
        <Btn
          onClick={mode === 'done' ? onDone : onNext}
          className="rainbow-bright-fill text-white shadow-[0_4px_18px_rgba(236,72,153,0.4)] !text-base"
        >
          {mode === 'done' ? '✓ Log set' : 'Next →'}
        </Btn>
      </div>
    </div>
  )
}

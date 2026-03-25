import { describe, expect, it } from 'vitest'
import { toast, toastError, toastInfo, toastSuccess, toastWarning } from './Toast'

describe('Toast helpers', () => {
  it('exports toast from sonner', () => {
    expect(typeof toast).toBe('function')
  })

  it('exports toastSuccess helper', () => {
    expect(typeof toastSuccess).toBe('function')
  })

  it('exports toastError helper', () => {
    expect(typeof toastError).toBe('function')
  })

  it('exports toastWarning helper', () => {
    expect(typeof toastWarning).toBe('function')
  })

  it('exports toastInfo helper', () => {
    expect(typeof toastInfo).toBe('function')
  })
})

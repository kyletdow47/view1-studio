import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockInsert, mockSelect } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
    }),
  }),
}))

import { POST, GET } from './route'

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for missing email', async () => {
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('email')
  })

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makePostRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-string email', async () => {
    const res = await POST(makePostRequest({ email: 42 }))
    expect(res.status).toBe(400)
  })

  it('returns 200 and count for valid email', async () => {
    mockInsert.mockResolvedValue({ error: null })
    mockSelect.mockReturnValue({ count: 42, error: null })

    const res = await POST(makePostRequest({ email: 'test@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json() as { success: boolean; count: number }
    expect(data.success).toBe(true)
    expect(typeof data.count).toBe('number')
  })

  it('normalises email to lowercase before insert', async () => {
    mockInsert.mockResolvedValue({ error: null })
    mockSelect.mockReturnValue({ count: 1, error: null })

    await POST(makePostRequest({ email: 'TEST@EXAMPLE.COM' }))
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    )
  })

  it('returns 409 for duplicate email', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'unique constraint' } })

    const res = await POST(makePostRequest({ email: 'dupe@example.com' }))
    expect(res.status).toBe(409)
    const data = await res.json() as { error: string }
    expect(data.error).toContain('already')
  })

  it('returns 500 on unexpected insert error', async () => {
    mockInsert.mockResolvedValue({ error: { code: '42P01', message: 'table missing' } })

    const res = await POST(makePostRequest({ email: 'test@example.com' }))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns count from database', async () => {
    mockSelect.mockReturnValue({ count: 17, error: null })

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json() as { count: number }
    expect(data.count).toBe(17)
  })

  it('returns 0 when count is null', async () => {
    mockSelect.mockReturnValue({ count: null, error: null })

    const res = await GET()
    const data = await res.json() as { count: number }
    expect(data.count).toBe(0)
  })
})

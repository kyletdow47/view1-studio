import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    // next/navigation redirect throws to interrupt rendering — simulate that
    throw Object.assign(new Error(`NEXT_REDIRECT:${url}`), { digest: `NEXT_REDIRECT;replace;${url};;;` })
  },
}))

// Import after mocks are in place
const { getCurrentUser, requireAuth, getUserWorkspace } = await import('./auth')

describe('getCurrentUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the authenticated user', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const user = await getCurrentUser()
    expect(user).toEqual(mockUser)
  })

  it('returns null when there is an auth error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') })

    const user = await getCurrentUser()
    expect(user).toBeNull()
  })

  it('returns null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const user = await getCurrentUser()
    expect(user).toBeNull()
  })
})

describe('requireAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the user when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const user = await requireAuth()
    expect(user).toEqual(mockUser)
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirects to /auth/login when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/auth/login')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
  })
})

describe('getUserWorkspace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns workspace data for the user', async () => {
    const mockData = {
      workspace_id: 'ws-456',
      role: 'owner',
      workspaces: { id: 'ws-456', name: "Jane's Workspace", slug: 'jane-abc12345' },
    }
    const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const result = await getUserWorkspace('user-123')
    expect(result).toEqual(mockData)
    expect(mockFrom).toHaveBeenCalledWith('workspace_members')
  })

  it('returns null when workspace is not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('No rows') })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const result = await getUserWorkspace('user-999')
    expect(result).toBeNull()
  })
})

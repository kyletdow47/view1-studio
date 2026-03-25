import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock next/navigation ---
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

// --- Mock supabase client ---
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockSignInWithOAuth = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockUpdateUser = vi.fn()
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      signInWithOAuth: mockSignInWithOAuth,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}))

const { useAuth } = await import('./useAuth')

function setupDefaultMocks() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('starts with loading=true and user=null', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets loading=false after getUser resolves', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {})
    expect(result.current.loading).toBe(false)
  })

  it('populates user when getUser returns one', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const { result } = renderHook(() => useAuth())
    await act(async () => {})
    expect(result.current.user).toEqual(mockUser)
  })

  describe('signIn', () => {
    it('calls signInWithPassword and redirects to /dashboard', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null })
      const { result } = renderHook(() => useAuth())
      await act(async () => {
        await result.current.signIn('test@example.com', 'password123')
      })
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
      expect(mockRefresh).toHaveBeenCalled()
    })

    it('throws when signInWithPassword returns an error', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: new Error('Invalid credentials') })
      const { result } = renderHook(() => useAuth())
      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrong')
        })
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('signUp', () => {
    it('calls signUp with email, password, and full_name metadata', async () => {
      mockSignUp.mockResolvedValue({ error: null })
      // jsdom sets window.location.origin to 'http://localhost'
      const { result } = renderHook(() => useAuth())
      await act(async () => {
        await result.current.signUp('new@example.com', 'secure123', 'Jane Smith')
      })
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'secure123',
        options: expect.objectContaining({
          data: { full_name: 'Jane Smith' },
        }),
      })
    })

    it('throws when signUp returns an error', async () => {
      mockSignUp.mockResolvedValue({ error: new Error('Email already taken') })
      const { result } = renderHook(() => useAuth())
      await expect(
        act(async () => {
          await result.current.signUp('existing@example.com', 'pw', 'Bob')
        })
      ).rejects.toThrow('Email already taken')
    })
  })

  describe('signOut', () => {
    it('calls signOut and redirects to /auth/login', async () => {
      mockSignOut.mockResolvedValue({ error: null })
      const { result } = renderHook(() => useAuth())
      await act(async () => {
        await result.current.signOut()
      })
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })

    it('throws when signOut fails', async () => {
      mockSignOut.mockResolvedValue({ error: new Error('Sign out failed') })
      const { result } = renderHook(() => useAuth())
      await expect(
        act(async () => {
          await result.current.signOut()
        })
      ).rejects.toThrow('Sign out failed')
    })
  })

  describe('resetPassword', () => {
    it('calls resetPasswordForEmail with the email and a redirectTo URL', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null })
      const { result } = renderHook(() => useAuth())
      await act(async () => {
        await result.current.resetPassword('user@example.com')
      })
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        })
      )
    })

    it('throws when resetPasswordForEmail fails', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: new Error('User not found') })
      const { result } = renderHook(() => useAuth())
      await expect(
        act(async () => {
          await result.current.resetPassword('nobody@example.com')
        })
      ).rejects.toThrow('User not found')
    })
  })

  describe('updatePassword', () => {
    it('calls updateUser with the new password', async () => {
      mockUpdateUser.mockResolvedValue({ error: null })
      const { result } = renderHook(() => useAuth())
      await act(async () => {
        await result.current.updatePassword('newSecurePass!')
      })
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecurePass!' })
    })
  })
})

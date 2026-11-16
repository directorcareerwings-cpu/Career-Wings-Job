import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  register: (data: Record<string, unknown>) => Promise<void>
  setUser: (user: User) => void
  setAccessToken: (token: string) => void
  initialize: () => Promise<void>
  updateUser: (partial: Partial<User>) => void
}

type AuthStore = AuthState & AuthActions

const formatUserData = (rawUser: any): User => {
  if (!rawUser) return rawUser
  const prof = rawUser.profile || {}
  return {
    ...rawUser,
    firstName: rawUser.firstName || prof.firstName || (rawUser.role === 'ADMIN' ? 'Admin' : (rawUser.email?.split('@')[0] || 'User')),
    lastName: rawUser.lastName || prof.lastName || (rawUser.role === 'ADMIN' ? 'User' : ''),
    avatar: rawUser.avatar || prof.profilePhoto || null,
  }
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await authAPI.login(email.trim().toLowerCase(), password)
          const { user, accessToken } = data.data
          const formatted = formatUserData(user)
          set({
            user: formatted,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
          return formatted
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await authAPI.logout()
        } catch {
          // ignore logout errors
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          })
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const { data: res } = await authAPI.register(data)
          const { user, accessToken } = res.data
          const formatted = formatUserData({
            ...user,
            firstName: data.firstName || user.firstName,
            lastName: data.lastName || user.lastName,
          })
          set({
            user: formatted,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      setUser: (user) => set({ user: formatUserData(user), isAuthenticated: true }),

      setAccessToken: (token) => set({ accessToken: token }),

      updateUser: (partial) => {
        const current = get().user
        if (current) {
          set({ user: formatUserData({ ...current, ...partial }) })
        }
      },

      initialize: async () => {
        const token = get().accessToken
        if (!token) {
          set({ isLoading: false })
          return
        }
        set({ isLoading: true })
        try {
          const { data } = await authAPI.me()
          set({
            user: formatUserData(data.data),
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          // Try refresh
          try {
            const { data } = await authAPI.refreshToken()
            const newUser = data.data?.user ? formatUserData(data.data.user) : get().user
            set({
              accessToken: data.data.accessToken,
              user: newUser,
              isAuthenticated: Boolean(newUser),
              isLoading: false,
            })
          } catch {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isLoading: false,
            })
          }
        }
      },
    }),
    {
      name: 'cw-auth',
      // Only persist user and token (access token in memory is ideal, but for UX we keep it)
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

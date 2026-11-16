import { useAuthStore } from '@/stores/auth.store'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const register = useAuthStore((s) => s.register)
  const setUser = useAuthStore((s) => s.setUser)
  const updateUser = useAuthStore((s) => s.updateUser)

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    isCandidate: user?.role?.toLowerCase() === 'candidate',
    isEmployer: user?.role?.toLowerCase() === 'employer',
    isAdmin: user?.role?.toLowerCase() === 'admin',
    login,
    logout,
    register,
    setUser,
    updateUser,
  }
}

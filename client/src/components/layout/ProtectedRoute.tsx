import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/Spinner'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  role?: UserRole
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingSpinner fullPage text="Verifying session..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && user?.role?.toLowerCase() !== role.toLowerCase()) {
    // Admin has superuser privileges to preview/access candidate and employer pages
    if (user?.role?.toUpperCase() === 'ADMIN') {
      return <>{children}</>
    }

    // Redirect to appropriate dashboard
    const userRole = user?.role?.toLowerCase()
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (userRole === 'employer') return <Navigate to="/employer/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

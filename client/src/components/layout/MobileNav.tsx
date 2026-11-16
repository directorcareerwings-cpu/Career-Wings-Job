import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Briefcase, FileText, User, MoreHorizontal, Plus, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export default function MobileNav() {
  const { isAuthenticated, isCandidate, isEmployer } = useAuth()
  const { pathname } = useLocation()

  if (!isAuthenticated) return null

  const candidateItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/my-applications', icon: FileText, label: 'Applied' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/dashboard', icon: MoreHorizontal, label: 'More' },
  ]

  const employerItems = [
    { to: '/employer/dashboard', icon: Home, label: 'Home' },
    { to: '/employer/jobs/post', icon: Plus, label: 'Post Job' },
    { to: '/employer/jobs', icon: Briefcase, label: 'My Jobs' },
    { to: '/employer/candidates', icon: Users, label: 'Candidates' },
    { to: '/employer/analytics', icon: MoreHorizontal, label: 'More' },
  ]

  const items = isCandidate ? candidateItems : isEmployer ? employerItems : []

  if (items.length === 0) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-bottom">
      <div className="flex items-center justify-around px-2 pt-1 pb-safe">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-0',
                active
                  ? 'text-primary-900'
                  : 'text-gray-400 hover:text-gray-700'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-accent-500')} />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

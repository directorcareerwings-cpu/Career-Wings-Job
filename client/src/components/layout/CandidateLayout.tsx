import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  FileText,
  Bookmark,
  Bell,
  CreditCard,
  Settings,
  LogOut,
  BriefcaseIcon,
  Package,
  MessageSquare,
  Wrench,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/profile/resume', icon: FileText, label: 'AI Resume Builder', badge: 'AI' },
  { to: '/my-applications', icon: BriefcaseIcon, label: 'Applications' },
  { to: '/saved-jobs', icon: Bookmark, label: 'Saved Jobs' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/career-tools', icon: Wrench, label: 'Career Tools', badge: 'NEW' },
  { to: '/job-alerts', icon: Bell, label: 'Job Alerts' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/subscription', icon: Package, label: 'My Package' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Mobile Horizontal Pill Navigation Bar (md:hidden) */}
        <div className="md:hidden overflow-x-auto no-scrollbar -mx-4 px-4 pb-3 mb-4 flex items-center gap-2">
          {navItems.map(({ to, icon: Icon, label, badge }) => {
            const isActive =
              pathname === to ||
              (to !== '/dashboard' && to !== '/profile' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-2xs',
                  isActive
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                {badge && (
                  <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-20">
              {/* Profile mini */}
              <div className="p-4 bg-gradient-to-br from-primary-900 to-primary-700 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-400 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-white/20">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <>{user?.firstName?.[0] || 'C'}{user?.lastName?.[0] || ''}</>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.firstName || 'Candidate'} {user?.lastName || ''}</p>
                    <p className="text-xs text-primary-200 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              <nav className="py-2">
                {navItems.map(({ to, icon: Icon, label, badge }) => (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                      // Exact match for /profile to avoid highlighting when on /profile/resume
                      pathname === to ||
                      (to !== '/dashboard' && to !== '/profile' && pathname.startsWith(to))
                        ? 'bg-primary-50 text-primary-900 border-r-2 border-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                    {badge && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-2xs">
                        {badge}
                      </span>
                    )}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-1 border-t border-gray-100"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </nav>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <Footer />
    </div>
  )
}

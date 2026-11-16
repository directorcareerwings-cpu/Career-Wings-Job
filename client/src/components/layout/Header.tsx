import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  Bell,
  Menu,
  X,
  ChevronDown,
  Briefcase,
  User,
  LogOut,
  BookmarkCheck,
  BarChart3,
  Building2,
  Settings,
  Plus,
  Shield,
  Package,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useQuery } from '@tanstack/react-query'
import { candidateAPI, publicAPI } from '@/lib/api'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import toast from 'react-hot-toast'

// ─── Logo ──────────────────────────────────────────────────────────────────────

function Logo() {
  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => publicAPI.getSettings(),
  })
  const settings = settingsData?.data?.data
  const logoUrl = settings?.SITE_LOGO_URL || '/images/logo.png'
  const isCustomLogo = Boolean(settings?.SITE_LOGO_URL && settings.SITE_LOGO_URL !== '/images/logo.png')
  const showText = settings?.SHOW_LOGO_TEXT !== 'false'

  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
      <img
        src={logoUrl}
        alt={settings?.SITE_NAME || 'Career Wings'}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/images/logo.png'
        }}
        className={cn(
          'object-contain transition-transform group-hover:scale-105',
          isCustomLogo ? 'h-10 w-auto max-w-[180px] sm:max-w-[220px]' : 'h-9 w-9 rounded-xl shadow-xs'
        )}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display font-extrabold text-xl text-primary-900 tracking-tight">
            CAREER <span className="text-[#E53935]">WINGS</span>
          </span>
          <span className="text-[9px] font-semibold tracking-wider text-gray-400 uppercase hidden sm:block mt-0.5">
            {settings?.TAGLINE || 'Jobs Today • A Brighter Tomorrow'}
          </span>
        </div>
      )}
    </Link>
  )
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavItem({ to, children, end }: { to: string; children: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'text-sm font-medium transition-colors hover:text-gray-900',
          isActive
            ? 'text-blue-600 font-semibold'
            : 'text-gray-600'
        )
      }
    >
      {children}
    </NavLink>
  )
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function UserDropdown() {
  const { user, logout, isCandidate, isEmployer, isAdmin } = useAuth()
  const navigate = useNavigate()

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => candidateAPI.getNotifications({ unread: true }),
    enabled: !!user && isCandidate,
    refetchInterval: 60000,
  })
  const unreadCount =
    typeof notifData?.data?.data?.unreadCount === 'number'
      ? notifData.data.data.unreadCount
      : Array.isArray(notifData?.data?.data?.notifications)
      ? notifData.data.data.notifications.filter((n: { isRead: boolean }) => !n.isRead).length
      : Array.isArray(notifData?.data?.data)
      ? notifData.data.data.filter((n: { isRead: boolean }) => !n.isRead).length
      : 0

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="flex items-center gap-2">
      {/* Notification Bell */}
      <Link
        to={isEmployer ? '/employer/settings' : '/notifications'}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      {/* User dropdown */}
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button className="flex items-center gap-2 rounded-xl hover:bg-gray-100 p-1.5 transition-colors">
            <Avatar
              src={user.avatar}
              name={`${user.firstName} ${user.lastName}`}
              size="sm"
            />
            <span className="hidden md:block text-sm font-medium text-gray-700">
              {user.firstName}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-[200px] bg-white rounded-xl shadow-lg border border-gray-100 py-1 animate-fade-in"
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>

            {isCandidate && (
              <>
                <DropdownItem to="/dashboard" icon={<Briefcase className="h-4 w-4" />}>
                  Dashboard
                </DropdownItem>
                <DropdownItem to="/profile" icon={<User className="h-4 w-4" />}>
                  My Profile
                </DropdownItem>
                <DropdownItem to="/my-applications" icon={<BookmarkCheck className="h-4 w-4" />}>
                  Applications
                </DropdownItem>
                <DropdownItem to="/subscription" icon={<Package className="h-4 w-4" />}>
                  Packages
                </DropdownItem>
              </>
            )}

            {isEmployer && (
              <>
                <DropdownItem to="/employer/dashboard" icon={<BarChart3 className="h-4 w-4" />}>
                  Dashboard
                </DropdownItem>
                <DropdownItem to="/employer/company" icon={<Building2 className="h-4 w-4" />}>
                  Company Profile
                </DropdownItem>
                <DropdownItem to="/employer/jobs" icon={<Briefcase className="h-4 w-4" />}>
                  Manage Jobs
                </DropdownItem>
                <DropdownItem to="/employer/analytics" icon={<BarChart3 className="h-4 w-4" />}>
                  Analytics
                </DropdownItem>
                <DropdownItem to="/employer/subscription" icon={<Package className="h-4 w-4" />}>
                  Packages
                </DropdownItem>
              </>
            )}

            {isAdmin && (
              <>
                <DropdownItem to="/admin/dashboard" icon={<Shield className="h-4 w-4" />}>
                  Admin Panel
                </DropdownItem>
                <DropdownItem to="/dashboard" icon={<Briefcase className="h-4 w-4" />}>
                  Candidate Dashboard
                </DropdownItem>
                <DropdownItem to="/employer/dashboard" icon={<Building2 className="h-4 w-4" />}>
                  Employer Dashboard
                </DropdownItem>
              </>
            )}

            <DropdownItem
              to={isEmployer ? '/employer/settings' : '/settings'}
              icon={<Settings className="h-4 w-4" />}
            >
              Settings
            </DropdownItem>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  )
}

function DropdownItem({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <DropdownMenuPrimitive.Item asChild>
      <Link
        to={to}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors outline-none"
      >
        <span className="text-gray-400">{icon}</span>
        {children}
      </Link>
    </DropdownMenuPrimitive.Item>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

export default function Header() {
  const { isAuthenticated, isCandidate, isEmployer, isAdmin } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full bg-white transition-shadow duration-200',
        isScrolled && 'shadow-sm border-b border-gray-100'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-7">
            <NavItem to="/" end>Home</NavItem>
            <NavItem to="/jobs">Jobs</NavItem>
            <NavItem to="/companies">Companies</NavItem>
            <NavItem to="/pricing">Pricing</NavItem>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                {isEmployer && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700"
                    onClick={() => (window.location.href = '/employer/jobs/post')}
                  >
                    Post Job
                  </Button>
                )}
                {isAdmin && (
                  <Link to="/admin/dashboard">
                    <Button variant="secondary" size="sm" leftIcon={<Shield className="h-4 w-4" />}>
                      Admin
                    </Button>
                  </Link>
                )}
                <UserDropdown />
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#c22d25] hover:bg-[#a8241d] rounded-lg shadow-xs hover:shadow transition cursor-pointer"
                >
                  Register Free
                </Link>
              </div>
            )}

            {/* Dark mode moon toggle */}
            <button
              type="button"
              onClick={() => toast('Dark mode preference saved!')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Toggle dark mode"
            >
              <Moon className="w-4 h-4" />
            </button>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 animate-slide-up">
          {[
            { to: '/', label: 'Home' },
            { to: '/jobs', label: 'Jobs' },
            { to: '/companies', label: 'Companies' },
            { to: '/pricing', label: 'Pricing' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {label}
            </Link>
          ))}
          {isAuthenticated && (
            <div className="pt-3 border-t border-gray-100 mt-2 space-y-1">
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isCandidate ? 'Job Seeker Portal' : isEmployer ? 'Employer Portal' : 'Admin Panel'}
              </p>
              {isCandidate && (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg">
                    📊 Candidate Dashboard
                  </Link>
                  <Link to="/career-tools" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-[#BA1A1A] hover:bg-red-50 rounded-lg">
                    ✨ Career Tools (10 Tools)
                  </Link>
                  <Link to="/my-applications" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg">
                    📑 My Applications
                  </Link>
                  <Link to="/messages" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg">
                    💬 Messages & Chat
                  </Link>
                </>
              )}
              {isEmployer && (
                <>
                  <Link to="/employer/candidates" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-[#BA1A1A] hover:bg-red-50 rounded-lg">
                    🔍 Search Resumes & Candidates
                  </Link>
                  <Link to="/employer/jobs" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg">
                    💼 My Job Listings
                  </Link>
                  <Link to="/employer/jobs/post" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg">
                    ➕ Post New Vacancy
                  </Link>
                  <Link to="/employer/ats" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg">
                    👥 ATS Applicants
                  </Link>
                  <Link to="/employer/chat" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-lg">
                    💬 Networking Chat
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link to="/admin/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 rounded-lg">
                  🛡️ Admin Console
                </Link>
              )}
            </div>
          )}

          {!isAuthenticated && (
            <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 mt-3">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="md" className="w-full">Log In</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" size="md" className="w-full bg-[#c22d25] hover:bg-[#a8241d] text-white">Register Free</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

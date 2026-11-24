import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileText,
  Package,
  CreditCard,
  Tag,
  MapPin,
  Zap,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Layers,
  Globe,
  Sparkles,
  Image as ImageIcon,
  Mail,
  BookOpen,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { publicAPI } from '@/lib/api'

interface NavSection {
  label: string
  items: { to: string; icon: React.ElementType; label: string }[]
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'Users',
    items: [
      { to: '/admin/candidates', icon: Users, label: 'Candidates' },
      { to: '/admin/smart-import', icon: Sparkles, label: 'AI Database Import' },
      { to: '/admin/employers', icon: Building2, label: 'Employers' },
      { to: '/admin/applications', icon: FileText, label: 'Applications' },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/companies', icon: Building2, label: 'Companies' },
      { to: '/admin/jobs', icon: Briefcase, label: 'Jobs' },
      { to: '/admin/blog', icon: BookOpen, label: 'Blog & Articles' },
      { to: '/admin/categories', icon: Layers, label: 'Categories' },
      { to: '/admin/locations', icon: MapPin, label: 'Locations' },
      { to: '/admin/skills', icon: Zap, label: 'Skills' },
      { to: '/admin/education', icon: GraduationCap, label: 'Education & Degrees' },
      { to: '/admin/cool-places', icon: Sparkles, label: 'Cool Places to Work' },
    ],
  },
  {
    label: 'Monetization',
    items: [
      { to: '/admin/packages', icon: Package, label: 'Packages' },
      { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
      { to: '/admin/coupons', icon: Tag, label: 'Coupons' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/seo', icon: Globe, label: 'SEO & Google Indexing' },
      { to: '/admin/emails', icon: Mail, label: 'Email & Notifications' },
      { to: '/admin/notifications', icon: Bell, label: 'In-App Broadcasts' },
      { to: '/admin/cms', icon: ImageIcon, label: 'Hero Banner & CMS' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => publicAPI.getSettings(),
  })
  const settings = settingsData?.data?.data
  const logoUrl = settings?.SITE_LOGO_URL

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const isActive = (to: string) =>
    pathname === to || (to !== '/admin/dashboard' && pathname.startsWith(to))

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-primary-900 text-white shrink-0 min-h-screen sticky top-0 max-h-screen overflow-y-auto">
        {/* Logo */}
        <div className="p-4 border-b border-primary-800">
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Career Wings"
                className="h-8 w-auto max-w-[150px] object-contain"
              />
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="#F97316" />
                  <path d="M7 22 C7 22, 11 11, 16 13 C21 15, 25 7, 25 7 C25 7, 23 17, 18 19 C13 21, 11 26, 11 26 Z" fill="white" />
                </svg>
                <span className="font-display font-bold text-lg">
                  Career<span className="text-accent-400">Wings</span>
                </span>
              </>
            )}
          </Link>
          <p className="text-xs text-primary-300 mt-1">Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navSections.map(({ label, items }) => (
            <div key={label} className="mb-4">
              <p className="px-4 mb-1 text-xs font-semibold uppercase tracking-wider text-primary-400">
                {label}
              </p>
              {items.map(({ to, icon: Icon, label: itemLabel }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive(to)
                      ? 'bg-primary-800 text-white border-r-2 border-accent-500'
                      : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {itemLabel}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-primary-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-accent-500 flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-primary-300">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-sm text-primary-300 hover:text-white transition-colors py-1.5"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-primary-900 text-white">
          <Link to="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#F97316" />
              <path d="M7 22 C7 22, 11 11, 16 13 C21 15, 25 7, 25 7 C25 7, 23 17, 18 19 C13 21, 11 26, 11 26 Z" fill="white" />
            </svg>
            <span className="font-display font-bold">CareerWings Admin</span>
          </Link>
          <button onClick={handleLogout} className="text-primary-200">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Search,
  Users,
  Building2,
  Plus,
  Package,
  Receipt,
  MessageSquare,
  ChevronRight,
  LogOut,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { employerAPI, chatAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Header from './Header'
import Footer from './Footer'

interface EmployerNavItem {
  to: string
  icon: React.ElementType
  label: string
  countKey?: 'myListings' | 'searchResumes' | 'atsApplicants' | 'unreadChat'
  isPostJob?: boolean
}

const employerNavItems: EmployerNavItem[] = [
  { to: '/employer/jobs', icon: Briefcase, label: 'My Listings', countKey: 'myListings' },
  { to: '/employer/candidates', icon: Search, label: 'Search Resumes', countKey: 'searchResumes' },
  { to: '/employer/ats', icon: Users, label: 'ATS Applicants', countKey: 'atsApplicants' },
  { to: '/employer/company', icon: Building2, label: 'Company' },
  { to: '/employer/jobs/post', icon: Plus, label: '+ Post Job', isPostJob: true },
  { to: '/employer/subscription', icon: Package, label: 'My Package' },
  { to: '/employer/payments', icon: Receipt, label: 'Billing' },
  { to: '/employer/chat', icon: MessageSquare, label: 'Networking Chat', countKey: 'unreadChat' },
]

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [counts, setCounts] = useState<{
    myListings?: number
    searchResumes?: number
    atsApplicants?: number
    unreadChat?: number
  }>({})
  const [isEmployerApproved, setIsEmployerApproved] = useState<boolean | null>(
    user?.isEmployerApproved !== undefined ? user.isEmployerApproved : null
  )

  useEffect(() => {
    const fetchCounts = () => {
      employerAPI
        .getEmployerCounts()
        .then((res) => {
          if (res.data?.data) {
            setCounts((prev) => ({ ...prev, ...res.data.data }))
          }
        })
        .catch((err) => {
          console.error('Failed to load employer counts', err)
        })

      chatAPI
        .getConversations()
        .then((res) => {
          if (Array.isArray(res.data?.data)) {
            const totalUnread = res.data.data.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
            setCounts((prev) => ({ ...prev, unreadChat: totalUnread > 0 ? totalUnread : undefined }))
          }
        })
        .catch(() => null)
    }

    fetchCounts()

    employerAPI
      .getCompany()
      .then((res) => {
        if (res.data?.data) {
          setIsEmployerApproved(Boolean(res.data.data.isVerified))
        }
      })
      .catch(() => null)

    window.addEventListener('employer-counts-changed', fetchCounts)
    return () => {
      window.removeEventListener('employer-counts-changed', fetchCounts)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile Horizontal Pill Navigation Bar (lg:hidden) */}
        <div className="lg:hidden overflow-x-auto no-scrollbar -mx-4 px-4 pb-3 mb-4 flex items-center gap-2">
          {employerNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.to || (item.to !== '/employer/jobs' && item.to !== '/employer/ats' && pathname.startsWith(item.to))
            const badgeValue = item.countKey !== undefined ? counts[item.countKey] : undefined

            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-2xs',
                  item.isPostJob
                    ? 'bg-[#E53935] text-white hover:bg-[#D32F2F]'
                    : isActive
                    ? 'bg-[#BA1A1A] text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {badgeValue !== undefined && badgeValue > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                      isActive ? 'bg-white text-[#BA1A1A]' : 'bg-red-50 text-red-600'
                    )}
                  >
                    {badgeValue}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Desktop Sidebar (hidden on mobile, visible on lg) */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs sticky top-24">
              <div className="flex items-center justify-between px-3 py-2.5 mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Employer Portal Menu
                </span>
                <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                  8 Tabs
                </span>
              </div>

              <nav className="space-y-1">
                {employerNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.to || (item.to !== '/employer/jobs' && item.to !== '/employer/ats' && pathname.startsWith(item.to))

                  if (item.isPostJob) {
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        className={cn(
                          'flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs',
                          isActive
                            ? 'bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-red-500/20'
                            : 'bg-red-50 hover:bg-red-100/80 text-[#E53935]'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>Post Job</span>
                        </div>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )
                  }

                  const badgeValue =
                    item.countKey !== undefined
                      ? counts[item.countKey] !== undefined
                        ? counts[item.countKey]
                        : undefined
                      : undefined

                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-2xs',
                        isActive
                          ? 'bg-[#c9252c] text-white font-semibold shadow-red-600/10'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                        <span>{item.label}</span>
                      </div>
                      {badgeValue !== undefined && (
                        <span
                          className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            isActive
                              ? 'bg-white text-[#c9252c]'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {badgeValue}
                        </span>
                      )}
                    </Link>
                  )
                })}

                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 w-full">
            {isEmployerApproved === false && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 shadow-xs animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Recruiter Account Pending Admin Approval
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Your recruiter profile and company are currently under review by our Admin team. You will be able to post vacancies and publish jobs as soon as your account is approved.
                  </p>
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  )
}

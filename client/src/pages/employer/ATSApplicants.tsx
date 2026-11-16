import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Check,
  X,
  Phone,
  MessageCircle,
  MessageSquare,
  Mail,
  Download,
  Search,
  Sparkles,
  GraduationCap,
  Languages,
  Briefcase,
  MapPin,
  IndianRupee,
  User,
  Users,
  Trash2,
  Star,
  ChevronDown,
  FileSpreadsheet,
  Eye,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowUpDown,
  UserCheck,
  UserX,
  CalendarCheck,
  Trophy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CandidateDetail {
  id: string
  firstName: string
  lastName: string
  phone?: string | null
  email?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  headline?: string | null
  summary?: string | null
  currentLocation?: string | null
  totalExperience?: number | null
  currentRole?: string | null
  currentCompany?: string | null
  educationLevel?: string | null
  highestDegree?: string | null
  college?: string | null
  expectedSalaryMin?: number | null
  expectedSalaryMax?: number | null
  resumeFile?: string | null
  resumeFileName?: string | null
  profilePhoto?: string | null
  candidateSkills?: { skill: { name: string } }[]
}

interface MatchingCriteria {
  skills: boolean
  education: boolean
  location: boolean
  experience: boolean
  salary?: boolean
}

interface ApplicationItem {
  id: string
  candidateId: string
  jobId: string
  status: 'APPLIED' | 'VIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'SELECTED' | 'REJECTED'
  appliedAt: string
  viewedAt?: string | null
  candidate: CandidateDetail
  job: { id: string; title: string; slug: string; status: string; jobType: string; workMode: string; city: string; state: string }
  matchPercentage?: number
  isHighMatch?: boolean
  matchingCriteria?: MatchingCriteria
}

type StatusTab = 'ALL' | 'APPLIED' | 'VIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'SELECTED' | 'REJECTED'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatDisplayPhone = (raw?: string | null) => {
  if (!raw) return '+91 XXXXX XXXXX'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  if (digits.length === 12 && digits.startsWith('91'))
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  return raw.startsWith('+') ? raw : `+91 ${raw}`
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  APPLIED: { label: 'Applied', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock },
  VIEWED: { label: 'Viewed', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Eye },
  SHORTLISTED: { label: 'Shortlisted', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  INTERVIEW: { label: 'Interview', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: CalendarCheck },
  SELECTED: { label: 'Selected', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: Trophy },
  REJECTED: { label: 'Rejected', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: XCircle },
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ATSApplicants() {
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'matching' | 'experience' | 'package'>('recent')
  const [jobsList, setJobsList] = useState<{ id: string; title: string }[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    all: 0, applied: 0, viewed: 0, shortlisted: 0, interview: 0, selected: 0, rejected: 0,
  })

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modals
  const [selectedCandidateModal, setSelectedCandidateModal] = useState<CandidateDetail | null>(null)
  const [smsModalCandidate, setSmsModalCandidate] = useState<{ candidate: CandidateDetail; jobTitle: string } | null>(null)
  const [smsMessage, setSmsMessage] = useState('')

  // Phone reveals
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({})

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchApplicants = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 100 }
      if (activeTab !== 'ALL') params.status = activeTab
      if (selectedJobId) params.jobId = selectedJobId
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim()
      params.sortBy = sortBy

      const res = await employerAPI.getAllApplicants(params)
      const data = res.data?.data || []
      setApplications(data)

      if (res.data?.meta?.statusCounts) {
        setStatusCounts(res.data.meta.statusCounts)
      }
      if (res.data?.meta?.jobs) {
        setJobsList(res.data.meta.jobs)
      }
    } catch (err) {
      console.error('Failed to load applicants:', err)
      toast.error('Failed to load applicants')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplicants()
  }, [activeTab, selectedJobId, sortBy])

  // Debounce keyword search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApplicants()
    }, 400)
    return () => clearTimeout(timer)
  }, [searchKeyword])

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleUpdateStatus = async (app: ApplicationItem, newStatus: 'SHORTLISTED' | 'REJECTED' | 'VIEWED' | 'INTERVIEW' | 'SELECTED') => {
    try {
      await employerAPI.updateApplicationStatus(app.jobId, app.id, { status: newStatus })
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: newStatus } : a))
      )
      // Update counts
      setStatusCounts((prev) => {
        const oldStatus = app.status.toLowerCase()
        const newSt = newStatus.toLowerCase()
        return {
          ...prev,
          [oldStatus]: Math.max(0, (prev[oldStatus] || 0) - 1),
          [newSt]: (prev[newSt] || 0) + 1,
        }
      })
      window.dispatchEvent(new CustomEvent('employer-counts-changed'))
      const labels: Record<string, string> = {
        SHORTLISTED: 'Candidate Shortlisted!',
        REJECTED: 'Candidate Rejected',
        VIEWED: 'Marked as Viewed',
        INTERVIEW: 'Interview Scheduled',
        SELECTED: 'Candidate Selected!',
      }
      toast.success(labels[newStatus] || 'Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleRevealPhone = async (app: ApplicationItem) => {
    setRevealedPhones((prev) => ({ ...prev, [app.id]: true }))
    try {
      await employerAPI.updateApplicationStatus(app.jobId, app.id, { status: 'VIEWED' })
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'VIEWED' } : a))
      )
    } catch {
      // Still keep the reveal in UI
    }
    toast.success('Phone number revealed!')
  }

  // Export CSV
  const handleDownloadCSV = () => {
    if (applications.length === 0) {
      toast.error('No applicants to export')
      return
    }
    const headers = ['Candidate', 'Phone', 'Email', 'Job Title', 'Status', 'Experience', 'Location', 'Applied']
    const rows = applications.map((app) => [
      `"${app.candidate.firstName} ${app.candidate.lastName}"`,
      `"${app.candidate.phone || 'N/A'}"`,
      `"${(app.candidate as any).user?.email || app.candidate.email || 'N/A'}"`,
      `"${app.job?.title || 'N/A'}"`,
      `"${app.status}"`,
      `"${app.candidate.totalExperience || 0} yrs"`,
      `"${app.candidate.currentLocation || 'N/A'}"`,
      `"${new Date(app.appliedAt).toLocaleDateString()}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ATS_Applicants_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!')
  }

  // Bulk actions
  const handleBulkAction = async (action: 'SHORTLISTED' | 'REJECTED') => {
    if (selectedIds.length === 0) {
      toast.error('Select applicants first')
      return
    }
    let successCount = 0
    for (const appId of selectedIds) {
      const app = applications.find((a) => a.id === appId)
      if (!app) continue
      try {
        await employerAPI.updateApplicationStatus(app.jobId, app.id, { status: action })
        successCount++
      } catch {
        // continue
      }
    }
    if (successCount > 0) {
      setApplications((prev) =>
        prev.map((a) => (selectedIds.includes(a.id) ? { ...a, status: action } : a))
      )
      toast.success(`${successCount} applicant(s) ${action === 'SHORTLISTED' ? 'shortlisted' : 'rejected'}`)
      setSelectedIds([])
      window.dispatchEvent(new CustomEvent('employer-counts-changed'))
      fetchApplicants() // refresh counts
    }
  }

  // Select
  const toggleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(applications.map((a) => a.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // ─── Status Tabs Config ────────────────────────────────────────────────────

  const tabs: { key: StatusTab; label: string; count: number; icon: React.ElementType; color: string; activeColor: string }[] = [
    { key: 'ALL', label: 'All', count: statusCounts.all || 0, icon: Users, color: 'text-slate-600', activeColor: 'bg-slate-800 text-white' },
    { key: 'APPLIED', label: 'Applied', count: statusCounts.applied || 0, icon: Clock, color: 'text-blue-600', activeColor: 'bg-blue-600 text-white' },
    { key: 'VIEWED', label: 'Viewed', count: statusCounts.viewed || 0, icon: Eye, color: 'text-amber-600', activeColor: 'bg-amber-500 text-white' },
    { key: 'SHORTLISTED', label: 'Shortlisted', count: statusCounts.shortlisted || 0, icon: CheckCircle2, color: 'text-emerald-600', activeColor: 'bg-emerald-600 text-white' },
    { key: 'INTERVIEW', label: 'Interview', count: statusCounts.interview || 0, icon: CalendarCheck, color: 'text-purple-600', activeColor: 'bg-purple-600 text-white' },
    { key: 'SELECTED', label: 'Selected', count: statusCounts.selected || 0, icon: Trophy, color: 'text-green-600', activeColor: 'bg-green-600 text-white' },
    { key: 'REJECTED', label: 'Rejected', count: statusCounts.rejected || 0, icon: XCircle, color: 'text-rose-600', activeColor: 'bg-rose-600 text-white' },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <EmployerLayout>
      <SEOMeta title="ATS — Applicant Tracking | Career Wings" />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Users className="w-5 h-5" />
              </div>
              ATS — Applicant Tracking
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage all applicants across your job postings. Track status, shortlist, and hire.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Status Pipeline Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key)
                    setSelectedIds([])
                  }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all',
                    isActive
                      ? tab.activeColor + ' shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[11px] font-bold',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 text-slate-600'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search, Filter, Sort Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full sm:max-w-xs">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search by name, skills, location..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            {/* Job Filter */}
            <div className="relative">
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value)
                  setSelectedIds([])
                }}
                className="pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[180px]"
              >
                <option value="">All Jobs</option>
                {jobsList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[180px]"
              >
                <option value="recent">Most Recent First</option>
                <option value="matching">Best Match First</option>
                <option value="experience">Experience ↓</option>
                <option value="package">Salary ↓</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Bulk Actions & Select All */}
          {applications.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applications.length > 0 && selectedIds.length === applications.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-semibold">Select All ({applications.length})</span>
                </label>
                {selectedIds.length > 0 && (
                  <span className="text-indigo-600 font-bold">{selectedIds.length} selected</span>
                )}
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkAction('SHORTLISTED')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Bulk Shortlist
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction('REJECTED')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow-sm"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Bulk Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Applicants List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-44" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-slate-800">No Applicants Found</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {activeTab !== 'ALL'
                ? `No applicants with "${activeTab}" status found. Try switching tabs or clearing filters.`
                : 'No candidates have applied to your jobs yet. Once applications arrive, they will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const isSelected = selectedIds.includes(app.id)
              const candidate = app.candidate
              const isPhoneRevealed = revealedPhones[app.id] || app.status !== 'APPLIED'
              const initials = `${candidate.firstName?.[0] || 'C'}${candidate.lastName?.[0] || 'W'}`
              const stCfg = statusConfig[app.status] || statusConfig.APPLIED
              const StIcon = stCfg.icon

              return (
                <div
                  key={app.id}
                  className={cn(
                    'bg-white rounded-2xl border p-5 shadow-xs transition-all hover:shadow-sm',
                    isSelected
                      ? 'border-indigo-400 ring-1 ring-indigo-400/30'
                      : 'border-slate-200/90 hover:border-slate-300'
                  )}
                >
                  {/* Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(app.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
                      />

                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 text-base">
                            {candidate.firstName} {candidate.lastName}
                          </h3>

                          {/* Status Badge */}
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border',
                            stCfg.bg, stCfg.color, stCfg.border
                          )}>
                            <StIcon className="w-3 h-3" />
                            {stCfg.label}
                          </span>

                          {/* High Match Badge */}
                          {app.isHighMatch && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Sparkles className="w-3 h-3 text-purple-600 fill-purple-300" />
                              HIGH MATCH {app.matchPercentage ? `${app.matchPercentage}%` : ''}
                            </span>
                          )}
                        </div>

                        {/* Candidate Info Pills */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {candidate.headline && (
                            <>
                              <span className="text-slate-700 font-medium truncate max-w-[200px]">{candidate.headline}</span>
                              <span>•</span>
                            </>
                          )}
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            {candidate.totalExperience || 0} yrs
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                            ₹{candidate.expectedSalaryMin ? candidate.expectedSalaryMin.toLocaleString('en-IN') : '—'} - ₹{candidate.expectedSalaryMax ? candidate.expectedSalaryMax.toLocaleString('en-IN') : '—'}/mo
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {candidate.currentLocation || 'Not specified'}
                          </span>
                        </div>

                        {/* Job Tag */}
                        <div className="mt-2">
                          <Link
                            to={`/employer/jobs/${app.job?.id}/applicants`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/70 text-[11px] font-semibold hover:bg-indigo-100 transition"
                          >
                            <Briefcase className="w-3 h-3" />
                            {app.job?.title || 'Job'}
                          </Link>
                          <span className="text-[11px] text-slate-400 ml-2">
                            Applied {new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Matching criteria */}
                        {app.matchingCriteria && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                            <span className="font-bold text-slate-600 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Match:
                            </span>
                            {(['skills', 'education', 'location', 'experience'] as const).map((key) => (
                              <span
                                key={key}
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border',
                                  app.matchingCriteria?.[key]
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200/60'
                                )}
                              >
                                {app.matchingCriteria?.[key] && <Check className="w-2.5 h-2.5" />}
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                              </span>
                            ))}
                            {!app.isHighMatch && app.matchPercentage != null && (
                              <span className="text-slate-500 font-medium ml-1">
                                {app.matchPercentage}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 mt-3.5 border-t border-slate-100">
                    {/* Left: Phone / WhatsApp / SMS */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isPhoneRevealed ? (
                        <a
                          href={`tel:${candidate.phone || ''}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {formatDisplayPhone(candidate.phone)}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevealPhone(app)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          View Number
                        </button>
                      )}

                      <a
                        href={`https://wa.me/91${(candidate.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hello ${candidate.firstName}, we reviewed your application for "${app.job?.title || 'Job'}" at Career Wings.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>

                      <Link
                        to={`/employer/chat?candidateId=${candidate.id}&jobId=${app.jobId}`}
                        className="w-9 h-9 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-[#E53935] flex items-center justify-center transition"
                        title="Chat in Networking Portal"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setSmsModalCandidate({ candidate, jobTitle: app.job?.title || 'Job' })
                          setSmsMessage(`Hello ${candidate.firstName}, we reviewed your application for "${app.job?.title || 'Job'}" and would like to invite you for an interview.`)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        SMS
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCandidateModal(candidate)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Profile
                      </button>
                    </div>

                    {/* Right: Status Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      {app.status !== 'INTERVIEW' && app.status !== 'SELECTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app, 'INTERVIEW')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold transition"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          Interview
                        </button>
                      )}
                      {app.status !== 'SHORTLISTED' && app.status !== 'SELECTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app, 'SHORTLISTED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Shortlist
                        </button>
                      )}
                      {app.status !== 'SELECTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app, 'SELECTED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-green-600 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold transition"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          Select
                        </button>
                      )}
                      {app.status !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app, 'REJECTED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── CANDIDATE DETAIL MODAL ──────────────────────────────────────────── */}
      {selectedCandidateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedCandidateModal(null)}
              className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
                {selectedCandidateModal.firstName?.[0]}
                {selectedCandidateModal.lastName?.[0]}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCandidateModal.firstName} {selectedCandidateModal.lastName}
                </h3>
                <p className="text-xs text-slate-500">{selectedCandidateModal.headline}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCandidateModal.currentLocation} • {selectedCandidateModal.totalExperience || 0} yrs Experience
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <span className="font-bold text-slate-900 block mb-1">About / Summary:</span>
                <p className="bg-slate-50 p-3 rounded-xl leading-relaxed text-slate-600">
                  {selectedCandidateModal.summary || 'Professional candidate registered on Career Wings portal.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Highest Degree:</span>
                  <p>{selectedCandidateModal.highestDegree || selectedCandidateModal.educationLevel || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Expected Salary:</span>
                  <p>₹{selectedCandidateModal.expectedSalaryMin?.toLocaleString('en-IN') || '—'} - ₹{selectedCandidateModal.expectedSalaryMax?.toLocaleString('en-IN') || '—'}/mo</p>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1.5">Key Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCandidateModal.candidateSkills && selectedCandidateModal.candidateSkills.length > 0 ? (
                    selectedCandidateModal.candidateSkills.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium text-slate-700">
                        {s.skill.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">No skills listed</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`tel:${selectedCandidateModal.phone || ''}`}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2"
              >
                <Phone className="w-3.5 h-3.5" /> Call Candidate
              </a>
              <button
                type="button"
                onClick={() => setSelectedCandidateModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SMS MODAL ───────────────────────────────────────────────────────── */}
      {smsModalCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSmsModalCandidate(null)}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900">Send System SMS</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                To: {smsModalCandidate.candidate.firstName} {smsModalCandidate.candidate.lastName}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Quick Template:</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSmsMessage(`Hello ${smsModalCandidate.candidate.firstName}, you have been invited for an interview for "${smsModalCandidate.jobTitle}". Please check your email for details.`)
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                >
                  Interview Invite
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSmsMessage(`Congratulations ${smsModalCandidate.candidate.firstName}! You have been shortlisted for "${smsModalCandidate.jobTitle}" by our hiring team.`)
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                >
                  Shortlisted
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSmsMessage(`Hello ${smsModalCandidate.candidate.firstName}, congratulations! You have been selected for "${smsModalCandidate.jobTitle}". We will contact you with the joining details soon.`)
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                >
                  Selected
                </button>
              </div>

              <textarea
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSmsModalCandidate(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success(`SMS sent to ${smsModalCandidate.candidate.firstName}!`)
                  setSmsModalCandidate(null)
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" /> Send SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </EmployerLayout>
  )
}

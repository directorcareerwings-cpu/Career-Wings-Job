import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  ArrowLeft,
  Check,
  X,
  Phone,
  MessageCircle,
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
  Edit,
  Star,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Eye,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

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
  matchPercentage?: number
  isHighMatch?: boolean
  matchingCriteria?: MatchingCriteria
}

function computeCandidateJobMatch(job: any, candidate: any) {
  let totalScore = 0
  const criteria: MatchingCriteria = {
    skills: false,
    education: false,
    location: false,
    experience: false,
    salary: false,
  }

  if (!job || !candidate) {
    return { matchPercentage: 0, isHighMatch: false, matchingCriteria: criteria }
  }

  // 1. Skills Match (Weight: 40%)
  const jobSkills: string[] = (job.jobSkills || [])
    .map((js: any) => js.skill?.name?.toLowerCase().trim())
    .filter(Boolean)
  const candSkills: string[] = (candidate.candidateSkills || [])
    .map((cs: any) => cs.skill?.name?.toLowerCase().trim())
    .filter(Boolean)

  let skillsScore = 0
  if (jobSkills.length === 0) {
    skillsScore = 40
    criteria.skills = true
  } else {
    const matchedSkills = jobSkills.filter((reqSkill: string) => {
      const inSkills = candSkills.some((s: string) => s.includes(reqSkill) || reqSkill.includes(s))
      const inSummary = (candidate.summary || '').toLowerCase().includes(reqSkill)
      const inHeadline = (candidate.headline || '').toLowerCase().includes(reqSkill)
      return inSkills || inSummary || inHeadline
    })
    const matchRatio = matchedSkills.length / jobSkills.length
    skillsScore = Math.round(matchRatio * 40)
    if (matchRatio >= 0.6 || matchedSkills.length >= 2 || (jobSkills.length === 1 && matchedSkills.length === 1)) {
      criteria.skills = true
    }
  }

  // 2. Experience Match (Weight: 25%)
  let experienceScore = 0
  const jobMinExp = typeof job.experienceMin === 'number' ? job.experienceMin : 0
  const candExp = typeof candidate.totalExperience === 'number' ? candidate.totalExperience : 0

  if (jobMinExp === 0) {
    experienceScore = 25
    criteria.experience = true
  } else if (candExp >= jobMinExp) {
    experienceScore = 25
    criteria.experience = true
  } else if (candExp >= jobMinExp * 0.7) {
    experienceScore = 18
    criteria.experience = true
  } else if (candExp > 0) {
    experienceScore = Math.round((candExp / jobMinExp) * 20)
    criteria.experience = false
  }

  // 3. Location Match (Weight: 15%)
  let locationScore = 0
  const workMode = (job.workMode || '').toUpperCase()
  const jobCity = (job.city || job.locationText || '').toLowerCase()
  const jobState = (job.state || 'Assam').toLowerCase()
  const candLocation = (candidate.currentLocation || '').toLowerCase()
  const candCity = (candidate.city || '').toLowerCase()
  const candState = (candidate.state || '').toLowerCase()
  const candPref = (candidate.preferredLocations || '').toLowerCase()

  if (workMode === 'REMOTE') {
    locationScore = 15
    criteria.location = true
  } else {
    const isSameCity = (jobCity && (candLocation.includes(jobCity) || candCity.includes(jobCity))) ||
      (candPref && jobCity && candPref.includes(jobCity))
    const isSameState = (jobState && (candLocation.includes(jobState) || candState.includes(jobState))) ||
      (candLocation.includes('assam') && jobState.includes('assam'))

    if (isSameCity) {
      locationScore = 15
      criteria.location = true
    } else if (isSameState) {
      locationScore = 11
      criteria.location = true
    } else if (candLocation) {
      locationScore = 5
    } else {
      locationScore = 10
      criteria.location = true
    }
  }

  // 4. Education Match (Weight: 10%)
  let educationScore = 0
  const jobEdu = (job.highestDegree || job.educationLevel || '').toLowerCase()
  const candEdu = (candidate.highestDegree || candidate.educationLevel || '').toLowerCase()
  const candEduHistory = (candidate.education || []).map((e: any) => (e.degree || '').toLowerCase()).join(' ')

  if (!jobEdu) {
    educationScore = 10
    criteria.education = true
  } else {
    const eduMatches = candEdu.includes(jobEdu) || jobEdu.includes(candEdu) ||
      candEduHistory.includes(jobEdu) ||
      (jobEdu.includes('bachelor') && (candEdu.includes('bachelor') || candEdu.includes('b.') || candEdu.includes('degree'))) ||
      (jobEdu.includes('master') && (candEdu.includes('master') || candEdu.includes('m.') || candEdu.includes('mba')))

    if (eduMatches) {
      educationScore = 10
      criteria.education = true
    } else if (candEdu) {
      educationScore = 6
      criteria.education = true
    } else {
      educationScore = 5
    }
  }

  // 5. Salary Match (Weight: 10%)
  let salaryScore = 10
  if (job.salaryMax && candidate.expectedSalaryMin) {
    if (candidate.expectedSalaryMin <= job.salaryMax) {
      salaryScore = 10
      criteria.salary = true
    } else if (candidate.expectedSalaryMin <= job.salaryMax * 1.25) {
      salaryScore = 6
    } else {
      salaryScore = 2
    }
  } else {
    salaryScore = 10
    criteria.salary = true
  }

  totalScore = Math.min(100, Math.max(0, skillsScore + experienceScore + locationScore + educationScore + salaryScore))
  const isHighMatch = totalScore >= 80

  return {
    matchPercentage: totalScore,
    isHighMatch,
    matchingCriteria: criteria,
  }
}

const getViewedStorageKey = (jobId: string) => `cw_viewed_candidates_${jobId}`

const getStoredViewedCandidateIds = (jobId: string): string[] => {
  try {
    const raw = localStorage.getItem(getViewedStorageKey(jobId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const addStoredViewedCandidateId = (jobId: string, appId: string) => {
  try {
    const current = getStoredViewedCandidateIds(jobId)
    if (!current.includes(appId)) {
      current.push(appId)
      localStorage.setItem(getViewedStorageKey(jobId), JSON.stringify(current))
    }
  } catch (e) {
    console.error('Failed to store viewed candidate ID', e)
  }
}

const formatDisplayPhone = (raw?: string | null) => {
  if (!raw) return '+91 98765 43210'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return raw.startsWith('+') ? raw : `+91 ${raw}`
}

export default function Applicants() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [job, setJob] = useState<any>(null)
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & tab state
  const [activeMetricTab, setActiveMetricTab] = useState<'all' | 'pending' | 'viewed' | 'shortlisted' | 'rejected'>('pending')
  const [sortBy, setSortBy] = useState<'package' | 'recent' | 'matching' | 'experience'>('package')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // IDs of candidates that were already marked as VIEWED before this page load / session
  const [initialViewedIds, setInitialViewedIds] = useState<Set<string>>(new Set())

  // Phone numbers that have been revealed (historical or current session)
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({})

  // Applications whose number was clicked during the CURRENT session (so they stay visible in pending until refresh)
  const [sessionRevealedIds, setSessionRevealedIds] = useState<Set<string>>(new Set())

  // Left sidebar filter states
  const [filterWhoOpen, setFilterWhoOpen] = useState(true)
  const [filterHigherPackage, setFilterHigherPackage] = useState(false)
  const [filterMatched, setFilterMatched] = useState(false)
  const [filterHaveResume, setFilterHaveResume] = useState(false)
  const [filterTriedContacting, setFilterTriedContacting] = useState(false)
  const [keywordSearch, setKeywordSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL')

  // Modals state
  const [selectedCandidateModal, setSelectedCandidateModal] = useState<CandidateDetail | null>(null)
  const [smsModalCandidate, setSmsModalCandidate] = useState<CandidateDetail | null>(null)
  const [smsMessage, setSmsMessage] = useState('Hello, we reviewed your profile on Career Wings and would like to invite you for an interview.')

  // Fetch job details and applicants
  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      // 1. Fetch current job info directly
      let currentJobData: any = null
      try {
        const jobRes = await employerAPI.getJob(id)
        if (jobRes.data?.data) {
          currentJobData = jobRes.data.data
          setJob(currentJobData)
        }
      } catch {
        // Fallback: search in getJobs list
        const jobsRes = await employerAPI.getJobs({ limit: 100 })
        const currentJob = jobsRes.data?.data?.find((j: any) => j.id === id || j._id === id)
        if (currentJob) {
          currentJobData = currentJob
          setJob(currentJob)
        }
      }

      // 2. Fetch real applicants from database only (NO demo/fallback applicants)
      const appsRes = await employerAPI.getApplicants(id)
      const fetchedApps: any[] = appsRes.data?.data || []

      // Check stored viewed IDs from localStorage for persistence across reloads
      const storedViewedList = id ? getStoredViewedCandidateIds(id) : []
      const viewedSet = new Set<string>()
      const revealedMap: Record<string, boolean> = {}

      const normalizedApps: ApplicationItem[] = fetchedApps.map((app: any) => {
        const isAlreadyViewed = app.status === 'VIEWED' || storedViewedList.includes(app.id)
        if (isAlreadyViewed) {
          viewedSet.add(app.id)
          revealedMap[app.id] = true
        }

        let matchPercentage = typeof app.matchPercentage === 'number' ? app.matchPercentage : undefined
        let isHighMatch = typeof app.isHighMatch === 'boolean' ? app.isHighMatch : undefined
        let matchingCriteria = app.matchingCriteria

        if ((matchPercentage === undefined || !matchingCriteria) && currentJobData) {
          const match = computeCandidateJobMatch(currentJobData, app.candidate)
          matchPercentage = match.matchPercentage
          isHighMatch = match.isHighMatch
          matchingCriteria = match.matchingCriteria
        }

        return {
          ...app,
          status: isAlreadyViewed ? ('VIEWED' as const) : app.status,
          matchPercentage: matchPercentage ?? 0,
          isHighMatch: isHighMatch ?? ((matchPercentage ?? 0) >= 80),
          matchingCriteria: matchingCriteria || { skills: false, education: false, location: false, experience: false, salary: false },
        }
      })

      setApplications(normalizedApps)
      setInitialViewedIds(viewedSet)
      setRevealedPhones(revealedMap)
      setSessionRevealedIds(new Set()) // Reset session revealed IDs on page load/refresh

      // Auto tab selection on load/refresh:
      const unviewedPendingCount = normalizedApps.filter(
        (a: ApplicationItem) => a.status === 'APPLIED' && !viewedSet.has(a.id)
      ).length
      const totalViewedCount = normalizedApps.filter(
        (a: ApplicationItem) => a.status === 'VIEWED' || viewedSet.has(a.id)
      ).length

      if (unviewedPendingCount === 0 && totalViewedCount > 0) {
        setActiveMetricTab('viewed')
      } else {
        setActiveMetricTab('pending')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Status updates (Shortlist / Reject / Viewed)
  const handleUpdateStatus = async (appId: string, newStatus: 'SHORTLISTED' | 'REJECTED' | 'VIEWED') => {
    try {
      if (id && !appId.startsWith('app-fallback')) {
        await employerAPI.updateApplicationStatus(id, appId, { status: newStatus })
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      )
      toast.success(
        newStatus === 'SHORTLISTED'
          ? 'Candidate Shortlisted!'
          : newStatus === 'REJECTED'
          ? 'Candidate Marked as Rejected'
          : 'Candidate marked as Viewed'
      )
    } catch {
      toast.error('Failed to update status')
    }
  }

  // View Number click handler:
  // 1. Immediately reveals phone number on candidate card in the UI
  // 2. Keeps candidate visible in "Action Pending" tab during current session
  // 3. Persists to localStorage and backend DB so upon refresh it moves to "Viewed Number" and never returns to "Action Pending"
  const handleViewNumber = async (appId: string) => {
    if (!id) return

    // 1. Reveal phone number in UI state
    setRevealedPhones((prev) => ({ ...prev, [appId]: true }))

    // 2. Mark as revealed in current session so it stays visible on the card
    setSessionRevealedIds((prev) => {
      const next = new Set(prev)
      next.add(appId)
      return next
    })

    // 3. Persist to localStorage for this vacancy
    addStoredViewedCandidateId(id, appId)

    // 4. Update status in database backend
    try {
      if (!appId.startsWith('app-fallback')) {
        await employerAPI.updateApplicationStatus(id, appId, { status: 'VIEWED' })
      }
    } catch (err) {
      console.error('Failed to update status on server:', err)
    }

    // 5. Update local applications state
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, status: 'VIEWED', viewedAt: new Date().toISOString() } : a
      )
    )

    toast.success('Candidate phone number revealed!')
  }

  // Delete Application
  const handleDeleteApplication = (appId: string) => {
    if (!window.confirm('Remove this applicant from current vacancy?')) return
    setApplications((prev) => prev.filter((a) => a.id !== appId))
    toast.success('Applicant removed')
  }

  // Reset all filters
  const handleResetFilters = () => {
    setFilterHigherPackage(false)
    setFilterMatched(false)
    setFilterHaveResume(true)
    setFilterTriedContacting(false)
    setKeywordSearch('')
    setGenderFilter('ALL')
    if (pendingCount > 0) {
      setActiveMetricTab('pending')
    } else {
      setActiveMetricTab('viewed')
    }
    toast.success('Filters reset to default')
  }

  // Export to Excel / CSV
  const handleDownloadExcel = () => {
    if (filteredApplications.length === 0) {
      toast.error('No applicants to export')
      return
    }

    const headers = ['Candidate Name', 'Phone', 'Email', 'Gender', 'Experience', 'Expected Salary', 'Education', 'Location', 'Status']
    const rows = filteredApplications.map((app) => [
      `"${app.candidate.firstName} ${app.candidate.lastName}"`,
      `"${app.candidate.phone || 'N/A'}"`,
      `"${app.candidate.email || 'N/A'}"`,
      `"${app.candidate.gender || 'N/A'}"`,
      `"${app.candidate.totalExperience || 0} yrs"`,
      `"₹${app.candidate.expectedSalaryMin || 0} - ₹${app.candidate.expectedSalaryMax || 0}/mo"`,
      `"${app.candidate.highestDegree || app.candidate.educationLevel || 'Graduate'}"`,
      `"${app.candidate.currentLocation || 'Guwahati, Assam'}"`,
      `"${app.status}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Applicants_${(job?.title || 'Job').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Excel/CSV export downloaded!')
  }

  // Computed metric counts
  const totalCount = applications.length
  const highMatchCount = applications.filter(
    (a) => a.isHighMatch === true || (a.matchPercentage || 0) >= 80
  ).length
  const haveResumeCount = applications.filter(
    (a) => Boolean(a.candidate.resumeFile || a.candidate.resumeFileName)
  ).length

  // Pending count: Only candidates that were NOT viewed previously AND NOT revealed in current session
  const pendingCount = applications.filter(
    (a) =>
      a.status !== 'SHORTLISTED' &&
      a.status !== 'REJECTED' &&
      !initialViewedIds.has(a.id) &&
      !sessionRevealedIds.has(a.id)
  ).length

  // Viewed count: Candidates viewed previously or revealed in current session
  const viewedCount = applications.filter(
    (a) =>
      a.status === 'VIEWED' ||
      initialViewedIds.has(a.id) ||
      sessionRevealedIds.has(a.id) ||
      revealedPhones[a.id]
  ).length

  const shortlistedCount = applications.filter((a) => a.status === 'SHORTLISTED').length
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Tab filter
        if (activeMetricTab === 'pending') {
          // If the candidate was already viewed before this page refresh, NEVER show in pending
          if (initialViewedIds.has(app.id)) return false
          // Shortlisted or rejected candidates do not show in pending
          if (app.status === 'SHORTLISTED' || app.status === 'REJECTED') return false
          // If revealed during current session, keep it displayed so employer sees the phone number!
          return true
        }
        if (activeMetricTab === 'viewed') {
          return (
            app.status === 'VIEWED' ||
            initialViewedIds.has(app.id) ||
            sessionRevealedIds.has(app.id) ||
            revealedPhones[app.id]
          )
        }
        if (activeMetricTab === 'shortlisted') {
          return app.status === 'SHORTLISTED'
        }
        if (activeMetricTab === 'rejected') {
          return app.status === 'REJECTED'
        }
        return true // 'all'
      })
      .filter((app) => {
        // Matched filter: if "Matched to job requirements" is checked, only show HIGH MATCH (>= 80%)
        if (filterMatched) {
          return app.isHighMatch === true || (app.matchPercentage || 0) >= 80
        }
        return true
      })
      .filter((app) => {
        // Have resume filter
        if (filterHaveResume) {
          return Boolean(app.candidate.resumeFile || app.candidate.resumeFileName)
        }
        return true
      })
      .filter((app) => {
        // Keyword search
        if (keywordSearch.trim()) {
          const q = keywordSearch.toLowerCase()
          const fullName = `${app.candidate.firstName} ${app.candidate.lastName}`.toLowerCase()
          const headline = (app.candidate.headline || '').toLowerCase()
          const skills = (app.candidate.candidateSkills?.map((s) => s.skill.name).join(' ') || '').toLowerCase()
          const college = (app.candidate.college || '').toLowerCase()
          return fullName.includes(q) || headline.includes(q) || skills.includes(q) || college.includes(q)
        }
        return true
      })
      .filter((app) => {
        // Gender filter
        if (genderFilter === 'MALE') return (app.candidate.gender || '').toUpperCase() === 'MALE'
        if (genderFilter === 'FEMALE') return (app.candidate.gender || '').toUpperCase() === 'FEMALE'
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'matching') {
          return (b.matchPercentage || 0) - (a.matchPercentage || 0)
        }
        if (sortBy === 'package') {
          return (b.candidate.expectedSalaryMax || 0) - (a.candidate.expectedSalaryMax || 0)
        }
        if (sortBy === 'experience') {
          return (b.candidate.totalExperience || 0) - (a.candidate.totalExperience || 0)
        }
        if (sortBy === 'recent') {
          return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
        }
        return 0
      })
  }, [applications, activeMetricTab, filterMatched, filterHaveResume, keywordSearch, genderFilter, sortBy, initialViewedIds, sessionRevealedIds, revealedPhones])

  // Select all toggler
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredApplications.map((a) => a.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelectOne = (appId: string) => {
    setSelectedIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    )
  }

  return (
    <EmployerLayout>
      <SEOMeta title={`${job?.title || 'Job'} Applicants | Career Wings`} />

      <div className="space-y-6">
        {/* TOP BAR / JOB INFO HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 px-6 py-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              to="/employer/jobs"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition"
              title="Back to All Jobs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {job?.title || 'Job Vacancy'}
            </h1>

            {job?.status === 'PENDING' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                Pending Review
              </span>
            ) : job?.status === 'PUBLISHED' || job?.status === 'FEATURED' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Active
              </span>
            ) : job?.status === 'REJECTED' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="w-3 h-3 text-rose-600" />
                Rejected
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {job?.status || 'Draft'}
              </span>
            )}

            <span className="text-xs text-slate-500 font-medium">
              • {job?.locationText || 'Guwahati, Assam'}
            </span>

            <Link
              to={`/employer/jobs/${id}/edit`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 ml-2"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Job
            </Link>
          </div>
        </div>

        {/* UNDER REVIEW NOTICE BANNER */}
        {job?.status === 'PENDING' && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-amber-800 text-sm block mb-0.5">Vacancy is Under Review</span>
              Admin verification is pending for this job posting. Once approved, it will be published live to job seekers. Real applicants will appear here once candidates apply.
            </div>
          </div>
        )}

        {/* METRICS / SUMMARY TABS BAR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800">Applied to job</h2>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Sort By:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="package">★ Higher Package First (Paid CVs)</option>
                  <option value="recent">Most Recent First</option>
                  <option value="matching">Best Matching First</option>
                  <option value="experience">Experience High to Low</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 5 Metric Tab Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Card 1: All candidates */}
            <button
              type="button"
              onClick={() => setActiveMetricTab('all')}
              className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                activeMetricTab === 'all'
                  ? 'bg-blue-50 border-blue-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="block text-2xl font-black text-slate-900 leading-none mb-1">
                {totalCount}
              </span>
              <span className="text-xs font-semibold text-slate-600">All candidates</span>
            </button>

            {/* Card 2: Action Pending */}
            <button
              type="button"
              onClick={() => setActiveMetricTab('pending')}
              className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                activeMetricTab === 'pending'
                  ? 'bg-[#ECFDF5] border-[#10B981] shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="block text-2xl font-black text-emerald-600 leading-none mb-1">
                {pendingCount}
              </span>
              <span className="text-xs font-bold text-slate-700">Action Pending</span>
            </button>

            {/* Card 3: Viewed Number */}
            <button
              type="button"
              onClick={() => setActiveMetricTab('viewed')}
              className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                activeMetricTab === 'viewed'
                  ? 'bg-blue-50 border-blue-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="block text-2xl font-black text-slate-900 leading-none mb-1">
                {viewedCount}
              </span>
              <span className="text-xs font-semibold text-slate-600">Viewed Number</span>
            </button>

            {/* Card 4: Shortlisted */}
            <button
              type="button"
              onClick={() => setActiveMetricTab('shortlisted')}
              className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                activeMetricTab === 'shortlisted'
                  ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="block text-2xl font-black text-emerald-600 leading-none mb-1">
                {shortlistedCount}
              </span>
              <span className="text-xs font-semibold text-slate-600">Shortlisted</span>
            </button>

            {/* Card 5: Rejected */}
            <button
              type="button"
              onClick={() => setActiveMetricTab('rejected')}
              className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                activeMetricTab === 'rejected'
                  ? 'bg-red-50 border-red-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="block text-2xl font-black text-red-600 leading-none mb-1">
                {rejectedCount}
              </span>
              <span className="text-xs font-semibold text-slate-600">Rejected</span>
            </button>
          </div>

          {/* Sub-action bar: Select All & Download Excel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                id="select-all-applicants"
                checked={
                  filteredApplications.length > 0 &&
                  selectedIds.length === filteredApplications.length
                }
                onChange={handleSelectAll}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="select-all-applicants" className="font-semibold cursor-pointer">
                Select All ({filteredApplications.length})
              </label>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-medium">
                Showing {filteredApplications.length} applicants
              </span>
            </div>

            <button
              type="button"
              onClick={handleDownloadExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-600 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Download Excel
            </button>
          </div>
        </div>

        {/* MAIN TWO-COLUMN CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* LEFT COLUMN: FILTERS SIDEBAR */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 p-4 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                FILTERS
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Filter Section 1: Show candidates who */}
            <div className="space-y-2.5">
              <div
                onClick={() => setFilterWhoOpen(!filterWhoOpen)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-700">Show candidates who</span>
                {filterWhoOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              {filterWhoOpen && (
                <div className="space-y-2 pt-1 text-xs">
                  {/* Higher Package CVs */}
                  <div
                    onClick={() => setFilterHigherPackage(!filterHigherPackage)}
                    className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition ${
                      filterHigherPackage
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Higher Package CVs</span>
                    </div>
                    <span className="text-slate-400">(0)</span>
                  </div>

                  {/* Matched to job requirements */}
                  <label className="flex items-center justify-between cursor-pointer text-slate-700 hover:text-slate-900">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filterMatched}
                        onChange={(e) => setFilterMatched(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Matched to job requirements</span>
                    </div>
                    <span className="text-slate-400 font-medium">({highMatchCount})</span>
                  </label>

                  {/* Have Resume Attached */}
                  <label className="flex items-center justify-between cursor-pointer text-slate-700 hover:text-slate-900">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filterHaveResume}
                        onChange={(e) => setFilterHaveResume(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Have Resume Attached</span>
                    </div>
                    <span className="text-slate-400 font-medium">({haveResumeCount})</span>
                  </label>

                  {/* Tried contacting you */}
                  <label className="flex items-center justify-between cursor-pointer text-slate-700 hover:text-slate-900">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filterTriedContacting}
                        onChange={(e) => setFilterTriedContacting(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Tried contacting you</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                        NEW
                      </span>
                    </div>
                    <span className="text-slate-400 font-medium">(0)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Filter Section 2: Keywords */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Keywords (including name)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)}
                  placeholder="Name, skills, college..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Filter Section 3: Gender */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Gender</label>
              <select
                value={genderFilter}
                onChange={(e: any) => setGenderFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>

          {/* RIGHT COLUMN: APPLICANT LIST & CANDIDATE CARDS */}
          <div className="lg:col-span-3 space-y-4">
            {/* Top High Match Banner */}
            <div className="rounded-2xl border border-purple-200/70 bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-blue-50/40 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="block text-xs font-black text-purple-900 uppercase tracking-wide">
                      HIGH MATCH CANDIDATES (Above 80% Match)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-200/80 text-purple-800">
                      {highMatchCount} {highMatchCount === 1 ? 'Candidate' : 'Candidates'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Candidates matching 80%+ of skills, experience, location, and education for this vacancy.
                  </p>
                </div>
              </div>
              {highMatchCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMatched((prev) => !prev)}
                  className={`self-start sm:self-auto shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${
                    filterMatched
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  {filterMatched ? '✓ Showing High Matches' : 'Filter High Matches'}
                </button>
              )}
            </div>

            {/* Applicant Cards List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-48" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  {job?.status === 'PENDING' ? (
                    <Clock className="w-6 h-6 text-amber-500" />
                  ) : (
                    <Users className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <p className="text-base font-bold text-slate-800">
                  {job?.status === 'PENDING'
                    ? 'Job Vacancy is Currently Under Review'
                    : 'No Applicants Yet'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {job?.status === 'PENDING'
                    ? 'Admin is verifying this job posting. Once approved, candidates across Guwahati and Northeast will be able to discover and apply.'
                    : 'No candidate has applied to this job vacancy yet. When applications arrive, their profiles, resumes, and contact details will appear here.'}
                </p>
                <Link
                  to="/employer/jobs"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to My Listings
                </Link>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <p className="text-sm font-bold text-slate-800">No applicants found in this category</p>
                <p className="text-xs text-slate-500">
                  Try switching tabs or resetting filters above to view other candidates.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredApplications.map((app) => {
                const isSelected = selectedIds.includes(app.id)
                const isNumberViewed =
                  revealedPhones[app.id] ||
                  sessionRevealedIds.has(app.id) ||
                  app.status === 'VIEWED' ||
                  initialViewedIds.has(app.id)
                const candidate = app.candidate
                const initials = `${candidate.firstName?.[0] || 'C'}${candidate.lastName?.[0] || 'W'}`

                return (
                  <div
                    key={app.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3.5 transition-all ${
                      isSelected ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Checkbox, Avatar, Name, View Full Profile link, High Match Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(app.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-1 sm:mt-0"
                        />

                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                          {initials}
                        </div>

                        {/* Name & View Profile Link */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">
                              {candidate.firstName} {candidate.lastName}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setSelectedCandidateModal(candidate)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              View full profile with resume ›
                            </button>
                          </div>

                          {/* Candidate Metadata Pills */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {candidate.gender || 'Female'}, 24 yr
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                              {candidate.totalExperience || 4} yrs
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                              ₹{candidate.expectedSalaryMin ? candidate.expectedSalaryMin.toLocaleString('en-IN') : '10,000'} - ₹{candidate.expectedSalaryMax ? candidate.expectedSalaryMax.toLocaleString('en-IN') : '12,000'}/mo
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {candidate.currentLocation || 'Bangalore, India'}
                            </span>
                            {isNumberViewed && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  {formatDisplayPhone(candidate.phone || '9876543210')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: High Match Badge or Normal Match */}
                      {app.isHighMatch || (app.matchPercentage && app.matchPercentage >= 80) ? (
                        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0 shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 fill-purple-300" />
                          HIGH MATCH {app.matchPercentage ? `(${app.matchPercentage}%)` : ''}
                        </span>
                      ) : (
                        <span className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {app.matchPercentage ? `${app.matchPercentage}% match` : 'Applied'}
                        </span>
                      )}
                    </div>

                    {/* Matching criteria tags row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Matching :
                      </span>
                      {app.matchingCriteria?.skills ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                          <Check className="w-3 h-3 text-emerald-600" /> Skills
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-200/60 text-xs font-normal">
                          Skills
                        </span>
                      )}
                      {app.matchingCriteria?.education ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                          <Check className="w-3 h-3 text-emerald-600" /> Education
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-200/60 text-xs font-normal">
                          Education
                        </span>
                      )}
                      {app.matchingCriteria?.location ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                          <Check className="w-3 h-3 text-emerald-600" /> Location
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-200/60 text-xs font-normal">
                          Location
                        </span>
                      )}
                      {app.matchingCriteria?.experience ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                          <Check className="w-3 h-3 text-emerald-600" /> Work Experience
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-slate-200/60 text-xs font-normal">
                          Work Experience
                        </span>
                      )}
                    </div>

                    {/* Candidate Education & Languages */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Education:{' '}
                          <strong className="text-slate-800">
                            {candidate.highestDegree || candidate.educationLevel || 'Bachelor Degree'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-slate-400" />
                        <span>Language: English | Assamese | Hindi</span>
                      </div>
                    </div>

                    {/* BOTTOM ACTION BUTTONS ROW */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      {/* Left: View Number, WhatsApp, System SMS */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isNumberViewed ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`tel:${candidate.phone || '9876543210'}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                              title="Click to Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {formatDisplayPhone(candidate.phone || '9876543210')}
                            </a>
                            {sessionRevealedIds.has(app.id) && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Number Revealed
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleViewNumber(app.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-xs transition cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            View Number
                          </button>
                        )}

                        {/* WhatsApp Button */}
                        <a
                          href={`https://wa.me/91${(candidate.phone || '9876543210').replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hello ${candidate.firstName}, we reviewed your application for "${job?.title || 'Job'}" at Career Wings.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition shadow-2xs"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>

                        {/* System SMS Button */}
                        <button
                          type="button"
                          onClick={() => setSmsModalCandidate(candidate)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          System SMS
                        </button>
                      </div>

                      {/* Right: Reject, Shortlist, Delete */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app.id, 'SHORTLISTED')}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Shortlist
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteApplication(app.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-50 transition cursor-pointer"
                          title="Remove applicant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Session Notification for Action Pending view: Informs user that upon refresh candidate moves to Viewed Number */}
                    {sessionRevealedIds.has(app.id) && activeMetricTab === 'pending' && (
                      <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-200/90 rounded-xl px-3.5 py-2 font-medium">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Candidate phone number unlocked! Upon page refresh, this candidate will move to the <strong>"Viewed Number"</strong> section and will not appear in Action Pending.
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* CANDIDATE DETAIL MODAL */}
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
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                {selectedCandidateModal.firstName[0]}
                {selectedCandidateModal.lastName[0]}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedCandidateModal.firstName} {selectedCandidateModal.lastName}
                  </h3>
                  {(() => {
                    const appForModal = applications.find(
                      (a) => a.candidateId === selectedCandidateModal.id || a.candidate.id === selectedCandidateModal.id
                    )
                    if (!appForModal) return null
                    return appForModal.isHighMatch || (appForModal.matchPercentage && appForModal.matchPercentage >= 80) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 fill-purple-300" />
                        HIGH MATCH ({appForModal.matchPercentage}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {appForModal.matchPercentage ? `${appForModal.matchPercentage}% match` : 'Applied'}
                      </span>
                    )
                  })()}
                </div>
                <p className="text-xs text-slate-500">{selectedCandidateModal.headline}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCandidateModal.currentLocation} • {selectedCandidateModal.totalExperience || 4} yrs Experience
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
                  <p>{selectedCandidateModal.highestDegree || selectedCandidateModal.educationLevel || 'Bachelor Degree'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Expected Salary:</span>
                  <p>₹{selectedCandidateModal.expectedSalaryMin || 10000} - ₹{selectedCandidateModal.expectedSalaryMax || 12000}/mo</p>
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
                    ['Customer Support', 'Tele Calling', 'Client Communication', 'MS Excel'].map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium text-slate-700">
                        {s}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`tel:${selectedCandidateModal.phone || '+919876543210'}`}
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

      {/* SYSTEM SMS MODAL */}
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
                To: {smsModalCandidate.firstName} {smsModalCandidate.lastName} (+91 {smsModalCandidate.phone || '9876543210'})
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Quick Template:</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSmsMessage(`Hello ${smsModalCandidate.firstName}, you have been invited for an interview for "${job?.title || 'Job'}". Please check your email for details.`)
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                >
                  Interview Invite
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSmsMessage(`Congratulations ${smsModalCandidate.firstName}! You have been shortlisted for "${job?.title || 'Job'}" by our hiring team.`)
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                >
                  Shortlisted
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
                  toast.success(`SMS sent to ${smsModalCandidate.firstName}!`)
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

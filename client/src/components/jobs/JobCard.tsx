import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MapPin,
  Clock,
  Bookmark,
  Briefcase,
  Star,
  CheckCircle2,
  ArrowRight,
  Send,
  ChevronRight,
} from 'lucide-react'
import {
  formatRelativeTime,
  formatJobType,
  cn,
} from '@/lib/utils'
import type { Job } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { jobsAPI } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface JobCardProps {
  job: Job
  onApply?: (job: Job) => void
  compact?: boolean
  layout?: 'grid' | 'list'
  appliedJobIds?: string[]
  savedJobIds?: string[]
  index?: number
}

function formatSalaryDisplay(job: any): string {
  if (job.showSalary === false) return 'Salary not disclosed'
  const min = job.minSalary ?? job.salaryMin
  const max = job.maxSalary ?? job.salaryMax
  const period = job.salaryPeriod || (max && max <= 100000 ? 'monthly' : 'yearly')
  if (!min && !max) return 'Best in Industry'

  const fmtNum = (n: number) => n.toLocaleString('en-IN')
  const isMonthly = period === 'monthly' || period === 'month' || (max && max <= 80000)

  if (isMonthly) {
    if (min && max) return `₹ ${fmtNum(min)} - ₹${fmtNum(max)}/mo`
    if (min) return `₹ ${fmtNum(min)}+/mo`
    if (max) return `Up to ₹ ${fmtNum(max)}/mo`
  } else {
    if (min && max) {
      if (min >= 100000 && max >= 100000) {
        const minL = (min / 100000).toFixed(min % 100000 === 0 ? 0 : 1)
        const maxL = (max / 100000).toFixed(max % 100000 === 0 ? 0 : 1)
        return `₹ ${minL} - ${maxL} LPA`
      }
      return `₹ ${fmtNum(min)} - ₹${fmtNum(max)}/yr`
    }
    if (min) return `From ₹ ${(min / 100000).toFixed(1)} LPA`
    if (max) return `Up to ₹ ${(max / 100000).toFixed(1)} LPA`
  }
  return 'Competitive'
}

function formatExpText(job: any): string {
  const min = job.experienceMin ?? job.minExperience
  const max = job.experienceMax ?? job.maxExperience
  if (min === undefined && max === undefined) return '0-3 yrs'
  if (min === 0 && (max === 0 || max === 1)) return '0-1 yr'
  if (min !== undefined && max !== undefined) return `${min}-${max} yrs`
  if (min !== undefined) return `${min}+ yrs`
  if (max !== undefined) return `Up to ${max} yrs`
  return '0-3 yrs'
}

export default function JobCard({
  job,
  onApply,
  compact = false,
  layout = 'list',
  appliedJobIds = [],
  savedJobIds = [],
  index = 0,
}: JobCardProps) {
  const { isAuthenticated, isCandidate } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const jobId = (job.id || job._id || '') as string
  const [isSaved, setIsSaved] = useState(savedJobIds.includes(jobId))
  const isApplied = appliedJobIds.includes(jobId)

  const saveMutation = useMutation({
    mutationFn: () =>
      isSaved ? jobsAPI.unsave(jobId) : jobsAPI.save(jobId),
    onSuccess: () => {
      setIsSaved((v) => !v)
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      toast.success(isSaved ? 'Job removed from saved' : 'Job saved!')
    },
    onError: () => toast.error('Please log in to save jobs'),
  })

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Please log in to save jobs')
      return
    }
    saveMutation.mutate()
  }

  const handleApply = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast('Please log in as a job seeker to apply', { icon: 'ℹ️' })
      navigate(`/login?redirect=${encodeURIComponent(`/jobs/${job.slug || jobId}?apply=true`)}`)
      return
    }
    if (!isCandidate) {
      toast.error('Please sign in with a candidate / job seeker account to apply.')
      return
    }
    if (onApply) {
      onApply(job)
    } else {
      navigate(`/jobs/${job.slug || jobId}?apply=true`)
    }
  }

  const company = job.company
  const companyName = company?.name || 'Career Wings'
  const isVerified = company?.isVerified ?? true
  const salaryText = formatSalaryDisplay(job)
  const expText = formatExpText(job)

  const locationDisplay = typeof job.location === 'object' && job.location !== null
    ? ((job.location as any).city ? `${(job.location as any).city}${(job.location as any).state ? ', ' + (job.location as any).state : ''}` : (job.location as any).name || 'Guwahati, Assam')
    : (typeof job.location === 'string' && job.location ? job.location : job.locationText || 'Guwahati, Assam')

  const categoryName = typeof job.category === 'object' && job.category !== null
    ? (job.category as any).name
    : (typeof job.category === 'string' ? job.category : job.department || 'Education & Services')

  // Alternating or featured top stripe
  const isAmberStripe = job.isFeatured || index % 2 === 0

  /* ---------------- Compact Mode (Sidebar / Related) ---------------- */
  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 hover:shadow-md hover:border-slate-300 transition-all duration-200 p-3.5 group">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0">
            {company?.logo ? (
              <img src={company.logo} alt={companyName} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center rounded-lg">
                CW
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              to={`/jobs/${job.slug || jobId}`}
              className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 block"
              title={job.title}
            >
              {job.title}
            </Link>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {companyName}
            </p>
          </div>
          <button
            onClick={handleSave}
            className={cn(
              'shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer',
              isSaved
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'
            )}
            aria-label={isSaved ? 'Remove from saved' : 'Save job'}
          >
            <Bookmark className={cn('h-4 w-4', isSaved && 'fill-current')} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(job.createdAt || new Date().toISOString())}
          </span>
          <div>
            {isApplied ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Applied
              </span>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition cursor-pointer"
              >
                <Send className="h-3 w-3" />
                <span>Apply</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- Grid Mode (Clean Professional) ---------------- */
  if (layout === 'grid') {
    return (
      <div
        className={cn(
          'bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col h-full overflow-hidden',
          job.isFeatured && 'border-l-4 border-l-blue-500'
        )}
      >
        {/* Card content */}
        <div className="flex flex-col flex-1 p-5">

          {/* Top row: Logo + Bookmark */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
              {company?.logo ? (
                <img src={company.logo} alt={companyName} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-blue-600 text-white font-bold text-base flex items-center justify-center rounded-xl">
                  {companyName.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {job.isFeatured && (
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                  Featured
                </span>
              )}
              <button
                onClick={handleSave}
                className={cn(
                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                  isSaved
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                )}
                aria-label={isSaved ? 'Remove from saved' : 'Save job'}
              >
                <Bookmark className={cn('h-4 w-4', isSaved && 'fill-current')} />
              </button>
            </div>
          </div>

          {/* Title + Company */}
          <Link
            to={`/jobs/${job.slug || jobId}`}
            className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
            title={job.title}
          >
            {job.title}
          </Link>
          <p className="text-xs text-gray-500 mt-1 truncate flex items-center gap-1">
            {isVerified && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
            {companyName}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="bg-gray-100 text-gray-600 rounded-md px-2 py-0.5 text-[11px] font-medium">
              {formatJobType(job.jobType)}
            </span>
            {categoryName && (
              <span className="bg-gray-100 text-gray-600 rounded-md px-2 py-0.5 text-[11px] truncate max-w-[130px]">
                {categoryName}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 mt-2.5">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {locationDisplay}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {expText}
            </span>
          </div>

          {/* Salary + Time */}
          <div className="flex items-center justify-between mt-auto pt-3.5 border-t border-gray-100">
            <span className="text-sm font-bold text-emerald-600">
              {salaryText}
            </span>
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(job.createdAt || new Date().toISOString())}
            </span>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Link
              to={`/jobs/${job.slug || jobId}`}
              className="flex items-center justify-center gap-1 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Details <ChevronRight className="h-3 w-3" />
            </Link>

            {isApplied ? (
              <span className="flex items-center justify-center gap-1 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="h-3.5 w-3.5" /> Applied
              </span>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center justify-center gap-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Apply <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }


  /* ---------------- List Mode (Matching careerwings.in/jobs reference) ---------------- */
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-150 p-4 sm:p-5 font-sans',
        job.isFeatured && 'border-l-4 border-l-blue-500'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Logo + Details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Logo */}
          <div className="w-11 h-11 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
            {company?.logo ? (
              <img
                src={company.logo}
                alt={companyName}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                CW
              </div>
            )}
          </div>

          {/* Info Column */}
          <div className="flex-1 min-w-0">
            {/* Title + Featured Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/jobs/${job.slug || jobId}`}
                className="text-sm sm:text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                title={job.title}
              >
                {job.title}
              </Link>
              {job.isFeatured && (
                <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  Featured
                </span>
              )}
            </div>

            {/* Company + Verified */}
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{companyName}</span>
              {isVerified && (
                <span className="inline-flex items-center gap-0.5 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1.5">
              <span className="inline-flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {expText}
              </span>
              <span className="font-medium text-gray-800">{salaryText}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {locationDisplay}
              </span>
              <span className="inline-flex items-center gap-1 text-gray-400">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(job.createdAt || new Date().toISOString())}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="bg-gray-100 text-gray-600 rounded px-2 py-0.5 text-xs">
                {formatJobType(job.jobType)}
              </span>
              {categoryName && (
                <span className="bg-gray-100 text-gray-600 rounded px-2 py-0.5 text-xs">
                  {categoryName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={handleSave}
            className={cn(
              'p-2 rounded-lg border transition-colors cursor-pointer',
              isSaved
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200'
            )}
            aria-label={isSaved ? 'Remove from saved' : 'Save job'}
          >
            <Bookmark className={cn('w-4 h-4', isSaved && 'fill-current')} />
          </button>

          {isApplied ? (
            <span className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Applied
            </span>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-5 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Apply
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

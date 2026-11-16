import React, { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Search,
  Check,
  X,
  Star,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Briefcase,
  Building2,
  MapPin,
  IndianRupee,
  RefreshCw,
  Users,
  Filter,
  GraduationCap,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Job } from '@/types'

const PRESET_REJECTION_REASONS = [
  'Incomplete job description or missing requirements',
  'Salary or compensation information unrealistic or invalid',
  'Misleading job title or classification',
  'Duplicate or repetitive job posting',
  'Requires verified corporate documents or company registration',
  'Violates platform terms of service or recruitment policies',
]

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PUBLISHED' | 'FEATURED' | 'REJECTED' | 'CLOSED'>('PENDING')
  const [searchQuery, setSearchQuery] = useState('')
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    published: 0,
    featured: 0,
    rejected: 0,
  })

  // Review Modal state
  const [reviewJob, setReviewJob] = useState<any | null>(null)
  const [loadingJobDetail, setLoadingJobDetail] = useState(false)

  // Rejection Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [jobToReject, setJobToReject] = useState<any | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  // Delete Confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<any | null>(null)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getJobs({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        q: searchQuery.trim() || undefined,
        limit: 100,
      })
      setJobs(res.data.data || [])
      if (res.data?.meta?.counts) {
        setCounts(res.data.meta.counts)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load job listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchJobs()
  }

  // Open Full Job Review Modal
  const handleOpenReview = async (jobItem: any) => {
    setReviewJob(jobItem)
    setLoadingJobDetail(true)
    try {
      const res = await adminAPI.getJob(jobItem.id)
      setReviewJob(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingJobDetail(false)
    }
  }

  // Approve Job
  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      setSubmittingAction(true)
      await adminAPI.approveJob(id)
      toast.success('Job approved! Listing is now LIVE on public boards.')
      if (reviewJob?.id === id) {
        setReviewJob(null)
      }
      fetchJobs()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve job')
    } finally {
      setSubmittingAction(false)
    }
  }

  // Open Reject Modal
  const handleOpenReject = (jobItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setJobToReject(jobItem)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  // Submit Rejection with reason
  const handleConfirmReject = async () => {
    if (!jobToReject?.id) return
    if (!rejectionReason.trim()) {
      toast.error('Please specify a reason for rejection')
      return
    }

    try {
      setSubmittingAction(true)
      await adminAPI.rejectJob(jobToReject.id, rejectionReason.trim())
      toast.success('Job rejected and feedback notification sent to employer.')
      setRejectModalOpen(false)
      if (reviewJob?.id === jobToReject.id) {
        setReviewJob(null)
      }
      setJobToReject(null)
      fetchJobs()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject job')
    } finally {
      setSubmittingAction(false)
    }
  }

  // Feature Toggle
  const handleFeature = async (id: string, current: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      await adminAPI.featureJob(id, !current)
      toast.success(current ? 'Job removed from featured' : 'Job featured on homepage!')
      fetchJobs()
    } catch {
      toast.error('Failed to update featured status')
    }
  }

  // Open Delete Confirmation
  const handleOpenDelete = (jobItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setJobToDelete(jobItem)
    setDeleteModalOpen(true)
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!jobToDelete?.id) return
    try {
      setSubmittingAction(true)
      await adminAPI.deleteJob(jobToDelete.id)
      toast.success('Job posting deleted')
      setDeleteModalOpen(false)
      if (reviewJob?.id === jobToDelete.id) {
        setReviewJob(null)
      }
      setJobToDelete(null)
      fetchJobs()
    } catch {
      toast.error('Failed to delete job')
    } finally {
      setSubmittingAction(false)
    }
  }

  const tabs = [
    { key: 'PENDING' as const, label: 'Pending Approval', count: counts.pending, color: 'text-amber-700 bg-amber-100', icon: Clock },
    { key: 'PUBLISHED' as const, label: 'Live (Approved)', count: counts.published, color: 'text-emerald-700 bg-emerald-100', icon: CheckCircle2 },
    { key: 'FEATURED' as const, label: 'Featured', count: counts.featured, color: 'text-amber-700 bg-amber-100', icon: Star },
    { key: 'REJECTED' as const, label: 'Rejected', count: counts.rejected, color: 'text-rose-700 bg-rose-100', icon: XCircle },
    { key: 'ALL' as const, label: 'All Listings', count: counts.all, color: 'text-slate-700 bg-slate-100', icon: Briefcase },
  ]

  return (
    <AdminLayout>
      <SEOMeta title="Job Approval & Moderation (Admin) | Career Wings" />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Briefcase className="w-7 h-7 text-teal-600" />
              Job Moderation & Approval
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Review, approve, reject, or feature employer job postings before they go live on Career Wings.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchJobs}
              className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
              title="Refresh listings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter('PENDING')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
              statusFilter === 'PENDING'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40'
                : 'bg-white border-slate-100 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-900 font-semibold uppercase tracking-wider">
                Pending Approval
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-2">{counts.pending}</p>
            <p className="text-[11px] text-amber-600 mt-0.5 font-medium">Requires Admin Review</p>
          </div>

          <div
            onClick={() => setStatusFilter('PUBLISHED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
              statusFilter === 'PUBLISHED'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/40'
                : 'bg-white border-slate-100 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-900 font-semibold uppercase tracking-wider">
                Live & Published
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-2">{counts.published}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Visible to Candidates</p>
          </div>

          <div
            onClick={() => setStatusFilter('FEATURED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
              statusFilter === 'FEATURED'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40'
                : 'bg-white border-slate-100 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-900 font-semibold uppercase tracking-wider">
                Featured Jobs
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-2">{counts.featured}</p>
            <p className="text-[11px] text-amber-600 mt-0.5 font-medium">Homepage Spotlight</p>
          </div>

          <div
            onClick={() => setStatusFilter('REJECTED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/40'
                : 'bg-white border-slate-100 hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-900 font-semibold uppercase tracking-wider">
                Rejected Listings
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-700 mt-2">{counts.rejected}</p>
            <p className="text-[11px] text-rose-600 mt-0.5 font-medium">Need Employer Revision</p>
          </div>
        </div>

        {/* Pending Approval Notice Banner */}
        {counts.pending > 0 && statusFilter !== 'PENDING' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  {counts.pending} {counts.pending === 1 ? 'job is' : 'jobs are'} awaiting your approval before going live
                </h4>
                <p className="text-xs text-amber-800">
                  Review submitted vacancies to verify authenticity, company credibility, and proper salaries.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition shadow-xs shrink-0 self-start sm:self-auto"
            >
              Review Pending Jobs ({counts.pending})
            </button>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isSelected = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : tab.color
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by job title, company name, location, or recruiter..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition shadow-xs shrink-0"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  fetchJobs()
                }}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 transition"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Jobs Moderation Table */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading job postings...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No jobs found in this view</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {statusFilter === 'PENDING'
                ? 'Great news! There are currently no jobs waiting for Admin approval.'
                : `No ${statusFilter.toLowerCase()} jobs matching your criteria.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Job Title & Details</th>
                    <th className="py-3.5 px-4 font-semibold">Company & Recruiter</th>
                    <th className="py-3.5 px-4 font-semibold">Salary & Type</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job: any) => {
                    const isPending = job.status === 'PENDING'
                    const isLive = job.status === 'PUBLISHED' || job.status === 'FEATURED'
                    const isRejected = job.status === 'REJECTED'

                    return (
                      <tr
                        key={job.id}
                        className={`hover:bg-slate-50/60 transition group cursor-pointer ${
                          isPending ? 'bg-amber-50/30' : ''
                        }`}
                        onClick={() => handleOpenReview(job)}
                      >
                        {/* Title & Location */}
                        <td className="py-3.5 px-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-teal-600 transition truncate">
                                {job.title}
                              </span>
                              {job.isFeatured && (
                                <span title="Featured Job">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-normal mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {job.locationText || job.city || 'Guwahati'}
                              </span>
                              <span>&bull;</span>
                              <span>{job.workMode}</span>
                              <span>&bull;</span>
                              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>

                        {/* Company & Recruiter */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {job.company?.name || 'Career Wings Employer'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {job.employer
                              ? `${job.employer.firstName || ''} ${job.employer.lastName || ''} (${job.employer.designation || 'Recruiter'})`
                              : 'Admin Posted'}
                          </div>
                        </td>

                        {/* Salary & Job Type */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium text-xs">
                            {job.salaryMin || job.salaryMax
                              ? `₹${job.salaryMin?.toLocaleString('en-IN') || 0} - ₹${job.salaryMax?.toLocaleString('en-IN') || 0} / ${job.salaryPeriod?.toLowerCase() || 'mo'}`
                              : 'Not Disclosed'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {job.jobType} &bull; {job.vacancies || 1} vacancy
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Live
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                              {job.status}
                            </span>
                          )}
                        </td>

                        {/* Moderation Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            {/* Inspect Details Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenReview(job)}
                              className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition"
                              title="Review Job Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Approve Button (Visible if Pending or Rejected) */}
                            {job.status !== 'PUBLISHED' && job.status !== 'FEATURED' && (
                              <button
                                type="button"
                                onClick={(e) => handleApprove(job.id, e)}
                                disabled={submittingAction}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                                title="Approve and make LIVE"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                            )}

                            {/* Reject Button (Visible if not Rejected) */}
                            {job.status !== 'REJECTED' && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenReject(job, e)}
                                disabled={submittingAction}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Reject job with reason"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {/* Feature toggle */}
                            <button
                              type="button"
                              onClick={(e) => handleFeature(job.id, job.isFeatured, e)}
                              className={`p-1.5 rounded-lg transition ${
                                job.isFeatured
                                  ? 'text-amber-500 bg-amber-50'
                                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                              }`}
                              title={job.isFeatured ? 'Unfeature' : 'Feature on homepage'}
                            >
                              <Star className={`w-4 h-4 ${job.isFeatured ? 'fill-amber-400' : ''}`} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenDelete(job, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Delete job posting"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {jobs.length} jobs</span>
              <span>Click on any job row to inspect description, compensation, and requirements before approving.</span>
            </div>
          </div>
        )}

        {/* ─── MODAL 1: JOB REVIEW & APPROVAL ──────────────────────────────── */}
        {reviewJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 truncate">{reviewJob.title}</h2>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          reviewJob.status === 'PUBLISHED' || reviewJob.status === 'FEATURED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reviewJob.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {reviewJob.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {reviewJob.company?.name || 'Company'} &bull; Submitted on{' '}
                      {new Date(reviewJob.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReviewJob(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                {/* Review Warning if Pending */}
                {reviewJob.status === 'PENDING' && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <strong className="font-semibold block text-amber-950 mb-0.5">
                        Action Required: Pending Admin Approval
                      </strong>
                      This job vacancy is currently hidden from candidates. Please verify the job description, salary range, and company profile before clicking "Approve & Publish Live".
                    </div>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Job Type</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{reviewJob.jobType}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Work Mode</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{reviewJob.workMode}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Experience</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {reviewJob.experienceMin || 0} - {reviewJob.experienceMax || 0} Yrs
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Salary</p>
                    <p className="text-sm font-semibold text-teal-700 mt-0.5">
                      {reviewJob.salaryMin || reviewJob.salaryMax
                        ? `₹${reviewJob.salaryMin?.toLocaleString('en-IN') || 0} - ₹${reviewJob.salaryMax?.toLocaleString('en-IN') || 0}`
                        : 'Not Disclosed'}
                    </p>
                  </div>
                </div>

                {/* Recruiter & Location Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                      Hiring Recruiter Details
                    </span>
                    <p className="font-semibold text-slate-800 text-sm">
                      {reviewJob.employer?.firstName} {reviewJob.employer?.lastName}
                    </p>
                    <p className="text-slate-500">{reviewJob.employer?.designation || 'Recruiter'}</p>
                    {reviewJob.employer?.user?.email && (
                      <p className="text-slate-600 font-mono">{reviewJob.employer.user.email}</p>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                      Job Location & Qualification
                    </span>
                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      {reviewJob.locationText || reviewJob.city || 'Guwahati, Assam'}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {reviewJob.educationLevel || 'Any qualification'}{' '}
                      {reviewJob.highestDegree ? `(${reviewJob.highestDegree})` : ''}
                    </p>
                    <p className="text-slate-500">Vacancies: {reviewJob.vacancies || 1}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Job Description & Overview
                  </h4>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {reviewJob.description || 'No description provided.'}
                  </div>
                </div>

                {/* Responsibilities */}
                {reviewJob.responsibilities && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Key Responsibilities
                    </h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {reviewJob.responsibilities}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {reviewJob.requirements && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Role Requirements
                    </h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {reviewJob.requirements}
                    </div>
                  </div>
                )}

                {/* Required Skills */}
                {reviewJob.jobSkills && reviewJob.jobSkills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Required Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {reviewJob.jobSkills.map((js: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-teal-50 text-teal-800 rounded-full text-xs font-medium border border-teal-100"
                        >
                          {js.skill?.name || 'Skill'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {reviewJob.status !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => handleOpenReject(reviewJob)}
                      className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Reject Job
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {reviewJob.status !== 'PUBLISHED' && reviewJob.status !== 'FEATURED' && (
                    <button
                      type="button"
                      disabled={submittingAction}
                      onClick={() => handleApprove(reviewJob.id)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Approve & Publish Live
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setReviewJob(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 2: REJECT WITH REASON ───────────────────────────────── */}
        {rejectModalOpen && jobToReject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reject Job Posting</h3>
                  <p className="text-xs text-slate-500">"{jobToReject.title}"</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Common Reason or Write Feedback:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PRESET_REJECTION_REASONS.map((reason, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionReason(reason)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition text-left ${
                        rejectionReason === reason
                          ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide detailed feedback so the employer can correct the listing..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingAction || !rejectionReason.trim()}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Reject & Notify Employer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 3: DELETE CONFIRMATION ──────────────────────────────── */}
        {deleteModalOpen && jobToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">Delete Job Posting?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to permanently delete <strong className="text-slate-800">{jobToDelete.title}</strong>?
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Yes, Delete Job
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

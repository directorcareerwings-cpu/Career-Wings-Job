import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Briefcase,
  Users,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowRight,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Job } from '@/types'

type TabType = 'ALL' | 'PENDING' | 'LIVE' | 'REJECTED'

export default function ManageJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('ALL')
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    live: 0,
    rejected: 0,
  })

  const fetchJobs = async (tab: TabType = activeTab) => {
    setLoading(true)
    try {
      const res = await employerAPI.getJobs({
        status: tab === 'ALL' ? undefined : tab,
      })
      setJobs(res.data.data || [])
      if (res.data?.meta?.counts) {
        setStatusCounts(res.data.meta.counts)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs('ALL')
  }, [])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this job vacancy?')) return
    try {
      await employerAPI.deleteJob(id)
      toast.success('Job deleted')
      setJobs((prev) => prev.filter((j) => j.id !== id))
      window.dispatchEvent(new CustomEvent('employer-counts-changed'))
      fetchJobs(activeTab)
    } catch {
      toast.error('Failed to delete job')
    }
  }

  const tabs = [
    { key: 'ALL' as TabType, label: 'All', count: statusCounts.all, icon: Briefcase },
    { key: 'PENDING' as TabType, label: 'Pending', count: statusCounts.pending, icon: Clock },
    { key: 'LIVE' as TabType, label: 'Live', count: statusCounts.live, icon: CheckCircle2 },
    { key: 'REJECTED' as TabType, label: 'Rejected', count: statusCounts.rejected, icon: XCircle },
  ]

  return (
    <EmployerLayout>
      <SEOMeta title="My Listing | Career Wings" />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Listing</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Track your job listings, pending reviews, live status, and applicant pipelines.
            </p>
          </div>

          <Link
            to="/employer/jobs/post"
            className="btn-primary flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> Post New Job
          </Link>
        </div>

        {/* Status Filter Tabs (All, Pending, Live, Rejected) with Synced DB Counts */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/70">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key)
                  fetchJobs(tab.key)
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive
                      ? tab.key === 'LIVE'
                        ? 'text-emerald-600'
                        : tab.key === 'PENDING'
                        ? 'text-amber-600'
                        : tab.key === 'REJECTED'
                        ? 'text-rose-600'
                        : 'text-slate-800'
                      : 'text-slate-400'
                  )}
                />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold transition-colors',
                    isActive
                      ? tab.key === 'LIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tab.key === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : tab.key === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-800'
                      : 'bg-slate-200/80 text-slate-600'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-32" />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:border-slate-200 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                    <Link
                      to={`/employer/jobs/${job.id || job._id || ''}/applicants`}
                      className="font-bold text-slate-900 hover:text-blue-600 text-base transition-colors cursor-pointer truncate"
                    >
                      {job.title}
                    </Link>

                    {/* Status Badge */}
                    {job.status === 'PUBLISHED' || job.status === 'FEATURED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Live
                      </span>
                    ) : job.status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Review
                      </span>
                    ) : job.status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Rejected
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {job.status}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{job.jobType}</span>
                    <span>•</span>
                    <span>{job.workMode}</span>
                    <span>•</span>
                    <span>{job.locationText || 'Guwahati, Assam'}</span>
                    <span>•</span>
                    <span>Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}</span>
                  </div>

                  {/* Context notice for pending/rejected */}
                  {job.status === 'PENDING' && (
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/70 border border-amber-100 rounded-lg px-3 py-1.5 max-w-2xl">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                      <span>In Review: Admin will verify this job posting. Once approved, it will go live for all job seekers.</span>
                    </div>
                  )}
                  {job.status === 'REJECTED' && (
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-rose-700 bg-rose-50/70 border border-rose-100 rounded-lg px-3 py-1.5 max-w-2xl">
                      <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                      <span>This job posting was rejected during admin review. You can edit the details to resubmit for review.</span>
                    </div>
                  )}
                </div>

                {/* Actions & Applicant Counter */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <Link
                    to={`/employer/jobs/${job.id || job._id || ''}/applicants`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 font-semibold text-xs transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {(job as any)._count?.applications ?? job.applicationCount ?? 0} Applicants
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/jobs/${job.slug}`}
                      target="_blank"
                      className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                      title="View public page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/employer/jobs/${job.id || job._id || ''}/edit`}
                      className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                      title="Edit job"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id || job._id || '')}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      title="Delete job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-700 text-base">
              {activeTab === 'PENDING'
                ? 'No pending vacancies under review'
                : activeTab === 'LIVE'
                ? 'No live vacancies published yet'
                : activeTab === 'REJECTED'
                ? 'No rejected vacancies'
                : 'No job postings created yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              {activeTab === 'PENDING'
                ? 'New jobs you submit will appear here until approved by admin.'
                : activeTab === 'LIVE'
                ? 'Approved vacancies will appear here and be visible to candidate job seekers.'
                : activeTab === 'REJECTED'
                ? 'All your job postings are in good standing.'
                : 'Publish your first vacancy to start receiving verified applications.'}
            </p>
            <Link to="/employer/jobs/post" className="btn-primary">Post Vacancy</Link>
          </div>
        )}
      </div>
    </EmployerLayout>
  )
}


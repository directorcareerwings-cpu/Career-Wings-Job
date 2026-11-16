import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { candidateAPI } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Briefcase, Bookmark, FileText, CheckCircle2,
  Clock, ArrowRight, Bell, Zap, AlertCircle
} from 'lucide-react'
import { Application, Job } from '@/types'

export default function CandidateDashboard() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profRes, appRes, subRes] = await Promise.all([
          candidateAPI.getProfile().catch(() => ({ data: { data: null } })),
          candidateAPI.getApplications({ limit: 5 }).catch(() => ({ data: { data: [] } })),
          candidateAPI.getSubscription().catch(() => ({ data: { data: null } })),
        ])

        setProfile(profRes.data?.data || null)
        const apps = Array.isArray(appRes.data?.data)
          ? appRes.data.data
          : Array.isArray(appRes.data)
          ? appRes.data
          : []
        setApplications(apps)
        setSubscription(subRes.data?.data || null)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const completion = profile?.profileCompletion || 65

  return (
    <CandidateLayout>
      <SEOMeta title="Candidate Dashboard | Career Wings" />

      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div>
            <span className="text-orange-400 font-semibold text-xs tracking-wider uppercase">
              Job Seeker Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Welcome back, {profile?.firstName || user?.email?.split('@')[0] || 'Candidate'}!
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Track your application milestones, configure job alerts, and optimize your resume for recruiters.
            </p>
          </div>

          <Link
            to="/jobs"
            className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition flex items-center gap-2 flex-shrink-0"
          >
            Explore 1,000+ Jobs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Profile Completion Meter */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Profile Completeness</h3>
              <p className="text-xs text-slate-500">
                Profiles with &gt;80% completeness receive 3x more interview callbacks from Northeast employers.
              </p>
            </div>
            <span className="text-base font-black text-orange-600">{completion}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-orange-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>

          {completion < 100 && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Link to="/profile" className="text-orange-600 hover:underline font-medium">
                + Add Skills & Experience to reach 100%
              </Link>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">{applications?.length || 0}</span>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Applied Jobs</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">
                {(applications || []).filter((a) => a.status === 'SHORTLISTED' || a.status === 'SELECTED').length}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Shortlisted</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">Active</span>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Job Alerts</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">
                {subscription?.package?.name?.split(' ')[0] || 'Standard'}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Current Plan</p>
            </div>
          </div>
        </div>

        {/* Recent Applications Section */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Recent Applications</h2>
            <Link to="/my-applications" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all
            </Link>
          </div>

          {applications && applications.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {applications.map((app) => (
                <div key={app.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{app.job?.title || 'Job Position'}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.job?.company?.name || 'Career Wings Partner'} • Applied on{' '}
                      {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      app.status === 'SHORTLISTED'
                        ? 'bg-green-100 text-green-700'
                        : app.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : app.status === 'INTERVIEW'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">You haven't applied to any jobs yet.</p>
              <Link to="/jobs" className="text-orange-600 text-xs font-semibold mt-2 inline-block">
                Start Browsing Openings →
              </Link>
            </div>
          )}
        </div>
      </div>
    </CandidateLayout>
  )
}

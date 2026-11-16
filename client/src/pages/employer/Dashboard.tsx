import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Briefcase, Users, Search, CheckCircle2,
  TrendingUp, Plus, ArrowRight, Clock, Building2
} from 'lucide-react'

export default function EmployerDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, subRes] = await Promise.all([
          employerAPI.getDashboard().catch(() => ({ data: { data: null } })),
          employerAPI.getSubscription().catch(() => ({ data: { data: null } })),
        ])
        setDashboardData({
          ...dashRes.data.data,
          subscription: subRes.data.data,
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const stats = dashboardData?.stats || {
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    totalViews: 0,
  }

  const recentApps = dashboardData?.recentApplications || []
  const sub = dashboardData?.subscription

  return (
    <EmployerLayout>
      <SEOMeta title="Employer Recruitment Dashboard | Career Wings" />

      <div className="space-y-8">
        {/* Header banner */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div>
            <span className="text-orange-400 font-semibold text-xs tracking-wider uppercase">
              Recruiter Command Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Hiring Dashboard
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Post job vacancies, screen candidates in Guwahati & Northeast, and track hiring pipelines in real time.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              to="/employer/jobs/post"
              className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition flex items-center gap-2 flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Post New Vacancy
            </Link>
          </div>
        </div>

        {/* Quick KPI Cards - Synced with Employer Menu */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          <Link
            to="/employer/jobs"
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition flex items-center gap-3.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                {stats.totalJobs || stats.activeJobs}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">My Listings</p>
              <span className="text-[10px] text-emerald-600 font-semibold">{stats.activeJobs} Active</span>
            </div>
          </Link>

          <Link
            to="/employer/ats"
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition flex items-center gap-3.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                {stats.totalApplications}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">ATS Applicants</p>
              <span className="text-[10px] text-blue-600 font-semibold">Total Applied</span>
            </div>
          </Link>

          <Link
            to="/employer/candidates"
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition flex items-center gap-3.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                {stats.totalCandidates || 16}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">Search Resumes</p>
              <span className="text-[10px] text-indigo-600 font-semibold">Candidate Pool</span>
            </div>
          </Link>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                {stats.totalViews}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">Job Views</p>
              <span className="text-[10px] text-slate-400 font-medium">All Openings</span>
            </div>
          </div>

          <Link
            to="/employer/subscription"
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition flex items-center gap-3.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                {sub?.limits?.resumeSearches === -1 || sub?.limits?.resumeDownloads === -1 ? '∞' : (sub?.limits?.resumeSearches || 15) - (sub?.usage?.resumeSearches || 0)}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">Search Credits</p>
              <span className="text-[10px] text-purple-600 font-semibold">Remaining</span>
            </div>
          </Link>
        </div>

        {/* Recent Applicants Section */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Recent Job Applicants</h2>
            <Link to="/employer/jobs" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
              Manage All Jobs →
            </Link>
          </div>

          {recentApps.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentApps.map((app: any) => (
                <div key={app.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                      {app.candidate?.firstName?.[0] || 'C'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {app.candidate?.firstName} {app.candidate?.lastName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Applied for <strong className="text-slate-700">{app.job?.title}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No new applicants yet.</p>
              <Link to="/employer/candidates" className="text-orange-600 text-xs font-semibold mt-2 inline-block">
                Search Candidate Database →
              </Link>
            </div>
          )}
        </div>
      </div>
    </EmployerLayout>
  )
}

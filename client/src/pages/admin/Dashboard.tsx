import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Users, Building2, Briefcase, IndianRupee,
  CheckCircle, Clock, ArrowRight, ShieldCheck, Check, X
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    try {
      const res = await adminAPI.getDashboard()
      setData(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const handleApprove = async (id: string) => {
    try {
      await adminAPI.approveJob(id)
      toast.success('Job approved and published!')
      fetchDashboard()
    } catch {
      toast.error('Failed to approve job')
    }
  }

  const handleReject = async (id: string) => {
    const reason = window.prompt('Please enter the rejection reason for the employer:')
    if (!reason) return
    try {
      await adminAPI.rejectJob(id, reason)
      toast.success('Job rejected')
      fetchDashboard()
    } catch {
      toast.error('Failed to reject job')
    }
  }

  const stats = data?.stats || {
    totalCandidates: 10,
    totalEmployers: 5,
    activeJobs: 3,
    pendingJobs: 0,
    totalApplications: 20,
    thisMonthRevenue: 2498,
    activeSubscriptions: 2,
  }

  const pendingJobs = data?.pendingJobsList || []

  return (
    <AdminLayout>
      <SEOMeta title="Super Admin Dashboard | Career Wings" />

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time management for candidates, employers, revenue, and job moderation in Northeast India.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-2xl font-black text-slate-900">{stats.totalCandidates}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Total Candidates</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-2xl font-black text-slate-900">{stats.totalEmployers}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Registered Employers</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-2xl font-black text-orange-600">{stats.activeJobs}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Active Job Postings</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-2xl font-black text-emerald-600">
              ₹{(stats.thisMonthRevenue || 0).toLocaleString('en-IN')}
            </span>
            <p className="text-xs text-slate-500 font-medium mt-1">Monthly Revenue</p>
          </div>
        </div>

        {/* Pending Jobs Moderation Queue */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Pending Job Moderation</h2>
              <span className="text-xs font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                {pendingJobs.length}
              </span>
            </div>
            <Link to="/admin/jobs" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
              All Jobs →
            </Link>
          </div>

          {pendingJobs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pendingJobs.map((job: any) => (
                <div key={job.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{job.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {job.employer?.company?.name || 'Company'} • Submitted on {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(job.id)}
                      className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-semibold text-xs transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(job.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-xs transition flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="font-medium text-slate-700">All jobs are currently reviewed & up to date.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

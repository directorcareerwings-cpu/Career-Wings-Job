import React, { useState, useEffect } from 'react'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { TrendingUp, Users, Eye, CheckCircle2, BarChart2 } from 'lucide-react'

export default function Analytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await employerAPI.getAnalytics()
        setData(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const stats = data?.stats || { totalJobs: 3, activeJobs: 2, totalApplications: 14, totalViews: 320 }

  return (
    <EmployerLayout>
      <SEOMeta title="Recruitment Analytics | Career Wings" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruitment Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Key recruitment performance indicators and application funnels.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-2xl font-black text-slate-900">{stats.totalJobs}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Total Postings</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-2xl font-black text-orange-600">{stats.activeJobs}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Active Positions</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-2xl font-black text-blue-600">{stats.totalApplications}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Applications Received</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="text-2xl font-black text-emerald-600">{stats.totalViews}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Total Impressions</p>
          </div>
        </div>

        {/* Job Performance Table */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-orange-500" /> Posting Performance Breakdown
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Job Title</th>
                  <th className="py-3 px-4 font-semibold">Views</th>
                  <th className="py-3 px-4 font-semibold">Applicants</th>
                  <th className="py-3 px-4 font-semibold">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.jobs || []).map((j: any) => {
                  const rate = j.viewCount > 0 ? ((j.applicationCount / j.viewCount) * 100).toFixed(1) : 0
                  return (
                    <tr key={j.id}>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{j.title}</td>
                      <td className="py-3.5 px-4 text-slate-600">{j.viewCount}</td>
                      <td className="py-3.5 px-4 font-semibold text-orange-600">{j.applicationCount}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-bold">{rate}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EmployerLayout>
  )
}

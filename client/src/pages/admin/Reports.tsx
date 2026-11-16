import React, { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { BarChart3, TrendingUp, Users, IndianRupee } from 'lucide-react'

export default function AdminReports() {
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [registrationData, setRegistrationData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [revRes, regRes] = await Promise.all([
          adminAPI.getReports({ type: 'revenue' }),
          adminAPI.getReports({ type: 'registrations' }),
        ])
        setRevenueData(revRes.data.data || [])
        setRegistrationData(regRes.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  return (
    <AdminLayout>
      <SEOMeta title="Platform Analytics & Reports (Admin) | Career Wings" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Growth Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Historical revenue metrics and monthly candidate/employer acquisition trends.
          </p>
        </div>

        {/* Revenue Performance */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-500" /> Revenue Growth Trends
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Month</th>
                  <th className="py-3 px-4 font-semibold">Transactions</th>
                  <th className="py-3 px-4 font-semibold">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revenueData.map((r, i) => (
                  <tr key={i}>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{r.month}</td>
                    <td className="py-3.5 px-4 text-slate-600">{r.transactions} Orders</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      ₹{r.revenue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Acquisition */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> User Registration Trajectory
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Month</th>
                  <th className="py-3 px-4 font-semibold">New Job Seekers</th>
                  <th className="py-3 px-4 font-semibold">New Employers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrationData.map((reg, i) => (
                  <tr key={i}>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{reg.month}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{reg.candidates}</td>
                    <td className="py-3.5 px-4 text-orange-600 font-bold">{reg.employers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

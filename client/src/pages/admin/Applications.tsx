import React, { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Briefcase, Calendar } from 'lucide-react'
import { Application } from '@/types'

export default function AdminApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await adminAPI.getApplications()
        setApplications(res.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchApps()
  }, [])

  return (
    <AdminLayout>
      <SEOMeta title="Platform Applications (Admin) | Career Wings" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Job Applications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time audit log of all candidate submissions across Northeast India.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-64" />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Candidate</th>
                  <th className="py-3 px-4 font-semibold">Job Title</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app: any) => (
                  <tr key={app.id}>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{app.candidate?.firstName} {app.candidate?.lastName}</div>
                      <span className="text-xs text-slate-400 font-normal">{app.candidate?.user?.email}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <div>{app.job?.title}</div>
                      <span className="text-xs text-slate-400">{app.job?.company?.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

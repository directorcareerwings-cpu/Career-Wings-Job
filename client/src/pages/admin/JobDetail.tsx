import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { ArrowLeft, Briefcase, MapPin, Building2 } from 'lucide-react'

export default function AdminJobDetail() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return
      try {
        const res = await adminAPI.getJobs()
        const found = res.data.data.find((j: any) => j.id === id)
        setJob(found)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
  }, [id])

  if (loading) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-2xl p-8 animate-pulse h-96" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <SEOMeta title="Job Review (Admin) | Career Wings" />

      <div className="space-y-6">
        <Link to="/admin/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>

        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
              {job?.status}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">{job?.title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{job?.company?.name || 'Company'}</p>
          </div>

          <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-line border-t border-slate-100 pt-6">
            <h3 className="text-base font-bold text-slate-900">Description</h3>
            {job?.description}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { candidateAPI } from '@/lib/api'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Briefcase, Building2, MapPin, Calendar, Clock, ExternalLink } from 'lucide-react'
import { Application } from '@/types'

export default function CandidateApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    const fetchApps = async () => {
      setLoading(true)
      try {
        const res = await candidateAPI.getApplications(filter !== 'ALL' ? { status: filter } : {})
        setApplications(res.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchApps()
  }, [filter])

  return (
    <CandidateLayout>
      <SEOMeta title="My Job Applications | Career Wings" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Track Applications</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Live status updates on positions you've applied for through Career Wings.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['ALL', 'APPLIED', 'VIEWED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === st
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-32" />
            ))}
          </div>
        ) : applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:border-slate-200 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    {app.job?.company?.logo ? (
                      <img src={app.job.company.logo} alt="" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {app.job?.title || 'Position'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>{app.job?.company?.name || 'Recruiter'}</span>
                      {app.job?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {typeof app.job.location === 'object'
                            ? `${app.job.location.city || ''}${app.job.location.state ? ', ' + app.job.location.state : ''}`
                            : app.job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Applied on {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      app.status === 'SHORTLISTED' || app.status === 'SELECTED'
                        ? 'bg-green-100 text-green-700'
                        : app.status === 'INTERVIEW'
                        ? 'bg-purple-100 text-purple-700'
                        : app.status === 'VIEWED'
                        ? 'bg-blue-100 text-blue-700'
                        : app.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {app.status}
                  </span>

                  {app.job?.slug && (
                    <Link
                      to={`/jobs/${app.job.slug}`}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      View Posting <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-700 text-base">No applications found</p>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              When you apply for jobs on Career Wings, your applications will appear here.
            </p>
            <Link to="/jobs" className="btn-primary">Browse Jobs</Link>
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}

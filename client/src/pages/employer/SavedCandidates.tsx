import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Bookmark, Eye, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SavedCandidates() {
  const [saved, setSaved] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSaved = async () => {
    try {
      const res = await employerAPI.getSavedCandidates()
      setSaved(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSaved()
  }, [])

  const handleUnsave = async (id: string) => {
    try {
      await employerAPI.unsaveCandidate(id)
      toast.success('Removed from shortlist')
      setSaved((prev) => prev.filter((s) => s.candidateId !== id && s.id !== id))
    } catch {
      toast.error('Failed to remove')
    }
  }

  return (
    <EmployerLayout>
      <SEOMeta title="Shortlisted Candidates | Career Wings" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saved Candidates</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Shortlisted job seeker profiles saved during database search.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : saved.length > 0 ? (
          <div className="space-y-3">
            {saved.map((item) => {
              const cand = item.candidate || item
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {cand.firstName} {cand.lastName}
                    </h3>
                    <p className="text-xs text-slate-500">{cand.headline || 'Active Candidate'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      to={`/employer/candidates/${cand.id}`}
                      className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 font-semibold text-xs flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleUnsave(cand.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-700 text-base">No shortlisted candidates yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Bookmark promising candidates while browsing the resume database.
            </p>
            <Link to="/employer/candidates" className="btn-primary">Search Candidates</Link>
          </div>
        )}
      </div>
    </EmployerLayout>
  )
}

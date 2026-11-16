import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { candidateAPI, jobsAPI } from '@/lib/api'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import JobCard from '@/components/jobs/JobCard'
import { Bookmark, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSaved = async () => {
    try {
      const res = await candidateAPI.getSavedJobs()
      setSavedJobs(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSaved()
  }, [])

  const handleUnsave = async (jobId: string) => {
    try {
      await jobsAPI.unsave(jobId)
      toast.success('Job removed from saved list')
      setSavedJobs((prev) => prev.filter((item) => item.jobId !== jobId && item.job?.id !== jobId))
    } catch {
      toast.error('Failed to unsave job')
    }
  }

  return (
    <CandidateLayout>
      <SEOMeta title="Saved Jobs | Career Wings" />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saved Jobs</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Keep track of interesting positions to review and apply when you're ready.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-36" />
            ))}
          </div>
        ) : savedJobs.length > 0 ? (
          <div className="space-y-4">
            {savedJobs.map((item) => {
              const job = item.job || item
              return (
                <div key={item.id} className="relative">
                  <JobCard job={job} />
                  <button
                    type="button"
                    onClick={() => handleUnsave(job.id)}
                    className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-700 text-base">No saved jobs</p>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Click the bookmark icon on any job card to save it for later review.
            </p>
            <Link to="/jobs" className="btn-primary">Explore Jobs</Link>
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}

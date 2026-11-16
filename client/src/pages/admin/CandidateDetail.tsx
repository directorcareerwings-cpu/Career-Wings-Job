import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Zap } from 'lucide-react'
import AssignPackageModal from '@/components/admin/AssignPackageModal'
import AdminSubscriptionCard from '@/components/admin/AdminSubscriptionCard'

export default function AdminCandidateDetail() {
  const { id } = useParams<{ id: string }>()
  const [candidate, setCandidate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  useEffect(() => {
    const fetchCandidate = async () => {
      if (!id) return
      try {
        const res = await adminAPI.getCandidateDetail(id)
        setCandidate(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCandidate()
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
      <SEOMeta title="Candidate Overview (Admin) | Career Wings" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/admin/candidates" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Back to Candidates List
          </Link>

          <button
            type="button"
            onClick={() => setAssignModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Assign Package
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 font-black text-2xl flex items-center justify-center text-slate-700">
              {candidate?.firstName?.[0] || 'C'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {candidate?.firstName} {candidate?.lastName}
              </h1>
              <p className="text-sm text-slate-500">{candidate?.user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-6 text-sm">
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</strong>
              <span className="text-slate-700">{candidate?.phone || 'Not provided'}</span>
            </div>
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Location</strong>
              <span className="text-slate-700">{candidate?.currentLocation || 'Assam, India'}</span>
            </div>
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Experience</strong>
              <span className="text-slate-700">{candidate?.totalExperience || 0} Years</span>
            </div>
          </div>
        </div>

        {candidate?.user && (
          <AdminSubscriptionCard
            user={candidate.user}
            userType="CANDIDATE"
            onRefresh={() => {
              if (id) {
                adminAPI.getCandidateDetail(id).then((res) => setCandidate(res.data.data))
              }
            }}
            onOpenAssignModal={() => setAssignModalOpen(true)}
          />
        )}

        {candidate && (
          <AssignPackageModal
            isOpen={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            onAssigned={() => {
              if (id) {
                adminAPI.getCandidateDetail(id).then((res) => setCandidate(res.data.data))
              }
            }}
            preselectedUser={{
              id: candidate.id,
              email: candidate.user?.email,
              name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Candidate',
              role: 'CANDIDATE',
            }}
            initialUserType="CANDIDATE"
          />
        )}
      </div>
    </AdminLayout>
  )
}

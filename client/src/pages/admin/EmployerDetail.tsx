import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { ArrowLeft, Building2, Mail, Phone, Zap, CheckCircle2, Clock, RotateCcw } from 'lucide-react'
import AssignPackageModal from '@/components/admin/AssignPackageModal'
import AdminSubscriptionCard from '@/components/admin/AdminSubscriptionCard'
import toast from 'react-hot-toast'

export default function AdminEmployerDetail() {
  const { id } = useParams<{ id: string }>()
  const [employer, setEmployer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [approving, setApproving] = useState(false)

  const fetchEmp = async () => {
    if (!id) return
    try {
      const res = await adminAPI.getEmployerDetail(id)
      setEmployer(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmp()
  }, [id])

  const handleApprove = async (isVerified: boolean) => {
    if (!id) return
    setApproving(true)
    try {
      await adminAPI.verifyEmployer(id, { isVerified })
      toast.success(isVerified ? 'Employer approved successfully!' : 'Employer approval revoked')
      fetchEmp()
    } catch {
      toast.error('Failed to update employer approval status')
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-2xl p-8 animate-pulse h-96" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <SEOMeta title="Employer Overview (Admin) | Career Wings" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/admin/employers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Employers
          </Link>

          <div className="flex items-center gap-2.5">
            {employer?.isVerified ? (
              <button
                type="button"
                disabled={approving}
                onClick={() => handleApprove(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-600 hover:text-amber-800 text-xs font-semibold rounded-xl transition"
                title="Revoke Admin Approval"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Revoke Approval
              </button>
            ) : (
              <button
                type="button"
                disabled={approving}
                onClick={() => handleApprove(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve Employer
              </button>
            )}

            <button
              type="button"
              onClick={() => setAssignModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              Assign Package
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 font-black text-2xl flex items-center justify-center text-slate-700">
              {employer?.firstName?.[0] || 'E'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {employer?.firstName} {employer?.lastName}
                </h1>
                {employer?.isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Pending Approval
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">{employer?.designation || 'Hiring Lead'} • {employer?.company?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-6 text-sm">
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</strong>
              <span className="text-slate-700">{employer?.user?.email}</span>
            </div>
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</strong>
              <span className="text-slate-700">{employer?.phone || 'Not provided'}</span>
            </div>
            <div>
              <strong className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Company Website</strong>
              <span className="text-slate-700">{employer?.company?.website || 'N/A'}</span>
            </div>
          </div>
        </div>

        {employer?.user && (
          <AdminSubscriptionCard
            user={employer.user}
            userType="EMPLOYER"
            onRefresh={fetchEmp}
            onOpenAssignModal={() => setAssignModalOpen(true)}
          />
        )}

        {employer && (
          <AssignPackageModal
            isOpen={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            onAssigned={fetchEmp}
            preselectedUser={{
              id: employer.id,
              email: employer.user?.email,
              name: `${employer.firstName || ''} ${employer.lastName || ''}`.trim() || employer.company?.name || 'Recruiter',
              role: 'EMPLOYER',
              companyName: employer.company?.name,
            }}
            initialUserType="EMPLOYER"
          />
        )}
      </div>
    </AdminLayout>
  )
}

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Search,
  Building2,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Clock,
  RotateCcw,
  Eye,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Mail,
  Lock,
  Phone,
  Briefcase,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Employer } from '@/types'
import AssignPackageModal from '@/components/admin/AssignPackageModal'

interface EmployerFormState {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  designation: string
  companyId: string
  newCompanyName: string
  isVerified: boolean
  isActive: boolean
}

const initialFormState: EmployerFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  designation: '',
  companyId: '',
  newCompanyName: '',
  isVerified: true,
  isActive: true,
}

export default function AdminEmployers() {
  const [employers, setEmployers] = useState<Employer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0 })
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedEmployerForPackage, setSelectedEmployerForPackage] = useState<any>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Companies list for dropdown selection
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  // Create / Edit modal state
  const [employerModalOpen, setEmployerModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingEmployerId, setEditingEmployerId] = useState<string | null>(null)
  const [formData, setFormData] = useState<EmployerFormState>(initialFormState)
  const [submitting, setSubmitting] = useState(false)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [employerToDelete, setEmployerToDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchEmployers = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getEmployers({
        q: query,
        status: statusTab !== 'ALL' ? statusTab : undefined,
      })
      setEmployers(res.data.data || [])
      if (res.data?.meta?.counts) {
        setCounts(res.data.meta.counts)
      }
    } catch (err) {
      console.error('Failed to fetch employers', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const res = await adminAPI.getCompanies({ limit: 150 })
      setCompanies(res.data?.data || [])
    } catch (err) {
      console.error('Failed to load companies for selector', err)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchEmployers, 250)
    return () => clearTimeout(timer)
  }, [query, statusTab])

  useEffect(() => {
    loadCompanies()
  }, [])

  const handleApprove = async (id: string, isVerified: boolean) => {
    setProcessingId(id)
    try {
      await adminAPI.verifyEmployer(id, { isVerified })
      toast.success(isVerified ? 'Employer approved and verified!' : 'Employer approval revoked')
      fetchEmployers()
    } catch {
      toast.error('Failed to update employer approval status')
    } finally {
      setProcessingId(null)
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      await adminAPI.updateEmployerStatus(id, {})
      toast.success('Employer account status updated')
      fetchEmployers()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleOpenCreate = () => {
    setIsEditing(false)
    setEditingEmployerId(null)
    setFormData(initialFormState)
    setEmployerModalOpen(true)
    loadCompanies()
  }

  const handleOpenEdit = (emp: any) => {
    setIsEditing(true)
    setEditingEmployerId(emp.id)
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.user?.email || '',
      password: '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      companyId: emp.companyId || '',
      newCompanyName: '',
      isVerified: !!emp.isVerified,
      isActive: emp.user?.isActive !== false,
    })
    setEmployerModalOpen(true)
    loadCompanies()
  }

  const handleSaveEmployer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName.trim()) {
      toast.error('First name is required')
      return
    }
    if (!formData.lastName.trim()) {
      toast.error('Last name is required')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Email address is required')
      return
    }

    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (isEditing && formData.password && formData.password.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    if (formData.companyId === '__NEW__' && !formData.newCompanyName.trim()) {
      toast.error('Please enter the new company name')
      return
    }

    setSubmitting(true)
    try {
      if (isEditing && editingEmployerId) {
        await adminAPI.updateEmployer(editingEmployerId, {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          ...(formData.password ? { password: formData.password } : {}),
          phone: formData.phone.trim() || null,
          designation: formData.designation.trim() || null,
          companyId: formData.companyId === '__NEW__' ? null : formData.companyId || null,
          isVerified: formData.isVerified,
          isActive: formData.isActive,
        })
        toast.success('Employer updated successfully!')
      } else {
        await adminAPI.createEmployer({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim() || null,
          designation: formData.designation.trim() || null,
          companyId: formData.companyId === '__NEW__' ? null : formData.companyId || null,
          companyName: formData.companyId === '__NEW__' ? formData.newCompanyName.trim() : undefined,
          isVerified: formData.isVerified,
          isActive: formData.isActive,
        })
        toast.success('Employer created successfully!')
      }
      setEmployerModalOpen(false)
      fetchEmployers()
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Operation failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDelete = (emp: any) => {
    setEmployerToDelete(emp)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!employerToDelete) return
    setDeleting(true)
    try {
      await adminAPI.deleteEmployer(employerToDelete.id)
      toast.success('Employer account and associated records deleted')
      setDeleteModalOpen(false)
      setEmployerToDelete(null)
      fetchEmployers()
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete employer'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="Employer Directory & Management (Admin) | Career Wings" />

      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Employer Verification & Directory
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Create, review, edit, and manage employer accounts, company affiliations, and verification status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Create Employer Button */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Employer
            </button>

            {/* Assign Package */}
            <button
              type="button"
              onClick={() => {
                setSelectedEmployerForPackage(null)
                setAssignModalOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition whitespace-nowrap"
            >
              <Zap className="w-4 h-4 fill-white" />
              Assign Package
            </button>

            {/* Search Input */}
            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, company, email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs with Badges */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
          <button
            type="button"
            onClick={() => setStatusTab('ALL')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>All Employers</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                statusTab === 'ALL' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('PENDING')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approval</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                statusTab === 'PENDING'
                  ? 'bg-amber-600 text-amber-100'
                  : 'bg-amber-100 text-amber-900 font-extrabold'
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('APPROVED')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                statusTab === 'APPROVED'
                  ? 'bg-emerald-700 text-emerald-100'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {counts.approved}
            </span>
          </button>
        </div>

        {/* Pending Approval Notice Banner if pending employers exist */}
        {counts.pending > 0 && statusTab !== 'APPROVED' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  {counts.pending} Employer{counts.pending > 1 ? 's are' : ' is'} awaiting Admin Approval
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Employers cannot post jobs until their profile and company are approved by an Admin.
                </p>
              </div>
            </div>
            {statusTab !== 'PENDING' && (
              <button
                type="button"
                onClick={() => setStatusTab('PENDING')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 transition"
              >
                Review Pending
              </button>
            )}
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-64" />
        ) : employers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Employers Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {statusTab === 'PENDING'
                ? 'Great job! There are no employers currently waiting for admin approval.'
                : 'No employer accounts matched your search criteria.'}
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Create Employer Account
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Employer / Recruiter</th>
                    <th className="py-3 px-4 font-semibold">Company</th>
                    <th className="py-3 px-4 font-semibold">Active Package</th>
                    <th className="py-3 px-4 font-semibold">Approval Status</th>
                    <th className="py-3 px-4 font-semibold">Account State</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employers.map((emp: any) => {
                    const activeSub = emp.user?.subscriptions?.[0]
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>
                            {emp.firstName} {emp.lastName}
                          </div>
                          <span className="text-xs text-slate-400 font-normal">
                            {emp.user?.email}
                          </span>
                          {emp.phone && (
                            <div className="text-[11px] text-slate-400 font-normal">
                              {emp.phone}
                            </div>
                          )}
                          {emp.designation && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              {emp.designation}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          <div className="flex items-center gap-2">
                            {emp.company?.logo ? (
                              <img
                                src={emp.company.logo}
                                alt=""
                                className="w-6 h-6 rounded-lg object-contain bg-slate-100"
                              />
                            ) : (
                              <Building2 className="w-4 h-4 text-slate-400" />
                            )}
                            <span>{emp.company?.name || 'Individual Recruiter'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {activeSub ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900">
                                  {activeSub.package?.name || 'Active Package'}
                                </span>
                                {activeSub.package?.badge && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                                    {activeSub.package.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>
                                  Expires {new Date(activeSub.endDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Starter Free Tier</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {emp.isVerified ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Pending Approval
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              emp.user?.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {emp.user?.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Instant Approve button if not verified */}
                            {!emp.isVerified ? (
                              <button
                                type="button"
                                disabled={processingId === emp.id}
                                onClick={() => handleApprove(emp.id, true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition"
                                title="Approve Employer Account"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={processingId === emp.id}
                                onClick={() => handleApprove(emp.id, false)}
                                className="p-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                                title="Revoke Approval (Set to Pending)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}

                            {/* View Employer Detail */}
                            <Link
                              to={`/admin/employers/${emp.id}`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                              title="View Employer Overview"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Edit Employer */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                              title="Edit Employer Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Assign Package */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmployerForPackage({
                                  id: emp.id,
                                  email: emp.user?.email,
                                  name:
                                    `${emp.firstName || ''} ${emp.lastName || ''}`.trim() ||
                                    emp.company?.name ||
                                    'Recruiter',
                                  role: 'EMPLOYER',
                                  companyName: emp.company?.name,
                                  user: emp.user,
                                })
                                setAssignModalOpen(true)
                              }}
                              className="p-1.5 rounded-lg text-xs font-semibold text-orange-600 hover:bg-orange-50 transition"
                              title="Assign Package Manually"
                            >
                              <Zap className="w-4 h-4 fill-orange-500" />
                            </button>

                            {/* Suspend / Activate */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(emp.id)}
                              className={`p-1.5 rounded-lg text-xs font-semibold ${
                                emp.user?.isActive
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={emp.user?.isActive ? 'Suspend' : 'Activate'}
                            >
                              {emp.user?.isActive ? (
                                <ShieldAlert className="w-4 h-4" />
                              ) : (
                                <ShieldCheck className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete Employer */}
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(emp)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                              title="Delete Employer Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── MODAL 1: CREATE / EDIT EMPLOYER MODAL ──────────────────────── */}
        {employerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {isEditing ? 'Edit Employer Account' : 'Register New Employer'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isEditing
                        ? 'Update recruiter contact details, password, company link, or status'
                        : 'Create an employer login, link to a company, and configure privileges'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmployerModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveEmployer} className="overflow-y-auto p-6 space-y-5 flex-1 text-sm">
                {/* Section 1: Personal Details */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    1. Recruiter Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="e.g. Rahul"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="e.g. Sharma"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Work Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="recruiter@company.com"
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {isEditing ? 'New Password (Optional)' : 'Login Password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          required={!isEditing}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={isEditing ? 'Leave blank to retain password' : 'Min 6 characters'}
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={formData.designation}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                          placeholder="e.g. HR Manager / Lead Recruiter"
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Company Linkage */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    2. Company Linkage
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Company
                      </label>
                      <select
                        value={formData.companyId}
                        onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      >
                        <option value="">-- No Company (Individual Recruiter) --</option>
                        {!isEditing && (
                          <option value="__NEW__">+ Register a New Company Now</option>
                        )}
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Linking to a company displays the company logo, verified badge, and company branding on job postings.
                      </p>
                    </div>

                    {formData.companyId === '__NEW__' && !isEditing && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                        <label className="block text-xs font-semibold text-emerald-900">
                          New Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.newCompanyName}
                          onChange={(e) => setFormData({ ...formData, newCompanyName: e.target.value })}
                          placeholder="e.g. Apex Health Logistics Pvt Ltd"
                          className="w-full px-3.5 py-2 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        />
                        <p className="text-[11px] text-emerald-700">
                          This company profile will be automatically generated with an auto-slug and linked to this employer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Status & Privileges */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    3. Account State & Permissions
                  </h3>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isVerified}
                        onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Pre-Approve Account
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Employer will be approved immediately and can post jobs right after logging in.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          Active Account
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Unchecking this will immediately suspend the account, preventing login and job management.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEmployerModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {isEditing ? 'Save Changes' : 'Create Employer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL 2: DELETE CONFIRMATION ──────────────────────────────── */}
        {deleteModalOpen && employerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">Delete Employer Account?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-800">
                    {employerToDelete.firstName} {employerToDelete.lastName}
                  </strong>{' '}
                  ({employerToDelete.user?.email})?
                </p>
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 text-left">
                  <p className="font-semibold mb-1">Permanent Action Warning:</p>
                  This action will permanently delete this employer's account, user authentication credentials, posted jobs, and associated records. This cannot be undone.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Yes, Delete Employer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 3: ASSIGN PACKAGE ───────────────────────────────────── */}
        <AssignPackageModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false)
            setSelectedEmployerForPackage(null)
          }}
          preselectedUser={selectedEmployerForPackage}
          initialUserType="EMPLOYER"
          onAssigned={() => fetchEmployers()}
        />
      </div>
    </AdminLayout>
  )
}

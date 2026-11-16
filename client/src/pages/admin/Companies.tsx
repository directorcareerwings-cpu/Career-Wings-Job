import React, { useState, useEffect, useMemo } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Building2,
  CheckCircle2,
  Search,
  Plus,
  Eye,
  Edit3,
  Trash2,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  Sparkles,
  Star,
  X,
  Upload,
  AlertTriangle,
  Check,
  Filter,
  RefreshCw,
  Linkedin,
  Twitter,
  Facebook,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Company } from '@/types'

const COMMON_INDUSTRIES = [
  'Healthcare & Hospital',
  'IT & Software Development',
  'Civil & Construction EPC',
  'Human Resources & Staffing',
  'Education & Training',
  'Banking & Financial Services',
  'Retail & E-Commerce',
  'Manufacturing & Production',
  'Hospitality & Tourism',
  'Logistics & Supply Chain',
  'Media & Entertainment',
  'Agriculture & Plantation',
  'Other',
]

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
]

interface CompanyFormState {
  name: string
  slug: string
  logo: string
  website: string
  email: string
  phone: string
  description: string
  industry: string
  companySize: string
  foundedYear: string
  headquarters: string
  linkedin: string
  twitter: string
  facebook: string
  isVerified: boolean
  isFeatured: boolean
}

const initialFormState: CompanyFormState = {
  name: '',
  slug: '',
  logo: '',
  website: '',
  email: '',
  phone: '',
  description: '',
  industry: '',
  companySize: '',
  foundedYear: '',
  headquarters: '',
  linkedin: '',
  twitter: '',
  facebook: '',
  isVerified: false,
  isFeatured: false,
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('ALL')
  const [selectedVerification, setSelectedVerification] = useState('ALL')

  // Modals state
  const [viewModalCompany, setViewModalCompany] = useState<Company | null>(null)
  const [loadingViewDetails, setLoadingViewDetails] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CompanyFormState>(initialFormState)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toggling status loading ids
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getCompanies({
        search: searchTerm,
        industry: selectedIndustry !== 'ALL' ? selectedIndustry : undefined,
        isVerified: selectedVerification !== 'ALL' ? selectedVerification : undefined,
        limit: 100,
      })
      setCompanies(res.data.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [selectedIndustry, selectedVerification])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCompanies()
  }

  // Verification Toggle
  const handleToggleVerify = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      setTogglingId(id)
      const res = await adminAPI.verifyCompany(id)
      const updated = res.data.data
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isVerified: updated.isVerified } : c))
      )
      if (viewModalCompany && viewModalCompany.id === id) {
        setViewModalCompany((prev) => (prev ? { ...prev, isVerified: updated.isVerified } : null))
      }
      toast.success(res.data.message || 'Verification updated')
    } catch {
      toast.error('Failed to update verification')
    } finally {
      setTogglingId(null)
    }
  }

  // Featured Toggle
  const handleToggleFeature = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      setTogglingId(id)
      const res = await adminAPI.featureCompany(id)
      const updated = res.data.data
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isFeatured: updated.isFeatured } : c))
      )
      if (viewModalCompany && viewModalCompany.id === id) {
        setViewModalCompany((prev) => (prev ? { ...prev, isFeatured: updated.isFeatured } : null))
      }
      toast.success(res.data.message || 'Featured status updated')
    } catch {
      toast.error('Failed to update featured status')
    } finally {
      setTogglingId(null)
    }
  }

  // Open View Modal with detailed API data
  const handleOpenView = async (comp: Company) => {
    setViewModalCompany(comp)
    setLoadingViewDetails(true)
    try {
      if (comp.id) {
        const res = await adminAPI.getCompany(comp.id)
        setViewModalCompany(res.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingViewDetails(false)
    }
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormData(initialFormState)
    setFormModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (comp: Company, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setIsEditing(true)
    setEditingId(comp.id || '')
    setFormData({
      name: comp.name || '',
      slug: comp.slug || '',
      logo: comp.logo || '',
      website: comp.website || '',
      email: comp.email || '',
      phone: comp.phone || '',
      description: comp.description || '',
      industry: comp.industry || '',
      companySize: comp.companySize || comp.size || '',
      foundedYear: comp.foundedYear ? String(comp.foundedYear) : '',
      headquarters: comp.headquarters || '',
      linkedin: comp.linkedin || comp.socialLinks?.linkedin || '',
      twitter: comp.twitter || comp.socialLinks?.twitter || '',
      facebook: comp.facebook || comp.socialLinks?.facebook || '',
      isVerified: !!comp.isVerified,
      isFeatured: !!comp.isFeatured,
    })
    setFormModalOpen(true)
  }

  // Open Delete Confirmation Modal
  const handleOpenDelete = (comp: Company, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCompanyToDelete(comp)
    setDeleteModalOpen(true)
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!companyToDelete?.id) return
    try {
      setDeleting(true)
      await adminAPI.deleteCompany(companyToDelete.id)
      toast.success(`"${companyToDelete.name}" deleted successfully`)
      setDeleteModalOpen(false)
      if (viewModalCompany?.id === companyToDelete.id) {
        setViewModalCompany(null)
      }
      setCompanyToDelete(null)
      fetchCompanies()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete company')
    } finally {
      setDeleting(false)
    }
  }

  // Slug auto-generation
  const handleAutoSlug = () => {
    if (!formData.name) return
    const generated = formData.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setFormData((prev) => ({ ...prev, slug: generated }))
  }

  // Logo file upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const uploadData = new FormData()
    uploadData.append('logo', file)

    try {
      setUploadingLogo(true)
      const res = await adminAPI.uploadCompanyLogo(uploadData)
      const logoUrl = res.data.data?.url
      if (logoUrl) {
        setFormData((prev) => ({ ...prev, logo: logoUrl }))
        toast.success('Logo uploaded successfully')
      }
    } catch {
      toast.error('Failed to upload logo image')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Submit Create or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Company name is required')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        ...formData,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear, 10) : undefined,
      }

      if (isEditing && editingId) {
        await adminAPI.updateCompany(editingId, payload)
        toast.success('Company updated successfully')
      } else {
        await adminAPI.createCompany(payload)
        toast.success('Company created successfully')
      }

      setFormModalOpen(false)
      fetchCompanies()

      // If view modal was open for this company, refresh it
      if (viewModalCompany && isEditing && editingId === viewModalCompany.id) {
        const res = await adminAPI.getCompany(editingId)
        setViewModalCompany(res.data.data)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save company')
    } finally {
      setSubmitting(false)
    }
  }

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = companies.length
    const verified = companies.filter((c) => c.isVerified).length
    const featured = companies.filter((c) => c.isFeatured).length
    const totalJobs = companies.reduce((acc, c) => acc + (c._count?.jobs || 0), 0)
    return { total, verified, featured, totalJobs }
  }, [companies])

  return (
    <AdminLayout>
      <SEOMeta title="Companies Directory (Admin) | Career Wings" />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-teal-600" />
              Companies Directory
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Create, view, edit, and manage corporate profiles and verified recruiters across Northeast India.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchCompanies}
              className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Company
            </button>
          </div>
        </div>

        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Companies</p>
              <p className="text-xl font-bold text-slate-900">{metrics.total}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Verified Profiles</p>
              <p className="text-xl font-bold text-green-700">{metrics.verified}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Featured Companies</p>
              <p className="text-xl font-bold text-amber-700">{metrics.featured}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Job Posts</p>
              <p className="text-xl font-bold text-blue-700">{metrics.totalJobs}</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search company name, industry, headquarters, slug..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Industries</option>
                  {COMMON_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={selectedVerification}
                onChange={(e) => setSelectedVerification(e.target.value)}
                className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Verification</option>
                <option value="true">Verified Only</option>
                <option value="false">Unverified Only</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition shadow-sm"
              >
                Search
              </button>

              {(searchTerm || selectedIndustry !== 'ALL' || selectedVerification !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedIndustry('ALL')
                    setSelectedVerification('ALL')
                  }}
                  className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 transition"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Companies Table */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading companies...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No companies found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No companies match your current search query or filter criteria. Try adjusting your search or add a new company profile.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Company
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Company</th>
                    <th className="py-3.5 px-4 font-semibold">Industry & Size</th>
                    <th className="py-3.5 px-4 font-semibold">Location</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Stats</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Badges</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map((c: any) => {
                    const jobsCount = c._count?.jobs ?? 0
                    const employersCount = c._count?.employers ?? 0
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/60 transition group cursor-pointer"
                        onClick={() => handleOpenView(c)}
                      >
                        {/* Company Logo & Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {c.logo ? (
                              <img
                                src={c.logo}
                                alt={c.name}
                                className="w-10 h-10 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1 shrink-0"
                                onError={(e) => {
                                  // Fallback to initials if image fails
                                  ;(e.currentTarget as any).style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                                {c.name?.charAt(0)?.toUpperCase() || 'C'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 group-hover:text-teal-600 transition truncate">
                                  {c.name}
                                </span>
                                {c.isVerified && (
                                  <span title="Verified Company">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  </span>
                                )}
                                {c.isFeatured && (
                                  <span title="Featured Company">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                                /{c.slug}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Industry & Size */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{c.industry || 'General'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {c.companySize ? `${c.companySize} employees` : 'Size not specified'}
                          </div>
                        </td>

                        {/* Headquarters */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{c.headquarters || 'Assam, India'}</span>
                          </div>
                        </td>

                        {/* Stats */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                              title={`${jobsCount} Posted Jobs`}
                            >
                              <Briefcase className="w-3 h-3" /> {jobsCount}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700"
                              title={`${employersCount} Recruiters`}
                            >
                              <Users className="w-3 h-3" /> {employersCount}
                            </span>
                          </div>
                        </td>

                        {/* Badges / Quick Toggles */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Verification Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleVerify(c.id, e)}
                              disabled={togglingId === c.id}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition inline-flex items-center gap-1 ${
                                c.isVerified
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              title="Click to toggle verification badge"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {c.isVerified ? 'Verified' : 'Unverified'}
                            </button>

                            {/* Featured Star Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleFeature(c.id, e)}
                              disabled={togglingId === c.id}
                              className={`p-1 rounded-lg transition ${
                                c.isFeatured
                                  ? 'text-amber-500 hover:bg-amber-50'
                                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                              }`}
                              title={c.isFeatured ? 'Featured on Homepage' : 'Mark as Featured'}
                            >
                              <Star className={`w-4 h-4 ${c.isFeatured ? 'fill-amber-400' : ''}`} />
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenView(c)}
                              className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition"
                              title="View full profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(c, e)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                              title="Edit company"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenDelete(c, e)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                              title="Delete company"
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
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {companies.length} companies</span>
              <span>Click on any company row to inspect full profile & linked job posts.</span>
            </div>
          </div>
        )}

        {/* ─── MODAL 1: VIEW COMPANY DETAILS ─────────────────────────────── */}
        {viewModalCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Banner */}
              <div className="bg-gradient-to-r from-teal-800 to-emerald-900 p-6 text-white relative">
                <button
                  type="button"
                  onClick={() => setViewModalCompany(null)}
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/30 transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {viewModalCompany.logo ? (
                    <img
                      src={viewModalCompany.logo}
                      alt={viewModalCompany.name}
                      className="w-16 h-16 rounded-2xl object-contain bg-white p-1.5 shadow-md shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/10 text-white border border-white/20 font-bold text-2xl flex items-center justify-center shadow-md shrink-0">
                      {viewModalCompany.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold tracking-tight text-white truncate">
                        {viewModalCompany.name}
                      </h2>
                      {viewModalCompany.isVerified && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                      {viewModalCompany.isFeatured && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          <Sparkles className="w-3.5 h-3.5" /> Featured
                        </span>
                      )}
                    </div>
                    <p className="text-teal-100/80 text-sm mt-1">
                      {viewModalCompany.industry || 'Industry unspecified'} &bull;{' '}
                      {viewModalCompany.headquarters || 'Northeast India'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                {loadingViewDetails && (
                  <div className="py-2 text-xs text-teal-600 font-medium flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading linked jobs and recruiters...
                  </div>
                )}

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Company Size</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {viewModalCompany.companySize || viewModalCompany.size || 'Not specified'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Founded Year</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {viewModalCompany.foundedYear || 'Not specified'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Active Jobs</p>
                    <p className="text-sm font-semibold text-teal-700 mt-0.5">
                      {viewModalCompany.jobs?.length ?? viewModalCompany._count?.jobs ?? 0} jobs
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">Recruiters</p>
                    <p className="text-sm font-semibold text-blue-700 mt-0.5">
                      {viewModalCompany.employers?.length ?? viewModalCompany._count?.employers ?? 0} members
                    </p>
                  </div>
                </div>

                {/* Contact & Social Information */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Contact & Online Presence
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    {viewModalCompany.website && (
                      <a
                        href={viewModalCompany.website.startsWith('http') ? viewModalCompany.website : `https://${viewModalCompany.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-teal-700 transition"
                      >
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="truncate text-xs font-medium">{viewModalCompany.website}</span>
                        <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                      </a>
                    )}

                    {viewModalCompany.email && (
                      <a
                        href={`mailto:${viewModalCompany.email}`}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                      >
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate text-xs font-medium">{viewModalCompany.email}</span>
                      </a>
                    )}

                    {viewModalCompany.phone && (
                      <a
                        href={`tel:${viewModalCompany.phone}`}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                      >
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="truncate text-xs font-medium">{viewModalCompany.phone}</span>
                      </a>
                    )}

                    {viewModalCompany.linkedin && (
                      <a
                        href={viewModalCompany.linkedin.startsWith('http') ? viewModalCompany.linkedin : `https://${viewModalCompany.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-700 transition"
                      >
                        <Linkedin className="w-4 h-4 text-blue-600" />
                        <span className="truncate text-xs font-medium">LinkedIn Profile</span>
                        <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>

                {/* About Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    About the Company
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {viewModalCompany.description || 'No corporate description provided yet.'}
                  </p>
                </div>

                {/* Linked Jobs List */}
                {viewModalCompany.jobs && viewModalCompany.jobs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Recent Jobs ({viewModalCompany.jobs.length})
                    </h4>
                    <div className="space-y-2">
                      {viewModalCompany.jobs.map((job: any) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{job.title}</span>
                            <span className="text-slate-400 ml-2">
                              {job.city || 'Guwahati'} &bull; {job.jobType || 'Full-time'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-800">
                            {job.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Recruiters */}
                {viewModalCompany.employers && viewModalCompany.employers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Assigned Recruiters ({viewModalCompany.employers.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {viewModalCompany.employers.map((emp: any) => (
                        <div
                          key={emp.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center gap-2.5"
                        >
                          <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold">
                            {emp.firstName?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-slate-400">{emp.designation || 'Recruiter'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const comp = viewModalCompany
                    setViewModalCompany(null)
                    handleOpenDelete(comp)
                  }}
                  className="px-3.5 py-2 text-red-600 hover:bg-red-50 text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete Company
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const comp = viewModalCompany
                      setViewModalCompany(null)
                      handleOpenEdit(comp)
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Company
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewModalCompany(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 2: CREATE / EDIT COMPANY ────────────────────────────── */}
        {formModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {isEditing ? 'Edit Company Profile' : 'Create New Company'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isEditing
                        ? 'Update corporate identity, verification status, and contact details'
                        : 'Register a new verified employer entity into the system'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitForm} className="overflow-y-auto p-6 space-y-5 flex-1 text-sm">
                {/* Section 1: Basic Information */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> 1. Basic Company Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Kamakhya Health City"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          URL Slug
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoSlug}
                          className="text-[11px] text-teal-600 hover:underline font-medium"
                        >
                          Auto-generate
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="e.g. kamakhya-health-city"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono text-xs transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
                      <input
                        type="text"
                        list="industries-list"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        placeholder="Select or enter industry"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                      <datalist id="industries-list">
                        {COMMON_INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Company Size</label>
                      <select
                        value={formData.companySize}
                        onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      >
                        <option value="">Select workforce size</option>
                        {COMPANY_SIZES.map((sz) => (
                          <option key={sz} value={sz}>
                            {sz} employees
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Founded Year</label>
                      <input
                        type="number"
                        min="1800"
                        max="2099"
                        value={formData.foundedYear}
                        onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                        placeholder="e.g. 2018"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Headquarters / Location
                      </label>
                      <input
                        type="text"
                        value={formData.headquarters}
                        onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                        placeholder="e.g. Dispur, Guwahati, Assam"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Logo & Website */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> 2. Media & Branding
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL or Upload</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.logo}
                          onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                          placeholder="https://... or upload"
                          className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                        />
                        <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition flex items-center justify-center shrink-0">
                          <Upload className={`w-4 h-4 ${uploadingLogo ? 'animate-bounce text-teal-600' : ''}`} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {formData.logo && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={formData.logo}
                            alt="Logo preview"
                            className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5"
                          />
                          <span className="text-[11px] text-slate-400">Logo preview ready</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://company.com"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Contact & Socials */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-3 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> 3. Contact & Social Profiles
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="hr@company.com"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 9876543210"
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn URL</label>
                      <input
                        type="text"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/company/..."
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Twitter / X URL</label>
                      <input
                        type="text"
                        value={formData.twitter}
                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                        placeholder="https://twitter.com/..."
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Description */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
                    4. About & Overview
                  </h3>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description about company mission, services, and work culture..."
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>

                {/* Section 5: Badges & Status */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVerified}
                      onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Verified Badge
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Displays green verified badge across job boards
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        Featured Company
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Highlighted on homepage and top employers carousel
                      </span>
                    </div>
                  </label>
                </div>

                {/* Footer Submit */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {isEditing ? 'Save Changes' : 'Create Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL 3: DELETE CONFIRMATION ──────────────────────────────── */}
        {deleteModalOpen && companyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">Delete Company Profile?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to delete <strong className="text-slate-800">{companyToDelete.name}</strong>?
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
                  <p className="font-semibold mb-1">Safety Notice:</p>
                  Any jobs or employer accounts linked to this company will be safely unlinked so no recruiter data or candidate applications are lost.
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
                  Yes, Delete Company
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

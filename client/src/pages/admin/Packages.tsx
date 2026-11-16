import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  X,
  Search,
  Building2,
  User,
  Sliders,
  Sparkles,
  Layers,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Tag,
  ShieldCheck,
  Eye,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Package, PackageType, PackageStatus } from '@/types'
import AssignPackageModal from '@/components/admin/AssignPackageModal'
import PackageBuilderModal, { formatDurationLabel } from '@/components/admin/PackageBuilderModal'

export default function AdminPackages() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CANDIDATE' | 'EMPLOYER' | 'ACTIVE' | 'DRAFT' | 'DISABLED'>('ALL')

  // Modals state
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignPackageId, setAssignPackageId] = useState<string | null>(null)

  // Dedicated View Package Modal state
  const [viewPackage, setViewPackage] = useState<Package | null>(null)

  // Quick Action Modal (Price, Duration, Display Order)
  const [quickActionModal, setQuickActionModal] = useState<{
    pkg: Package
    type: 'price' | 'duration' | 'order'
  } | null>(null)
  const [quickValue, setQuickValue] = useState<number>(0)
  const [quickSaving, setQuickSaving] = useState(false)

  // Delete confirmation modal state
  const [deletePkg, setDeletePkg] = useState<Package | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPackages = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getPackages()
      setPackages(res.data.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  // Auto-open builder if navigated to /new or /:id/edit
  useEffect(() => {
    if (location.pathname.endsWith('/packages/new')) {
      setEditingPackage(null)
      setBuilderOpen(true)
    } else if (params.id && packages.length > 0) {
      const match = packages.find((p) => (p.id || p._id) === params.id)
      if (match) {
        setEditingPackage(match)
        setBuilderOpen(true)
      }
    }
  }, [location.pathname, params.id, packages])

  // ─── Metric Counts ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = packages.length
    const candidate = packages.filter((p) => p.type?.toUpperCase() === 'CANDIDATE').length
    const employer = packages.filter((p) => p.type?.toUpperCase() === 'EMPLOYER').length
    const active = packages.filter((p) => p.status === 'ACTIVE' || (p.status === undefined && p.isActive !== false)).length
    const draft = packages.filter((p) => p.status === 'DRAFT').length
    const disabled = packages.filter((p) => p.status === 'DISABLED' || p.isActive === false).length

    return { total, candidate, employer, active, draft, disabled }
  }, [packages])

  // ─── Filtered Packages ───────────────────────────────────────────────────
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Filter Tab
      const isCand = pkg.type?.toUpperCase() === 'CANDIDATE'
      const isEmp = pkg.type?.toUpperCase() === 'EMPLOYER'
      const isAct = pkg.status === 'ACTIVE' || (pkg.status === undefined && pkg.isActive !== false)
      const isDrf = pkg.status === 'DRAFT'
      const isDis = pkg.status === 'DISABLED' || (!isDrf && pkg.isActive === false)

      if (activeFilter === 'CANDIDATE' && !isCand) return false
      if (activeFilter === 'EMPLOYER' && !isEmp) return false
      if (activeFilter === 'ACTIVE' && !isAct) return false
      if (activeFilter === 'DRAFT' && !isDrf) return false
      if (activeFilter === 'DISABLED' && !isDis) return false

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = pkg.name?.toLowerCase().includes(q)
        const matchSlug = pkg.slug?.toLowerCase().includes(q)
        const matchDesc = pkg.description?.toLowerCase().includes(q)
        const matchBadge = pkg.badge?.toLowerCase().includes(q)
        if (!matchName && !matchSlug && !matchDesc && !matchBadge) return false
      }

      return true
    })
  }, [packages, activeFilter, searchQuery])

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleToggleStatus = async (pkg: Package) => {
    const id = pkg.id || pkg._id
    if (!id) return

    try {
      await adminAPI.togglePackageActive(id)
      const nextActive = !pkg.isActive
      toast.success(`Package "${pkg.name}" ${nextActive ? 'activated' : 'disabled'}`)
      fetchPackages()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update package status')
    }
  }

  const handleDuplicate = async (pkg: Package) => {
    const id = pkg.id || pkg._id
    if (!id) return

    try {
      toast.loading(`Duplicating "${pkg.name}"...`, { id: 'dup' })
      const res = await adminAPI.duplicatePackage(id)
      toast.success(res.data?.message || 'Package duplicated successfully!', { id: 'dup' })
      await fetchPackages()

      // Open in builder for instant modification
      if (res.data?.data) {
        setEditingPackage(res.data.data)
        setBuilderOpen(true)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to duplicate package', { id: 'dup' })
    }
  }

  const handleOpenQuickAction = (pkg: Package, type: 'price' | 'duration' | 'order') => {
    setQuickActionModal({ pkg, type })
    if (type === 'price') setQuickValue(pkg.price ?? 0)
    else if (type === 'duration') setQuickValue(pkg.durationDays || pkg.duration || 30)
    else if (type === 'order') setQuickValue(pkg.sortOrder || 0)
  }

  const handleSaveQuickAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickActionModal?.pkg?.id) return

    setQuickSaving(true)
    try {
      const updatePayload: Record<string, any> = {}
      if (quickActionModal.type === 'price') updatePayload.price = quickValue
      if (quickActionModal.type === 'duration') updatePayload.durationDays = quickValue
      if (quickActionModal.type === 'order') updatePayload.sortOrder = quickValue

      await adminAPI.updatePackage(quickActionModal.pkg.id, updatePayload)
      toast.success(`Updated ${quickActionModal.type} for "${quickActionModal.pkg.name}"`)
      setQuickActionModal(null)
      fetchPackages()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update package')
    } finally {
      setQuickSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePkg?.id) return
    setDeleting(true)
    try {
      await adminAPI.deletePackage(deletePkg.id)
      toast.success(`Package "${deletePkg.name}" deleted successfully`)
      setDeletePkg(null)
      fetchPackages()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cannot delete this package')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="Package Management (Admin) | Career Wings" />

      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Package Management</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Select & Configure Candidate and Employer packages without manual coding or DB configuration.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAssignPackageId(null)
                setAssignModalOpen(true)
              }}
              className="flex items-center gap-2 text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 font-bold transition cursor-pointer shadow-2xs"
            >
              <Zap className="w-4 h-4 text-orange-600 fill-orange-500" /> Assign Package Manually
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingPackage(null)
                setBuilderOpen(true)
              }}
              className="flex items-center gap-2 text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Create Package
            </button>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => setActiveFilter('ALL')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-semibold opacity-70 block uppercase tracking-wider">
              All Packages
            </span>
            <div className="text-2xl font-black mt-1">{metrics.total}</div>
          </div>

          <div
            onClick={() => setActiveFilter('EMPLOYER')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'EMPLOYER'
                ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">
                Employer Plans
              </span>
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black mt-1">{metrics.employer}</div>
          </div>

          <div
            onClick={() => setActiveFilter('CANDIDATE')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'CANDIDATE'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">
                Candidate Plans
              </span>
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-black mt-1">{metrics.candidate}</div>
          </div>

          <div
            onClick={() => setActiveFilter('ACTIVE')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">
                Active Packages
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-2xl font-black mt-1">{metrics.active}</div>
          </div>

          <div
            onClick={() => setActiveFilter('DRAFT')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'DRAFT'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">
                Draft Packages
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            </div>
            <div className="text-2xl font-black mt-1">{metrics.draft}</div>
          </div>

          <div
            onClick={() => setActiveFilter('DISABLED')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              activeFilter === 'DISABLED'
                ? 'bg-slate-700 text-white border-slate-700 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">
                Disabled
              </span>
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            </div>
            <div className="text-2xl font-black mt-1">{metrics.disabled}</div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {(['ALL', 'EMPLOYER', 'CANDIDATE', 'ACTIVE', 'DRAFT', 'DISABLED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  activeFilter === tab
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL' && 'All Packages'}
                {tab === 'EMPLOYER' && '🏢 Employer Packages'}
                {tab === 'CANDIDATE' && '👨‍💼 Candidate Packages'}
                {tab === 'ACTIVE' && '🟢 Active Packages'}
                {tab === 'DRAFT' && '🟡 Draft Packages'}
                {tab === 'DISABLED' && '⚪ Expired/Disabled'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Packages Table View */}
        {loading ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded-lg w-1/4"></div>
            <div className="h-12 bg-slate-50 rounded-xl"></div>
            <div className="h-12 bg-slate-50 rounded-xl"></div>
            <div className="h-12 bg-slate-50 rounded-xl"></div>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Packages Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No packages match your search "${searchQuery}".`
                : 'No packages in this filter yet. Click "Create Package" to select options and build one.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingPackage(null)
                setBuilderOpen(true)
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create Package
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-5 font-semibold">Package & Audience</th>
                    <th className="py-3.5 px-4 font-semibold">Price</th>
                    <th className="py-3.5 px-4 font-semibold">Duration</th>
                    <th className="py-3.5 px-4 font-semibold">Configured Options</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPackages.map((pkg) => {
                    const isCandidate = pkg.type?.toUpperCase() === 'CANDIDATE'
                    const limitsObj: Record<string, any> =
                      typeof pkg.limits === 'string'
                        ? (() => {
                            try {
                              return JSON.parse(pkg.limits)
                            } catch {
                              return {}
                            }
                          })()
                        : pkg.limits || {}

                    const pkgStatus: PackageStatus =
                      pkg.status || (pkg.isActive === false ? 'DISABLED' : 'ACTIVE')

                    return (
                      <tr key={pkg.id || pkg._id} className="hover:bg-slate-50/50 transition">
                        {/* Package & Audience */}
                        <td className="py-4 px-5">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-2xs"
                              style={{ backgroundColor: pkg.color || '#F97316' }}
                            >
                              <Zap className="w-4 h-4 fill-white/20" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">{pkg.name}</span>
                                {pkg.badge && (
                                  <span
                                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white shadow-2xs"
                                    style={{ backgroundColor: pkg.color || '#F97316' }}
                                  >
                                    {pkg.badge}
                                  </span>
                                )}
                                {pkg.isFeatured && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                    ★ Featured
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isCandidate
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-orange-50 text-orange-700 border border-orange-200'
                                  }`}
                                >
                                  {isCandidate ? <User className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                                  {isCandidate ? 'CANDIDATE' : 'EMPLOYER'}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Order #{pkg.sortOrder || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-4 px-4">
                          <div className="font-extrabold text-slate-900 text-sm">
                            {pkg.price === 0 ? (
                              <span className="text-emerald-600 font-black">Free (₹0)</span>
                            ) : (
                              `₹${Number(pkg.price).toLocaleString('en-IN')}`
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAction(pkg, 'price')}
                            className="text-[10px] text-orange-600 hover:underline font-semibold cursor-pointer"
                          >
                            Change Price
                          </button>
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-4">
                          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDurationLabel(pkg.durationDays || pkg.duration || 30)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAction(pkg, 'duration')}
                            className="text-[10px] text-orange-600 hover:underline font-semibold cursor-pointer"
                          >
                            Change Duration
                          </button>
                        </td>

                        {/* Configured Options Summary */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {isCandidate ? (
                              <>
                                {limitsObj.jobApplications !== undefined && (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                                    {limitsObj.jobApplications === -1 ? '∞ Apps' : `${limitsObj.jobApplications} Apps`}
                                  </span>
                                )}
                                {limitsObj.resumeBuilder && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                                    ✓ Resume Builder
                                  </span>
                                )}
                                {limitsObj.featuredProfile && (
                                  <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-md border border-amber-200">
                                    ★ Pro Profile
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {limitsObj.jobPostings !== undefined && (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                                    {limitsObj.jobPostings === -1 ? '∞ Posts' : `${limitsObj.jobPostings} Posts`}
                                  </span>
                                )}
                                {limitsObj.resumeSearches !== undefined && (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                                    {limitsObj.resumeSearches === -1 ? '∞ Searches' : `${limitsObj.resumeSearches} Searches`}
                                  </span>
                                )}
                                {limitsObj.resumeDatabaseAccess && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                                    ✓ Resume DB
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(pkg)}
                            title="Click to Enable / Disable"
                            className="group inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span
                              className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition ${
                                pkgStatus === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100'
                                  : pkgStatus === 'DRAFT'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 group-hover:bg-amber-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-slate-200'
                              }`}
                            >
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                                  pkgStatus === 'ACTIVE'
                                    ? 'bg-emerald-500'
                                    : pkgStatus === 'DRAFT'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                                }`}
                              ></span>
                              {pkgStatus}
                            </span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-1 sm:gap-1.5">
                            {/* View button */}
                            <button
                              type="button"
                              onClick={() => setViewPackage(pkg)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="View Package Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPackage(pkg)
                                setBuilderOpen(true)
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                              title="Edit in Smart Package Builder"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Duplicate button */}
                            <button
                              type="button"
                              onClick={() => handleDuplicate(pkg)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                              title="Duplicate Package"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Change Display Order button */}
                            <button
                              type="button"
                              onClick={() => handleOpenQuickAction(pkg, 'order')}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="Change Display Order"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>

                            {/* Assign button */}
                            <button
                              type="button"
                              onClick={() => {
                                setAssignPackageId(pkg.id || pkg._id || null)
                                setAssignModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition cursor-pointer"
                              title="Assign package to candidate or employer"
                            >
                              <Zap className="w-3 h-3 text-orange-600 fill-orange-500" />
                              <span className="hidden xl:inline">Assign</span>
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => setDeletePkg(pkg)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                              title="Delete package"
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

        {/* ─── Smart Package Builder Modal ─────────────────────────────────── */}
        <PackageBuilderModal
          isOpen={builderOpen}
          initialPackage={editingPackage}
          onClose={() => {
            setBuilderOpen(false)
            setEditingPackage(null)
          }}
          onSaved={() => {
            fetchPackages()
          }}
        />

        {/* ─── Assign Package Modal ────────────────────────────────────────── */}
        <AssignPackageModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false)
            setAssignPackageId(null)
          }}
          preselectedPackageId={assignPackageId}
        />

        {/* ─── Dedicated View Package Modal ─────────────────────────────────── */}
        {viewPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: viewPackage.color || '#F97316' }}
                  >
                    <Zap className="w-5 h-5 fill-white/20" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{viewPackage.name}</h3>
                    <p className="text-xs text-slate-500">
                      {viewPackage.type} Package • {viewPackage.slug}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewPackage(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Package Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Price</span>
                  <span className="text-lg font-black text-slate-900">
                    {viewPackage.price === 0 ? 'Free' : `₹${Number(viewPackage.price).toLocaleString('en-IN')}`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Duration</span>
                  <span className="text-sm font-black text-slate-900">
                    {formatDurationLabel(viewPackage.durationDays || viewPackage.duration || 30)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Status</span>
                  <span className="text-sm font-black text-emerald-600">
                    {viewPackage.status || (viewPackage.isActive ? 'ACTIVE' : 'DISABLED')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Display Order</span>
                  <span className="text-sm font-black text-slate-900">#{viewPackage.sortOrder || 0}</span>
                </div>
              </div>

              {/* Public Marketing Bullets */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Customer Bullet Features
                </h4>
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {(() => {
                    const bullets: string[] =
                      typeof viewPackage.features === 'string'
                        ? (() => {
                            try {
                              return JSON.parse(viewPackage.features)
                            } catch {
                              return []
                            }
                          })()
                        : viewPackage.features || []

                    if (bullets.length === 0) {
                      return <span className="text-xs text-slate-400">No bullets configured.</span>
                    }

                    return bullets.map((bullet, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        <span>{bullet}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Raw Entitlement Limits */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Raw Limits & Entitlement Config
                </h4>
                <pre className="p-3 bg-slate-900 text-emerald-400 text-xs rounded-2xl font-mono overflow-x-auto max-h-40">
                  {typeof viewPackage.limits === 'string'
                    ? viewPackage.limits
                    : JSON.stringify(viewPackage.limits, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewPackage(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewPackage
                    setViewPackage(null)
                    setEditingPackage(toEdit)
                    setBuilderOpen(true)
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit This Package
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Quick Action Modal (Change Price / Duration / Order) ───────── */}
        {quickActionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {quickActionModal.type === 'price' && 'Change Package Price'}
                    {quickActionModal.type === 'duration' && 'Change Package Duration'}
                    {quickActionModal.type === 'order' && 'Change Display Order'}
                  </h3>
                  <p className="text-xs text-slate-500">{quickActionModal.pkg.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickActionModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveQuickAction} className="space-y-4">
                {quickActionModal.type === 'price' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      New Price (INR ₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={quickValue}
                        onChange={(e) => setQuickValue(Math.max(0, Number(e.target.value)))}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {quickActionModal.type === 'duration' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Select or Enter Duration (Days)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {[15, 30, 60, 90, 180, 365].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setQuickValue(d)}
                          className={`text-xs py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                            quickValue === d
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={quickValue}
                      onChange={(e) => setQuickValue(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      placeholder="Custom Days"
                    />
                  </div>
                )}

                {quickActionModal.type === 'order' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Display Priority Order
                    </label>
                    <input
                      type="number"
                      value={quickValue}
                      onChange={(e) => setQuickValue(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setQuickActionModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quickSaving}
                    className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-md cursor-pointer"
                  >
                    {quickSaving ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
        {deletePkg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900">Delete Package?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold text-slate-800">"{deletePkg.name}"</span>?
                  Active subscriptions will block deletion.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeletePkg(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

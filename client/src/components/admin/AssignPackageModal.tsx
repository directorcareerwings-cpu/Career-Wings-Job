import React, { useState, useEffect } from 'react'
import { adminAPI } from '@/lib/api'
import { Package } from '@/types'
import {
  X,
  Zap,
  Building2,
  User,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface TargetUserInfo {
  id: string
  email: string
  name?: string
  role?: 'EMPLOYER' | 'CANDIDATE' | string
  companyName?: string
}

interface AssignPackageModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onAssigned?: () => void
  preselectedUser?: TargetUserInfo | null
  preselectedPackageId?: string | null
  initialUserType?: 'EMPLOYER' | 'CANDIDATE'
}

export default function AssignPackageModal({
  isOpen,
  onClose,
  onSuccess,
  onAssigned,
  preselectedUser = null,
  preselectedPackageId = null,
  initialUserType,
}: AssignPackageModalProps) {
  const [userType, setUserType] = useState<'EMPLOYER' | 'CANDIDATE'>(
    initialUserType || (preselectedUser?.role === 'CANDIDATE' ? 'CANDIDATE' : 'EMPLOYER')
  )
  const [userQuery, setUserQuery] = useState('')
  const [usersList, setUsersList] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [selectedUser, setSelectedUser] = useState<TargetUserInfo | null>(preselectedUser)
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<string>(preselectedPackageId || '')
  const [durationDays, setDurationDays] = useState<number>(30)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      if (preselectedUser) {
        setSelectedUser(preselectedUser)
        setUserType(preselectedUser.role === 'CANDIDATE' ? 'CANDIDATE' : 'EMPLOYER')
      } else if (initialUserType) {
        setUserType(initialUserType)
      }
      if (preselectedPackageId) {
        setSelectedPackageId(preselectedPackageId)
      }
      fetchPackages()
    }
  }, [isOpen, preselectedUser, preselectedPackageId, initialUserType])

  // Fetch available packages
  const fetchPackages = async () => {
    try {
      const res = await adminAPI.getPackages()
      const pkgs: Package[] = res.data?.data || []
      setPackages(pkgs)
      if (!selectedPackageId && pkgs.length > 0) {
        // Pick first active package matching user type
        const match = pkgs.find((p) => p.type === userType && p.isActive !== false) || pkgs[0]
        const id = match?.id || match?._id
        if (id) {
          setSelectedPackageId(id)
          setDurationDays(match.durationDays || 30)
        }
      }
    } catch (err) {
      console.error('Failed to load packages', err)
    }
  }

  // Search users if not preselected
  useEffect(() => {
    if (preselectedUser) return
    const timer = setTimeout(async () => {
      setLoadingUsers(true)
      try {
        if (userType === 'EMPLOYER') {
          const res = await adminAPI.getEmployers({ q: userQuery, limit: 10 })
          setUsersList(res.data?.data || [])
        } else {
          const res = await adminAPI.getCandidates({ q: userQuery, limit: 10 })
          setUsersList(res.data?.data || [])
        }
      } catch (err) {
        console.error('Failed to search users', err)
      } finally {
        setLoadingUsers(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [userType, userQuery, preselectedUser])

  // When selected package changes, update default duration
  const handlePackageSelect = (pkgId: string) => {
    setSelectedPackageId(pkgId)
    const pkg = packages.find((p) => (p.id || p._id) === pkgId)
    if (pkg && pkg.durationDays) {
      setDurationDays(pkg.durationDays)
    }
  }

  const selectedPackage = packages.find((p) => (p.id || p._id) === selectedPackageId)

  // Parse limits safely
  const parsedLimits: Record<string, any> = React.useMemo(() => {
    if (!selectedPackage?.limits) return {}
    try {
      return typeof selectedPackage.limits === 'string'
        ? JSON.parse(selectedPackage.limits)
        : selectedPackage.limits
    } catch {
      return {}
    }
  }, [selectedPackage])

  // Filter packages by user type
  const relevantPackages = packages.filter(
    (p) => p.type === (selectedUser?.role || userType) && p.isActive !== false
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser?.id && !selectedUser?.email) {
      toast.error('Please select a recipient employer or candidate')
      return
    }
    if (!selectedPackageId) {
      toast.error('Please select a subscription package')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        packageId: selectedPackageId,
        durationDays: Number(durationDays) || 30,
        notes: notes.trim() || undefined,
      }

      if (selectedUser.role === 'EMPLOYER') {
        payload.employerId = selectedUser.id
      } else if (selectedUser.role === 'CANDIDATE') {
        payload.candidateId = selectedUser.id
      } else {
        payload.userId = selectedUser.id
      }

      const res = await adminAPI.assignPackage(payload)
      toast.success(res.data?.message || 'Package assigned successfully!')
      onSuccess?.()
      onAssigned?.()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to assign package')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 shadow-2xs">
            <Zap className="w-6 h-6 fill-orange-500 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Assign Package Manually
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly grant full subscription entitlements, job posting limits, and candidate search credits to an employer or job seeker.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. TARGET RECIPIENT SELECTION */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Target Recipient
            </label>

            {preselectedUser ? (
              // Pre-selected User Card
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {preselectedUser.name?.[0] || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {preselectedUser.name || 'Selected User'}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span>{preselectedUser.email}</span>
                      {preselectedUser.companyName && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{preselectedUser.companyName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                  {preselectedUser.role || 'EMPLOYER'}
                </span>
              </div>
            ) : (
              // Search & Select User
              <div className="space-y-3">
                {/* User Type Switcher */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserType('EMPLOYER')
                      setSelectedUser(null)
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      userType === 'EMPLOYER'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Employer / Recruiter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserType('CANDIDATE')
                      setSelectedUser(null)
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      userType === 'CANDIDATE'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Candidate
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder={`Search ${userType === 'EMPLOYER' ? 'employers by name or email' : 'candidates by name'}...`}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* User Selection List */}
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                  {loadingUsers ? (
                    <div className="p-3 text-center text-xs text-slate-400">Searching...</div>
                  ) : usersList.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      {userQuery ? 'No matching users found' : 'Type name or email to find accounts'}
                    </div>
                  ) : (
                    usersList.map((u: any) => {
                      const isSelected = selectedUser?.id === u.id
                      const uName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User'
                      const uEmail = u.user?.email || u.email || ''
                      const compName = u.company?.name

                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUser({
                              id: u.id,
                              email: uEmail,
                              name: uName,
                              role: userType,
                              companyName: compName,
                            })
                          }}
                          className={`p-2.5 px-3 flex items-center justify-between text-xs cursor-pointer transition ${
                            isSelected
                              ? 'bg-orange-100/70 font-semibold text-orange-950'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div>
                            <span className="font-bold">{uName}</span>
                            <span className="text-slate-500 ml-2">({uEmail})</span>
                            {compName && (
                              <span className="text-slate-400 ml-2">• {compName}</span>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. SELECT PACKAGE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Select Subscription Package
              </label>
              <span className="text-[11px] text-slate-400">
                {relevantPackages.length} Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {relevantPackages.map((pkg) => {
                const pkgId = pkg.id || pkg._id || ''
                const isChosen = selectedPackageId === pkgId
                return (
                  <div
                    key={pkgId}
                    onClick={() => pkgId && handlePackageSelect(pkgId)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isChosen
                        ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {pkg.name}
                          {pkg.isFeatured && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {pkg.description || `${pkg.durationDays} days validity`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-slate-900 text-sm">
                          {pkg.price === 0 ? 'Free' : `₹${pkg.price.toLocaleString('en-IN')}`}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {pkg.durationDays}d
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. VALIDITY DURATION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Validity Period (Days)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Expires on:{' '}
                <strong className="text-slate-800">
                  {new Date(
                    Date.now() + (Number(durationDays) || 30) * 86400000
                  ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[30, 60, 90, 180, 365].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDurationDays(preset)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    durationDays === preset
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {preset === 365 ? '1 Year (365d)' : `${preset} Days`}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl text-center focus:outline-none focus:border-orange-500"
                />
                <span className="text-xs text-slate-500 font-medium">days</span>
              </div>
            </div>
          </div>

          {/* 4. ADMIN NOTE / AUDIT REASON */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. Admin Allocation Note / Reason (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Offline bank transfer / Promotional upgrade / VIP Partner"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* ENTITLEMENT SUMMARY BOX */}
          {selectedPackage && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Package Entitlements Breakdown:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                {selectedPackage.type === 'EMPLOYER' ? (
                  <>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Job Postings</span>
                      <strong className="text-slate-800 font-bold text-xs">
                        {parsedLimits.jobPostings === -1 ? 'Unlimited' : parsedLimits.jobPostings ?? 'Standard'}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Resume Searches</span>
                      <strong className="text-slate-800 font-bold text-xs">
                        {parsedLimits.resumeSearches === -1 ? 'Unlimited' : parsedLimits.resumeSearches ?? 'Standard'}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Profile Views</span>
                      <strong className="text-slate-800 font-bold text-xs">
                        {parsedLimits.profileViews === -1 ? 'Unlimited' : parsedLimits.profileViews ?? 'Standard'}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Featured Jobs</span>
                      <strong className="text-slate-800 font-bold text-xs">
                        {parsedLimits.featuredJobs ?? 0}
                      </strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Job Applications</span>
                      <strong className="text-slate-800 font-bold text-xs">
                        {parsedLimits.jobApplications === -1 ? 'Unlimited' : parsedLimits.jobApplications ?? 'Standard'}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Job Alerts</span>
                      <strong className="text-slate-800 font-bold text-xs">
                        {parsedLimits.jobAlerts ?? 3}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Featured Profile</span>
                      <strong className="text-slate-800 font-bold text-xs">
                        {parsedLimits.featuredProfile ? 'Yes' : 'No'}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="text-slate-400 block">Validity</span>
                      <strong className="text-slate-800 font-bold text-xs">
                        {durationDays} Days
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-white" />
              {submitting ? 'Assigning Package...' : 'Confirm & Assign Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

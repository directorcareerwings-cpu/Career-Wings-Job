import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { candidateAPI, publicAPI } from '@/lib/api'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Zap,
  Calendar,
  Check,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  PackageCheck,
  Briefcase,
  Bell,
  Bookmark,
  FileText,
  Clock,
  RefreshCw,
  Lock,
  UserCheck,
} from 'lucide-react'
import { Package } from '@/types'
import { CANDIDATE_TOGGLE_OPTIONS } from '@/constants/packageOptions'

export default function CandidateSubscription() {
  const navigate = useNavigate()
  const packagesRef = useRef<HTMLDivElement>(null)
  const [subData, setSubData] = useState<any>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [subRes, pkgRes] = await Promise.all([
        candidateAPI.getSubscription().catch(() => ({ data: { data: null } })),
        publicAPI.getPackages('CANDIDATE').catch(() => ({ data: { data: [] } })),
      ])
      setSubData(subRes?.data?.data || null)
      const allPkgs = (pkgRes?.data?.data || []) as Package[]
      const candidatePkgs = allPkgs.filter(
        (p) => String(p.type).toUpperCase() === 'CANDIDATE' && p.isActive !== false
      )
      setPackages(candidatePkgs)
    } catch (err) {
      console.error('Failed to load candidate subscription or packages', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPackage = (pkg: Package) => {
    navigate(`/checkout?packageId=${pkg.id}`)
  }

  const scrollToPackages = () => {
    packagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <CandidateLayout>
        <div className="max-w-5xl space-y-6 animate-pulse">
          <div className="h-64 bg-white rounded-3xl border border-slate-100" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-96 bg-white rounded-3xl border border-slate-100" />
            <div className="h-96 bg-white rounded-3xl border border-slate-100" />
          </div>
        </div>
      </CandidateLayout>
    )
  }

  const currentPkg = subData?.package
  const limits = subData?.limits || {}
  const usage = subData?.usage || {}
  const daysRemaining = subData?.daysRemaining ?? 0
  const isExpired = subData?.status === 'EXPIRED' || (subData?.endDate && daysRemaining <= 0)
  const isActive = subData?.status === 'ACTIVE' && !isExpired

  // Quota Meter helper
  const renderQuotaMeter = (
    label: string,
    key: string,
    icon: React.ReactNode,
    unitName = 'used',
    colorClass = 'bg-orange-500'
  ) => {
    const limit = limits[key]
    const used = usage[key] || 0
    const isUnlimited = limit === -1

    let percentage = 0
    let remainingText = ''
    let isExhausted = false

    if (isUnlimited) {
      percentage = 15
      remainingText = `${used} used (Unlimited)`
    } else if (typeof limit === 'number' && limit > 0) {
      const remaining = Math.max(0, limit - used)
      percentage = Math.min(100, (used / limit) * 100)
      remainingText = `${used} / ${limit} ${unitName} (${remaining} remaining)`
      if (used >= limit) isExhausted = true
    } else {
      percentage = 0
      remainingText = 'Not included in plan'
      isExhausted = true
    }

    return (
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/90 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-2">
            {icon}
            {label}
          </span>
          <span
            className={`font-bold ${
              isExhausted && !isUnlimited ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {remainingText}
          </span>
        </div>

        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isExhausted && !isUnlimited ? 'bg-rose-500' : colorClass
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {isExhausted && !isUnlimited && (
          <p className="text-[11px] text-rose-600 font-medium">
            Limit reached. Upgrade your package to apply for more jobs.
          </p>
        )}
      </div>
    )
  }

  return (
    <CandidateLayout>
      <SEOMeta title="My Package & Application Allowance | Career Wings Candidate" />

      <div className="max-w-5xl space-y-8 pb-12">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Candidate Dashboard → My Package
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Job Seeker Package & Limits
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Review your current application allowance, profile visibility status, and Pro career tools.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentPkg && (
              <button
                type="button"
                onClick={() => handleSelectPackage(currentPkg)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Renew Plan
              </button>
            )}
            <button
              type="button"
              onClick={scrollToPackages}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              Upgrade Package
            </button>
          </div>
        </div>

        {/* 1. CURRENT ACTIVE PLAN OVERVIEW CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-blue-500" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                    isActive
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : isExpired
                      ? 'text-rose-700 bg-rose-50 border-rose-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isActive ? 'Active Plan' : isExpired ? 'Expired' : 'Suspended'}
                </span>

                {currentPkg?.badge && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                    {currentPkg.badge}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                {currentPkg?.name || 'Job Seeker Free Plan'}
              </h2>

              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                {currentPkg?.description ||
                  'Standard candidate access for browsing vacancies and submitting job applications in Northeast India.'}
              </p>
            </div>

            {/* Price & Expiry Block */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100 lg:text-right min-w-[240px]">
              <div className="text-3xl font-black text-slate-900">
                {currentPkg?.price === 0 ? 'Free' : `₹${currentPkg?.price?.toLocaleString('en-IN')}`}
                {currentPkg?.price > 0 && (
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    / {currentPkg.durationDays} days
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600">
                {subData?.startDate && (
                  <div className="flex items-center lg:justify-end gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Started: {new Date(subData.startDate).toLocaleDateString()}</span>
                  </div>
                )}
                {subData?.endDate && (
                  <div className="flex items-center lg:justify-end gap-1.5 text-slate-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span>Expires: {new Date(subData.endDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="mt-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                      daysRemaining > 15
                        ? 'bg-emerald-100 text-emerald-800'
                        : daysRemaining > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {daysRemaining > 0 ? `${daysRemaining} Days Remaining` : 'Plan Expired'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. USAGE METERS (Job Applications, Job Alerts, Saved Jobs, Resume Downloads) */}
          <div className="pt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Application Allowance & Usage Quotas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderQuotaMeter(
                'Job Applications',
                'jobApplications',
                <Briefcase className="w-4 h-4 text-orange-500" />,
                'applications',
                'bg-orange-500'
              )}
              {renderQuotaMeter(
                'Instant Job Alerts',
                'jobAlerts',
                <Bell className="w-4 h-4 text-blue-500" />,
                'alerts',
                'bg-blue-500'
              )}
              {renderQuotaMeter(
                'Saved Jobs Slots',
                'savedJobs',
                <Bookmark className="w-4 h-4 text-amber-500" />,
                'bookmarks',
                'bg-amber-500'
              )}
              {renderQuotaMeter(
                'Resume PDF Downloads',
                'resumeDownloads',
                <FileText className="w-4 h-4 text-emerald-500" />,
                'downloads',
                'bg-emerald-500'
              )}
            </div>
          </div>

          {/* 3. FEATURE STATUS TOGGLES & BADGES */}
          <div className="pt-6 border-t border-slate-100 mt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Included Candidate Features & Privileges
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {CANDIDATE_TOGGLE_OPTIONS.map((opt) => {
                const isEnabled = Boolean(limits[opt.key])
                return (
                  <div
                    key={opt.key}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition ${
                      isEnabled
                        ? 'bg-emerald-50/40 border-emerald-100 text-slate-800'
                        : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isEnabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isEnabled ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <Lock className="w-2.5 h-2.5" />
                      )}
                    </div>
                    <div>
                      <div className={`font-semibold ${isEnabled ? 'text-slate-900' : 'text-slate-500'}`}>
                        {opt.label}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{opt.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-slate-100 mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                100% verified for job seekers in Assam & Northeast India.
              </span>
            </div>
            <div className="flex items-center gap-3">
              {currentPkg && (
                <button
                  type="button"
                  onClick={() => handleSelectPackage(currentPkg)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  Renew Current Plan
                </button>
              )}
              <button
                type="button"
                onClick={scrollToPackages}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1 cursor-pointer"
              >
                Browse Upgrade Options
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. AVAILABLE CANDIDATE PACKAGES SECTION */}
        <div ref={packagesRef} className="pt-4">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5 text-orange-600" /> Career Boosters
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Available Candidate Packages
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose an official candidate plan created by Admin to boost your recruiter discoverability and unlock unlimited job applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {packages.map((pkg) => {
              const isCurrent = currentPkg?.id === pkg.id
              const features: string[] =
                typeof pkg.features === 'string'
                  ? JSON.parse(pkg.features || '[]')
                  : pkg.features || []

              const pkgLimits =
                typeof pkg.limits === 'string'
                  ? JSON.parse(pkg.limits || '{}')
                  : pkg.limits || {}

              return (
                <div
                  key={pkg.id}
                  className={`relative bg-white rounded-3xl p-6 sm:p-8 border transition flex flex-col justify-between ${
                    pkg.isFeatured
                      ? 'border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500'
                      : isCurrent
                      ? 'border-emerald-300 ring-2 ring-emerald-400 bg-emerald-50/10'
                      : 'border-slate-200 shadow-xs hover:border-slate-300'
                  }`}
                >
                  {pkg.badge && (
                    <div className="absolute -top-3.5 left-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3.5 rounded-full shadow-sm flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-white" /> {pkg.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{pkg.name}</h3>
                      {isCurrent && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Current Plan
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 min-h-[36px] mb-5 leading-relaxed">
                      {pkg.description}
                    </p>

                    <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-slate-100">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900">
                        {pkg.price === 0 ? 'Free' : `₹${pkg.price.toLocaleString('en-IN')}`}
                      </span>
                      {pkg.price > 0 && (
                        <span className="text-xs font-medium text-slate-400">
                          / {pkg.durationDays ? `${pkg.durationDays} days` : 'year'}
                        </span>
                      )}
                    </div>

                    {/* Limits Highlight */}
                    <div className="grid grid-cols-2 gap-2.5 mb-6 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-medium">Applications</span>
                        <span className="font-bold text-slate-800">
                          {pkgLimits.jobApplications === -1
                            ? 'Unlimited'
                            : `${pkgLimits.jobApplications || 15} Applications`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Profile Visibility</span>
                        <span className="font-bold text-slate-800">
                          {pkgLimits.featuredProfile ? 'Featured Top Tier' : 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-3 mb-8">
                      {features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <div className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isCurrent ? (
                    <button
                      type="button"
                      onClick={() => handleSelectPackage(pkg)}
                      className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Renew This Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectPackage(pkg)}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                        pkg.isFeatured
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {pkg.price === 0 ? 'Select Free Plan' : 'Upgrade to this Plan'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </CandidateLayout>
  )
}

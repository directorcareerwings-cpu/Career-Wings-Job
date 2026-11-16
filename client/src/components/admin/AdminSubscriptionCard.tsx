import React, { useState } from 'react'
import { adminAPI } from '@/lib/api'
import {
  Zap,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  PlusCircle,
  RotateCw,
  History,
  Sparkles,
  Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AdminSubscriptionCardProps {
  user: {
    id: string
    email: string
    role?: string
    subscriptions?: any[]
  }
  userType: 'EMPLOYER' | 'CANDIDATE'
  onRefresh: () => void
  onOpenAssignModal: () => void
}

export default function AdminSubscriptionCard({
  user,
  userType,
  onRefresh,
  onOpenAssignModal,
}: AdminSubscriptionCardProps) {
  const [extending, setExtending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [customDays, setCustomDays] = useState('30')
  const [showCustomExtend, setShowCustomExtend] = useState(false)

  const subscriptions = user?.subscriptions || []
  const activeSub = subscriptions.find((s: any) => s.status === 'ACTIVE') || subscriptions[0]

  const parseJson = (val: any) => {
    if (!val) return {}
    if (typeof val === 'object') return val
    try {
      return JSON.parse(val)
    } catch {
      return {}
    }
  }

  const limits = activeSub ? parseJson(activeSub.limitsSnapshot || activeSub.package?.limits) : {}
  const usage = activeSub ? parseJson(activeSub.usageData) : {}
  const features = activeSub ? parseJson(activeSub.package?.features) : {}

  const handleExtend = async (days: number) => {
    if (!activeSub) return
    setExtending(true)
    try {
      await adminAPI.extendSubscription(activeSub.id, days)
      toast.success(`Subscription extended by ${days} days`)
      setShowCustomExtend(false)
      onRefresh()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to extend subscription')
    } finally {
      setExtending(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!activeSub) return
    setUpdatingStatus(true)
    try {
      await adminAPI.updateSubscriptionStatus(activeSub.id, newStatus)
      toast.success(`Subscription status updated to ${newStatus}`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update subscription status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const daysRemaining = activeSub
    ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {activeSub?.package?.name || (userType === 'EMPLOYER' ? 'Free Starter Tier' : 'Job Seeker Free')}
              </h2>
              {activeSub?.package?.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 uppercase tracking-wider">
                  {activeSub.package.badge}
                </span>
              )}
              {activeSub && (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    activeSub.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : activeSub.status === 'SUSPENDED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {activeSub.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeSub
                ? `Plan Price: ₹${activeSub.package?.price?.toLocaleString('en-IN') || 0} • Valid for ${activeSub.package?.durationDays || 30} days`
                : 'Default platform access limits apply'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenAssignModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            {activeSub ? 'Change Package' : 'Assign Package'}
          </button>

          {activeSub && (
            <>
              {activeSub.status === 'ACTIVE' ? (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange('SUSPENDED')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-200 hover:bg-amber-50 text-amber-800 text-xs font-semibold rounded-xl transition"
                  title="Temporarily freeze access"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Suspend
                </button>
              ) : activeSub.status === 'SUSPENDED' ? (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
                  title="Reactivate package"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Activate
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setShowCustomExtend(!showCustomExtend)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
                Extend Validity
              </button>
            </>
          )}
        </div>
      </div>

      {/* Extension Drawer/Bar */}
      {showCustomExtend && activeSub && (
        <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-orange-950">Add Extension Days:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={extending}
              onClick={() => handleExtend(30)}
              className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:text-orange-600 border border-orange-200 rounded-lg hover:border-orange-400 transition"
            >
              +30 Days
            </button>
            <button
              type="button"
              disabled={extending}
              onClick={() => handleExtend(60)}
              className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:text-orange-600 border border-orange-200 rounded-lg hover:border-orange-400 transition"
            >
              +60 Days
            </button>
            <button
              type="button"
              disabled={extending}
              onClick={() => handleExtend(90)}
              className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 hover:text-orange-600 border border-orange-200 rounded-lg hover:border-orange-400 transition"
            >
              +90 Days
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-16 px-2 py-1 text-xs rounded-lg border border-orange-300 text-center font-bold"
              />
              <button
                type="button"
                disabled={extending || !customDays}
                onClick={() => handleExtend(parseInt(customDays, 10) || 30)}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validity Information */}
      {activeSub && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Start Date</span>
            <span className="font-bold text-slate-800">
              {new Date(activeSub.startDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Expiry Date</span>
            <span className="font-bold text-slate-800">
              {new Date(activeSub.endDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Days Remaining</span>
            <span className={`font-bold ${daysRemaining < 5 ? 'text-red-600' : 'text-emerald-700'}`}>
              {daysRemaining} Days
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Renewal Status</span>
            <span className="font-bold text-slate-800">
              {daysRemaining === 0 ? 'Expired' : 'Active'}
            </span>
          </div>
        </div>
      )}

      {/* Limit & Usage Meters */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          Enforced Usage & Limits
        </h3>

        {userType === 'EMPLOYER' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LimitMeter
              label="Job Postings"
              used={usage.jobPostings || 0}
              limit={limits.jobPostings}
              color="emerald"
            />
            <LimitMeter
              label="Featured Job Posts"
              used={usage.featuredJobs || 0}
              limit={limits.featuredJobs}
              color="orange"
            />
            <LimitMeter
              label="Resume Searches"
              used={usage.resumeSearches || 0}
              limit={limits.resumeSearches}
              color="blue"
            />
            <LimitMeter
              label="Candidate Profile Views"
              used={usage.profileViews || 0}
              limit={limits.profileViews}
              color="indigo"
            />
            <LimitMeter
              label="Resume Downloads"
              used={usage.resumeDownloads || 0}
              limit={limits.resumeDownloads}
              color="purple"
            />
            <LimitMeter
              label="Candidate Direct Contacts"
              used={usage.candidateContacts || 0}
              limit={limits.candidateContacts}
              color="rose"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LimitMeter
              label="Job Applications"
              used={usage.jobApplications || 0}
              limit={limits.jobApplications}
              color="emerald"
            />
            <LimitMeter
              label="Direct Recruiter Contacts"
              used={usage.employerContacts || 0}
              limit={limits.employerContacts}
              color="blue"
            />
            <LimitMeter
              label="Profile Boosts"
              used={usage.profileBoosts || 0}
              limit={limits.profileBoosts}
              color="orange"
            />
          </div>
        )}
      </div>

      {/* Configured Features Checklist */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Entitled Package Features
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(features).map(([key, val]) => {
            const isEnabled = Boolean(val)
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border ${
                  isEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                {isEnabled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                )}
                {formatFeatureName(key)}
              </span>
            )
          })}
          {Object.keys(features).length === 0 && (
            <span className="text-xs text-slate-400 italic">No specific feature flags recorded.</span>
          )}
        </div>
      </div>

      {/* Subscription History */}
      {subscriptions.length > 0 && (
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Subscription & Package History ({subscriptions.length})
            </h3>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Package</th>
                  <th className="py-2.5 px-3 font-semibold">Duration</th>
                  <th className="py-2.5 px-3 font-semibold">Start Date</th>
                  <th className="py-2.5 px-3 font-semibold">Expiry Date</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {sub.package?.name || 'Package'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {sub.package?.durationDays || 30} days
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {new Date(sub.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : sub.status === 'SUSPENDED'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function LimitMeter({
  label,
  used,
  limit,
  color = 'orange',
}: {
  label: string
  used: number
  limit: any
  color?: 'emerald' | 'orange' | 'blue' | 'indigo' | 'purple' | 'rose'
}) {
  const isUnlimited = limit === -1 || limit === '-1' || limit === undefined
  const max = isUnlimited ? Infinity : Number(limit) || 0
  const pct = isUnlimited ? 15 : max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const isFull = !isUnlimited && max > 0 && used >= max

  const colorStyles: Record<string, { bar: string; text: string }> = {
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-700' },
    orange: { bar: 'bg-orange-500', text: 'text-orange-700' },
    blue: { bar: 'bg-blue-500', text: 'text-blue-700' },
    indigo: { bar: 'bg-indigo-500', text: 'text-indigo-700' },
    purple: { bar: 'bg-purple-500', text: 'text-purple-700' },
    rose: { bar: 'bg-rose-500', text: 'text-rose-700' },
  }

  const selectedColor = isFull
    ? { bar: 'bg-red-500', text: 'text-red-700' }
    : colorStyles[color] || colorStyles.orange

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className={`font-bold ${selectedColor.text}`}>
          {isUnlimited ? (
            `${used} / Unlimited`
          ) : (
            `${used} / ${max} used`
          )}
        </span>
      </div>
      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${selectedColor.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isUnlimited && (
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>{Math.max(0, max - used)} remaining</span>
          <span>{pct}%</span>
        </div>
      )}
    </div>
  )
}

function formatFeatureName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

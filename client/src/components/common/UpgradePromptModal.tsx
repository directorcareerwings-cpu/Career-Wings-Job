import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, X, ArrowRight, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react'

export interface UpgradePromptModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  featureName?: string
  packageName?: string
  isLimitReached?: boolean
  usedCount?: number
  limitCount?: number
  unit?: string
  role?: 'EMPLOYER' | 'CANDIDATE'
}

export default function UpgradePromptModal({
  isOpen,
  onClose,
  title,
  description,
  featureName,
  packageName = 'Pro Plan',
  isLimitReached = false,
  usedCount,
  limitCount,
  unit = 'credits',
  role = 'EMPLOYER',
}: UpgradePromptModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const targetUrl = role === 'EMPLOYER' ? '/employer/subscription' : '/subscription'

  const resolvedTitle =
    title || (isLimitReached ? 'Usage Limit Reached' : 'Premium Feature')

  const resolvedDescription =
    description ||
    (isLimitReached
      ? `You have used all available ${featureName || 'usage credits'} in your current package (${
          usedCount !== undefined && limitCount !== undefined ? `${usedCount} / ${limitCount} ${unit}` : ''
        }). Upgrade your package to continue without disruption.`
      : `This feature is available with the ${packageName}. Upgrade your subscription to unlock this and other advanced capabilities.`)

  const handleUpgradeClick = () => {
    onClose()
    navigate(targetUrl)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm ${
              isLimitReached
                ? 'bg-amber-50 text-amber-600 border border-amber-200/80'
                : 'bg-orange-50 text-orange-600 border border-orange-200/80'
            }`}
          >
            {isLimitReached ? (
              <AlertTriangle className="w-7 h-7" />
            ) : (
              <Sparkles className="w-7 h-7" />
            )}
          </div>

          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
              isLimitReached
                ? 'bg-amber-100/70 text-amber-800'
                : 'bg-orange-100/70 text-orange-800'
            }`}
          >
            {isLimitReached ? 'Limit Exceeded' : 'Premium Entitlement'}
          </span>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {resolvedTitle}
          </h3>

          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            {resolvedDescription}
          </p>

          {isLimitReached && usedCount !== undefined && limitCount !== undefined && (
            <div className="my-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-left">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>{featureName || 'Quota'}</span>
                <span>
                  {usedCount} / {limitCount} Used
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-500 h-2 rounded-full w-full" />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold shadow-md shadow-orange-500/25 flex items-center justify-center gap-1.5 transition"
            >
              <Zap className="w-4 h-4 fill-white" />
              Upgrade Package
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Instant activation upon payment</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline banner alternative for embedding inside pages
 */
export function UpgradeBanner({
  title,
  description,
  isLimitReached,
  role = 'EMPLOYER',
  onUpgrade,
}: {
  title?: string
  description?: string
  isLimitReached?: boolean
  role?: 'EMPLOYER' | 'CANDIDATE'
  onUpgrade?: () => void
}) {
  const navigate = useNavigate()
  const targetUrl = role === 'EMPLOYER' ? '/employer/subscription' : '/subscription'

  return (
    <div
      className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isLimitReached
          ? 'bg-amber-50/80 border-amber-200 text-amber-900'
          : 'bg-blue-50/80 border-blue-200 text-blue-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2.5 rounded-xl shrink-0 ${
            isLimitReached ? 'bg-amber-200/70 text-amber-800' : 'bg-blue-200/70 text-blue-800'
          }`}
        >
          {isLimitReached ? <AlertTriangle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="text-sm font-bold">
            {title || (isLimitReached ? 'Usage Limit Reached' : 'Premium Feature')}
          </h4>
          <p className="text-xs mt-0.5 opacity-90 max-w-xl">
            {description ||
              (isLimitReached
                ? 'You have reached the maximum quota for this action in your current package. Upgrade to increase capacity.'
                : 'This action is included in upgraded packages. Boost your account for full access.')}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (onUpgrade) onUpgrade()
          else navigate(targetUrl)
        }}
        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shrink-0 flex items-center gap-1.5 transition shadow-sm"
      >
        <Zap className="w-3.5 h-3.5 fill-white text-orange-400" />
        Upgrade Package
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Zap,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  Layers,
  Sliders,
  DollarSign,
  Calendar,
  Eye,
  Building2,
  User,
  Infinity,
  ArrowUp,
  ArrowDown,
  Info,
  Palette,
  Tag,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { Package, PackageType, PackageStatus } from '@/types'
import {
  CANDIDATE_QUOTA_OPTIONS,
  CANDIDATE_TOGGLE_OPTIONS,
  EMPLOYER_QUOTA_OPTIONS,
  EMPLOYER_TOGGLE_OPTIONS,
  DURATION_PRESETS,
  COLOR_PRESETS,
  BADGE_PRESETS,
  generateDefaultBullets,
  PackageFeatureOption,
} from '@/constants/packageOptions'
import toast from 'react-hot-toast'

interface PackageBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  initialPackage?: Package | null
}

export function formatDurationLabel(days: number): string {
  if (days === 30) return '1 Month'
  if (days === 60) return '2 Months'
  if (days === 90) return '3 Months'
  if (days === 180) return '6 Months'
  if (days === 365) return '1 Year'
  if (days % 30 === 0) return `${days / 30} Months`
  return `${days} Days`
}

export default function PackageBuilderModal({
  isOpen,
  onClose,
  onSaved,
  initialPackage = null,
}: PackageBuilderModalProps) {
  const isEditing = !!initialPackage?.id

  // ─── Builder Form State ───────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<'all' | 'basics' | 'quotas' | 'toggles' | 'features'>('all')

  const [type, setType] = useState<'CANDIDATE' | 'EMPLOYER'>(
    initialPackage?.type?.toUpperCase() === 'CANDIDATE' ? 'CANDIDATE' : 'EMPLOYER'
  )
  const [name, setName] = useState(initialPackage?.name || '')
  const [description, setDescription] = useState(initialPackage?.description || '')
  const [price, setPrice] = useState<number>(initialPackage?.price ?? (type === 'EMPLOYER' ? 4999 : 499))
  const [durationDays, setDurationDays] = useState<number>(
    initialPackage?.durationDays || initialPackage?.duration || (type === 'EMPLOYER' ? 180 : 30)
  )
  const [status, setStatus] = useState<PackageStatus>(
    initialPackage?.status || (initialPackage?.isActive === false ? 'DISABLED' : 'ACTIVE')
  )
  const [badge, setBadge] = useState<string>(initialPackage?.badge || '')
  const [isFeatured, setIsFeatured] = useState<boolean>(!!initialPackage?.isFeatured)
  const [color, setColor] = useState<string>(initialPackage?.color || '#F97316')
  const [sortOrder, setSortOrder] = useState<number>(initialPackage?.sortOrder || 0)

  // Parse existing limits & features
  const parsedLimits = useMemo(() => {
    if (!initialPackage?.limits) return {}
    if (typeof initialPackage.limits === 'string') {
      try {
        return JSON.parse(initialPackage.limits)
      } catch {
        return {}
      }
    }
    return initialPackage.limits
  }, [initialPackage])

  const parsedFeatures = useMemo(() => {
    if (!initialPackage?.features) return []
    if (typeof initialPackage.features === 'string') {
      try {
        return JSON.parse(initialPackage.features)
      } catch {
        return []
      }
    }
    return Array.isArray(initialPackage.features) ? initialPackage.features : []
  }, [initialPackage])

  // Dynamic limits state (stores quotas and toggles)
  const [limitsState, setLimitsState] = useState<Record<string, any>>({})
  const [bulletsList, setBulletsList] = useState<Array<{ text: string; enabled: boolean }>>([])
  const [newBulletText, setNewBulletText] = useState('')
  const [saving, setSaving] = useState(false)

  // Initialize form state
  useEffect(() => {
    if (initialPackage) {
      const pType = initialPackage.type?.toUpperCase() === 'CANDIDATE' ? 'CANDIDATE' : 'EMPLOYER'
      setType(pType)
      setName(initialPackage.name || '')
      setDescription(initialPackage.description || '')
      setPrice(initialPackage.price ?? 0)
      setDurationDays(initialPackage.durationDays || initialPackage.duration || 30)
      setStatus(initialPackage.status || (initialPackage.isActive === false ? 'DISABLED' : 'ACTIVE'))
      setBadge(initialPackage.badge || '')
      setIsFeatured(!!initialPackage.isFeatured)
      setColor(initialPackage.color || '#F97316')
      setSortOrder(initialPackage.sortOrder || 0)
      setLimitsState(parsedLimits)

      if (parsedFeatures.length > 0) {
        setBulletsList(parsedFeatures.map((f: string) => ({ text: f, enabled: true })))
      } else {
        const auto = generateDefaultBullets(pType, parsedLimits)
        setBulletsList(auto.map((f) => ({ text: f, enabled: true })))
      }
    } else {
      // Default initial state for a brand new package
      setName('')
      setDescription('')
      setPrice(type === 'EMPLOYER' ? 4999 : 499)
      setDurationDays(type === 'EMPLOYER' ? 180 : 30)
      setStatus('ACTIVE')
      setBadge('')
      setIsFeatured(false)
      setColor('#F97316')
      setSortOrder(0)

      const defaultLimits: Record<string, any> = {}
      const quotaOpts = type === 'CANDIDATE' ? CANDIDATE_QUOTA_OPTIONS : EMPLOYER_QUOTA_OPTIONS
      const toggleOpts = type === 'CANDIDATE' ? CANDIDATE_TOGGLE_OPTIONS : EMPLOYER_TOGGLE_OPTIONS

      quotaOpts.forEach((q) => {
        defaultLimits[q.key] = q.defaultValue
      })
      toggleOpts.forEach((t) => {
        defaultLimits[t.key] = t.defaultValue
      })
      setLimitsState(defaultLimits)

      const auto = generateDefaultBullets(type, defaultLimits)
      setBulletsList(auto.map((f) => ({ text: f, enabled: true })))
    }
  }, [initialPackage, isOpen])

  // Handle Type Change (Candidate <-> Employer)
  const handleTypeChange = (newType: 'CANDIDATE' | 'EMPLOYER') => {
    if (newType === type) return
    setType(newType)
    if (!isEditing) {
      const defaultLimits: Record<string, any> = {}
      const quotaOpts = newType === 'CANDIDATE' ? CANDIDATE_QUOTA_OPTIONS : EMPLOYER_QUOTA_OPTIONS
      const toggleOpts = newType === 'CANDIDATE' ? CANDIDATE_TOGGLE_OPTIONS : EMPLOYER_TOGGLE_OPTIONS

      quotaOpts.forEach((q) => {
        defaultLimits[q.key] = q.defaultValue
      })
      toggleOpts.forEach((t) => {
        defaultLimits[t.key] = t.defaultValue
      })

      setLimitsState(defaultLimits)
      setPrice(newType === 'EMPLOYER' ? 4999 : 499)
      setDurationDays(newType === 'EMPLOYER' ? 180 : 30)

      const auto = generateDefaultBullets(newType, defaultLimits)
      setBulletsList(auto.map((f) => ({ text: f, enabled: true })))
    }
  }

  // Quota & Toggle change handler with automatic bullet synchronization
  const handleLimitChange = (key: string, value: any) => {
    const updated = { ...limitsState, [key]: value }
    setLimitsState(updated)

    // Re-generate bullets while preserving custom items
    const generated = generateDefaultBullets(type, updated)
    setBulletsList((prev) => {
      const existingCustom = prev.filter(
        (p) => !generateDefaultBullets(type, limitsState).includes(p.text)
      )
      const combined = [
        ...generated.map((text) => {
          const match = prev.find((p) => p.text === text)
          return { text, enabled: match ? match.enabled : true }
        }),
        ...existingCustom,
      ]
      return combined
    })
  }

  // Bullet items management
  const handleToggleBullet = (index: number) => {
    setBulletsList((prev) =>
      prev.map((b, i) => (i === index ? { ...b, enabled: !b.enabled } : b))
    )
  }

  const handleAddBullet = () => {
    if (!newBulletText.trim()) return
    setBulletsList((prev) => [...prev, { text: newBulletText.trim(), enabled: true }])
    setNewBulletText('')
  }

  const handleRemoveBullet = (index: number) => {
    setBulletsList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveBullet = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= bulletsList.length) return
    const cloned = [...bulletsList]
    const temp = cloned[index]
    cloned[index] = cloned[targetIdx]
    cloned[targetIdx] = temp
    setBulletsList(cloned)
  }

  // Form Submission
  const handleSubmit = async (saveAsStatus?: PackageStatus) => {
    if (!name.trim()) {
      toast.error('Package Name is required')
      setActiveSection('basics')
      return
    }

    if (price < 0 || isNaN(price)) {
      toast.error('Price cannot be negative')
      setActiveSection('basics')
      return
    }

    if (!durationDays || durationDays <= 0) {
      toast.error('Duration must be at least 1 day')
      setActiveSection('basics')
      return
    }

    const finalStatus = saveAsStatus || status
    const enabledBullets = bulletsList.filter((b) => b.enabled).map((b) => b.text.trim())

    const payload = {
      name: name.trim(),
      type,
      description: description.trim(),
      price: Number(price),
      durationDays: Number(durationDays),
      status: finalStatus,
      isActive: finalStatus === 'ACTIVE',
      isFeatured: !!isFeatured,
      badge: badge.trim() || null,
      color,
      sortOrder: Number(sortOrder) || 0,
      limits: limitsState,
      features: enabledBullets,
    }

    setSaving(true)
    try {
      if (isEditing && initialPackage?.id) {
        const { adminAPI } = await import('@/lib/api')
        await adminAPI.updatePackage(initialPackage.id, payload)
        toast.success(`Package "${name}" updated successfully!`)
      } else {
        const { adminAPI } = await import('@/lib/api')
        await adminAPI.createPackage(payload)
        toast.success(`Package "${name}" created successfully!`)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save package')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const currentQuotaOptions = type === 'CANDIDATE' ? CANDIDATE_QUOTA_OPTIONS : EMPLOYER_QUOTA_OPTIONS
  const currentToggleOptions = type === 'CANDIDATE' ? CANDIDATE_TOGGLE_OPTIONS : EMPLOYER_TOGGLE_OPTIONS

  // Active enabled bullets for the live preview card
  const previewBullets = bulletsList.filter((b) => b.enabled).map((b) => b.text)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full my-4 sm:my-8 shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-colors"
              style={{ backgroundColor: color }}
            >
              <Zap className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {isEditing ? `Edit Package: ${initialPackage?.name}` : 'Smart Package Builder'}
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : status === 'DRAFT'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Select & Configure ready-made entitlements, limits, and live preview.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audience / Type Switcher */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Step 1: Select Package Type
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleTypeChange('EMPLOYER')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  type === 'EMPLOYER'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-orange-500" /> Employer Package
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('CANDIDATE')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  type === 'CANDIDATE'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5 text-blue-600" /> Candidate Package
              </button>
            </div>
          </div>

          {/* Quick Jump Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSection === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Controls
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('basics')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSection === 'basics'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Basics & Pricing
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('quotas')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSection === 'quotas'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Quotas & Limits
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('toggles')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSection === 'toggles'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Feature Toggles
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('features')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSection === 'features'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Card Bullets ({previewBullets.length})
            </button>
          </div>
        </div>

        {/* Main Body: Left Configuration + Right Live Package Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Left / Center: Configurator Controls */}
          <div className="lg:col-span-7 p-6 space-y-8">
            {/* ─── 1. Package Name, Pricing & Duration ────────────────────── */}
            {(activeSection === 'all' || activeSection === 'basics') && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-orange-500" />
                    Package Identity, Pricing & Duration
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Step 2: Basic Info</span>
                </div>

                {/* Name & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Package Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={type === 'EMPLOYER' ? 'e.g. GOLD EMPLOYER PACKAGE' : 'e.g. CANDIDATE PRO BOOSTER'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Badge / Tag</span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional card flair</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Most Popular / Best Value"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {BADGE_PRESETS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBadge(b)}
                          className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                            badge === b
                              ? 'bg-orange-500 text-white border-orange-500 font-bold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                      {badge && (
                        <button
                          type="button"
                          onClick={() => setBadge('')}
                          className="text-[10px] text-red-500 hover:underline px-1 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Short Description / Tagline
                  </label>
                  <input
                    type="text"
                    placeholder="Brief highlight for this plan"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Price & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Price (INR ₹) <span className="text-red-500">*</span></span>
                      <button
                        type="button"
                        onClick={() => setPrice(0)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                          price === 0 ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        Set as Free (₹0)
                      </button>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={price}
                        onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Duration Dropdown <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value={15}>15 Days</option>
                      <option value={30}>30 Days (1 Month)</option>
                      <option value={60}>60 Days (2 Months)</option>
                      <option value={90}>90 Days (3 Months)</option>
                      <option value={180}>180 Days (6 Months)</option>
                      <option value={365}>365 Days (1 Year)</option>
                    </select>
                  </div>
                </div>

                {/* Status, Display Order & Accent Theme */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Package Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PackageStatus)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none"
                    >
                      <option value="ACTIVE">🟢 ACTIVE (Live)</option>
                      <option value="DRAFT">🟡 DRAFT (Hidden)</option>
                      <option value="DISABLED">⚪ DISABLED (Archived)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Theme Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      {COLOR_PRESETS.slice(0, 5).map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColor(c.value)}
                          className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                            color === c.value ? 'scale-110 ring-2 ring-slate-900' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ─── 2. Quotas & Numeric Limits ───────────────────────────────── */}
            {(activeSection === 'all' || activeSection === 'quotas') && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-orange-500" />
                      {type === 'EMPLOYER' ? 'Employer Hiring Quotas' : 'Candidate Application Quotas'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Numeric limits (with one-click Unlimited option).
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Step 3: Quotas</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {currentQuotaOptions.map((opt) => {
                    const currentValue = limitsState[opt.key] !== undefined ? limitsState[opt.key] : opt.defaultValue
                    const isUnlimited = currentValue === -1

                    return (
                      <div
                        key={opt.key}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                            {opt.unit && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                                {opt.unit}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 leading-tight mt-0.5">{opt.description}</p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                          {opt.allowUnlimited && (
                            <button
                              type="button"
                              onClick={() => handleLimitChange(opt.key, isUnlimited ? opt.defaultValue || 10 : -1)}
                              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                                isUnlimited
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Infinity className="w-3.5 h-3.5" /> Unlimited
                            </button>
                          )}

                          {!isUnlimited ? (
                            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                              <button
                                type="button"
                                onClick={() =>
                                  handleLimitChange(
                                    opt.key,
                                    Math.max(0, (Number(currentValue) || 0) - (opt.key.includes('Search') ? 50 : 1))
                                  )
                                }
                                className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 text-sm font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={currentValue}
                                onChange={(e) => handleLimitChange(opt.key, Math.max(0, Number(e.target.value)))}
                                className="w-16 text-center text-xs font-bold text-slate-900 bg-white py-1.5 border-x border-slate-200 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleLimitChange(
                                    opt.key,
                                    (Number(currentValue) || 0) + (opt.key.includes('Search') ? 50 : 1)
                                  )
                                }
                                className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 text-sm font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                              ∞ Unlimited
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ─── 3. Feature Entitlements & Toggles ────────────────────────── */}
            {(activeSection === 'all' || activeSection === 'toggles') && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Check className="w-4 h-4 text-orange-500" />
                      Ready-made Feature Toggles ({currentToggleOptions.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Toggle capabilities [ ON ] or [ OFF ]. Everything is already available in the system.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Step 4: Toggles</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentToggleOptions.map((opt) => {
                    const isChecked = !!limitsState[opt.key]

                    return (
                      <div
                        key={opt.key}
                        onClick={() => handleLimitChange(opt.key, !isChecked)}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-4 cursor-pointer select-none ${
                          isChecked
                            ? 'bg-orange-50/40 border-orange-200 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5 pr-2">
                          <span
                            className={`text-sm font-bold block ${
                              isChecked ? 'text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="text-xs text-slate-500 block leading-tight">
                            {opt.description}
                          </span>
                        </div>

                        {/* Prominent [ ON ] / [ OFF ] Indicator + Switch */}
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span
                            className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                              isChecked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isChecked ? 'ON' : 'OFF'}
                          </span>

                          <div className="relative inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ─── 4. Live Card Bullets & Display Ordering ──────────────────── */}
            {(activeSection === 'all' || activeSection === 'features') && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      Select / Unselect Card Bullet Features
                    </h3>
                    <p className="text-xs text-slate-500">
                      Check/Uncheck to show or hide bullets. Use Up/Down arrows to change display order.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Step 5: Card Bullets</span>
                </div>

                {/* Add Custom Bullet */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom marketing bullet (e.g. Priority WhatsApp Hiring Support)"
                    value={newBulletText}
                    onChange={(e) => setNewBulletText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddBullet()
                      }
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddBullet}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Bullets List with Checkbox (Select/Unselect) + Reorder (Up/Down) */}
                <div className="space-y-2">
                  {bulletsList.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 text-xs ${
                        item.enabled ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-100/60 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Checkbox: Select / Unselect */}
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => handleToggleBullet(idx)}
                          className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                          title={item.enabled ? 'Unselect feature from card' : 'Select feature for card'}
                        />

                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const updated = [...bulletsList]
                            updated[idx].text = e.target.value
                            setBulletsList(updated)
                          }}
                          className={`bg-transparent border-0 focus:outline-none px-1 py-0.5 rounded text-xs font-medium w-full ${
                            item.enabled ? 'text-slate-800' : 'text-slate-400 line-through'
                          }`}
                        />
                      </div>

                      {/* Move Up/Down Controls & Delete */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveBullet(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25 cursor-pointer"
                          title="Move up in display order"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === bulletsList.length - 1}
                          onClick={() => handleMoveBullet(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25 cursor-pointer"
                          title="Move down in display order"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveBullet(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove feature"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Live Package Preview */}
          <div className="lg:col-span-5 p-6 bg-slate-50/70 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Live Package Preview
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-bold">
                  {type}
                </span>
              </div>

              {/* Exact Card Preview as requested */}
              <div
                className={`relative bg-white rounded-3xl p-6 sm:p-7 border shadow-xl transition-all ${
                  isFeatured ? 'ring-2 ring-orange-500' : 'border-slate-200'
                }`}
                style={{
                  borderColor: isFeatured ? color : undefined,
                  boxShadow: `0 12px 30px -10px ${color}30`,
                }}
              >
                {/* Badge if set */}
                {(badge || isFeatured) && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[11px] font-black uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center gap-1"
                    style={{ backgroundColor: color }}
                  >
                    <Zap className="w-3 h-3 fill-white" />
                    {badge || 'Recommended'}
                  </div>
                )}

                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 mb-1">
                    {name || (type === 'EMPLOYER' ? 'GOLD EMPLOYER PACKAGE' : 'CANDIDATE PRO PACKAGE')}
                  </h3>

                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-3xl font-black text-slate-900">
                      {price === 0 ? 'Free' : `₹${Number(price).toLocaleString('en-IN')}`}
                    </span>
                    {price > 0 && (
                      <span className="text-xs font-semibold text-slate-500">
                        / {formatDurationLabel(durationDays)}
                      </span>
                    )}
                  </div>

                  {description && (
                    <p className="text-xs text-slate-400 mb-4 italic">
                      {description}
                    </p>
                  )}

                  {/* Bullet features list */}
                  <div className="border-t border-slate-100 pt-4 space-y-2.5 mb-6">
                    {previewBullets.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2">
                        Select features to see them live here...
                      </div>
                    ) : (
                      previewBullets.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <span className="text-emerald-600 font-bold text-sm leading-none mt-0.5">✓</span>
                          <span className="font-medium leading-tight">{feat}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Purchase Package CTA */}
                <button
                  type="button"
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: color }}
                >
                  [ Purchase Package ]
                </button>
              </div>
            </div>

            {/* Helper Info */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2.5 shadow-2xs">
              <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Automatic Updates:</span> Any adjustment to options, toggles, or quotas immediately reflects in this live card preview.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Publish Status:</span>
            <div className="inline-flex rounded-lg p-1 bg-slate-100">
              <button
                type="button"
                onClick={() => setStatus('ACTIVE')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  status === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('DRAFT')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  status === 'DRAFT' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Draft
              </button>
              <button
                type="button"
                onClick={() => setStatus('DISABLED')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  status === 'DISABLED' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                Disabled
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            {status !== 'DRAFT' && (
              <button
                type="button"
                onClick={() => handleSubmit('DRAFT')}
                disabled={saving}
                className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Save as Draft
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={saving}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save & Publish Package'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

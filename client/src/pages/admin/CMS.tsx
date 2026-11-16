import React, { useState, useEffect, useRef } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Save,
  Globe,
  Phone,
  Mail,
  MapPin,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Loader2,
  ExternalLink,
  Sliders,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminCMS() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const heroFileInputRef = useRef<HTMLInputElement | null>(null)
  const logoFileInputRef = useRef<HTMLInputElement | null>(null)

  const [settings, setSettings] = useState<any>({
    SITE_NAME: 'Career Wings',
    TAGLINE: 'Jobs in Guwahati & Northeast India',
    CONTACT_EMAIL: 'info@careerwings.in',
    CONTACT_PHONE: '+91-8876211864',
    CONTACT_ADDRESS: 'Zoo Road Tiniali, Hriday Ranjan Path, By Lane 6, House No 5, Guwahati, Assam 781003',
    HERO_TITLE: 'Find Verified Jobs in Guwahati & Northeast India',
    HERO_SUBTITLE: 'Connect directly with top recruiters in IT, Healthcare, Banking, Construction & Office jobs with zero placement fees.',
    HERO_IMAGE_URL: '',
    SITE_LOGO_URL: '',
    SHOW_LOGO_TEXT: 'true',
  })

  useEffect(() => {
    const fetchCMS = async () => {
      try {
        const res = await adminAPI.getCMSSettings()
        if (res.data.data?.settings) {
          const map: Record<string, string> = {}
          res.data.data.settings.forEach((s: any) => { map[s.key] = s.value })
          setSettings((prev: any) => ({ ...prev, ...map }))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCMS()
  }, [])

  const handleChange = (key: string, val: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: val }))
  }

  // ─── Handle Hero Banner Upload ──────────────────────────────────────────────
  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB')
      return
    }

    setUploadingHero(true)
    const toastId = toast.loading('Uploading hero image...')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await adminAPI.uploadHeroImage(formData)
      const uploadedUrl = res.data?.data?.imageUrl

      if (uploadedUrl) {
        setSettings((prev: any) => ({ ...prev, HERO_IMAGE_URL: uploadedUrl }))
        toast.success('Hero banner uploaded & updated live!', { id: toastId })
      } else {
        toast.error('Upload succeeded but no image URL was returned', { id: toastId })
      }
    } catch (err: any) {
      console.error('Failed to upload hero image:', err)
      toast.error(err?.response?.data?.message || 'Failed to upload hero image', { id: toastId })
    } finally {
      setUploadingHero(false)
      if (heroFileInputRef.current) heroFileInputRef.current.value = ''
    }
  }

  const handleResetHeroImage = async () => {
    if (!window.confirm('Reset homepage hero image to the default system banner?')) return

    setSettings((prev: any) => ({ ...prev, HERO_IMAGE_URL: '' }))
    try {
      await adminAPI.updateCMSSettings({
        settings: [{ key: 'HERO_IMAGE_URL', value: '' }],
      })
      toast.success('Reset to default system hero banner!')
    } catch {
      toast.error('Failed to reset banner setting')
    }
  }

  // ─── Handle Website Logo Upload ─────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, SVG, JPG, WEBP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo image size must be less than 5MB')
      return
    }

    setUploadingLogo(true)
    const toastId = toast.loading('Uploading website logo...')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await adminAPI.uploadLogo(formData)
      const uploadedUrl = res.data?.data?.logoUrl

      if (uploadedUrl) {
        setSettings((prev: any) => ({ ...prev, SITE_LOGO_URL: uploadedUrl }))
        toast.success('Website logo uploaded & updated live!', { id: toastId })
      } else {
        toast.error('Upload succeeded but no image URL returned', { id: toastId })
      }
    } catch (err: any) {
      console.error('Failed to upload logo:', err)
      toast.error(err?.response?.data?.message || 'Failed to upload logo', { id: toastId })
    } finally {
      setUploadingLogo(false)
      if (logoFileInputRef.current) logoFileInputRef.current.value = ''
    }
  }

  const handleResetLogo = async () => {
    if (!window.confirm('Reset website logo to the default Career Wings logo?')) return

    setSettings((prev: any) => ({ ...prev, SITE_LOGO_URL: '' }))
    try {
      await adminAPI.updateCMSSettings({
        settings: [{ key: 'SITE_LOGO_URL', value: '' }],
      })
      toast.success('Reset to default system logo!')
    } catch {
      toast.error('Failed to reset logo setting')
    }
  }

  // ─── Save All CMS Content ───────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = Object.keys(settings).map((key) => ({ key, value: String(settings[key] ?? '') }))
      await adminAPI.updateCMSSettings({ settings: payload })
      toast.success('Website content and branding saved successfully!')
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const currentHeroImg = settings.HERO_IMAGE_URL || '/images/hero-banner.png'
  const isCustomHero = Boolean(settings.HERO_IMAGE_URL && settings.HERO_IMAGE_URL !== '/images/hero-banner.png')

  const currentLogoImg = settings.SITE_LOGO_URL || '/images/logo.png'
  const isCustomLogo = Boolean(settings.SITE_LOGO_URL && settings.SITE_LOGO_URL !== '/images/logo.png')
  const showLogoText = settings.SHOW_LOGO_TEXT !== 'false'

  return (
    <AdminLayout>
      <SEOMeta title="Logo, Hero Banner & CMS Management (Admin) | Career Wings" />

      <div className="max-w-4xl space-y-8 pb-12">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <ImageIcon className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Website Logo, Hero Banner & CMS</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Upload your website logo, change homepage hero banner, update headline texts, and configure portal details.
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            1. WEBSITE LOGO UPLOAD & MANAGEMENT SHOWCASE
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Website Brand Logo</h2>
                {isCustomLogo ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Custom Logo Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Default System Logo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                This logo is displayed in the main navbar header, footer, and emails.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isCustomLogo && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  Reset to Default
                </button>
              )}
              <button
                type="button"
                onClick={() => logoFileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-900 hover:bg-primary-800 text-white shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {uploadingLogo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingLogo ? 'Uploading...' : 'Upload Website Logo'}
              </button>
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          {/* Dual Preview: Header Navbar (Light) & Footer (Dark) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Header Light Preview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Preview in Header (Light Navbar)
              </span>
              <div className="h-16 rounded-xl border border-slate-100 bg-white px-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentLogoImg}
                    alt="Logo Header Preview"
                    className="h-10 w-auto max-w-[160px] object-contain"
                  />
                  {showLogoText && (
                    <div className="flex flex-col leading-none">
                      <span className="font-extrabold text-base text-primary-900 tracking-tight">
                        CAREER <span className="text-[#E53935]">WINGS</span>
                      </span>
                      <span className="text-[8px] font-semibold tracking-wider text-gray-400 uppercase mt-0.5">
                        Jobs Today • A Brighter Tomorrow
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                  <span>Home</span>
                  <span>Jobs</span>
                </div>
              </div>
            </div>

            {/* Footer Dark Preview */}
            <div className="rounded-2xl border border-slate-800 bg-[#0A2540] p-4 space-y-2 shadow-xs text-white">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Preview in Footer (Dark Surface)
              </span>
              <div className="h-16 rounded-xl border border-white/10 bg-[#0A2540] px-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentLogoImg}
                    alt="Logo Footer Preview"
                    className="h-10 w-auto max-w-[160px] object-contain rounded-lg p-0.5 bg-white/10"
                  />
                  {showLogoText && (
                    <div className="flex flex-col leading-none">
                      <span className="font-extrabold text-base text-white tracking-tight">
                        CAREER <span className="text-[#FF5252]">WINGS</span>
                      </span>
                      <span className="text-[8px] font-medium tracking-wider text-primary-300 uppercase mt-0.5">
                        Jobs Today • A Brighter Tomorrow
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-[10px] text-slate-400">
                  © Career Wings
                </div>
              </div>
            </div>
          </div>

          {/* Logo Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <label className="flex items-center gap-2 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLogoText}
                onChange={(e) => handleChange('SHOW_LOGO_TEXT', e.target.checked ? 'true' : 'false')}
                className="rounded border-slate-300 text-primary-900 focus:ring-primary-500 h-4 w-4 cursor-pointer"
              />
              Show brand text ("CAREER WINGS") next to logo icon
            </label>
            <span className="text-slate-400">
              Recommended: PNG with transparent background or SVG. Max size: 5 MB.
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            2. HERO BANNER UPLOAD SHOWCASE
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Homepage Hero Banner</h2>
                {isCustomHero ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Custom Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Default Brand Banner
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                This image appears prominently at the top of the homepage hero section.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isCustomHero && (
                <button
                  type="button"
                  onClick={handleResetHeroImage}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  Reset to Default
                </button>
              )}
              <button
                type="button"
                onClick={() => heroFileInputRef.current?.click()}
                disabled={uploadingHero}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-900 hover:bg-primary-800 text-white shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {uploadingHero ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingHero ? 'Uploading...' : 'Upload New Hero Banner'}
              </button>
              <input
                ref={heroFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleHeroImageUpload}
              />
            </div>
          </div>

          {/* Banner Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Live Banner Preview:</span>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:underline flex items-center gap-1"
              >
                View on live homepage <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 group">
              <img
                src={currentHeroImg}
                alt="Homepage Hero Banner Preview"
                className="w-full h-auto object-cover max-h-[380px] block"
              />
              <div className="absolute bottom-3 right-3 bg-black/65 backdrop-blur-xs text-white text-[11px] font-medium px-3 py-1 rounded-full pointer-events-none">
                {isCustomHero ? 'Custom Uploaded Banner' : 'Default Career Wings Banner'}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
              <span>Recommended dimensions: 1920×600 px (or wide aspect ratio). Formats: PNG, JPG, WEBP.</span>
              <span>Max file size: 10 MB</span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            3. GENERAL CMS CONTENT FORM
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Platform Identity & Hero Texts
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={settings.SITE_NAME || ''}
                  onChange={(e) => handleChange('SITE_NAME', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={settings.TAGLINE || ''}
                  onChange={(e) => handleChange('TAGLINE', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Homepage Hero Headline
              </label>
              <input
                type="text"
                value={settings.HERO_TITLE || ''}
                onChange={(e) => handleChange('HERO_TITLE', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Homepage Subtitle
              </label>
              <textarea
                rows={2}
                value={settings.HERO_SUBTITLE || ''}
                onChange={(e) => handleChange('HERO_SUBTITLE', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pt-4 pb-3 border-b border-slate-100">
              Guwahati Office Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Phone / Helpline
                </label>
                <input
                  type="text"
                  value={settings.CONTACT_PHONE || ''}
                  onChange={(e) => handleChange('CONTACT_PHONE', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.CONTACT_EMAIL || ''}
                  onChange={(e) => handleChange('CONTACT_EMAIL', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Registered Office Address
              </label>
              <input
                type="text"
                value={settings.CONTACT_ADDRESS || ''}
                onChange={(e) => handleChange('CONTACT_ADDRESS', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save CMS Content'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

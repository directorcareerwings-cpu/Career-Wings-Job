import React, { useState, useEffect, useRef } from 'react'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const MAX_LOGO_SIZE_LABEL = '2 MB'

export default function CompanyProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    logo: '',
    website: '',
    email: '',
    phone: '',
    description: '',
    industry: '',
    companySize: '11-50',
    foundedYear: 2018,
    headquarters: '',
    linkedin: '',
    twitter: '',
    facebook: '',
  })

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await employerAPI.getCompany()
        if (res.data.data?.company) {
          const comp = res.data.data.company
          setForm((prev) => ({
            ...prev,
            name: comp.name || '',
            logo: comp.logo || '',
            website: comp.website || '',
            email: comp.email || '',
            phone: comp.phone || '',
            description: comp.description || '',
            industry: comp.industry || '',
            companySize: comp.companySize || comp.size || '11-50',
            foundedYear: comp.foundedYear || 2018,
            headquarters: comp.headquarters || '',
            linkedin: comp.linkedin || comp.socialLinks?.linkedin || '',
            twitter: comp.twitter || comp.socialLinks?.twitter || '',
            facebook: comp.facebook || comp.socialLinks?.facebook || '',
          }))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCompany()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Handle Logo Upload with 2 MB Max Size Enforcement
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Strict 2 MB Size Validation
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error(`Logo file size exceeds ${MAX_LOGO_SIZE_LABEL}. Please choose an image smaller than 2 MB.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 2. Format validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/jpg']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Only JPG, PNG, WEBP, and SVG image files are allowed.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 3. Upload to server
    const formData = new FormData()
    formData.append('logo', file)

    try {
      setUploadingLogo(true)
      const res = await employerAPI.uploadCompanyLogo(formData)
      const uploadedUrl = res.data?.data?.logo || res.data?.data?.url
      if (uploadedUrl) {
        setForm((prev) => ({ ...prev, logo: uploadedUrl }))
        toast.success(`Company logo uploaded successfully! (Max size ${MAX_LOGO_SIZE_LABEL})`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload company logo')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Remove Logo
  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logo: '' }))
    toast.success('Logo removed. Remember to save changes.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await employerAPI.updateCompany(form)
      toast.success('Company details and branding saved successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update company')
    } finally {
      setSaving(false)
    }
  }

  return (
    <EmployerLayout>
      <SEOMeta title="Company Profile & Branding | Career Wings" />

      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-orange-500" />
            Company Profile & Branding
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage your official corporate brand identity, company logo (max 2 MB), and candidate-facing details.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ─── LOGO UPLOAD SECTION (Max 2 MB) ─────────────────────── */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                Company Logo (Max Size: 2 MB)
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-5 mt-3">
                {/* Logo Preview Container */}
                <div className="relative shrink-0">
                  {form.logo ? (
                    <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-200 p-1.5 flex items-center justify-center overflow-hidden shadow-xs">
                      <img
                        src={form.logo}
                        alt="Company logo preview"
                        className="w-full h-full object-contain rounded-xl"
                        onError={(e) => {
                          ;(e.currentTarget as any).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex flex-col items-center justify-center font-bold text-2xl shadow-xs">
                      {form.name ? form.name.charAt(0).toUpperCase() : <Building2 className="w-8 h-8 opacity-80" />}
                    </div>
                  )}

                  {form.logo && (
                    <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs" title="Logo Active">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Upload Controls & Limits */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {uploadingLogo ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {form.logo ? 'Change Logo' : 'Upload Company Logo'}
                    </button>

                    {form.logo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Remove
                      </button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Strict Limit:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                      Max 2 MB
                    </span>
                    <span>&bull;</span>
                    <span>Supported: JPG, PNG, WEBP, SVG</span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Recommended resolution: Square 400x400 px with transparent or solid background.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── BASIC COMPANY DETAILS ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={form.name || ''}
                  onChange={handleChange}
                  placeholder="e.g. Pragjyotish Infotech Pvt Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Industry / Sector
                </label>
                <input
                  type="text"
                  name="industry"
                  value={form.industry || ''}
                  onChange={handleChange}
                  placeholder="e.g. IT & Software Development"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={form.website || ''}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Headquarters Location
                </label>
                <input
                  type="text"
                  name="headquarters"
                  value={form.headquarters || ''}
                  onChange={handleChange}
                  placeholder="e.g. Zoo Road, Guwahati, Assam"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Company Size
                </label>
                <select
                  name="companySize"
                  value={form.companySize || '11-50'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                >
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-500">201-500 Employees</option>
                  <option value="501-1000">501-1000 Employees</option>
                  <option value="1000+">1000+ Employees</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Contact Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone || ''}
                  onChange={handleChange}
                  placeholder="+91 88762 11864"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Contact Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email || ''}
                  onChange={handleChange}
                  placeholder="contact@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Founded Year
                </label>
                <input
                  type="number"
                  min="1900"
                  max="2099"
                  name="foundedYear"
                  value={form.foundedYear || 2018}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                About the Company
              </label>
              <textarea
                name="description"
                rows={5}
                value={form.description || ''}
                onChange={handleChange}
                placeholder="Describe your organization, culture, and what makes working here exciting..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Company Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </EmployerLayout>
  )
}

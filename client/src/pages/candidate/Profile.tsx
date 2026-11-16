import React, { useState, useEffect } from 'react'
import { candidateAPI } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  User,
  Phone,
  PhoneCall,
  MessageCircle,
  MapPin,
  Briefcase,
  GraduationCap,
  Zap,
  Save,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  Camera,
  Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function CandidateProfile() {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [imgLoadError, setImgLoadError] = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    headline: '',
    currentRole: '',
    currentCompany: '',
    phone: '',
    email: '',
    country: 'India IN (Fixed)',
    state: 'Assam',
    city: 'Guwahati',
    gender: 'Male',
    totalExperience: '0',
    educationLevel: 'Bachelor Degree',
    college: '',
    highestDegree: '',        // empty by default — must be selected by user
    passYear: '',             // graduation/pass year
    expectedSalaryMin: 0,
    noticePeriod: '15 Days',
    summary: '',
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await candidateAPI.getProfile()
        if (res.data.data) {
          const d = res.data.data
          const fName = d.firstName || ''
          const lName = d.lastName || ''
          const full = `${fName} ${lName}`.trim() || user?.firstName || ''

          if (d.profilePhoto) {
            setPhotoPreview(d.profilePhoto)
            setImgLoadError(false)
            if (user && user.avatar !== d.profilePhoto) {
              updateUser({ avatar: d.profilePhoto })
            }
          } else if (user?.avatar) {
            setPhotoPreview(user.avatar)
            setImgLoadError(false)
          }

          setForm({
            fullName: full,
            headline: d.headline || '',
            currentRole: d.currentRole || '',
            currentCompany: d.currentCompany || '',
            phone: d.phone || '',
            email: user?.email || '',
            country: d.country || 'India IN (Fixed)',
            state: d.state || 'Assam',
            city: d.city || (d.currentLocation ? d.currentLocation.split(',')[0].trim() : 'Guwahati'),
            gender: d.gender ? (d.gender.charAt(0).toUpperCase() + d.gender.slice(1).toLowerCase()) : 'Male',
            totalExperience: d.totalExperience !== null && d.totalExperience !== undefined ? String(d.totalExperience) : '0',
            educationLevel: d.educationLevel || 'Bachelor Degree',
            college: d.college || (d.education?.[0]?.institution) || '',
            highestDegree: d.highestDegree || (d.education?.[0]?.degree) || '',  // don't default to 'Bachelor Degree'
            passYear: d.education?.[0]?.endYear ? String(d.education[0].endYear) : '',
            expectedSalaryMin: d.expectedSalaryMin || 0,
            noticePeriod: d.noticePeriod || '15 Days',
            summary: d.summary || '',
          })

          if (d.candidateSkills && Array.isArray(d.candidateSkills)) {
            const skillList = d.candidateSkills.map((cs: any) => cs.skill?.name).filter(Boolean)
            if (skillList.length > 0) setSkills(skillList)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim()
    if (!trimmed) return
    if (!skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed])
    }
    setSkillInput('')
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove))
  }

  // Handle Photo Upload with 5 MB validation
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validate file extension / mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/pjpeg', 'image/x-png']
    const isImage = validMimes.includes(file.type.toLowerCase()) || /\.(jpe?g|png|webp)$/i.test(file.name)
    if (!isImage) {
      toast.error('Only JPG, PNG, and WEBP images are allowed.')
      e.target.value = ''
      return
    }

    // 2. Validate max file size to 5 MB
    const maxSizeBytes = 5 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      toast.error(`File size is ${sizeMB} MB. Maximum allowed size is 5 MB.`)
      e.target.value = ''
      return
    }

    // Immediate local preview and clear error
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)
    setImgLoadError(false)

    const formData = new FormData()
    formData.append('photo', file)
    formData.append('image', file)
    formData.append('file', file)

    try {
      setPhotoUploading(true)
      const res = await candidateAPI.uploadPhoto(formData)
      const uploadedUrl = res.data?.data?.profilePhoto || res.data?.profilePhoto
      if (uploadedUrl) {
        setPhotoPreview(uploadedUrl)
        setImgLoadError(false)
        updateUser({ avatar: uploadedUrl })
      }
      toast.success('Profile photo uploaded successfully!')
    } catch (err: any) {
      console.error('Photo upload failed:', err)
      toast.error(err.response?.data?.message || 'Failed to upload photo. Please check file format and size under 5 MB.')
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    try {
      setPhotoPreview(null)
      setImgLoadError(false)
      updateUser({ avatar: null })
      await candidateAPI.updateProfile({ profilePhoto: null })
      toast.success('Profile photo removed')
    } catch {
      toast.error('Failed to remove photo')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const parts = form.fullName.trim().split(' ')
      const firstName = parts[0] || ''
      const lastName = parts.slice(1).join(' ') || ''

      await candidateAPI.updateProfile({
        ...form,
        profilePhoto: photoPreview,
        firstName,
        lastName,
        skills,
        // Pass endYear separately so backend education sync can use it
        educationEndYear: form.passYear ? parseInt(form.passYear, 10) : undefined,
      })
      if (photoPreview) {
        updateUser({ avatar: photoPreview })
      }
      toast.success('Candidate profile details saved successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <CandidateLayout>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 animate-pulse h-96" />
      </CandidateLayout>
    )
  }

  return (
    <CandidateLayout>
      <SEOMeta title="My Profile Details | Career Wings" />

      <div className="max-w-5xl space-y-6">
        {/* Top Call & WhatsApp Direct Help Banner Card */}
        <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="text-sm">
              <span className="text-gray-500 font-medium">Ph no: </span>
              <span className="font-bold text-gray-900">8876211864</span>
            </div>
            <a
              href="tel:+918876211864"
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition ml-auto sm:ml-2"
            >
              Call Now
            </a>
          </div>

          <a
            href="https://wa.me/918876211864?text=Hello%20Career%20Wings%20Support,%20I%20need%20help%20with%20my%20Candidate%20Profile"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-2.5 bg-[#128C7E] hover:bg-[#075E54] active:bg-[#054c44] text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp Direct Help</span>
          </a>
        </div>

        {/* Candidate Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. BASIC INFORMATION */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-6 text-primary-900 font-bold text-base sm:text-lg border-b border-gray-100 pb-3">
              <User className="h-5 w-5 text-blue-600" />
              <h2>1. BASIC INFORMATION</h2>
            </div>

            {/* PROFILE PHOTO UPLOAD BLOCK (MAX 5 MB) */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-slate-50 border border-blue-100/80 mb-6">
              {/* Photo Avatar */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center">
                  {photoPreview && !imgLoadError ? (
                    <img
                      src={photoPreview}
                      alt="Candidate Profile"
                      className="w-full h-full object-cover"
                      onError={() => setImgLoadError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center font-bold">
                      <span className="text-2xl tracking-wider">
                        {form.fullName ? form.fullName.slice(0, 2).toUpperCase() : 'CW'}
                      </span>
                      <span className="text-[10px] font-normal opacity-85 mt-0.5">No Photo</span>
                    </div>
                  )}
                </div>

                {/* Floating Camera Upload Button */}
                <label
                  htmlFor="candidate-profile-photo-input"
                  className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md cursor-pointer transition-all hover:scale-105"
                  title="Upload profile photo (Max 5 MB)"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  id="candidate-profile-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Photo Details & Actions */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Profile Photo</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Max 5 MB
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload a clear, formal passport-size photo. Profiles with photos receive up to <strong>3x more recruiter contacts</strong>.
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                  <label
                    htmlFor="candidate-profile-photo-input"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-2 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {photoUploading ? 'Uploading...' : photoPreview && !imgLoadError ? 'Change Photo' : 'Upload Photo'}
                  </label>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}

                  <span className="text-[11px] font-medium text-slate-400">
                    Formats: JPG, PNG, WEBP • Max Size: <span className="font-bold text-slate-700">5 MB</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Row 1: Full Name, Professional Title, Current Job Role */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Puja Das"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Professional Title / Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="headline"
                  value={form.headline}
                  onChange={handleChange}
                  placeholder="e.g. Front Office Manager / Accountant"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Current Job Role (Optional)
                </label>
                <input
                  type="text"
                  name="currentRole"
                  value={form.currentRole}
                  onChange={handleChange}
                  placeholder="e.g. Senior Software Engineer / Sales Exec"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Row 2: Current Company, Contact Mobile Phone, Email Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Current Company (Optional)
                </label>
                <input
                  type="text"
                  name="currentCompany"
                  value={form.currentCompany}
                  onChange={handleChange}
                  placeholder="e.g. TCS / Wipro / Career Wings / Freelanc"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Contact Mobile Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="986401258"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email || user?.email || ''}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 3: Country, State, City */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="country"
                  value={form.country}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
                >
                  <option value="Assam">Assam</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Sikkim">Sikkim</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Delhi">Delhi NCR</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Guwahati"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Row 4: Gender */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Gender
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. QUALIFICATION & EXPERIENCE */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-6 text-primary-900 font-bold text-base sm:text-lg border-b border-gray-100 pb-3">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <h2>3. QUALIFICATION & EXPERIENCE</h2>
            </div>

            {/* Row 1: Total Experience, Educational Qualification, College Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Total Experience (Years)
                </label>
                <select
                  name="totalExperience"
                  value={form.totalExperience}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
                >
                  <option value="0">Fresher (0 Years)</option>
                  <option value="1">1 Year</option>
                  <option value="2">2 Years</option>
                  <option value="3">3 Years</option>
                  <option value="4">4 Years</option>
                  <option value="5">5 Years</option>
                  <option value="6">6 Years</option>
                  <option value="7">7 Years</option>
                  <option value="8">8+ Years</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Educational Qualification
                </label>
                <select
                  name="educationLevel"
                  value={form.educationLevel}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
                >
                  <option value="10th / HSLC">10th / HSLC</option>
                  <option value="12th / Higher Secondary">12th / Higher Secondary</option>
                  <option value="Diploma / Polytechnic">Diploma / Polytechnic</option>
                  <option value="Bachelor Degree">Bachelor Degree</option>
                  <option value="Master Degree">Master Degree</option>
                  <option value="Post Graduate Diploma">Post Graduate Diploma</option>
                  <option value="Doctorate / Ph.D">Doctorate / Ph.D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  College / Institution Name
                </label>
                <input
                  type="text"
                  name="college"
                  value={form.college}
                  onChange={handleChange}
                  placeholder="e.g. Gauhati University / Cotton University"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Pass / Graduation Year */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Pass / Graduation Year
              </label>
              <select
                name="passYear"
                value={form.passYear}
                onChange={handleChange}
                className="w-full md:w-64 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
              >
                <option value="">-- Select Year --</option>
                {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + 2 - i).map((yr) => (
                  <option key={yr} value={String(yr)}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Highest Qualification / Degree (Single Degree) */}
            <div className="mb-5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  Highest Qualification / Degree <span className="text-gray-400 font-normal">(Single Degree)</span>
                </label>
                {form.highestDegree && (
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    Selected: {form.highestDegree}
                  </span>
                )}
              </div>

              <select
                name="highestDegree"
                value={form.highestDegree}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
              >
                <option value="">-- Select single highest degree (e.g. B.A, B.Com, B.Sc, B.Tech, MBA, Ph.D...) --</option>
                <option value="Bachelor Degree">Bachelor Degree</option>
                <option value="B.A">B.A (Bachelor of Arts)</option>
                <option value="B.Com">B.Com (Bachelor of Commerce)</option>
                <option value="B.Sc">B.Sc (Bachelor of Science)</option>
                <option value="B.Tech / B.E">B.Tech / B.E (Engineering)</option>
                <option value="BBA / BBM">BBA / BBM (Business Management)</option>
                <option value="BCA">BCA (Computer Applications)</option>
                <option value="Master Degree">Master Degree</option>
                <option value="M.A">M.A (Master of Arts)</option>
                <option value="M.Com">M.Com (Master of Commerce)</option>
                <option value="M.Sc">M.Sc (Master of Science)</option>
                <option value="MBA / PGDM">MBA / PGDM (Business Admin)</option>
                <option value="MCA">MCA (Computer Applications)</option>
                <option value="M.Tech">M.Tech / M.E</option>
                <option value="MBBS / Medical">MBBS / Medical / BDS / Nursing</option>
                <option value="LLB / Law">LLB / LLM (Law)</option>
                <option value="Diploma / Polytechnic">Diploma / Polytechnic</option>
                <option value="12th / Higher Secondary">12th / Higher Secondary</option>
                <option value="10th / HSLC">10th / HSLC</option>
                <option value="Ph.D / Doctorate">Ph.D / Doctorate</option>
              </select>

              {form.highestDegree && (
                <div className="mt-2.5 flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-200 text-xs">
                  <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                    Selected Highest Qualification:{' '}
                    <span className="text-blue-700 font-bold flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {form.highestDegree}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, highestDegree: '' }))}
                    className="text-gray-400 hover:text-red-500 font-bold transition flex items-center gap-0.5 cursor-pointer"
                  >
                    ✕ Clear
                  </button>
                </div>
              )}

              <p className="text-[11px] text-gray-500 mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                <span>✨ Select candidate's single highest qualification to synchronize with recruiter search & database.</span>
                <span className="text-blue-600 font-semibold hover:underline cursor-pointer">
                  + Other Degree Quick Degree Picker
                </span>
              </p>
            </div>

            {/* Expected Monthly Salary / LPA, Notice Period (Days) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Expected Monthly Salary / LPA
                </label>
                <input
                  type="number"
                  name="expectedSalaryMin"
                  value={form.expectedSalaryMin}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Notice Period (Days)
                </label>
                <select
                  name="noticePeriod"
                  value={form.noticePeriod}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="45 Days">45 Days</option>
                  <option value="60 Days">60 Days</option>
                  <option value="90 Days">90 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. KEY JOB SKILLS */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2 mb-6 text-primary-900 font-bold text-base sm:text-lg border-b border-gray-100 pb-3">
              <Zap className="h-5 w-5 text-blue-600" />
              <h2>4. KEY JOB SKILLS</h2>
            </div>

            {/* Input & Add Button */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSkill(skillInput)
                    }
                  }}
                  placeholder="Type a skill and hit enter..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill(skillInput)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Currently Added Skills Chips */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-800 font-semibold text-xs rounded-lg shadow-2xs"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-gray-400 hover:text-red-500 font-bold transition ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Add Popular Pills */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                <span className="font-semibold text-gray-600 mr-1">Quick Add Popular:</span>
                {[
                  'Tally Prime',
                  'Advanced Excel',
                  'Communication',
                  'Front Office',
                  'Sales & Marketing',
                  'Customer Support',
                  'Graphic Design',
                  'Java',
                  'React.js',
                  'Python',
                  'GST Filing',
                  'AutoCAD',
                  'Data Entry',
                  'Teaching',
                ].map((popSkill) => (
                  <button
                    key={popSkill}
                    type="button"
                    onClick={() => handleAddSkill(popSkill)}
                    disabled={skills.includes(popSkill)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      skills.includes(popSkill)
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-gray-700 border-gray-200'
                    }`}
                  >
                    + {popSkill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="py-3.5 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Profile...' : 'Save & Update Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </CandidateLayout>
  )
}

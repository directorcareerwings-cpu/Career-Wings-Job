import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { employerAPI, categoriesAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Briefcase,
  Sparkles,
  RefreshCw,
  Plus,
  X,
  GraduationCap,
  ChevronDown,
  Check,
  CheckCircle2,
  HelpCircle,
  Clock,
  AlertCircle,
  Zap,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { UpgradeBanner } from '@/components/common/UpgradePromptModal'

const ASSAM_DISTRICTS = [
  'Kamrup Metropolitan (Guwahati)',
  'Kamrup Rural',
  'Dibrugarh',
  'Jorhat',
  'Silchar (Cachar)',
  'Nagaon',
  'Sonitpur (Tezpur)',
  'Tinsukia',
  'Barpeta',
  'Bongaigaon',
  'Dhubri',
  'Goalpara',
  'Golaghat',
  'Hailakandi',
  'Karbi Anglong',
  'Karimganj',
  'Kokrajhar',
  'Lakhimpur',
  'Morigaon',
  'Nalbari',
  'Sivasagar',
  'Darrang',
  'Udalguri',
  'Dima Hasao',
  'Chirang',
  'Baksa',
  'Charaideo',
  'Hojai',
  'Biswanath',
  'Majuli',
  'South Salmara-Mankachar',
  'West Karbi Anglong',
  'Bajali',
  'Tamulpur',
]

const STATES_LIST = [
  'Assam',
  'Meghalaya',
  'Arunachal Pradesh',
  'Nagaland',
  'Manipur',
  'Mizoram',
  'Tripura',
  'West Bengal',
  'Delhi',
  'Maharashtra',
  'Karnataka',
  'Other State',
]

const POPULAR_DEGREES = [
  'B.A',
  'B.Com',
  'B.Sc',
  'B.Tech',
  'B.E',
  'BBA',
  'BCA',
  'MBA',
  'M.Tech',
  'M.Sc',
  'M.Com',
  'M.A',
  'MCA',
  'Diploma',
  'ITI',
  '12th Pass',
  '10th Pass',
  'B.Ed',
  'LLB',
  'MBBS',
]

interface AISkillSuggestion {
  name: string
  level: 'HIGH' | 'MEDIUM' | 'RECOMMENDED'
  category: 'Soft Skills' | 'Tools & Software' | 'Core Domain Skill'
}

const DEFAULT_AI_SUGGESTIONS: AISkillSuggestion[] = [
  { name: 'Communication Skills', level: 'HIGH', category: 'Soft Skills' },
  { name: 'MS Office & Excel', level: 'HIGH', category: 'Tools & Software' },
  { name: 'Team Collaboration', level: 'MEDIUM', category: 'Soft Skills' },
  { name: 'Problem Solving', level: 'MEDIUM', category: 'Soft Skills' },
  { name: 'Time Management', level: 'RECOMMENDED', category: 'Soft Skills' },
]

export default function PostJob() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  // Form State
  const [form, setForm] = useState({
    title: '',
    categoryId: '',
    jobType: 'FULL_TIME',
    qualificationRequired: 'Any qualification',
    openings: 1,
    genderPreference: 'Any (no preference)',
    state: 'Assam',
    district: 'Kamrup Metropolitan (Guwahati)',
    city: 'Guwahati',
    country: 'India',
    experienceMin: 0,
    experienceMax: 0,
    salaryMin: 0,
    salaryMax: 0,
    description: '',
    isFeatured: false,
  })

  // Degree Picker State
  const [selectedDegrees, setSelectedDegrees] = useState<string[]>([])
  const [degreeDropdownOpen, setDegreeDropdownOpen] = useState(false)
  const [quickDegreePickerOpen, setQuickDegreePickerOpen] = useState(false)
  const [customDegreeInput, setCustomDegreeInput] = useState('')
  const [showCustomDegreePrompt, setShowCustomDegreePrompt] = useState(false)

  // Skills State
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [aiFilterTab, setAiFilterTab] = useState<'All' | 'Soft Skills' | 'Tools & Software' | 'Core Domain Skill'>('All')
  const [aiSuggestions, setAiSuggestions] = useState<AISkillSuggestion[]>(DEFAULT_AI_SUGGESTIONS)
  const [isAiRefreshing, setIsAiRefreshing] = useState(false)
  const [isEmployerApproved, setIsEmployerApproved] = useState<boolean | null>(null)
  const [subSummary, setSubSummary] = useState<any>(null)
  const [featuredQuota, setFeaturedQuota] = useState<{
    limit: number
    used: number
    remaining: number
    isUnlimited: boolean
    canFeature: boolean
    packageName: string
  } | null>(null)

  useEffect(() => {
    // Check employer verification status
    employerAPI
      .getCompany()
      .then((res) => {
        if (res.data?.data) {
          setIsEmployerApproved(Boolean(res.data.data.isVerified))
        }
      })
      .catch(() => null)

    // Check employer package and posting limit
    employerAPI
      .getSubscription()
      .then((res) => {
        if (res.data?.data) {
          setSubSummary(res.data.data)
        }
      })
      .catch(() => null)

    // Check featured job quota for this employer
    employerAPI
      .getFeaturedQuota()
      .then((res) => {
        if (res.data?.data) {
          setFeaturedQuota(res.data.data)
        }
      })
      .catch(() => null)

    // Fetch categories
    categoriesAPI
      .getAll()
      .then((res) => {
        if (res.data?.data) {
          setCategories(res.data.data)
        }
      })
      .catch(() => {
        // Fallback default categories
        setCategories([
          { id: 'it', name: 'IT & Software Development' },
          { id: 'banking', name: 'Banking & Financial Services' },
          { id: 'healthcare', name: 'Healthcare & Hospital' },
          { id: 'sales', name: 'Sales & Business Development' },
          { id: 'civil', name: 'Civil & Construction EPC' },
          { id: 'education', name: 'Education & Teaching' },
          { id: 'office', name: 'Office Administration & HR' },
          { id: 'retail', name: 'Retail & FMCG' },
          { id: 'logistics', name: 'Logistics & Supply Chain' },
          { id: 'hospitality', name: 'Hospitality & Tourism' },
        ])
      })
  }, [])

  // Dynamic AI Suggestions based on Job Title or Category
  const refreshAISuggestions = () => {
    setIsAiRefreshing(true)
    setTimeout(() => {
      const lowerTitle = form.title.toLowerCase()
      let updated: AISkillSuggestion[] = []

      if (lowerTitle.includes('developer') || lowerTitle.includes('engineer') || lowerTitle.includes('tech') || lowerTitle.includes('software')) {
        updated = [
          { name: 'JavaScript / TypeScript', level: 'HIGH', category: 'Core Domain Skill' },
          { name: 'React / Next.js', level: 'HIGH', category: 'Tools & Software' },
          { name: 'Node.js & APIs', level: 'MEDIUM', category: 'Tools & Software' },
          { name: 'Git & Version Control', level: 'MEDIUM', category: 'Tools & Software' },
          { name: 'Problem Solving', level: 'RECOMMENDED', category: 'Soft Skills' },
        ]
      } else if (lowerTitle.includes('sale') || lowerTitle.includes('marketing') || lowerTitle.includes('b2b')) {
        updated = [
          { name: 'B2B Sales & Pitching', level: 'HIGH', category: 'Core Domain Skill' },
          { name: 'Lead Generation', level: 'HIGH', category: 'Core Domain Skill' },
          { name: 'CRM & Excel Reporting', level: 'MEDIUM', category: 'Tools & Software' },
          { name: 'Client Negotiation', level: 'MEDIUM', category: 'Soft Skills' },
          { name: 'Communication Skills', level: 'RECOMMENDED', category: 'Soft Skills' },
        ]
      } else if (lowerTitle.includes('civil') || lowerTitle.includes('construction') || lowerTitle.includes('site')) {
        updated = [
          { name: 'Site Supervision', level: 'HIGH', category: 'Core Domain Skill' },
          { name: 'AutoCAD & Blueprints', level: 'HIGH', category: 'Tools & Software' },
          { name: 'Material Estimation', level: 'MEDIUM', category: 'Core Domain Skill' },
          { name: 'Safety & Quality Compliance', level: 'MEDIUM', category: 'Core Domain Skill' },
          { name: 'Team Coordination', level: 'RECOMMENDED', category: 'Soft Skills' },
        ]
      } else {
        updated = [
          { name: 'Communication Skills', level: 'HIGH', category: 'Soft Skills' },
          { name: 'MS Office & Excel', level: 'HIGH', category: 'Tools & Software' },
          { name: 'Team Collaboration', level: 'MEDIUM', category: 'Soft Skills' },
          { name: 'Problem Solving', level: 'MEDIUM', category: 'Soft Skills' },
          { name: 'Time Management', level: 'RECOMMENDED', category: 'Soft Skills' },
        ]
      }

      setAiSuggestions(updated)
      setIsAiRefreshing(false)
      toast.success('AI suggestions updated for role!')
    }, 400)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value
    setForm((prev) => ({ ...prev, [e.target.name]: val }))
  }

  // Degrees handling
  const toggleDegree = (degree: string) => {
    setSelectedDegrees((prev) =>
      prev.includes(degree) ? prev.filter((d) => d !== degree) : [...prev, degree]
    )
  }

  const addCustomDegree = () => {
    if (customDegreeInput.trim()) {
      const deg = customDegreeInput.trim()
      if (!selectedDegrees.includes(deg)) {
        setSelectedDegrees((prev) => [...prev, deg])
      }
      setCustomDegreeInput('')
      setShowCustomDegreePrompt(false)
    }
  }

  // Skills handling
  const handleAddSkill = (skillName: string) => {
    const trimmed = skillName.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed])
    }
  }

  const handleRemoveSkill = (skillName: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillName))
  }

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (skillInput.trim()) {
        handleAddSkill(skillInput)
        setSkillInput('')
      }
    }
  }

  const handleAddAllSuggestions = () => {
    const newSkills = [...skills]
    filteredSuggestions.forEach((s) => {
      if (!newSkills.includes(s.name)) {
        newSkills.push(s.name)
      }
    })
    setSkills(newSkills)
    toast.success('Added AI suggestions to skills!')
  }

  // Auto-fill Description with AI
  const handleAutoFillDescription = () => {
    const roleTitle = form.title || 'Professional'
    const categoryName =
      categories.find((c) => c.id === form.categoryId)?.name || 'General Industry'
    const location = `${form.city}, ${form.district ? form.district + ', ' : ''}${form.state}`
    const skillsList = skills.length > 0 ? skills.join(', ') : 'industry best practices and team coordination'
    const expText =
      form.experienceMin === 0 && form.experienceMax === 0
        ? 'Freshers and experienced candidates both welcome'
        : `${form.experienceMin} - ${form.experienceMax} years`

    const generated = `Role Overview:
We are seeking an energetic and skilled ${roleTitle} to join our growing organization in ${location}. In this role, you will play a crucial part in executing day-to-day operations, meeting deliverables, and contributing to high-standard team excellence in ${categoryName}.

Key Responsibilities:
• Manage and execute key operations aligned with ${roleTitle} responsibilities.
• Apply expertise in ${skillsList} to achieve team objectives efficiently.
• Collaborate with department managers and cross-functional teams to resolve blockers.
• Ensure strict adherence to organizational quality benchmarks and delivery timelines.
• Maintain organized documentation, reports, and clear professional communication.

Required Qualifications & Competencies:
• Minimum Qualification: ${form.qualificationRequired} ${selectedDegrees.length > 0 ? `(${selectedDegrees.join(', ')})` : ''}
• Experience Required: ${expText}
• Demonstrated proficiency in: ${skillsList}
• Strong interpersonal communication, accountability, and problem-solving attitude.

Benefits & Compensation:
• Attractive compensation package (₹${form.salaryMin.toLocaleString('en-IN')} - ₹${form.salaryMax.toLocaleString('en-IN')} per month).
• Collaborative work environment with substantial opportunities for career progression.
• Full support and verification via Career Wings network.`

    setForm((prev) => ({ ...prev, description: generated }))
    toast.success('AI generated job description!')
  }

  const filteredSuggestions = aiSuggestions.filter((s) => {
    if (aiFilterTab === 'All') return true
    return s.category === aiFilterTab
  })

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Job title is required')
      return
    }

    if (isJobLimitReached) {
      toast.error('Your job posting limit has been reached. Upgrade your package to post more jobs.')
      navigate('/employer/subscription')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: form.title,
        categoryId: form.categoryId || undefined,
        jobType: form.jobType,
        educationLevel: form.qualificationRequired,
        highestDegree: selectedDegrees.join(', '),
        vacancies: Number(form.openings) || 1,
        genderPreference: form.genderPreference,
        state: form.state,
        district: form.district,
        city: form.city,
        country: form.country,
        locationText: `${form.city}, ${form.district ? form.district + ', ' : ''}${form.state}`,
        experienceMin: Number(form.experienceMin) || 0,
        experienceMax: Number(form.experienceMax) || 0,
        salaryMin: Number(form.salaryMin) || 0,
        salaryMax: Number(form.salaryMax) || 0,
        salaryPeriod: 'MONTHLY',
        description: form.description || `${form.title} role at Career Wings.`,
        skills: skills,
        isFeatured: form.isFeatured,
      }

      const res = await employerAPI.createJob(payload)
      window.dispatchEvent(new CustomEvent('employer-counts-changed'))
      toast.success(res.data?.message || 'Job submitted for Admin review! It will go live once approved.')
      navigate('/employer/jobs')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post job. Please verify your details.')
    } finally {
      setLoading(false)
    }
  }

  const jobLimit = subSummary?.limits?.jobPostings ?? 5
  const jobsUsed = subSummary?.usage?.jobPostings ?? 0
  const isUnlimitedJobs = jobLimit === -1
  const isJobLimitReached = !isUnlimitedJobs && jobsUsed >= jobLimit

  return (
    <EmployerLayout>
      <SEOMeta title="Post a New Job | Career Wings Employer" />

      <div className="max-w-4xl space-y-6">
        {/* Top Header Row */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Post a new job</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Publish a verified job vacancy to Career Wings portal and candidate network.
          </p>
        </div>

        {/* Main Form Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          {/* Job Posting Limit Warning */}
          {isJobLimitReached ? (
            <div className="mb-6">
              <UpgradeBanner
                title="Your job posting limit has been reached."
                description={`Your active package includes ${jobLimit} job posts and you have already used ${jobsUsed} / ${jobLimit}. Upgrade your package to post more jobs.`}
                isLimitReached={true}
                role="EMPLOYER"
                onUpgrade={() => navigate('/employer/subscription')}
              />
            </div>
          ) : subSummary?.package ? (
            <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Active Package:</span>
                <span className="font-semibold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                  {subSummary.package.name}
                </span>
                <span className="text-slate-500">
                  • {isUnlimitedJobs ? 'Unlimited Job Postings' : `${jobsUsed} / ${jobLimit} Job Posts Used`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/employer/subscription')}
                className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-orange-500" />
                Upgrade Quota
              </button>
            </div>
          ) : null}

          {isEmployerApproved === false && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Admin Approval Required to Post Jobs
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Your employer account is currently pending Admin verification. You may fill in job specifications, but submitting new job listings to the portal requires Admin account approval.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ROW 1: Job title * | Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="">Choose category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ROW 2: Job type | Qualification required */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job type
                </label>
                <div className="relative">
                  <select
                    name="jobType"
                    value={form.jobType}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="FREELANCE">Freelance</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Qualification required
                </label>
                <div className="relative">
                  <select
                    name="qualificationRequired"
                    value={form.qualificationRequired}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="Any qualification">Any qualification</option>
                    <option value="10th Pass">10th Pass</option>
                    <option value="12th Pass">12th Pass</option>
                    <option value="Diploma / ITI">Diploma / ITI</option>
                    <option value="Bachelor Degree">Bachelor Degree</option>
                    <option value="Master Degree">Master Degree</option>
                    <option value="Doctorate / Ph.D">Doctorate / Ph.D</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ROW 3: Highest Degree(s) Accepted / Required */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">
                  Highest Degree(s) Accepted / Required
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Select Multiple or Drag)
                </span>
              </div>

              {/* Degrees Container Box */}
              <div
                onClick={() => setDegreeDropdownOpen(!degreeDropdownOpen)}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {selectedDegrees.length === 0 ? (
                    <span className="text-sm text-slate-400 select-none">
                      -- e.g. B.A, B.Com, B.Sc, B.Tech, MBA --
                    </span>
                  ) : (
                    selectedDegrees.map((deg) => (
                      <span
                        key={deg}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleDegree(deg)
                        }}
                      >
                        {deg}
                        <X className="w-3 h-3 text-blue-500 hover:text-blue-800" />
                      </span>
                    ))
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    degreeDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {/* Degree Dropdown Menu */}
              {degreeDropdownOpen && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 shadow-lg grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto">
                  {POPULAR_DEGREES.map((deg) => {
                    const isSelected = selectedDegrees.includes(deg)
                    return (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => toggleDegree(deg)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{deg}</span>
                        {isSelected && <Check className="w-3 h-3 ml-1 text-white" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Degree Section Subtext Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1 text-amber-600">
                  <span>✨</span>
                  <span>Drag degree chips to arrange priority degree requirements for this job vacancy.</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCustomDegreePrompt(!showCustomDegreePrompt)}
                    className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    + Other Degree
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDegreePickerOpen(!quickDegreePickerOpen)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Quick Degree Picker
                  </button>
                </div>
              </div>

              {/* Custom Degree Input Field if clicked */}
              {showCustomDegreePrompt && (
                <div className="mt-2 flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    value={customDegreeInput}
                    onChange={(e) => setCustomDegreeInput(e.target.value)}
                    placeholder="Enter degree name (e.g. B.Des, BDS)"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs flex-1 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomDegree}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Quick Degree Picker Grid */}
              {quickDegreePickerOpen && (
                <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Select Common Degrees</span>
                    <button
                      type="button"
                      onClick={() => setQuickDegreePickerOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Done
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_DEGREES.map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => toggleDegree(deg)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          selectedDegrees.includes(deg)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {deg}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ROW 4: Openings | Gender preference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Openings
                </label>
                <input
                  type="number"
                  name="openings"
                  min={1}
                  value={form.openings}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender preference
                </label>
                <div className="relative">
                  <select
                    name="genderPreference"
                    value={form.genderPreference}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="Any (no preference)">Any (no preference)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ROW 5: State | District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  State
                </label>
                <div className="relative">
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    {STATES_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  District
                </label>
                <div className="relative">
                  <select
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    {form.state === 'Assam' ? (
                      ASSAM_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={form.district || 'Main District'}>
                          {form.district || 'Main District'}
                        </option>
                        <option value="Headquarters">Headquarters</option>
                        <option value="Other Area">Other Area</option>
                      </>
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ROW 6: City / Location | Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  City / Location
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Guwahati"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={form.country}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-slate-50 cursor-not-allowed"
                />
              </div>
            </div>

            {/* ROW 7: Experience min (yrs) | Experience max (yrs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Experience min (yrs)
                </label>
                <input
                  type="number"
                  name="experienceMin"
                  min={0}
                  value={form.experienceMin}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Experience max (yrs)
                </label>
                <input
                  type="number"
                  name="experienceMax"
                  min={0}
                  value={form.experienceMax}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            {/* ROW 8: Salary min (₹/Month) | Salary max (₹/Month) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Salary min (₹/Month)
                </label>
                <input
                  type="number"
                  name="salaryMin"
                  min={0}
                  step={500}
                  value={form.salaryMin}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Salary max (₹/Month)
                </label>
                <input
                  type="number"
                  name="salaryMax"
                  min={0}
                  step={500}
                  value={form.salaryMax}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            {/* ROW 9: Required skills * & AI Suggestions Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Required skills <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-medium text-slate-400">
                  {skills.length} selected
                </span>
              </div>

              {/* Skills Input with chips */}
              <div className="p-2.5 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all flex flex-wrap items-center gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200/80"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill (e.g. React, GST, B2B Sales) or drag & drop AI suggestions below..."
                  className="flex-1 min-w-[280px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent py-1 px-1"
                />
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>ℹ</span> Press Enter or comma to add. Drag chips to re-order priority.
              </p>

              {/* AI Suggestions Box */}
              <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/40 via-blue-50/20 to-purple-50/30 p-4 sm:p-5 space-y-3.5 shadow-2xs">
                {/* AI Box Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 tracking-tight">
                          AI Required Skills Suggestions
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                          GEMINI 3.7
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Smart recommendations based on role & industry
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleAddAllSuggestions}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add All ({filteredSuggestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={refreshAISuggestions}
                      disabled={isAiRefreshing}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-slate-500 ${
                          isAiRefreshing ? 'animate-spin' : ''
                        }`}
                      />
                      Refresh AI
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(['All', 'Soft Skills', 'Tools & Software', 'Core Domain Skill'] as const).map(
                    (tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setAiFilterTab(tab)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          aiFilterTab === tab
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
                        }`}
                      >
                        {tab}
                      </button>
                    )
                  )}
                </div>

                {/* Drag info */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Drag chips directly into Required Skills or click + to add instantly:</span>
                  <span className="font-medium text-slate-400">
                    {filteredSuggestions.length} suggestions ready
                  </span>
                </div>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  {filteredSuggestions.map((item) => {
                    const isAlreadyAdded = skills.includes(item.name)
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleAddSkill(item.name)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          isAlreadyAdded
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <span className="text-slate-300 font-mono text-xs">::</span>
                        <span>{item.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            item.level === 'HIGH'
                              ? 'bg-red-50 text-red-600 border border-red-100'
                              : item.level === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}
                        >
                          {item.level}
                        </span>
                        {!isAlreadyAdded ? (
                          <Plus className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ROW 10: Description & Auto-fill with AI */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Description
                </label>
                <button
                  type="button"
                  onClick={handleAutoFillDescription}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Auto-fill with AI
                </button>
              </div>
              <textarea
                name="description"
                rows={6}
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the role, responsibilities, requirements and perks..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
              />
            </div>

            {/* Featured Job Package Option */}
            <div
              className={cn(
                'p-5 rounded-2xl border transition-all',
                form.isFeatured
                  ? 'bg-amber-500/5 border-amber-300 ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      form.isFeatured
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    <Star className={cn('w-5 h-5', form.isFeatured ? 'fill-white' : '')} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Feature this Job on Homepage & Top of Search
                      </h3>
                      {form.isFeatured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                      Featured jobs appear on the Career Wings homepage and are pinned to the top of candidate searches, generating up to 5x more applications.
                    </p>

                    {/* Quota Status */}
                    <div className="mt-2 text-xs">
                      {featuredQuota ? (
                        featuredQuota.limit <= 0 ? (
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="text-rose-600 font-semibold">
                              Not included in {featuredQuota.packageName}
                            </span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => navigate('/employer/subscription')}
                              className="text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
                            >
                              Upgrade package to unlock
                            </button>
                          </div>
                        ) : featuredQuota.canFeature ? (
                          <span className="text-emerald-700 font-medium">
                            ✓ {featuredQuota.isUnlimited ? 'Unlimited' : `${featuredQuota.remaining} of ${featuredQuota.limit}`} featured slots remaining in your {featuredQuota.packageName} plan
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-600 font-medium">
                            <span>All {featuredQuota.limit} featured slots used in your {featuredQuota.packageName} plan</span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => navigate('/employer/subscription')}
                              className="text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
                            >
                              Upgrade Plan
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400">Checking package limits...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <div className="self-start sm:self-center shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      disabled={!featuredQuota || !featuredQuota.canFeature}
                      onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-disabled:opacity-40 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Admin Approval Notice Banner */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong className="font-semibold block text-amber-950 mb-0.5">
                  Admin Approval Required Before Live
                </strong>
                All job vacancies are verified by Career Wings administrators before going live on the public job board. Once submitted, your job will be set to <span className="font-bold text-amber-800">Pending Review</span>. You will receive an immediate notification as soon as an Admin approves it.
              </div>
            </div>

            {/* Submit Row */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {isJobLimitReached ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Posting limit reached ({jobsUsed} / {jobLimit} used). Upgrade your package to post more jobs.
                  </span>
                ) : (
                  <span>
                    Package balance:{' '}
                    <strong>{isUnlimitedJobs ? 'Unlimited' : `${Math.max(0, jobLimit - jobsUsed)} postings remaining`}</strong>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || isEmployerApproved === false || isJobLimitReached}
                className="py-3 px-6 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title={
                  isJobLimitReached
                    ? 'Your job posting limit has been reached. Upgrade your package to post more jobs.'
                    : isEmployerApproved === false
                    ? 'Your account requires Admin approval before posting jobs'
                    : 'Submit Job for Admin Approval'
                }
              >
                <Briefcase className="w-4 h-4" />
                {loading
                  ? 'Submitting...'
                  : isJobLimitReached
                  ? 'Posting Limit Reached'
                  : isEmployerApproved === false
                  ? 'Account Pending Admin Approval'
                  : 'Submit Job for Admin Approval'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </EmployerLayout>
  )
}

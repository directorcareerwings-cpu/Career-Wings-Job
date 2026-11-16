import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Download,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Briefcase,
  GraduationCap,
  Award,
  User,
  Layers,
  Palette,
  Eye,
  ChevronDown,
  ChevronUp,
  FileDown,
  RefreshCw,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { aiResumeAPI, candidateAPI } from '@/lib/api'
import { ModernTemplate, ExecutiveTemplate, TechTemplate, type ResumeData } from './ResumeTemplates'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const DEFAULT_RESUME: ResumeData = {
  personalInfo: {
    fullName: '',
    targetRole: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
  },
  summary: '',
  experience: [
    {
      id: 'exp-1',
      title: 'Senior Software Engineer',
      company: 'Tech Solutions India',
      location: 'Guwahati, Assam',
      startDate: '2022-01',
      endDate: 'Present',
      isCurrent: true,
      description: '• Architected and shipped scalable full-stack web applications serving 50K+ monthly active users.\n• Streamlined database performance, cutting query response times by 35%.\n• Mentored 3 junior software engineers and established weekly code review guidelines.',
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'B.Tech in Computer Science',
      institution: 'Gauhati University',
      fieldOfStudy: 'Computer Science & Engineering',
      startYear: '2017',
      endYear: '2021',
      grade: '8.4 CGPA',
    },
  ],
  skills: [
    'React / Next.js',
    'TypeScript',
    'Node.js / Express',
    'PostgreSQL / SQL',
    'REST APIs',
    'Git & GitHub',
    'Problem Solving',
    'Agile Methodologies',
  ],
  certifications: ['AWS Certified Solutions Architect', 'Meta Front-End Developer Certificate'],
  languages: ['English', 'Assamese', 'Hindi'],
  templateId: 'modern',
  themeColor: '#0f172a',
}

const COLOR_PALETTES = [
  { name: 'Slate Dark', hex: '#0f172a' },
  { name: 'Career Orange', hex: '#ea580c' },
  { name: 'Executive Blue', hex: '#0369a1' },
  { name: 'Emerald Forest', hex: '#047857' },
  { name: 'Royal Purple', hex: '#6d28d9' },
  { name: 'Classic Crimson', hex: '#be123c' },
]

export default function AIResumeBuilder() {
  const [resume, setResume] = useState<ResumeData>(DEFAULT_RESUME)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [atsAudit, setAtsAudit] = useState<{
    score: number
    grade: string
    strengths: string[]
    improvements: string[]
  } | null>(null)

  // AI Generation Modals / State
  const [aiLoading, setAiLoading] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [aiSummaries, setAiSummaries] = useState<Array<{ id: string; title: string; tone: string; text: string }>>([])
  const [targetExpIndex, setTargetExpIndex] = useState<number | null>(null)
  const [showBulletModal, setShowBulletModal] = useState(false)
  const [bulletSuggestions, setBulletSuggestions] = useState<string[]>([])
  const [showSkillModal, setShowSkillModal] = useState(false)
  const [suggestedSkillsList, setSuggestedSkillsList] = useState<{
    tech: string[]
    soft: string[]
  }>({ tech: [], soft: [] })

  // Active accordion section
  const [activeSection, setActiveSection] = useState<'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'extras'>('personal')

  // Load draft on mount
  useEffect(() => {
    fetchDraft()
  }, [])

  // Recalculate ATS score when data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      runATSAudit()
    }, 800)
    return () => clearTimeout(timer)
  }, [resume])

  const fetchDraft = async () => {
    setLoading(true)
    try {
      const res = await aiResumeAPI.getDraft()
      if (res.data?.data) {
        setResume((prev) => ({
          ...prev,
          ...res.data.data,
          personalInfo: { ...prev.personalInfo, ...res.data.data.personalInfo },
        }))
      }
    } catch (err) {
      console.warn('Could not load draft, using initial profile data', err)
    } finally {
      setLoading(false)
    }
  }

  const runATSAudit = async () => {
    try {
      const res = await aiResumeAPI.auditATS({ resume })
      if (res.data?.data) {
        setAtsAudit(res.data.data)
      }
    } catch {
      // silent
    }
  }

  const handleSaveDraft = async (syncProfile = false) => {
    setSaving(true)
    try {
      await aiResumeAPI.saveDraft({ resume, syncProfile })
      toast.success(syncProfile ? 'Saved & synced to your candidate profile!' : 'Resume draft saved successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleAutofillFromProfile = async () => {
    const ok = window.confirm('Import data from your Career Wings candidate profile? (This will update your contact, education, and experience fields)')
    if (!ok) return

    try {
      const res = await candidateAPI.getProfile()
      const profile = res.data?.data
      if (!profile) return

      setResume((prev) => ({
        ...prev,
        personalInfo: {
          fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || prev.personalInfo.fullName,
          targetRole: profile.headline || profile.currentRole || prev.personalInfo.targetRole,
          email: profile.user?.email || prev.personalInfo.email,
          phone: profile.phone || prev.personalInfo.phone,
          location: profile.currentLocation || profile.city || prev.personalInfo.location,
        },
        summary: profile.summary || prev.summary,
        experience: profile.experience?.length
          ? profile.experience.map((e: any) => ({
              id: e.id || Math.random().toString(),
              title: e.title,
              company: e.company,
              location: e.location || '',
              startDate: e.startDate ? String(e.startDate).slice(0, 7) : '',
              endDate: e.isCurrent ? 'Present' : e.endDate ? String(e.endDate).slice(0, 7) : '',
              isCurrent: Boolean(e.isCurrent),
              description: e.description || '',
            }))
          : prev.experience,
        education: profile.education?.length
          ? profile.education.map((ed: any) => ({
              id: ed.id || Math.random().toString(),
              degree: ed.degree,
              institution: ed.institution,
              fieldOfStudy: ed.fieldOfStudy || '',
              startYear: ed.startYear ? String(ed.startYear) : '',
              endYear: ed.endYear ? String(ed.endYear) : '',
              grade: ed.grade || '',
            }))
          : prev.education,
        skills: profile.candidateSkills?.length
          ? profile.candidateSkills.map((s: any) => s.skill?.name || s.skill || '')
          : prev.skills,
      }))
      toast.success('Profile imported into resume builder!')
    } catch {
      toast.error('Failed to import profile data')
    }
  }

  // AI Summary Generator Trigger
  const handleGenerateAISummary = async () => {
    setAiLoading(true)
    try {
      const res = await aiResumeAPI.generateSummary({
        targetRole: resume.personalInfo.targetRole || 'Professional',
        experienceYears: resume.experience.length * 2,
        keySkills: resume.skills,
      })
      if (res.data?.data?.variations) {
        setAiSummaries(res.data.data.variations)
        setShowSummaryModal(true)
      }
    } catch {
      toast.error('Failed to generate AI summaries')
    } finally {
      setAiLoading(false)
    }
  }

  // AI Bullet Point Generator Trigger
  const handleGenerateBullets = async (index: number) => {
    setTargetExpIndex(index)
    setAiLoading(true)
    const exp = resume.experience[index]
    try {
      const res = await aiResumeAPI.enhanceExperience({
        jobTitle: exp.title || resume.personalInfo.targetRole,
        company: exp.company,
      })
      if (res.data?.data?.suggestions) {
        setBulletSuggestions(res.data.data.suggestions)
        setShowBulletModal(true)
      }
    } catch {
      toast.error('Failed to suggest bullet points')
    } finally {
      setAiLoading(false)
    }
  }

  // AI Skill Suggestions Trigger
  const handleSuggestSkills = async () => {
    setAiLoading(true)
    try {
      const res = await aiResumeAPI.suggestSkills({
        targetRole: resume.personalInfo.targetRole || 'Professional',
      })
      if (res.data?.data) {
        setSuggestedSkillsList({
          tech: res.data.data.technicalSkills || [],
          soft: res.data.data.softSkills || [],
        })
        setShowSkillModal(true)
      }
    } catch {
      toast.error('Failed to suggest skills')
    } finally {
      setAiLoading(false)
    }
  }

  // Print / PDF Export
  const handlePrint = () => {
    window.print()
  }

  // Render chosen template
  const renderActiveTemplate = () => {
    switch (resume.templateId) {
      case 'executive':
        return <ExecutiveTemplate resume={resume} />
      case 'tech':
        return <TechTemplate resume={resume} />
      case 'modern':
      default:
        return <ModernTemplate resume={resume} />
    }
  }

  return (
    <div className="space-y-6">
      {/* ────────────────────────────────────────────────────────────────────────
          PRINT STYLE INJECTION
      ──────────────────────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-resume, #printable-resume * {
            visibility: visible;
          }
          #printable-resume {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* ────────────────────────────────────────────────────────────────────────
          TOP ACTION & STATUS BAR
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-orange-100 text-orange-600">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              AI Resume Builder
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build ATS-compliant resumes with AI summaries, bullet point optimization, and vector PDF download.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click Profile Autofill */}
          <button
            type="button"
            onClick={handleAutofillFromProfile}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Import all data from your candidate profile"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>Autofill Profile</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleSaveDraft(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>{saving ? 'Saving...' : 'Save & Sync'}</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          MAIN WORKSPACE: SPLIT SCREEN (LEFT: EDITOR, RIGHT: LIVE PREVIEW)
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: SECTION EDITORS (COL 1 to 6) ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* ATS Score Card */}
          {atsAudit && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs',
                      atsAudit.score >= 80 ? 'bg-emerald-600' : atsAudit.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    )}
                  >
                    {atsAudit.score}%
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">ATS Readiness Score:</span>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Grade {atsAudit.grade}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {atsAudit.score >= 80 ? 'High probability of passing recruiter ATS keyword filters.' : 'Follow improvement tips to boost interview calls.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Improvements banner if any */}
              {atsAudit.improvements.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-700 block">Suggested Improvements:</span>
                  {atsAudit.improvements.slice(0, 2).map((tip, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-amber-800">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 1: Personal & Target Role */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveSection(activeSection === 'personal' ? 'summary' : 'personal')}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-sm text-slate-900">1. Contact & Target Role</span>
              </div>
              {activeSection === 'personal' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {activeSection === 'personal' && (
              <div className="p-4 sm:p-5 space-y-3.5 border-t border-slate-100 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={resume.personalInfo.fullName}
                      onChange={(e) =>
                        setResume((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, fullName: e.target.value },
                        }))
                      }
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Target Job Title</label>
                    <input
                      type="text"
                      value={resume.personalInfo.targetRole}
                      onChange={(e) =>
                        setResume((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, targetRole: e.target.value },
                        }))
                      }
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Email</label>
                    <input
                      type="email"
                      value={resume.personalInfo.email}
                      onChange={(e) =>
                        setResume((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, email: e.target.value },
                        }))
                      }
                      placeholder="rahul@example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={resume.personalInfo.phone}
                      onChange={(e) =>
                        setResume((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, phone: e.target.value },
                        }))
                      }
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">City / Location</label>
                    <input
                      type="text"
                      value={resume.personalInfo.location}
                      onChange={(e) =>
                        setResume((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, location: e.target.value },
                        }))
                      }
                      placeholder="Guwahati, Assam"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">LinkedIn URL (optional)</label>
                    <input
                      type="text"
                      value={resume.personalInfo.linkedin || ''}
                      onChange={(e) =>
                        setResume((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, linkedin: e.target.value },
                        }))
                      }
                      placeholder="linkedin.com/in/username"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Portfolio / Website</label>
                    <input
                      type="text"
                      value={resume.personalInfo.portfolio || ''}
                      onChange={(e) =>
                        setResume((p) => ({
                          ...p,
                          personalInfo: { ...p.personalInfo, portfolio: e.target.value },
                        }))
                      }
                      placeholder="github.com/username or portfolio.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: AI Professional Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-sm text-slate-900">2. Professional Summary</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateAISummary}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'Generating...' : '✨ Generate AI Summary'}</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-2">
              <textarea
                rows={4}
                value={resume.summary}
                onChange={(e) => setResume((p) => ({ ...p, summary: e.target.value }))}
                placeholder="Write a brief 3-4 sentence professional summary or click 'Generate AI Summary' above..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-400">
                Word count: {resume.summary ? resume.summary.trim().split(/\s+/).length : 0} words (Recommended: 40–100 words).
              </p>
            </div>
          </div>

          {/* Section 3: Work Experience */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-sm text-slate-900">3. Work Experience</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setResume((p) => ({
                    ...p,
                    experience: [
                      ...p.experience,
                      {
                        id: Math.random().toString(),
                        title: '',
                        company: '',
                        location: '',
                        startDate: '',
                        endDate: '',
                        isCurrent: false,
                        description: '',
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-300 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5">
              {resume.experience.map((exp, idx) => (
                <div key={exp.id} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3 relative text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setResume((p) => ({
                        ...p,
                        experience: p.experience.filter((_, i) => i !== idx),
                      }))
                    }
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-1"
                    title="Remove Position"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-8">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Job Title</label>
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => {
                          const val = e.target.value
                          setResume((p) => {
                            const copy = [...p.experience]
                            copy[idx].title = val
                            return { ...p, experience: copy }
                          })
                        }}
                        placeholder="e.g. Sales Executive"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Company</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => {
                          const val = e.target.value
                          setResume((p) => {
                            const copy = [...p.experience]
                            copy[idx].company = val
                            return { ...p, experience: copy }
                          })
                        }}
                        placeholder="e.g. Tata Motors"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
                      <input
                        type="text"
                        value={exp.startDate}
                        onChange={(e) => {
                          const val = e.target.value
                          setResume((p) => {
                            const copy = [...p.experience]
                            copy[idx].startDate = val
                            return { ...p, experience: copy }
                          })
                        }}
                        placeholder="e.g. 2022-04"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">End Date</label>
                      <input
                        type="text"
                        value={exp.endDate}
                        disabled={exp.isCurrent}
                        onChange={(e) => {
                          const val = e.target.value
                          setResume((p) => {
                            const copy = [...p.experience]
                            copy[idx].endDate = val
                            return { ...p, experience: copy }
                          })
                        }}
                        placeholder={exp.isCurrent ? 'Present' : 'e.g. 2024-06'}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white disabled:bg-slate-100"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exp.isCurrent}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setResume((p) => {
                              const copy = [...p.experience]
                              copy[idx].isCurrent = checked
                              if (checked) copy[idx].endDate = 'Present'
                              return { ...p, experience: copy }
                            })
                          }}
                          className="rounded text-orange-600"
                        />
                        <span className="text-xs text-slate-700">Currently Working</span>
                      </label>
                    </div>
                  </div>

                  {/* Bullet Points Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Responsibilities & Achievements</label>
                      <button
                        type="button"
                        onClick={() => handleGenerateBullets(idx)}
                        disabled={aiLoading}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>✨ AI Bullet Suggestions</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={exp.description}
                      onChange={(e) => {
                        const val = e.target.value
                        setResume((p) => {
                          const copy = [...p.experience]
                          copy[idx].description = val
                          return { ...p, experience: copy }
                        })
                      }}
                      placeholder="• Achieved 120% of sales quota...\n• Managed key client communications..."
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Skills */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-sm text-slate-900">4. Key Skills ({resume.skills.length})</span>
              </div>
              <button
                type="button"
                onClick={handleSuggestSkills}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ AI Skill Suggestions</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs">
              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setResume((p) => ({
                          ...p,
                          skills: p.skills.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-slate-400 hover:text-rose-600 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Skill input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  id="new-skill-input"
                  placeholder="Type a skill and press Add (e.g. Python, GST Filing)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const val = (e.currentTarget.value || '').trim()
                      if (val && !resume.skills.includes(val)) {
                        setResume((p) => ({ ...p, skills: [...p.skills, val] }))
                        e.currentTarget.value = ''
                      }
                    }
                  }}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('new-skill-input') as HTMLInputElement
                    if (el && el.value.trim() && !resume.skills.includes(el.value.trim())) {
                      setResume((p) => ({ ...p, skills: [...p.skills, el.value.trim()] }))
                      el.value = ''
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Education */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-sm text-slate-900">5. Education</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setResume((p) => ({
                    ...p,
                    education: [
                      ...p.education,
                      {
                        id: Math.random().toString(),
                        degree: '',
                        institution: '',
                        fieldOfStudy: '',
                        startYear: '',
                        endYear: '',
                        grade: '',
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-300 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Degree</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {resume.education.map((edu, idx) => (
                <div key={edu.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2 relative">
                  <button
                    type="button"
                    onClick={() =>
                      setResume((p) => ({
                        ...p,
                        education: p.education.filter((_, i) => i !== idx),
                      }))
                    }
                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Degree / Qualification</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => {
                          const val = e.target.value
                          setResume((p) => {
                            const c = [...p.education]
                            c[idx].degree = val
                            return { ...p, education: c }
                          })
                        }}
                        placeholder="e.g. B.Com (Accountancy)"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Institution / College</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => {
                          const val = e.target.value
                          setResume((p) => {
                            const c = [...p.education]
                            c[idx].institution = val
                            return { ...p, education: c }
                          })
                        }}
                        placeholder="e.g. Cotton University"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Years</label>
                      <input
                        type="text"
                        value={`${edu.startYear}${edu.endYear ? ` - ${edu.endYear}` : ''}`}
                        onChange={(e) => {
                          const parts = e.target.value.split('-').map((s) => s.trim())
                          setResume((p) => {
                            const c = [...p.education]
                            c[idx].startYear = parts[0] || ''
                            c[idx].endYear = parts[1] || ''
                            return { ...p, education: c }
                          })
                        }}
                        placeholder="2019 - 2022"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Score / Grade (optional)</label>
                      <input
                        type="text"
                        value={edu.grade || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setResume((p) => {
                            const c = [...p.education]
                            c[idx].grade = val
                            return { ...p, education: c }
                          })
                        }}
                        placeholder="e.g. 78% or First Class"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: LIVE A4 PREVIEW & DESIGN CUSTOMIZER (COL 7 to 12) ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* Design Toolbar (Template Switcher + Color Swatches) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Template Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  <span>Template:</span>
                </span>
                {[
                  { id: 'modern', label: 'Modern' },
                  { id: 'executive', label: 'Executive' },
                  { id: 'tech', label: 'Tech' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setResume((p) => ({ ...p, templateId: t.id as any }))}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer',
                      resume.templateId === t.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                {COLOR_PALETTES.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setResume((p) => ({ ...p, themeColor: c.hex }))}
                    className={cn(
                      'w-5 h-5 rounded-full border-2 transition-transform',
                      resume.themeColor === c.hex ? 'scale-125 border-white ring-2 ring-slate-400' : 'border-transparent hover:scale-110'
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* A4 Paper Canvas Container */}
          <div className="bg-slate-200/60 rounded-2xl p-3 sm:p-6 border border-slate-300/80 shadow-inner overflow-x-auto max-h-[850px] overflow-y-auto">
            <div id="printable-resume">
              {renderActiveTemplate()}
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: AI SUMMARY GENERATOR RESULTS
      ──────────────────────────────────────────────────────────────────────── */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Generated Professional Summaries</h3>
                  <p className="text-xs text-slate-500">Pick the summary tone that best matches your target career goals</p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {aiSummaries.map((s) => (
                <div key={s.id} className="p-4 rounded-2xl border border-slate-200 hover:border-orange-500/50 hover:bg-orange-50/20 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{s.title}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setResume((p) => ({ ...p, summary: s.text }))
                        setShowSummaryModal(false)
                        toast.success('AI summary applied to resume!')
                      }}
                      className="px-3 py-1 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-2xs transition"
                    >
                      Use This Summary
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: AI BULLET POINT SUGGESTIONS
      ──────────────────────────────────────────────────────────────────────── */}
      {showBulletModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">STAR Achievement Bullet Points</h3>
                  <p className="text-xs text-slate-500">Action-verb bullet points tailored to your role</p>
                </div>
              </div>
              <button onClick={() => setShowBulletModal(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ×
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {bulletSuggestions.map((bullet, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-start justify-between gap-3">
                  <p className="text-slate-700 leading-relaxed">• {bullet}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (targetExpIndex !== null) {
                        setResume((p) => {
                          const copy = [...p.experience]
                          const existing = copy[targetExpIndex].description ? copy[targetExpIndex].description + '\n' : ''
                          copy[targetExpIndex].description = `${existing}• ${bullet}`
                          return { ...p, experience: copy }
                        })
                        toast.success('Bullet point added!')
                      }
                    }}
                    className="shrink-0 px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition"
                  >
                    + Insert
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowBulletModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: AI SKILL SUGGESTIONS
      ──────────────────────────────────────────────────────────────────────── */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recommended In-Demand Skills</h3>
                  <p className="text-xs text-slate-500">Tap any skill to add directly to your resume</p>
                </div>
              </div>
              <button onClick={() => setShowSkillModal(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ×
              </button>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              <div>
                <span className="font-bold text-slate-800 block mb-2">Technical & Core Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSkillsList.tech.map((s) => {
                    const isAdded = resume.skills.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          if (!isAdded) {
                            setResume((p) => ({ ...p, skills: [...p.skills, s] }))
                            toast.success(`Added "${s}"`)
                          }
                        }}
                        disabled={isAdded}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer',
                          isAdded
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-60'
                            : 'bg-slate-100 hover:bg-orange-100 hover:text-orange-900 border border-slate-200'
                        )}
                      >
                        {isAdded ? `✓ ${s}` : `+ ${s}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-2">Soft & Leadership Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSkillsList.soft.map((s) => {
                    const isAdded = resume.skills.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          if (!isAdded) {
                            setResume((p) => ({ ...p, skills: [...p.skills, s] }))
                            toast.success(`Added "${s}"`)
                          }
                        }}
                        disabled={isAdded}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer',
                          isAdded
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-60'
                            : 'bg-slate-100 hover:bg-orange-100 hover:text-orange-900 border border-slate-200'
                        )}
                      >
                        {isAdded ? `✓ ${s}` : `+ ${s}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSkillModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

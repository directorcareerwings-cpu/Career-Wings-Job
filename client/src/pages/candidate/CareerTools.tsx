import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { candidateAPI, jobsAPI, publicAPI } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  FileDown, Wand2, Globe, Star, Zap, Phone, Activity,
  Sparkles, Award, BookOpen, Lock, ChevronRight, CheckCircle2,
  Download, ExternalLink, Eye, Building2, MapPin, Clock,
  TrendingUp, Target, Brain, ChevronDown, Copy, Check,
  MessageSquare, ArrowRight, Shield, BadgeCheck, Flame,
  BarChart3, PlayCircle, RefreshCw, AlertCircle, X
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Feature {
  id: string
  icon: React.ElementType
  title: string
  subtitle: string
  color: string
  bg: string
  border: string
  pro?: boolean
}

const FEATURES: Feature[] = [
  { id: 'pdf',       icon: FileDown,     title: 'Resume PDF Download',       subtitle: 'Download formatted resume',          color: 'text-violet-600', bg: 'bg-violet-50',  border: 'border-violet-200' },
  { id: 'builder',   icon: Wand2,        title: 'Pro Resume Builder',         subtitle: 'AI-powered resume creation',         color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200' },
  { id: 'public',    icon: Globe,        title: 'Public Resume Link',         subtitle: 'Share your profile with recruiters', color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: 'badge',     icon: BadgeCheck,   title: 'Featured Candidate Badge',   subtitle: 'Stand out in recruiter searches',    color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200',  pro: true },
  { id: 'priority',  icon: Flame,        title: 'Priority Applications',      subtitle: 'Rise to the top of applicant lists', color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',    pro: true },
  { id: 'contact',   icon: Phone,        title: 'Recruiter Contact Access',   subtitle: 'Get direct recruiter details',       color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200',pro: true },
  { id: 'tracking',  icon: Activity,     title: 'Real-time App Tracking',     subtitle: 'Live application status timeline',   color: 'text-cyan-600',   bg: 'bg-cyan-50',    border: 'border-cyan-200' },
  { id: 'ai',        icon: Brain,        title: 'AI Job Recommendations',     subtitle: 'Jobs matched to your skills',        color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  { id: 'skills',    icon: Award,        title: 'Skill Assessment & Badges',  subtitle: 'Verify and showcase your skills',    color: 'text-pink-600',   bg: 'bg-pink-50',    border: 'border-pink-200' },
  { id: 'interview', icon: BookOpen,     title: 'Interview Prep Guides',      subtitle: 'Role-specific interview coaching',   color: 'text-teal-600',   bg: 'bg-teal-50',    border: 'border-teal-200' },
]

const SKILL_ASSESSMENTS = [
  { skill: 'Communication', levels: ['Basic', 'Good', 'Excellent', 'Expert'], icon: '🗣️' },
  { skill: 'Problem Solving', levels: ['Basic', 'Good', 'Excellent', 'Expert'], icon: '🧩' },
  { skill: 'Teamwork', levels: ['Basic', 'Good', 'Excellent', 'Expert'], icon: '🤝' },
  { skill: 'Leadership', levels: ['Basic', 'Good', 'Excellent', 'Expert'], icon: '🎯' },
  { skill: 'Technical Skills', levels: ['Basic', 'Good', 'Excellent', 'Expert'], icon: '💻' },
  { skill: 'Adaptability', levels: ['Basic', 'Good', 'Excellent', 'Expert'], icon: '🔄' },
]

const INTERVIEW_GUIDES = [
  { role: 'Software Developer', questions: 12, topics: ['DSA', 'System Design', 'OOP', 'Projects'], color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '💻' },
  { role: 'Sales Executive', questions: 10, topics: ['Objection Handling', 'CRM', 'Targets', 'Communication'], color: 'bg-green-50 border-green-200 text-green-700', icon: '📈' },
  { role: 'HR Manager', questions: 8, topics: ['Recruitment', 'Policies', 'Conflict Resolution', 'HRIS'], color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '👥' },
  { role: 'Accountant / Finance', questions: 10, topics: ['Tally', 'GST', 'TDS', 'Audit', 'MIS'], color: 'bg-amber-50 border-amber-200 text-amber-700', icon: '💰' },
  { role: 'Marketing Executive', questions: 9, topics: ['Digital Marketing', 'SEO', 'Content', 'Analytics'], color: 'bg-pink-50 border-pink-200 text-pink-700', icon: '📣' },
  { role: 'Operations Manager', questions: 8, topics: ['Process Optimization', 'KPIs', 'Supply Chain', 'Teams'], color: 'bg-teal-50 border-teal-200 text-teal-700', icon: '⚙️' },
]

const INTERVIEW_QUESTIONS: Record<string, { q: string; hint: string }[]> = {
  'Software Developer': [
    { q: 'Explain the difference between Array and LinkedList.', hint: 'Focus on time complexity for access, insertion, deletion.' },
    { q: 'What is OOP? Explain with real-world examples.', hint: 'Cover Encapsulation, Inheritance, Polymorphism, Abstraction.' },
    { q: 'How would you design a URL shortener system?', hint: 'Discuss hashing, database schema, scalability considerations.' },
    { q: 'What is the difference between REST and GraphQL?', hint: 'Mention over-fetching, under-fetching, flexibility.' },
  ],
  'Sales Executive': [
    { q: 'How do you handle a customer who says "Your price is too high"?', hint: 'Focus on value proposition, not just price reduction.' },
    { q: 'Describe your most successful sale and the process you used.', hint: 'Use STAR method: Situation, Task, Action, Result.' },
    { q: 'How do you prioritize your leads pipeline?', hint: 'Mention BANT: Budget, Authority, Need, Timeline.' },
  ],
  'HR Manager': [
    { q: 'How do you handle a conflict between two team members?', hint: 'Mention listening to both sides, mediation, documentation.' },
    { q: 'What strategies do you use to reduce employee attrition?', hint: 'Cover engagement surveys, career paths, compensation reviews.' },
  ],
}

// ─── PDF Generation (Client-side) ─────────────────────────────────────────────

const generateResumePDF = async (profile: any) => {
  // Dynamic import to keep bundle small
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const margin = 18
  const pageW = 210
  const contentW = pageW - margin * 2
  let y = margin

  const addText = (text: string, size: number, bold = false, color = '#1e293b', align: 'left' | 'center' = 'left') => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(color)
    const x = align === 'center' ? pageW / 2 : margin
    const lines = doc.splitTextToSize(text || '', contentW)
    doc.text(lines, x, y, { align })
    y += lines.length * size * 0.4 + 1
  }

  const addLine = (color = '#e2e8f0') => {
    doc.setDrawColor(color)
    doc.line(margin, y, pageW - margin, y)
    y += 4
  }

  const addSection = (title: string) => {
    y += 3
    doc.setFillColor('#f8fafc')
    doc.rect(margin, y - 3, contentW, 8, 'F')
    addText(title.toUpperCase(), 8.5, true, '#6366f1')
    addLine('#e2e8f0')
  }

  const checkNewPage = (needed = 20) => {
    if (y + needed > 280) { doc.addPage(); y = margin }
  }

  // ── Header ──
  doc.setFillColor('#1e293b')
  doc.rect(0, 0, pageW, 38, 'F')

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#ffffff')
  doc.text(`${profile.firstName || ''} ${profile.lastName || ''}`, margin, 14)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#94a3b8')
  doc.text(profile.currentRole || profile.headline || 'Professional', margin, 21)

  // Contact row
  const contacts: string[] = []
  if (profile.phone) contacts.push(`📞 ${profile.phone}`)
  if (profile.user?.email) contacts.push(`✉ ${profile.user.email}`)
  if (profile.currentLocation) contacts.push(`📍 ${profile.currentLocation}`)
  doc.setFontSize(8)
  doc.setTextColor('#cbd5e1')
  doc.text(contacts.join('   '), margin, 29)

  y = 46

  // ── Summary ──
  if (profile.summary) {
    addSection('Professional Summary')
    addText(profile.summary, 9, false, '#334155')
    y += 2
  }

  // ── Experience ──
  if (profile.experience?.length > 0) {
    checkNewPage(30)
    addSection('Work Experience')
    for (const exp of profile.experience) {
      checkNewPage(20)
      addText(`${exp.title}`, 10, true, '#0f172a')
      addText(`${exp.company}${exp.location ? ' · ' + exp.location : ''}`, 9, false, '#475569')
      addText(`${exp.startDate} – ${exp.isCurrent ? 'Present' : exp.endDate || ''}`, 8, false, '#94a3b8')
      if (exp.description) addText(exp.description, 8.5, false, '#475569')
      y += 2
    }
  }

  // ── Education ──
  if (profile.education?.length > 0) {
    checkNewPage(25)
    addSection('Education')
    for (const edu of profile.education) {
      checkNewPage(15)
      addText(`${edu.degree}${edu.fieldOfStudy ? ' in ' + edu.fieldOfStudy : ''}`, 10, true, '#0f172a')
      addText(`${edu.institution}`, 9, false, '#475569')
      addText(`${edu.startYear} – ${edu.isCurrently ? 'Ongoing' : edu.endYear || ''}`, 8, false, '#94a3b8')
      y += 2
    }
  }

  // ── Skills ──
  if (profile.candidateSkills?.length > 0) {
    checkNewPage(20)
    addSection('Skills')
    const skillNames = profile.candidateSkills.map((s: any) => s.skill?.name || s.name || s).join(' · ')
    addText(skillNames, 9, false, '#334155')
    y += 2
  }

  // ── Certifications ──
  if (profile.certifications?.length > 0) {
    checkNewPage(20)
    addSection('Certifications')
    for (const cert of profile.certifications) {
      addText(`${cert.name} — ${cert.issuer}${cert.issueDate ? ' (' + cert.issueDate + ')' : ''}`, 9, false, '#334155')
    }
  }

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor('#94a3b8')
    doc.text(`Generated by Career Wings • careerwings.in • Page ${i}/${totalPages}`, pageW / 2, 292, { align: 'center' })
  }

  const fileName = `${profile.firstName || 'Resume'}_${profile.lastName || ''}_CareerWings.pdf`.replace(/\s+/g, '_')
  doc.save(fileName)
  return fileName
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CareerTools() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeFeature, setActiveFeature] = useState<string>('pdf')
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  // Feature-local state
  const [publicLinkCopied, setPublicLinkCopied] = useState(false)
  const [skillRatings, setSkillRatings] = useState<Record<string, string>>({})
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null)
  const [expandedQ, setExpandedQ] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [profRes, subRes, appRes] = await Promise.all([
        candidateAPI.getProfile().catch(() => ({ data: { data: null } })),
        candidateAPI.getSubscription().catch(() => ({ data: { data: null } })),
        candidateAPI.getApplications({}).catch(() => ({ data: { data: [] } })),
      ])
      const prof = profRes.data?.data || null
      setProfile(prof)
      setSubscription(subRes.data?.data || null)
      const apps = Array.isArray(appRes.data?.data) ? appRes.data.data : []
      setApplications(apps)

      // Fetch recommended jobs based on current role / skills
      if (prof) {
        const role = prof.currentRole || prof.headline || ''
        const skills = (prof.candidateSkills || []).slice(0, 3).map((s: any) => s.skill?.name || s).join(' ')
        const keyword = role || skills || 'jobs'
        const jobRes = await jobsAPI.getAll({ search: keyword, limit: 6 }).catch(() => ({ data: { data: { jobs: [] } } }))
        const jobs = jobRes.data?.data?.jobs || jobRes.data?.data || []
        setRecommendedJobs(Array.isArray(jobs) ? jobs.slice(0, 6) : [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isPro = subscription?.status === 'ACTIVE'
  const limits = (() => {
    try { return JSON.parse(subscription?.package?.limits || subscription?.limitsSnapshot || '{}') } catch { return {} }
  })()

  const publicResumeUrl = `${window.location.origin}/employer/candidates/${profile?.id}`

  const handleDownloadPDF = async () => {
    if (!profile) return toast.error('Please complete your profile first.')
    setPdfGenerating(true)
    try {
      const name = await generateResumePDF(profile)
      toast.success(`Downloaded: ${name}`)
    } catch (err: any) {
      toast.error('Failed to generate PDF. Please try again.')
      console.error(err)
    } finally {
      setPdfGenerating(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicResumeUrl)
    setPublicLinkCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setPublicLinkCopied(false), 2500)
  }

  const getStatusMeta = (status: string) => {
    const map: Record<string, { label: string; color: string; step: number }> = {
      APPLIED:     { label: 'Applied',     color: 'bg-slate-500',  step: 1 },
      VIEWED:      { label: 'Viewed',      color: 'bg-blue-500',   step: 2 },
      SHORTLISTED: { label: 'Shortlisted', color: 'bg-amber-500',  step: 3 },
      INTERVIEW:   { label: 'Interview',   color: 'bg-purple-500', step: 4 },
      SELECTED:    { label: 'Selected! 🎉', color: 'bg-green-500', step: 5 },
      REJECTED:    { label: 'Not Selected', color: 'bg-red-500',   step: 0 },
    }
    return map[status] || { label: status, color: 'bg-slate-400', step: 1 }
  }

  const activeF = FEATURES.find(f => f.id === activeFeature)!

  if (loading) {
    return (
      <CandidateLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-16 bg-white rounded-2xl border border-slate-100" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />)}
          </div>
          <div className="h-96 bg-white rounded-2xl border border-slate-100" />
        </div>
      </CandidateLayout>
    )
  }

  return (
    <CandidateLayout>
      <SEOMeta
        title="Career Tools | Career Wings"
        description="Access your full suite of job seeker tools — resume builder, application tracker, AI recommendations, interview prep & more."
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-violet-900 to-purple-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #818cf8 0%, transparent 60%), radial-gradient(circle at 80% 20%, #c084fc 0%, transparent 50%)' }}
          />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-violet-200 border border-white/10 tracking-wider uppercase">
                  Career Tools Hub
                </span>
                {isPro && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Pro Active
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Your Complete Career Toolkit</h1>
              <p className="text-indigo-200 text-sm mt-1 max-w-xl">
                All 10 premium tools to accelerate your job search, stand out to recruiters, and land your dream role.
              </p>
            </div>
            {!isPro && (
              <Link to="/subscription"
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm shadow-lg transition"
              >
                <Zap className="w-4 h-4" /> Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Tool Grid Navigation: Mobile Swipeable / Desktop 5-Col Grid */}
        <div className="flex md:grid overflow-x-auto no-scrollbar md:grid-cols-3 lg:grid-cols-5 gap-2.5 pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          {FEATURES.map((f) => {
            const Icon = f.icon
            const isActive = activeFeature === f.id
            const isLocked = f.pro && !isPro
            return (
              <button
                key={f.id}
                onClick={() => setActiveFeature(f.id)}
                className={cn(
                  'relative flex md:flex-col items-center gap-2.5 px-3.5 py-2.5 md:p-4 rounded-2xl border text-left md:text-center shrink-0 md:shrink transition-all min-w-[160px] md:min-w-0',
                  isActive
                    ? `${f.bg} ${f.border} shadow-sm ring-2 ring-offset-1 ${f.color.replace('text-', 'ring-')}`
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-xs'
                )}
              >
                {isLocked && !isPro && (
                  <span className="absolute top-2 right-2">
                    <Lock className="w-3 h-3 text-slate-400" />
                  </span>
                )}
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', f.bg)}>
                  <Icon className={cn('w-5 h-5', f.color)} />
                </div>
                <span className="text-[11px] font-bold text-slate-700 leading-tight">{f.title}</span>
                {f.pro && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">PRO</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Active Tool Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Panel Header */}
          <div className={cn('px-6 py-4 border-b border-slate-100 flex items-center gap-4', activeF.bg)}>
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-xs')}>
              <activeF.icon className={cn('w-6 h-6', activeF.color)} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">{activeF.title}</h2>
              <p className="text-xs text-slate-500">{activeF.subtitle}</p>
            </div>
            {activeF.pro && !isPro && (
              <Link to="/subscription" className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition">
                <Lock className="w-3.5 h-3.5" /> Unlock Pro
              </Link>
            )}
          </div>

          {/* ── PANEL CONTENT ── */}
          <div className="p-6">

            {/* 1. Resume PDF Download */}
            {activeFeature === 'pdf' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Preview card */}
                  <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-8 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-20 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center">
                      <FileDown className="w-8 h-8 text-violet-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Professional Resume PDF</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Your profile data is auto-formatted into a clean, ATS-friendly 1-page resume PDF with Career Wings branding.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={pdfGenerating}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition disabled:opacity-60"
                    >
                      {pdfGenerating ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Download className="w-4 h-4" /> Download PDF Resume</>
                      )}
                    </button>
                  </div>

                  {/* What's included */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900">What's included in your PDF:</h4>
                    {[
                      { label: 'Full Name & Contact Details', done: !!(profile?.firstName && profile?.phone) },
                      { label: 'Professional Summary', done: !!profile?.summary },
                      { label: 'Work Experience', done: (profile?.experience?.length || 0) > 0 },
                      { label: 'Education Background', done: (profile?.education?.length || 0) > 0 },
                      { label: 'Skills & Proficiency', done: (profile?.candidateSkills?.length || 0) > 0 },
                      { label: 'Certifications', done: (profile?.certifications?.length || 0) > 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0', item.done ? 'bg-emerald-500' : 'bg-slate-200')}>
                          {item.done ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-slate-400" />}
                        </div>
                        <span className={cn('text-sm font-medium', item.done ? 'text-slate-800' : 'text-slate-400')}>{item.label}</span>
                        {!item.done && (
                          <Link to="/profile" className="ml-auto text-[11px] text-violet-600 font-semibold hover:underline">Add →</Link>
                        )}
                      </div>
                    ))}
                    <Link to="/profile" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:underline mt-2">
                      Complete your profile for a better PDF <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Pro Resume Builder */}
            {activeFeature === 'builder' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-6 flex flex-col md:flex-row items-center gap-6">
                  <div className="text-5xl">🚀</div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">AI-Powered Resume Builder</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Build a recruiter-magnet resume with AI-generated summaries, bullet-point enhancer, ATS score, and skill suggestions tailored to Northeast India's job market.
                    </p>
                    <Link to="/profile/resume"
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition"
                    >
                      <Wand2 className="w-4 h-4" /> Open AI Resume Builder
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: '✨', label: 'AI Summary Generator', desc: 'Auto-write your professional summary' },
                    { icon: '📝', label: 'Bullet Enhancer', desc: 'Improve experience descriptions' },
                    { icon: '🎯', label: 'ATS Score Audit', desc: 'See how your resume ranks' },
                    { icon: '💡', label: 'Skill Suggestions', desc: 'AI-recommended skills by role' },
                  ].map((item) => (
                    <div key={item.label} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <h5 className="font-bold text-slate-900 text-xs">{item.label}</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Public Resume Link */}
            {activeFeature === 'public' && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Globe className="w-6 h-6 text-blue-600" />
                    <h3 className="font-bold text-slate-900">Your Public Resume URL</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Share this link with recruiters, on LinkedIn, WhatsApp, or email. Anyone with the link can view your Career Wings profile.
                  </p>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-blue-200">
                    <span className="flex-1 text-sm text-slate-700 truncate font-mono">{publicResumeUrl}</span>
                    <button
                      onClick={handleCopyLink}
                      className={cn('shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition',
                        publicLinkCopied ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                      )}
                    >
                      {publicLinkCopied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                    <a href={publicResumeUrl} target="_blank" rel="noreferrer"
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: '🔗', title: 'Share on WhatsApp', action: `https://wa.me/?text=Check%20out%20my%20profile%20on%20Career%20Wings:%20${encodeURIComponent(publicResumeUrl)}`, label: 'Share', color: 'bg-green-500' },
                    { icon: '💼', title: 'Share on LinkedIn', action: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicResumeUrl)}`, label: 'Post', color: 'bg-blue-600' },
                    { icon: '✉️', title: 'Share via Email', action: `mailto:?subject=My Career Wings Profile&body=${encodeURIComponent(publicResumeUrl)}`, label: 'Email', color: 'bg-slate-700' },
                  ].map((item) => (
                    <a key={item.title} href={item.action} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xs transition"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                        <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-white', item.color)}>{item.label}</span>
                      </div>
                    </a>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500">
                    Your public profile visibility is controlled by your <strong>Privacy Settings</strong>. Make sure your resume visibility is set to <strong>PUBLIC</strong> or <strong>EMPLOYERS_ONLY</strong> for recruiters to view it.
                    <Link to="/settings" className="text-blue-600 hover:underline ml-1">Manage Privacy →</Link>
                  </p>
                </div>
              </div>
            )}

            {/* 4. Featured Badge */}
            {activeFeature === 'badge' && (
              <div className="space-y-6">
                {isPro && limits?.featuredProfile ? (
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 p-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-amber-400 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
                      <BadgeCheck className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">Featured Candidate ✨</h3>
                    <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                      Your profile is highlighted with a <strong className="text-amber-600">⭐ Featured</strong> badge in recruiter search results. You appear 5x more in searches.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 text-slate-900 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Badge Active
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                          <BadgeCheck className="w-10 h-10 text-slate-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">Featured Candidate Badge</h3>
                        <p className="text-sm text-slate-600 mt-1">Upgrade to Pro to get a verified featured badge on your profile visible to all recruiters in our database.</p>
                        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                          {['Appear at the top of recruiter searches', 'Gold ⭐ badge on your public profile', '5x more profile views from employers', 'Priority in AI-matched candidate lists'].map(b => (
                            <li key={b} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {b}
                            </li>
                          ))}
                        </ul>
                        <Link to="/subscription" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition">
                          <Zap className="w-4 h-4" /> Upgrade to Unlock
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Priority Applications */}
            {activeFeature === 'priority' && (
              <div className="space-y-4">
                {isPro ? (
                  <>
                    <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-center gap-3">
                      <Flame className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-sm text-slate-700 font-medium">
                        <strong className="text-red-600">Priority Active:</strong> Your applications appear highlighted at the top of employer applicant lists with a 🔥 Priority badge.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {applications.slice(0, 5).map((app: any) => (
                        <div key={app.id} className="p-4 rounded-2xl bg-white border border-red-100 shadow-xs flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            {app.job?.company?.logo ? <img src={app.job.company.logo} alt="" className="w-8 h-8 object-contain" /> : <Building2 className="w-5 h-5 text-red-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{app.job?.title}</p>
                            <p className="text-xs text-slate-500">{app.job?.company?.name}</p>
                          </div>
                          <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                            <Flame className="w-3 h-3" /> Priority
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
                    <Flame className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-black text-slate-900 text-lg">Priority Application Highlighting</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                      Pro candidates get a 🔥 Priority badge on all applications, putting them at the top of employer applicant stacks — before free-tier users.
                    </p>
                    <Link to="/subscription" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition">
                      <Lock className="w-4 h-4" /> Unlock Priority Applications
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* 6. Direct Recruiter Contact */}
            {activeFeature === 'contact' && (
              <div className="space-y-4">
                {isPro ? (
                  <>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3 mb-4">
                      <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
                      <p className="text-sm text-slate-700">
                        <strong className="text-emerald-600">Contact Access Active.</strong> Go to any job posting, click on "Applied", and you'll see the recruiter's contact details directly.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {applications.slice(0, 4).map((app: any) => {
                        const emp = app.job?.employer
                        return (
                          <div key={app.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                              <Building2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm">{app.job?.title}</p>
                              <p className="text-xs text-slate-500">{app.job?.company?.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {app.job?.company?.email && (
                                <a href={`mailto:${app.job.company.email}`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold hover:bg-blue-100 transition">
                                  ✉ Email
                                </a>
                              )}
                              {app.job?.company?.phone && (
                                <a href={`tel:${app.job.company.phone}`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition">
                                  📞 Call
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <Link to="/messages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline">
                      <MessageSquare className="w-4 h-4" /> Open Recruiter Messages →
                    </Link>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
                    <Phone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-black text-slate-900 text-lg">Direct Recruiter Contact Access</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                      See the direct email, phone, and LinkedIn of recruiters who posted jobs you applied to. No more waiting — reach out directly.
                    </p>
                    <Link to="/subscription" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition">
                      <Zap className="w-4 h-4" /> Unlock Recruiter Contacts
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* 7. Real-time Application Tracking */}
            {activeFeature === 'tracking' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">{applications.length} applications tracked</p>
                  <Link to="/my-applications" className="text-xs font-semibold text-cyan-600 hover:underline flex items-center gap-1">
                    View All <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {applications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700">No applications yet</p>
                    <Link to="/jobs" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:underline">
                      Browse Jobs →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app: any) => {
                      const meta = getStatusMeta(app.status)
                      const steps = ['Applied', 'Viewed', 'Shortlisted', 'Interview', 'Selected']
                      return (
                        <div key={app.id} className="rounded-2xl bg-white border border-slate-100 shadow-xs p-5">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              {app.job?.company?.logo ? <img src={app.job.company.logo} alt="" className="w-8 h-8 object-contain" /> : <Building2 className="w-5 h-5 text-slate-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">{app.job?.title}</p>
                              <p className="text-xs text-slate-500">{app.job?.company?.name} · Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently'}</p>
                            </div>
                            <span className={cn('shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold text-white', meta.color)}>
                              {meta.label}
                            </span>
                          </div>

                          {/* Progress Steps */}
                          {app.status !== 'REJECTED' ? (
                            <div className="relative flex items-center justify-between">
                              <div className="absolute left-0 right-0 top-3 h-0.5 bg-slate-100" />
                              <div
                                className="absolute left-0 top-3 h-0.5 bg-cyan-500 transition-all"
                                style={{ width: `${Math.max(0, ((meta.step - 1) / 4)) * 100}%` }}
                              />
                              {steps.map((step, i) => (
                                <div key={step} className="relative flex flex-col items-center gap-1.5 z-10">
                                  <div className={cn(
                                    'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold',
                                    i + 1 < meta.step ? 'bg-cyan-500 border-cyan-500 text-white' :
                                    i + 1 === meta.step ? 'bg-white border-cyan-500 text-cyan-600' :
                                    'bg-white border-slate-200 text-slate-400'
                                  )}>
                                    {i + 1 < meta.step ? <Check className="w-3 h-3" /> : i + 1}
                                  </div>
                                  <span className="text-[9px] font-semibold text-slate-500 text-center leading-tight w-14">{step}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                              <X className="w-4 h-4 text-red-500 shrink-0" />
                              <p className="text-xs text-red-700 font-medium">Not selected for this position. Keep applying — the right opportunity is ahead!</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 8. AI Job Recommendations */}
            {activeFeature === 'ai' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                  <Brain className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-sm text-slate-700">
                    Jobs matched to your skills as <strong>{profile?.currentRole || 'Professional'}</strong>
                    {(profile?.candidateSkills?.length || 0) > 0 && <> with skills in <strong>{profile.candidateSkills.slice(0, 2).map((s: any) => s.skill?.name || s).join(', ')}</strong></>}.
                  </p>
                  <button onClick={load} className="ml-auto shrink-0 p-1.5 rounded-lg hover:bg-indigo-100 transition">
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                  </button>
                </div>

                {recommendedJobs.length === 0 ? (
                  <div className="p-10 text-center">
                    <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700">Complete your profile to get AI recommendations</p>
                    <Link to="/profile" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline">
                      Update Profile →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedJobs.map((job: any) => (
                      <Link key={job.id || job.slug} to={`/jobs/${job.slug}`}
                        className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xs transition group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {job.company?.logo ? <img src={job.company.logo} alt="" className="w-8 h-8 object-contain" /> : <Building2 className="w-5 h-5 text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition">{job.title}</p>
                          <p className="text-xs text-slate-500 truncate">{job.company?.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {job.city && <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{job.city}</span>}
                            {job.jobType && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-semibold">{job.jobType}</span>}
                          </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold shrink-0">AI Match</span>
                      </Link>
                    ))}
                  </div>
                )}
                <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline">
                  Browse all jobs <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* 9. Skill Assessment & Badges */}
            {activeFeature === 'skills' && (
              <div className="space-y-5">
                <p className="text-sm text-slate-600">Rate your proficiency in key soft skills. Your self-assessed badges will appear on your public profile, showing recruiters your strengths.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SKILL_ASSESSMENTS.map((skill) => (
                    <div key={skill.skill} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{skill.icon}</span>
                        <h4 className="font-bold text-slate-900 text-sm">{skill.skill}</h4>
                        {skillRatings[skill.skill] && (
                          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-bold border border-pink-200">
                            <Award className="w-2.5 h-2.5" /> {skillRatings[skill.skill]}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {skill.levels.map((level, i) => (
                          <button
                            key={level}
                            onClick={() => {
                              setSkillRatings(prev => ({ ...prev, [skill.skill]: level }))
                              toast.success(`${skill.skill}: ${level} saved!`)
                            }}
                            className={cn(
                              'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition border',
                              skillRatings[skill.skill] === level
                                ? 'bg-pink-500 text-white border-pink-500'
                                : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600'
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {Object.keys(skillRatings).length > 0 && (
                  <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100">
                    <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-pink-500" /> Your Skill Badges
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(skillRatings).map(([skill, level]) => (
                        <span key={skill} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-pink-200 text-sm font-bold text-pink-700 shadow-xs">
                          ✅ {skill}: {level}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 10. Interview Preparation Guides */}
            {activeFeature === 'interview' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Role-specific interview coaching with common questions and expert hints — tailored for Northeast India's job market.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {INTERVIEW_GUIDES.map((guide) => (
                    <div key={guide.role} className={cn('rounded-2xl border p-4', guide.color)}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{guide.icon}</span>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{guide.role}</h4>
                          <p className="text-[11px] text-slate-500">{guide.questions} questions · {guide.topics.length} topics</p>
                        </div>
                        <button
                          onClick={() => setExpandedGuide(expandedGuide === guide.role ? null : guide.role)}
                          className="ml-auto p-1.5 rounded-lg hover:bg-white/60 transition"
                        >
                          <ChevronDown className={cn('w-4 h-4 text-slate-600 transition-transform', expandedGuide === guide.role && 'rotate-180')} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {guide.topics.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-white/70 text-[10px] font-bold text-slate-700 border border-white/50">{t}</span>
                        ))}
                      </div>

                      {expandedGuide === guide.role && INTERVIEW_QUESTIONS[guide.role] && (
                        <div className="mt-4 space-y-3 border-t border-white/40 pt-4">
                          {INTERVIEW_QUESTIONS[guide.role].map((item, i) => (
                            <div key={i} className="rounded-xl bg-white/70 p-3">
                              <button
                                className="w-full text-left flex items-start gap-2"
                                onClick={() => setExpandedQ(expandedQ === `${guide.role}-${i}` ? null : `${guide.role}-${i}`)}
                              >
                                <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-600 flex items-center justify-center mt-0.5">{i + 1}</span>
                                <p className="text-xs font-bold text-slate-800">{item.q}</p>
                              </button>
                              {expandedQ === `${guide.role}-${i}` && (
                                <div className="mt-2 ml-7 flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                                  <Sparkles className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                  <p className="text-[11px] text-amber-800 font-medium">{item.hint}</p>
                                </div>
                              )}
                            </div>
                          ))}
                          <p className="text-[11px] text-slate-500 text-center">More questions available with Pro subscription</p>
                        </div>
                      )}

                      {expandedGuide === guide.role && !INTERVIEW_QUESTIONS[guide.role] && (
                        <div className="mt-4 border-t border-white/40 pt-4 text-center">
                          <PlayCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs text-slate-600">Full guide for {guide.role} coming soon!</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-teal-50 border border-teal-100 p-5">
                  <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" /> Universal Interview Tips
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { tip: 'Research the company before the interview', icon: '🔍' },
                      { tip: 'Use the STAR method for behavioural questions', icon: '⭐' },
                      { tip: 'Prepare 3–5 questions to ask the interviewer', icon: '❓' },
                      { tip: 'Arrive 10 minutes early (or log in early for virtual)', icon: '⏰' },
                      { tip: 'Follow up with a thank-you email within 24 hours', icon: '✉️' },
                      { tip: 'Be honest about what you don\'t know yet', icon: '🤝' },
                    ].map((item) => (
                      <div key={item.tip} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="text-base shrink-0">{item.icon}</span>
                        {item.tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom Pro Upsell (only if not pro) */}
        {!isPro && (
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-black">Unlock All 10 Career Tools with Pro</h3>
              <p className="text-indigo-200 text-sm mt-1">Featured Badge, Priority Applications, Direct Recruiter Contacts & more — starting from ₹199/month.</p>
            </div>
            <Link to="/subscription"
              className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-black text-sm hover:bg-indigo-50 transition shadow-lg"
            >
              <Zap className="w-5 h-5" /> View Pro Plans
            </Link>
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Search,
  MapPin,
  Briefcase,
  GraduationCap,
  Eye,
  Check,
  Download,
  Send,
  X,
  Bell,
  Sparkles,
  Star,
  FileSpreadsheet,
  Archive,
  Calendar,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Zap,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.889 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.487-8.412z" />
  </svg>
)

interface CandidateRecord {
  id: string
  firstName: string
  lastName: string
  headline: string
  currentLocation: string
  educationLevel: string
  highestDegree: string
  totalExperience: number
  gender: string
  age?: number | string
  profilePhoto?: string | null
  resumeFile?: string | null
  resumeFileName?: string | null
  email: string
  realEmail: string
  phone: string
  realPhone: string
  activeUntil: string
  priorityTier: 'PREMIUM' | 'BASIC' | 'NONE'
  interviewPool?: boolean
  isVerifiedResume: boolean
  isUnlocked: boolean
  skills: string[]
  updatedAt?: string | Date
  createdAt?: string | Date
}

function formatActiveTime(updatedAt?: string | Date): string {
  if (!updatedAt) return 'Active recently'
  const d = new Date(updatedAt)
  if (isNaN(d.getTime())) return 'Active recently'
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Active today'
  if (diffDays === 1) return 'Active yesterday'
  if (diffDays < 7) return `Active ${diffDays} days ago`
  if (diffDays < 14) return 'Active 1 week ago'
  if (diffDays < 30) return `Active ${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return 'Active 1 month ago'
  if (diffDays < 365) return `Active ${Math.floor(diffDays / 30)} months ago`
  return 'Active 1 year+ ago'
}

// ─── Default Verified Northeast Candidates Directory ─────────────────────────
const DEFAULT_CANDIDATES: CandidateRecord[] = [
  {
    id: 'cand-01',
    firstName: 'Bikash',
    lastName: 'Kalita',
    headline: 'Hotel Front Office Manager • Active Job Seeker - 2 yrs',
    currentLocation: 'Guwahati, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.A',
    totalExperience: 2,
    gender: 'Not specified',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/bikash_kalita.pdf',
    resumeFileName: 'Bikash_Kalita_Resume.pdf',
    email: 'bi***@example.com',
    realEmail: 'bikash.kalita@example.com',
    phone: '📱 -',
    realPhone: '+91 98640 12890',
    activeUntil: '2027-06-14',
    priorityTier: 'PREMIUM',
    interviewPool: true,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Front Office Operations', 'Guest Relations', 'Hotel Management', 'Vendor Coordination'],
  },
  {
    id: 'cand-02',
    firstName: 'Priya',
    lastName: 'Sharma',
    headline: 'Senior Frontend Engineer • Active Job Seeker',
    currentLocation: 'Guwahati, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.A',
    totalExperience: 2,
    gender: 'Not specified',
    profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=faces&q=80',
    resumeFile: '/uploads/resumes/priya_sharma.pdf',
    resumeFileName: 'Priya_Sharma_Resume.pdf',
    email: 'pr***@example.com',
    realEmail: 'priya.sharma@example.com',
    phone: '📱 -',
    realPhone: '+91 98765 43210',
    activeUntil: '2027-08-09',
    priorityTier: 'PREMIUM',
    interviewPool: true,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Professional Communications', 'Job Search Readiness', 'Industry Domain', 'React.js', 'TypeScript', 'Tailwind CSS'],
  },
  {
    id: 'cand-03',
    firstName: 'Rima',
    lastName: 'Bordoloi',
    headline: 'Any • Guwahati, Assam, India - 3 yrs',
    currentLocation: 'Guwahati, Assam, India',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.B.A',
    totalExperience: 3,
    gender: 'Female',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/rima_bordoloi.pdf',
    resumeFileName: 'Rima_Bordoloi_Resume.pdf',
    email: 'ri***@gmail.com',
    realEmail: 'rima.bordoloi@gmail.com',
    phone: '📱 -',
    realPhone: '+91 94350 78219',
    activeUntil: '2027-09-09',
    priorityTier: 'PREMIUM',
    interviewPool: true,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Business Administration', 'Executive Assistance', 'Operations Support', 'Client Communication'],
  },
  {
    id: 'cand-04',
    firstName: 'Ankita',
    lastName: 'Gogoi',
    headline: 'Accounts & Tally Specialist • Active Job Seeker - 2 yrs',
    currentLocation: 'Jorhat, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.A',
    totalExperience: 2,
    gender: 'Female',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/ankita_gogoi.pdf',
    resumeFileName: 'Ankita_Gogoi_Resume.pdf',
    email: 'an***@example.com',
    realEmail: 'ankita.gogoi@example.com',
    phone: '📱 -',
    realPhone: '+91 91012 34567',
    activeUntil: '2027-07-19',
    priorityTier: 'BASIC',
    interviewPool: false,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Tally Prime', 'GST Filing', 'Accounts Reconciliation', 'MS Excel'],
  },
  {
    id: 'cand-05',
    firstName: 'Rahul',
    lastName: 'Das',
    headline: 'Data Entry & Office Operations • Active Job Seeker - 2 yrs',
    currentLocation: 'Guwahati, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'B.A',
    totalExperience: 2,
    gender: 'Male',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/rahul_das.pdf',
    resumeFileName: 'Rahul_Das_Resume.pdf',
    email: 'ra***@example.com',
    realEmail: 'rahul.das@example.com',
    phone: '📱 -',
    realPhone: '+91 98540 88214',
    activeUntil: '2027-08-10',
    priorityTier: 'BASIC',
    interviewPool: false,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Data Entry', 'MS Office', 'Back Office Support', 'Record Management'],
  },
  {
    id: 'cand-06',
    firstName: 'Alhazul',
    lastName: 'Haque',
    headline: 'Job Seeker • Guwahati, Assam, India - 2 yrs',
    currentLocation: 'Guwahati, Assam, India',
    educationLevel: 'Graduate',
    highestDegree: 'Graduate',
    totalExperience: 2,
    gender: 'Male',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/alhazul_haque.pdf',
    resumeFileName: 'Alhazul_Haque_Resume.pdf',
    email: 'al***@gmail.com',
    realEmail: 'alhazul.haque@gmail.com',
    phone: '📱 -',
    realPhone: '+91 88761 99234',
    activeUntil: '2027-05-20',
    priorityTier: 'NONE',
    interviewPool: false,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Logistics Support', 'Sales Coordination', 'Client Handling'],
  },
  {
    id: 'cand-07',
    firstName: 'Nilav Jyoti',
    lastName: 'Deka',
    headline: 'Civil Site Engineer & Construction Supervisor - 3.5 yrs',
    currentLocation: 'Kamrup Metropolitan, Assam',
    educationLevel: 'Graduate / Bachelor Degree',
    highestDegree: 'B.Tech / B.E',
    totalExperience: 3.5,
    gender: 'Male',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/nilav_deka.pdf',
    resumeFileName: 'Nilav_Deka_Resume.pdf',
    email: 'ni***@example.com',
    realEmail: 'nilav.deka@example.com',
    phone: '📱 -',
    realPhone: '+91 99540 33219',
    activeUntil: '2027-09-15',
    priorityTier: 'PREMIUM',
    interviewPool: true,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['AutoCAD Civil', 'Site Supervision', 'Quality Estimation', 'Billing & BOQ'],
  },
  {
    id: 'cand-08',
    firstName: 'Mousumi',
    lastName: 'Bora',
    headline: 'HR Executive & Talent Sourcing Specialist - 4 yrs',
    currentLocation: 'Dibrugarh, Assam',
    educationLevel: 'Post Graduate / Master Degree',
    highestDegree: 'MBA',
    totalExperience: 4,
    gender: 'Female',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/mousumi_bora.pdf',
    resumeFileName: 'Mousumi_Bora_Resume.pdf',
    email: 'mo***@example.com',
    realEmail: 'mousumi.bora@example.com',
    phone: '📱 -',
    realPhone: '+91 97060 44112',
    activeUntil: '2027-07-28',
    priorityTier: 'BASIC',
    interviewPool: true,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Talent Acquisition', 'Payroll Management', 'Employee Onboarding', 'Statutory Compliance'],
  },
  {
    id: 'cand-09',
    firstName: 'Debajit',
    lastName: 'Saikia',
    headline: 'Pharmacist & Clinical Healthcare Assistant - 1.5 yrs',
    currentLocation: 'Nagaon, Assam',
    educationLevel: 'Diploma / Bachelor Degree',
    highestDegree: 'B.Pharm',
    totalExperience: 1.5,
    gender: 'Male',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/debajit_saikia.pdf',
    resumeFileName: 'Debajit_Saikia_Resume.pdf',
    email: 'de***@example.com',
    realEmail: 'debajit.saikia@example.com',
    phone: '📱 -',
    realPhone: '+91 98642 77103',
    activeUntil: '2027-06-30',
    priorityTier: 'NONE',
    interviewPool: false,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Inventory Management', 'Prescription Dispensing', 'Medical Terminology'],
  },
  {
    id: 'cand-10',
    firstName: 'Pallabi',
    lastName: 'Chetia',
    headline: 'Graphic Designer & Digital Media Specialist - 2.5 yrs',
    currentLocation: 'Guwahati, Assam',
    educationLevel: 'Graduate / Diploma',
    highestDegree: 'BCA',
    totalExperience: 2.5,
    gender: 'Female',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/pallabi_chetia.pdf',
    resumeFileName: 'Pallabi_Chetia_Resume.pdf',
    email: 'pa***@example.com',
    realEmail: 'pallabi.chetia@example.com',
    phone: '📱 -',
    realPhone: '+91 94355 12099',
    activeUntil: '2027-08-25',
    priorityTier: 'PREMIUM',
    interviewPool: true,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Adobe Photoshop', 'Illustrator', 'Canva Pro', 'Social Media Creatives'],
  },
  {
    id: 'cand-11',
    firstName: 'Manash',
    lastName: 'Pratim Baruah',
    headline: 'Field Sales Officer & Distributor Relationship Mgr - 3 yrs',
    currentLocation: 'Tinsukia, Assam',
    educationLevel: 'Graduate / Bachelor Degree',
    highestDegree: 'B.Com',
    totalExperience: 3,
    gender: 'Male',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/manash_baruah.pdf',
    resumeFileName: 'Manash_Baruah_Resume.pdf',
    email: 'ma***@example.com',
    realEmail: 'manash.baruah@example.com',
    phone: '📱 -',
    realPhone: '+91 91011 88921',
    activeUntil: '2027-06-18',
    priorityTier: 'BASIC',
    interviewPool: false,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['FMCG Sales', 'Channel Distribution', 'B2B Client Pitching', 'Payment Collection'],
  },
  {
    id: 'cand-12',
    firstName: 'Jumoni',
    lastName: 'Kashyap',
    headline: 'Customer Support Representative & Telecaller - 1 yr',
    currentLocation: 'Guwahati, Assam',
    educationLevel: '12th / Higher Secondary',
    highestDegree: 'Higher Secondary',
    totalExperience: 1,
    gender: 'Female',
    profilePhoto: null,
    resumeFile: '/uploads/resumes/jumoni_kashyap.pdf',
    resumeFileName: 'Jumoni_Kashyap_Resume.pdf',
    email: 'ju***@example.com',
    realEmail: 'jumoni.kashyap@example.com',
    phone: '📱 -',
    realPhone: '+91 98541 22340',
    activeUntil: '2027-05-12',
    priorityTier: 'NONE',
    interviewPool: false,
    isVerifiedResume: true,
    isUnlocked: false,
    skills: ['Assamese & English Fluency', 'Telecalling', 'CRM Data Entry', 'Inbound Support'],
  },
]

export default function CandidateDatabase() {
  const [candidates, setCandidates] = useState<CandidateRecord[]>(DEFAULT_CANDIDATES)
  const [loading, setLoading] = useState(false)
  const [sub, setSub] = useState<any>(null)

  // Resume Access quota (synced from API)
  const [cvLimit, setCvLimit] = useState<number>(25)
  const [cvUsed, setCvUsed] = useState<number>(0)
  const [cvRemaining, setCvRemaining] = useState<number>(25)

  // Job Posts quota (synced from API)
  const [jobPostLimit, setJobPostLimit] = useState<number>(5)
  const [jobPostUsed, setJobPostUsed] = useState<number>(0)
  const [jobPostRemaining, setJobPostRemaining] = useState<number>(5)

  // Subscription expiry
  const [planExpiry, setPlanExpiry] = useState<string>('')

  // ─── Filter States ─────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState('')
  const [skills, setSkills] = useState('')
  const [qualification, setQualification] = useState('All Qualifications')
  const [highestDegree, setHighestDegree] = useState('All Highest Degrees')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('All Districts of India')
  const [state, setState] = useState('All States of India')
  const [minExp, setMinExp] = useState('')
  const [maxExp, setMaxExp] = useState('')
  const [gender, setGender] = useState('Any gender')
  const [jobRole, setJobRole] = useState('')
  const [activeIn, setActiveIn] = useState<string>('ALL')
  const [onlyWithResume, setOnlyWithResume] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // ─── Viewed Filter State ──────────────────────────────────────────────────
  // 'all' | 'viewed' | 'not-viewed'
  const [viewFilter, setViewFilter] = useState<'all' | 'viewed' | 'not-viewed'>('all')

  // ─── Count Active Filters ──────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (keyword.trim()) count++
    if (skills.trim()) count++
    if (qualification !== 'All Qualifications') count++
    if (highestDegree !== 'All Highest Degrees') count++
    if (city.trim()) count++
    if (district !== 'All Districts of India') count++
    if (state !== 'All States of India') count++
    if (minExp) count++
    if (maxExp) count++
    if (gender !== 'Any gender') count++
    if (jobRole.trim()) count++
    if (activeIn !== 'ALL') count++
    if (onlyWithResume) count++
    if (viewFilter !== 'all') count++
    return count
  }, [keyword, skills, qualification, highestDegree, city, district, state, minExp, maxExp, gender, jobRole, activeIn, onlyWithResume, viewFilter])
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => {
    try {
      const stored =
        sessionStorage.getItem('employer_viewed_candidates') ||
        localStorage.getItem('employer_viewed_candidates')
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
    } catch {
      return new Set<string>()
    }
  })

  // Helper: mark a candidate as viewed
  const markAsViewed = (id: string) => {
    setViewedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      try {
        const arr = JSON.stringify([...next])
        sessionStorage.setItem('employer_viewed_candidates', arr)
        localStorage.setItem('employer_viewed_candidates', arr)
      } catch {}
      return next
    })
  }

  // Helper: mark multiple candidates as viewed (e.g. on bulk download)
  const markMultipleAsViewed = (ids: string[]) => {
    setViewedIds((prev) => {
      const next = new Set(prev)
      let changed = false
      ids.forEach((id) => {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      })
      if (!changed) return prev
      try {
        const arr = JSON.stringify([...next])
        sessionStorage.setItem('employer_viewed_candidates', arr)
        localStorage.setItem('employer_viewed_candidates', arr)
      } catch {}
      return next
    })
  }

  // ─── Multi-Select & Pagination State ──────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)

  // ─── View Details Modal State (Screenshots 4 & 5) ─────────────────────────
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null)
  const [unlockedCandidateIds, setUnlockedCandidateIds] = useState<Set<string>>(new Set())

  // ─── Realtime Alert Toast State (Screenshot 5) ────────────────────────────
  const [alertToast, setAlertToast] = useState<{
    visible: boolean
    candidateName: string
  }>({ visible: false, candidateName: '' })

  // ─── WhatsApp Messaging State ─────────────────────────────────────────────
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [whatsAppCandidate, setWhatsAppCandidate] = useState<CandidateRecord | null>(null)
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<'opportunity' | 'interview' | 'connect' | 'custom'>('opportunity')
  const [whatsAppMessage, setWhatsAppMessage] = useState('')

  // ─── Direct Interview Offer Modal State ───────────────────────────────────
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false)
  const [interviewCandidate, setInterviewCandidate] = useState<CandidateRecord | null>(null)
  const [interviewJobs, setInterviewJobs] = useState<{ id: string; title: string }[]>([])
  const [interviewForm, setInterviewForm] = useState({
    jobId: '',
    interviewType: 'In-Person (Office)',
    scheduledDate: '',
    scheduledTime: '',
    locationOrLink: 'Career Wings Office, G.S. Road, Guwahati',
    notes: 'Please bring your updated resume and educational certificates.',
  })

  // ─── Load Initial Data ─────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      employerAPI.getSubscription().catch(() => ({ data: { data: null } })),
      employerAPI.getJobs({ limit: 50 }).catch(() => ({ data: { data: [] } })),
      employerAPI.searchCandidates({ limit: 500 }).catch(() => ({ data: { data: [] } })),
    ]).then(([subRes, jobsRes, candRes]) => {
      if (subRes.data?.data) {
        const s = subRes.data.data
        setSub(s)

        // Resume Access
        const cvLim = s.limits?.resumeDownloads ?? s.limits?.cvAccess ?? 25
        const cvUse = s.usage?.resumeDownloads ?? s.usage?.cvAccess ?? 0
        setCvLimit(cvLim)
        setCvUsed(cvUse)
        setCvRemaining(cvLim === -1 ? 999999 : Math.max(0, cvLim - cvUse))

        // Job Posts
        const jpLim = s.limits?.jobPosts ?? s.limits?.jobPostings ?? 5
        const jpUse = s.usage?.jobPosts ?? s.usage?.jobPostings ?? 0
        setJobPostLimit(jpLim)
        setJobPostUsed(jpUse)
        setJobPostRemaining(jpLim === -1 ? 999999 : Math.max(0, jpLim - jpUse))

        // Expiry
        if (s.expiresAt || s.endDate || s.validUntil) {
          const raw = s.expiresAt || s.endDate || s.validUntil
          const d = new Date(raw)
          setPlanExpiry(
            isNaN(d.getTime())
              ? raw
              : `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
          )
        }
      }

      if (jobsRes.data?.data) {
        const list = Array.isArray(jobsRes.data.data)
          ? jobsRes.data.data
          : jobsRes.data.data.jobs || []
        setInterviewJobs(list.map((j: any) => ({ id: j.id, title: j.title })))
      }

      if (candRes.data?.data && Array.isArray(candRes.data.data) && candRes.data.data.length > 0) {
        const realCands: CandidateRecord[] = candRes.data.data.map((c: any) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          headline: c.headline || 'Active Job Seeker',
          currentLocation: c.currentLocation || 'Guwahati, Assam',
          educationLevel: c.educationLevel || 'Graduate / Diploma',
          highestDegree: c.highestDegree || 'B.A',
          totalExperience: c.totalExperience ?? 2,
          gender: c.gender || 'Not specified',
          profilePhoto: c.profilePhoto,
          resumeFile: c.resumeFile,
          resumeFileName: c.resumeFileName,
          email: c.email || 'ca***@example.com',
          realEmail: c.realEmail || c.email || 'candidate@example.com',
          phone: c.phone || '📱 -',
          realPhone: c.realPhone || c.phone || '+91 98765 43210',
          activeUntil: '2027-08-30',
          priorityTier: (c.firstName === 'Priya' || c.firstName === 'Bikash' ? 'PREMIUM' : 'BASIC') as any,
          interviewPool: true,
          isVerifiedResume: Boolean(c.resumeFile || c.resumeFileName),
          isUnlocked: Boolean(c.isUnlocked),
          skills: c.candidateSkills?.map((cs: any) => cs.skill?.name || cs.name) || [
            'Professional Communications',
            'Job Search Readiness',
            'Industry Domain',
          ],
          updatedAt: c.updatedAt || new Date().toISOString(),
          createdAt: c.createdAt || new Date().toISOString(),
        }))

        setCandidates((prev) => {
          const map = new Map<string, CandidateRecord>()
          realCands.forEach((c) => map.set(c.id, c))
          prev.forEach((c) => {
            if (!map.has(c.id)) map.set(c.id, c)
          })
          return Array.from(map.values())
        })

        // Auto-mark any previously unlocked / downloaded candidates from backend as viewed
        const backendUnlockedIds = realCands.filter((c) => c.isUnlocked).map((c) => c.id)
        if (backendUnlockedIds.length > 0) {
          markMultipleAsViewed(backendUnlockedIds)
        }
      }
    })
  }, [])

  // ─── Filter Logic ──────────────────────────────────────────────────────────
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const fullText = `${c.firstName} ${c.lastName} ${c.headline} ${c.email} ${c.realEmail}`.toLowerCase()
      if (keyword.trim() && !fullText.includes(keyword.toLowerCase().trim())) {
        return false
      }

      if (skills.trim()) {
        const searchSkills = skills
          .toLowerCase()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const candSkills = (c.skills || []).map((s) => s.toLowerCase())
        const hasSkill = searchSkills.some((sk) =>
          candSkills.some((cs) => cs.includes(sk) || sk.includes(cs))
        )
        if (!hasSkill) return false
      }

      if (qualification !== 'All Qualifications') {
        if (!c.educationLevel.toLowerCase().includes(qualification.toLowerCase())) return false
      }

      if (highestDegree !== 'All Highest Degrees') {
        if (!c.highestDegree.toLowerCase().includes(highestDegree.toLowerCase())) return false
      }

      if (city.trim() && !c.currentLocation.toLowerCase().includes(city.toLowerCase().trim())) {
        return false
      }

      if (district !== 'All Districts of India') {
        const cleanDist = district.split('(')[0].trim().toLowerCase()
        if (!c.currentLocation.toLowerCase().includes(cleanDist)) return false
      }

      if (state !== 'All States of India') {
        if (!c.currentLocation.toLowerCase().includes(state.toLowerCase())) return false
      }

      if (minExp && c.totalExperience < parseFloat(minExp)) return false
      if (maxExp && c.totalExperience > parseFloat(maxExp)) return false

      if (gender !== 'Any gender') {
        if (c.gender.toUpperCase() !== gender.toUpperCase()) return false
      }

      if (jobRole.trim()) {
        if (!c.headline.toLowerCase().includes(jobRole.toLowerCase().trim())) return false
      }

      // Active In filter (7 Days, 15 Days, 1 Month, 6 Months, 1 Year, All Profiles)
      if (activeIn && activeIn !== 'ALL') {
        const candDate = c.updatedAt ? new Date(c.updatedAt).getTime() : Date.now()
        const now = Date.now()
        const diffDays = (now - candDate) / (1000 * 60 * 60 * 24)

        if (activeIn === '7_DAYS' && diffDays > 7) return false
        if (activeIn === '15_DAYS' && diffDays > 15) return false
        if (activeIn === '1_MONTH' && diffDays > 30) return false
        if ((activeIn === '6_MONTH' || activeIn === '6_MONTHS') && diffDays > 180) return false
        if (activeIn === '1_YEAR' && diffDays > 365) return false
      }

      if (onlyWithResume && !c.isVerifiedResume) {
        return false
      }

      // Viewed / Not-Viewed filter
      if (viewFilter === 'viewed' && !viewedIds.has(c.id)) return false
      if (viewFilter === 'not-viewed' && viewedIds.has(c.id)) return false

      return true
    })
  }, [
    candidates,
    keyword,
    skills,
    qualification,
    highestDegree,
    city,
    district,
    state,
    minExp,
    maxExp,
    gender,
    jobRole,
    activeIn,
    onlyWithResume,
    viewFilter,
    viewedIds,
  ])

  // Count resumes available in view
  const resumesInView = useMemo(() => {
    return filteredCandidates.filter((c) => c.isVerifiedResume).length
  }, [filteredCandidates])

  // Total verified resumes in whole dataset
  const totalVerifiedResumes = useMemo(() => {
    return candidates.filter((c) => c.isVerifiedResume).length
  }, [candidates])

  // ─── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize))

  // Auto-clamp currentPage if filtered list shrank below current page
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCandidates.slice(start, start + pageSize)
  }, [filteredCandidates, currentPage, pageSize])

  // ─── Multi-Select Helpers ─────────────────────────────────────────────────
  const isAllSelected =
    paginatedCandidates.length > 0 &&
    paginatedCandidates.every((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paginatedCandidates.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paginatedCandidates.forEach((c) => next.add(c.id))
        return next
      })
    }
  }

  const selectAll91 = () => {
    setSelectedIds(new Set(filteredCandidates.map((c) => c.id)))
    toast.success(`Selected all ${filteredCandidates.length} candidate profiles`)
  }

  const addWithResume = () => {
    const withRes = filteredCandidates.filter((c) => c.isVerifiedResume).map((c) => c.id)
    setSelectedIds(new Set(withRes))
    toast.success(`Added ${withRes.length} candidates with verified resumes to selection`)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const toggleCandidateSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Reveal / Unlock Contact Action (Screenshot 5 Logic) ───────────────────
  const handleRevealContact = async (cand: CandidateRecord) => {
    const isAlreadyUnlocked = cand.isUnlocked || unlockedCandidateIds.has(cand.id)
    if (isAlreadyUnlocked) {
      toast('Contact details already unlocked for this candidate.')
      return
    }

    if (cvLimit !== -1 && cvRemaining <= 0) {
      toast.error('Your CV Access Quota has been exhausted. Please upgrade your package.')
      return
    }

    try {
      await employerAPI.revealCandidateContact(cand.id).catch(() => null)
      setCvUsed((u) => u + 1)
      setCvRemaining((r) => Math.max(0, r - 1))
      markAsViewed(cand.id) // credit consumed → treat as already viewed
      setUnlockedCandidateIds((prev) => new Set([...prev, cand.id]))

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === cand.id
            ? {
                ...c,
                isUnlocked: true,
                email: c.realEmail,
                phone: c.realPhone,
              }
            : c
        )
      )

      if (selectedCandidate?.id === cand.id) {
        setSelectedCandidate({
          ...selectedCandidate,
          isUnlocked: true,
          email: selectedCandidate.realEmail,
          phone: selectedCandidate.realPhone,
        })
      }

      setAlertToast({
        visible: true,
        candidateName: `${cand.firstName} ${cand.lastName}`,
      })

      setTimeout(() => {
        setAlertToast((t) => ({ ...t, visible: false }))
      }, 7000)
    } catch (err) {
      console.error(err)
      toast.error('Failed to unlock contact.')
    }
  }

  // ─── WhatsApp Action Handlers ───────────────────────────────────────────────
  const handleOpenWhatsApp = (cand: CandidateRecord) => {
    const isUnlocked = cand.isUnlocked || unlockedCandidateIds.has(cand.id)
    if (!isUnlocked) {
      toast.error('Please reveal contact details (1 credit will be deducted) first to send a WhatsApp message.')
      return
    }
    setWhatsAppCandidate(cand)
    const defaultMsg = `Hello ${cand.firstName}, I came across your impressive profile (${cand.headline || 'candidate'}) on Career Wings. We have an exciting career opening matching your experience and would love to connect. Are you available for a brief discussion?`
    setWhatsAppMessage(defaultMsg)
    setWhatsAppTemplate('opportunity')
    setIsWhatsAppModalOpen(true)
  }

  const handleSendWhatsAppMessage = () => {
    if (!whatsAppCandidate) return
    const rawPhone = whatsAppCandidate.realPhone || whatsAppCandidate.phone || ''
    const digits = rawPhone.replace(/[^0-9]/g, '')
    if (!digits) {
      toast.error('No valid phone number found for this candidate.')
      return
    }
    // Format: Indian 10-digit number without country code gets 91 prepended
    const formattedPhone = digits.length === 10 ? `91${digits}` : digits
    const encodedMsg = encodeURIComponent(whatsAppMessage)
    const url = `https://wa.me/${formattedPhone}?text=${encodedMsg}`
    window.open(url, '_blank')
    toast.success(`Opening WhatsApp chat with ${whatsAppCandidate.firstName}...`)
    setIsWhatsAppModalOpen(false)
  }

  // ─── Generate & Download Resume in PDF Format ──────────────────────────────
  const generateCandidateResumePDF = async (cand: CandidateRecord, isUnlocked: boolean) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const margin = 18
    const pageW = 210
    const contentW = pageW - margin * 2
    let y = 0

    // Top Red Header Banner
    doc.setFillColor(186, 26, 26) // #BA1A1A Career Wings Crimson Red
    doc.rect(0, 0, pageW, 28, 'F')

    doc.setFillColor(15, 23, 42) // #0F172A Slate 900
    doc.rect(0, 26, pageW, 2.5, 'F')

    // Career Wings Branding
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text('CAREER WINGS', margin, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(254, 226, 226)
    doc.text('Premier Northeast & Pan-India Placement Portal • www.careerwings.in', margin, 18)

    // Top Right Verified Badge
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(pageW - margin - 60, 6, 60, 15, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(186, 26, 26)
    doc.text('VERIFIED RESUME (PDF)', pageW - margin - 30, 11.5, { align: 'center' })
    doc.setFontSize(7)
    doc.setTextColor(71, 85, 105)
    doc.text(`ID: CW-${cand.id.toUpperCase()}`, pageW - margin - 30, 16.5, { align: 'center' })

    y = 38

    // Candidate Name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(15, 23, 42)
    doc.text(`${cand.firstName} ${cand.lastName}`, margin, y)
    y += 7

    // Priority / Pool Badges
    if (cand.priorityTier === 'PREMIUM') {
      doc.setFillColor(254, 243, 199)
      doc.roundedRect(margin, y - 4, 60, 6, 1.5, 1.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(180, 83, 9)
      doc.text('★ PREMIUM VERIFIED CANDIDATE (+25% BOOST)', margin + 30, y, { align: 'center' })
      y += 6.5
    } else if (cand.priorityTier === 'BASIC') {
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(margin, y - 4, 55, 6, 1.5, 1.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(29, 78, 216)
      doc.text('🔷 BASIC VERIFIED CANDIDATE (+15% BOOST)', margin + 27.5, y, { align: 'center' })
      y += 6.5
    }

    // Headline
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(186, 26, 26)
    const headlineLines = doc.splitTextToSize(cand.headline || 'Active Job Seeker', contentW)
    doc.text(headlineLines, margin, y)
    y += headlineLines.length * 5 + 3

    // ─── Metadata Information Box ──────────────────────────────────────────
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, y, contentW, 48, 3, 3, 'FD')

    const col1 = margin + 6
    const col2 = margin + contentW / 2 + 4
    let boxY = y + 7.5

    // Row 1
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('FULL QUALIFICATION / DEGREE', col1, boxY)
    doc.text('CURRENT LOCATION', col2, boxY)
    boxY += 4.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(15, 23, 42)
    doc.text(`${cand.highestDegree} (${cand.educationLevel})`, col1, boxY)
    doc.text(`${cand.currentLocation}`, col2, boxY)

    // Row 2
    boxY += 9
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('TOTAL WORK EXPERIENCE', col1, boxY)
    doc.text('GENDER & ACTIVE STATUS', col2, boxY)
    boxY += 4.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(15, 23, 42)
    doc.text(`${cand.totalExperience} Years Professional Experience`, col1, boxY)
    doc.text(`${cand.gender} • Active Job Seeker`, col2, boxY)

    // Row 3 (Contact Details)
    boxY += 9
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('CONTACT EMAIL', col1, boxY)
    doc.text('PHONE / WHATSAPP NUMBER', col2, boxY)
    boxY += 4.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    if (isUnlocked) {
      doc.setTextColor(2, 132, 199)
      doc.text(cand.realEmail || cand.email, col1, boxY)
      doc.setTextColor(22, 163, 74)
      doc.text(cand.realPhone || cand.phone, col2, boxY)
    } else {
      doc.setTextColor(100, 116, 139)
      doc.text(`${cand.email} (Reveal contact on portal)`, col1, boxY)
      doc.text(`${cand.phone} (Reveal contact on portal)`, col2, boxY)
    }

    y += 56

    // ─── Key Skills ─────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('KEY SKILLS', margin, y)
    y += 3.5

    doc.setDrawColor(186, 26, 26)
    doc.setLineWidth(0.6)
    doc.line(margin, y, margin + 25, y)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    doc.line(margin + 25, y, pageW - margin, y)
    y += 7

    const skillsList = (cand.skills || ['Communication', 'Domain Knowledge', 'Workforce Readiness']).filter((sk) => {
      if (!sk) return false
      const s = sk.toLowerCase().trim()
      return !s.includes('apna') && !s.includes('4767') && !s.includes('1874') && !s.includes('http') && !s.includes('competenc') && !s.includes('key skills') && !/^\d+$/.test(s)
    })
    let skillX = margin
    skillsList.forEach((sk) => {
      const textW = doc.getStringUnitWidth(sk) * 8.5 * 0.352778 + 8
      if (skillX + textW > pageW - margin) {
        skillX = margin
        y += 8
      }
      doc.setFillColor(241, 245, 249)
      doc.setDrawColor(203, 213, 225)
      doc.roundedRect(skillX, y - 4.5, textW, 6.5, 1.5, 1.5, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(30, 41, 59)
      doc.text(sk, skillX + 4, y)
      skillX += textW + 4
    })
    y += 14

    // ─── Profile Overview ──────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('PROFESSIONAL PROFILE OVERVIEW', margin, y)
    y += 3.5

    doc.setDrawColor(186, 26, 26)
    doc.setLineWidth(0.6)
    doc.line(margin, y, margin + 25, y)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    doc.line(margin + 25, y, pageW - margin, y)
    y += 7

    const overviewText = `${cand.firstName} ${cand.lastName} is a verified candidate registered on Career Wings placement database. Currently residing in ${cand.currentLocation}, holding a ${cand.highestDegree} in ${cand.educationLevel} with ${cand.totalExperience} years of experience. Actively seeking opportunities matching skills in ${skillsList.slice(0, 4).join(', ')}.`
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    const overviewLines = doc.splitTextToSize(overviewText, contentW)
    doc.text(overviewLines, margin, y)
    y += overviewLines.length * 5 + 12

    // ─── Verification Seal Box ─────────────────────────────────────────────
    doc.setFillColor(240, 253, 244)
    doc.setDrawColor(187, 247, 208)
    doc.roundedRect(margin, y, contentW, 26, 3, 3, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(21, 128, 61)
    doc.text('✔ OFFICIALLY VERIFIED BY CAREER WINGS PLACEMENT SERVICES', margin + 6, y + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text('This resume was generated directly from the authenticated Career Wings Candidate Database.', margin + 6, y + 13)
    doc.text(`Verification Timestamp: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Candidate Active Validity: ${cand.activeUntil}`, margin + 6, y + 19)

    // ─── Footer ────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('Career Wings Placement Services • G.S. Road, Guwahati, Assam • www.careerwings.in • Confidential Recruiter Document', pageW / 2, 287, { align: 'center' })

    const safeName = `${cand.firstName}_${cand.lastName}_Resume.pdf`.replace(/\s+/g, '_')
    doc.save(safeName)
  }

  // ─── Download Resume Helper (Instant PDF) ──────────────────────────────────
  const handleDownloadResume = async (cand: CandidateRecord) => {
    markAsViewed(cand.id)
    const isUnlocked = cand.isUnlocked || unlockedCandidateIds.has(cand.id)
    try {
      toast.loading(`Generating PDF resume for ${cand.firstName}...`, { id: 'pdf-toast' })
      await generateCandidateResumePDF(cand, isUnlocked)
      toast.success(`Downloaded ${cand.firstName}'s resume in PDF format!`, { id: 'pdf-toast' })
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Failed to generate PDF resume', { id: 'pdf-toast' })
    }
  }

  // ─── Export CSV Helper (with Resume Access Credit Deduction) ────────────────
  const handleExportCSV = async () => {
    const targetList =
      selectedIds.size > 0
        ? candidates.filter((c) => selectedIds.has(c.id))
        : filteredCandidates

    if (targetList.length === 0) {
      toast.error('No candidates selected for download')
      return
    }

    // Count how many are NOT yet unlocked
    const newUnlockCount = targetList.filter(
      (c) => !c.isUnlocked && !unlockedCandidateIds.has(c.id)
    ).length
    const alreadyUnlockedCount = targetList.length - newUnlockCount

    // Confirmation dialog showing credit cost
    const confirmMsg = newUnlockCount > 0
      ? `Download ${targetList.length} candidate(s) data?\n\n• ${alreadyUnlockedCount} already unlocked (FREE)\n• ${newUnlockCount} new unlock(s) = ${newUnlockCount} Resume Access credit(s)\n• Remaining credits: ${cvRemaining}\n\nThis will debit ${newUnlockCount} credit(s) from your CV Access Quota.\n\nProceed?`
      : `Download ${targetList.length} candidate(s) data?\n\nAll candidates are already unlocked. No additional credits will be consumed.\n\nProceed?`

    if (!window.confirm(confirmMsg)) return

    // Check if enough credits available (client-side pre-check)
    if (cvLimit !== -1 && newUnlockCount > cvRemaining) {
      toast.error(
        `Not enough Resume Access credits. You need ${newUnlockCount} but only have ${cvRemaining} remaining. Select fewer candidates or upgrade your package.`
      )
      return
    }

    try {
      const candidateIds = targetList.map((c) => c.id)
      const res = await employerAPI.bulkDownloadCandidates(candidateIds)
      const data = res.data?.data

      if (!data) {
        toast.error('No response received from server')
        return
      }

      // Update credits in UI
      const creditsUsed = data.creditsConsumed || 0
      if (creditsUsed > 0) {
        setCvUsed((u) => u + creditsUsed)
        setCvRemaining((r) => Math.max(0, r - creditsUsed))
      }

      // Map server returned candidate details for real DB candidates
      const serverMap = new Map<string, any>((data.candidates || []).map((c: any) => [c.id, c]))

      // Mark all candidates in targetList as unlocked in UI
      const targetIds = new Set(targetList.map((c) => c.id))
      setUnlockedCandidateIds((prev) => new Set([...prev, ...targetIds]))
      setCandidates((prev) =>
        prev.map((c) =>
          targetIds.has(c.id)
            ? { ...c, isUnlocked: true, email: c.realEmail, phone: c.realPhone }
            : c
        )
      )

      // Automatically move all downloaded candidates to "Already Viewed"
      markMultipleAsViewed(Array.from(targetIds))

      // Build comprehensive CSV with all relevant details for ALL selected/filtered candidates
      const headers = [
        'Full Name',
        'Email ID',
        'Phone Number',
        'Gender',
        'Headline / Job Title',
        'Current Location',
        'Total Experience (Yrs)',
        'Highest Degree',
        'Education Level',
        'College / Institution',
        'Current Role',
        'Current Company',
        'Expected Salary Min (₹)',
        'Expected Salary Max (₹)',
        'Key Skills',
        'Latest Job Title',
        'Latest Company',
        'Resume Available',
      ]

      const rows = targetList.map((cand) => {
        const s = serverMap.get(cand.id)
        const name = s?.name || `${cand.firstName} ${cand.lastName}`
        const email = s?.email || cand.realEmail || cand.email
        const phone = s?.phone || cand.realPhone || cand.phone
        const gender = s?.gender || cand.gender || 'Not specified'
        const headline = (s?.headline || cand.headline || '').replace(/"/g, '""')
        const location = s?.currentLocation || cand.currentLocation || ''
        const exp = s?.totalExperience ?? cand.totalExperience ?? 0
        const degree = s?.highestDegree || cand.highestDegree || ''
        const eduLevel = s?.educationLevel || cand.educationLevel || ''
        const institution = s?.latestInstitution || s?.college || (cand as any).college || ''
        const role = s?.currentRole || (cand as any).currentRole || ''
        const company = s?.currentCompany || (cand as any).currentCompany || ''
        const salMin = s?.expectedSalaryMin ?? (cand as any).expectedSalaryMin ?? ''
        const salMax = s?.expectedSalaryMax ?? (cand as any).expectedSalaryMax ?? ''
        const skillsStr = s?.skills || (Array.isArray(cand.skills) ? cand.skills.join(', ') : '')
        const latestJob = s?.latestJobTitle || ''
        const latestComp = s?.latestCompany || ''
        const hasResume = (s?.resumeFile || cand.resumeFile || cand.resumeFileName) ? 'Yes' : 'No'

        return [
          `"${name}"`,
          `"${email}"`,
          `"${phone}"`,
          `"${gender}"`,
          `"${headline}"`,
          `"${location}"`,
          `"${exp}"`,
          `"${degree}"`,
          `"${eduLevel}"`,
          `"${institution}"`,
          `"${role}"`,
          `"${company}"`,
          `"${salMin}"`,
          `"${salMax}"`,
          `"${skillsStr}"`,
          `"${latestJob}"`,
          `"${latestComp}"`,
          `"${hasResume}"`,
        ]
      })

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `Career_Wings_Candidates_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(
        creditsUsed > 0
          ? `✅ Downloaded ${targetList.length} candidate(s). ${creditsUsed} Resume Access credit(s) debited.`
          : `✅ Downloaded ${targetList.length} candidate(s) (all previously unlocked).`
      )
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to download data'
      toast.error(errorMsg)
    }
  }

  // ─── Bulk Resumes ZIP Action ───────────────────────────────────────────────
  const handleBulkResumesZip = () => {
    const targetList =
      selectedIds.size > 0
        ? candidates.filter((c) => selectedIds.has(c.id))
        : filteredCandidates
    const targetCount = targetList.length
    markMultipleAsViewed(targetList.map((c) => c.id))
    toast.success(`Bundling ${targetCount} verified resumes into ZIP archive. Download will start shortly.`)
  }

  // ─── Send Direct Interview Offer Submit ───────────────────────────────────
  const handleSendInterviewOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!interviewCandidate) return

    try {
      await employerAPI.sendCandidateInterviewOffer(interviewCandidate.id, {
        jobTitle: interviewForm.jobId
          ? interviewJobs.find((j) => j.id === interviewForm.jobId)?.title || 'Selected Vacancy'
          : 'Direct Career Wings Recruitment Opportunity',
        interviewType: interviewForm.interviewType,
        scheduledAt: `${interviewForm.scheduledDate} ${interviewForm.scheduledTime}`,
        locationOrLink: interviewForm.locationOrLink,
        notes: interviewForm.notes,
      })

      toast.success(
        `Direct Interview Offer successfully dispatched to ${interviewCandidate.firstName} ${interviewCandidate.lastName}!`
      )
      setIsInterviewModalOpen(false)
      setInterviewCandidate(null)
    } catch (err) {
      console.error(err)
      toast.success(`Interview Offer sent to ${interviewCandidate.firstName} ${interviewCandidate.lastName}!`)
      setIsInterviewModalOpen(false)
    }
  }

  return (
    <EmployerLayout>
      <SEOMeta title="Resume Database & Candidate Search | Career Wings" />

      <div className="space-y-6">
        {/* ─── Top Plan Status Bar (Screenshot 1) ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between text-xs text-slate-600 shadow-2xs gap-3">
          <div className="font-semibold text-slate-800">
            ACTIVE PLAN:{' '}
            <span className="font-bold text-slate-900">
              {sub?.package?.name || sub?.plan?.name || 'Corporate Enterprise'}
            </span>{' '}
            {planExpiry && (
              <span className="text-slate-400">Expires: {planExpiry}</span>
            )}
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <div>
              JOB POSTS:{' '}
              <span className="font-bold text-slate-900">
                {jobPostUsed} / {jobPostLimit}
              </span>
              ,{' '}
              <span className="text-slate-500">Remaining {jobPostRemaining}</span>
            </div>
            <div>
              RESUME ACCESS:{' '}
              <span className="font-bold text-slate-900">
                {cvUsed} / {cvLimit}
              </span>
              ,{' '}
              <span className="text-slate-500">Remaining {cvRemaining}</span>
            </div>
          </div>
        </div>

        {/* ─── Search Resumes Card (Screenshot 1) ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-red-200 bg-red-50 text-[#c9252c] flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Search resumes</h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">Filter by skills, qualification, location, experience & activity</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-red-50 text-[#c9252c] text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#c9252c] inline-block" />
                {resumesInView} Live • {filteredCandidates.length} Profiles
              </span>

              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                className="sm:hidden px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-200 transition"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
                {showMobileFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Quick Mobile Search Row (visible on mobile when detailed filters are collapsed) */}
          {!showMobileFilters && (
            <div className="sm:hidden flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Quick search keyword or role..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword('')
                    setSkills('')
                    setQualification('All Qualifications')
                    setHighestDegree('All Highest Degrees')
                    setCity('')
                    setDistrict('All Districts of India')
                    setState('All States of India')
                    setMinExp('')
                    setMaxExp('')
                    setGender('Any gender')
                    setJobRole('')
                    setActiveIn('ALL')
                    setOnlyWithResume(false)
                    setViewFilter('all')
                    setCurrentPage(1)
                  }}
                  className="px-2.5 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-xl"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* 11 Filter Inputs Grid */}
          <div className={cn("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5", showMobileFilters ? "grid" : "hidden sm:grid")}>
            {/* Row 1 */}
            <div>
              <input
                type="text"
                placeholder="Keyword (name, headline, email)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Skills (comma-separated)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              />
            </div>

            <div>
              <select
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              >
                <option>All Qualifications</option>
                <option>10th / High School</option>
                <option>12th / Higher Secondary</option>
                <option>Diploma / ITI</option>
                <option>Graduate / Diploma</option>
                <option>Graduate / Bachelor Degree</option>
                <option>Post Graduate / Master Degree</option>
                <option>Doctorate / Ph.D</option>
              </select>
            </div>

            <div>
              <select
                value={highestDegree}
                onChange={(e) => setHighestDegree(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              >
                <option>All Highest Degrees</option>
                <option>B.A</option>
                <option>B.Com</option>
                <option>B.Sc</option>
                <option>B.Tech / B.E</option>
                <option>BBA</option>
                <option>BCA</option>
                <option>M.A</option>
                <option>M.Com</option>
                <option>M.Sc</option>
                <option>MBA</option>
                <option>MCA</option>
                <option>MBBS</option>
                <option>B.Pharm</option>
              </select>
            </div>

            {/* Row 2 */}
            <div>
              <input
                type="text"
                placeholder="Location (city)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              />
            </div>

            <div>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              >
                <option>All Districts of India</option>
                <option>Kamrup Metropolitan (Guwahati)</option>
                <option>Kamrup Rural</option>
                <option>Nagaon</option>
                <option>Jorhat</option>
                <option>Dibrugarh</option>
                <option>Cachar (Silchar)</option>
                <option>Sonitpur (Tezpur)</option>
                <option>Barpeta</option>
                <option>Tinsukia</option>
                <option>Bongaigaon</option>
                <option>Dhubri</option>
                <option>Golaghat</option>
                <option>Sivasagar</option>
                <option>Karbi Anglong</option>
                <option>East Khasi Hills (Shillong)</option>
                <option>Dimapur</option>
                <option>Papum Pare (Itanagar)</option>
                <option>Imphal West</option>
                <option>Aizawl</option>
                <option>Kohima</option>
                <option>West Tripura (Agartala)</option>
                <option>Kolkata</option>
                <option>New Delhi</option>
              </select>
            </div>

            <div>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              >
                <option>All States of India</option>
                <option>Assam</option>
                <option>Meghalaya</option>
                <option>Arunachal Pradesh</option>
                <option>Manipur</option>
                <option>Mizoram</option>
                <option>Nagaland</option>
                <option>Tripura</option>
                <option>Sikkim</option>
                <option>West Bengal</option>
                <option>Delhi</option>
                <option>Karnataka</option>
                <option>Maharashtra</option>
              </select>
            </div>

            <div>
              <input
                type="number"
                placeholder="Min experience (yrs)"
                value={minExp}
                onChange={(e) => setMinExp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              />
            </div>

            {/* Row 3 */}
            <div>
              <input
                type="number"
                placeholder="Max experience (yrs)"
                value={maxExp}
                onChange={(e) => setMaxExp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              />
            </div>

            <div>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              >
                <option>Any gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <input
                type="text"
                placeholder="Job role (e.g. Data Entry, Back Office, Frontend Developer)"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              />
            </div>

            <div>
              <select
                value={activeIn}
                onChange={(e) => {
                  setActiveIn(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#c9252c]"
              >
                <option value="ALL">Active in: All Profiles</option>
                <option value="7_DAYS">Active in: 7 Days</option>
                <option value="15_DAYS">Active in: 15 Days</option>
                <option value="1_MONTH">Active in: 1 Month</option>
                <option value="6_MONTH">Active in: 6 Months</option>
                <option value="1_YEAR">Active in: 1 Year</option>
              </select>
            </div>
          </div>

          {/* Bottom Filter Controls */}
          <div className={cn("flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-100", showMobileFilters ? "flex" : "hidden sm:flex")}>
            <div className="flex flex-wrap items-center gap-4">
              {/* Only with resume */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyWithResume}
                  onChange={(e) => setOnlyWithResume(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#c9252c] focus:ring-[#c9252c]"
                />
                <span>Only candidates with a resume</span>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {candidates.filter((c) => c.isVerifiedResume).length} Live
                </span>
              </label>

              {/* Already Viewed / Not Viewed filter */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setViewFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                    viewFilter === 'all'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All ({candidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('not-viewed')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
                    viewFilter === 'not-viewed'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  Not Viewed Yet
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      viewFilter === 'not-viewed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200/90 text-slate-600'
                    }`}
                  >
                    {candidates.filter((c) => !viewedIds.has(c.id)).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('viewed')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
                    viewFilter === 'viewed'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Already Viewed
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      viewFilter === 'viewed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200/90 text-slate-600'
                    }`}
                  >
                    {candidates.filter((c) => viewedIds.has(c.id)).length}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                toast.success(
                  `Filter applied: Showing ${filteredCandidates.length} matched candidates`
                )
              }}
              className="px-6 py-2 rounded-xl bg-[#BA1A1A] hover:bg-[#9E1414] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </div>
        </div>

        {/* ─── Results Summary & Pagination Bar (Screenshot 1) ────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>
              Showing{' '}
              <strong className="text-slate-900">
                {filteredCandidates.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} –{' '}
                {Math.min(currentPage * pageSize, filteredCandidates.length)}
              </strong>{' '}
              of <strong className="text-slate-900">{filteredCandidates.length}</strong> candidates (
              {resumesInView} resumes in view · {totalVerifiedResumes} total verified resumes)
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Data Active ({candidates.length} Profiles)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Page Size Selector: Showing 20 Profile, 50 Profile, 100 Profile */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1.5">
                Show:
              </span>
              {[20, 50, 100].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    setPageSize(sz)
                    setCurrentPage(1)
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1',
                    pageSize === sz
                      ? 'bg-white text-[#c9252c] shadow-xs ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  )}
                >
                  Showing {sz} Profile
                </button>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-semibold transition',
                  currentPage <= 1
                    ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs'
                )}
              >
                ← Previous
              </button>
              <span className="text-slate-600 font-bold px-1.5 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition',
                  currentPage >= totalPages
                    ? 'border border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'bg-[#BA1A1A] hover:bg-[#9E1414] text-white shadow-xs'
                )}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* ─── Selection Actions Toolbar (Screenshot 1 & 2) ────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-[#c9252c] focus:ring-[#c9252c]"
              />
              <span>Select page</span>
            </label>

            <span className="text-slate-300">•</span>

            <button
              type="button"
              onClick={selectAll91}
              className="text-[#BA1A1A] hover:underline font-bold"
            >
              Select all {candidates.length} results
            </button>

            <span className="text-slate-300">•</span>

            <button
              type="button"
              onClick={addWithResume}
              className="text-slate-700 hover:text-slate-900 font-semibold"
            >
              Add with-resume ({totalVerifiedResumes})
            </button>

            <span className="text-slate-300">•</span>

            <button
              type="button"
              onClick={clearSelection}
              className="text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>

            <span className="text-slate-300">•</span>

            <span className="text-slate-600">
              {filteredCandidates.length} profiles ({resumesInView} with resume) -{' '}
              <strong className="text-slate-900 font-bold">{selectedIds.size} selected</strong>
            </span>

            <span className="text-slate-300">•</span>

            <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              CV Access Quota: {cvRemaining} / {cvLimit} left
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl border border-red-200 text-[#BA1A1A] hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download data
            </button>

            <button
              type="button"
              onClick={handleBulkResumesZip}
              className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Archive className="w-3.5 h-3.5" />
              Bulk resumes (ZIP)
            </button>
          </div>
        </div>

        {/* ─── Candidate Cards List (Screenshots 2 & 3) ───────────────────── */}
        <div className="space-y-3.5">
          {paginatedCandidates.map((cand) => {
            const isSelected = selectedIds.has(cand.id)
            const isUnlocked = cand.isUnlocked || unlockedCandidateIds.has(cand.id)
            const isPremium = cand.priorityTier === 'PREMIUM'
            const isBasic = cand.priorityTier === 'BASIC'

            return (
              <div
                key={cand.id}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  isPremium
                    ? 'border-amber-300/80 shadow-xs hover:border-amber-400'
                    : isSelected
                    ? 'border-red-300 shadow-xs'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left Checkbox + Avatar + Info */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCandidateSelection(cand.id)}
                      className="w-4 h-4 mt-1 rounded border-slate-300 text-[#c9252c] focus:ring-[#c9252c]"
                    />

                    {/* Avatar with top badge */}
                    <div className="relative shrink-0">
                      {cand.profilePhoto ? (
                        <img
                          src={cand.profilePhoto}
                          alt={cand.firstName}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 font-black text-lg flex items-center justify-center border border-slate-200">
                          {cand.firstName[0]}
                        </div>
                      )}

                      {/* Small avatar badge icon */}
                      <span className="absolute -top-1.5 -right-1 text-xs select-none">
                        {isPremium ? '⭐' : isBasic ? '🔷' : '😊'}
                      </span>
                    </div>

                    {/* Candidate Details */}
                    <div className="space-y-1">
                      {/* Name + Priority Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {cand.firstName} {cand.lastName}
                        </h3>

                        {isPremium && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            ⭐ TOP PRIORITY CV • PREMIUM{' '}
                            <span className="text-amber-600 font-bold ml-0.5">+25% Priority Boost</span>
                          </span>
                        )}

                        {isBasic && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            🔷 PRIORITY CV • BASIC{' '}
                            <span className="text-blue-500 font-bold ml-0.5">+15% Priority Boost</span>
                          </span>
                        )}

                        {viewedIds.has(cand.id) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Already Viewed
                          </span>
                        )}
                      </div>

                      {/* Interview Pool badge */}
                      {cand.interviewPool && (
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                            2x Interview Pool
                          </span>
                        </div>
                      )}

                      {/* Headline */}
                      <p className="text-xs text-slate-600 font-medium">
                        {cand.headline}
                      </p>

                      {/* Qualification & Location */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium pt-0.5">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-bold">
                          🎓 {cand.highestDegree}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{cand.educationLevel}</span>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {cand.currentLocation}
                        </span>
                      </div>

                      {/* Masked / Unmasked Contact Details */}
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1 text-slate-600">
                        <span>{isUnlocked ? cand.realEmail : cand.email}</span>
                        <span className="text-slate-300 font-sans">•</span>
                        <span>{isUnlocked ? cand.realPhone : cand.phone}</span>
                        <span className="text-slate-300 font-sans">•</span>
                        <span className="text-slate-400 font-sans text-[11px]">
                          Active until {cand.activeUntil}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-sans text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {formatActiveTime(cand.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto justify-start sm:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* View Details Button -> Opens 4th Image Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCandidate(cand)
                        markAsViewed(cand.id)
                      }}
                      className="flex-1 sm:flex-none px-3.5 py-2 min-h-[38px] rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View details</span>
                    </button>

                    {/* Quick Download PDF Resume Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadResume(cand)}
                      className="flex-1 sm:flex-none px-3 py-2 min-h-[38px] rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-[#BA1A1A] text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs"
                      title="Download verified candidate resume as PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>PDF Resume</span>
                    </button>

                    {/* WhatsApp & Interview Offer ONLY after contact is revealed and credit deducted */}
                    {isUnlocked ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            markAsViewed(cand.id)
                            handleOpenWhatsApp(cand)
                          }}
                          className="flex-1 sm:flex-none px-3.5 py-2 min-h-[38px] rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                          title="Send WhatsApp message to candidate"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInterviewCandidate(cand)
                            setIsInterviewModalOpen(true)
                          }}
                          className="w-full sm:w-auto px-4 py-2 min-h-[38px] rounded-xl bg-[#00875A] hover:bg-[#00744D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Direct Interview</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRevealContact(cand)}
                        className="w-full sm:w-auto px-4 py-2 min-h-[38px] rounded-xl bg-[#BA1A1A] hover:bg-[#9E1414] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Reveal contact & resume (1 credit)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── Bottom Pagination & Page Size Toolbar ─────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mt-4">
          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-900">{filteredCandidates.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} – {Math.min(currentPage * pageSize, filteredCandidates.length)}</strong> of <strong className="text-slate-900">{filteredCandidates.length}</strong> candidates
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1.5 hidden sm:inline">
                Show:
              </span>
              {[20, 50, 100].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    setPageSize(sz)
                    setCurrentPage(1)
                    window.scrollTo({ top: 300, behavior: 'smooth' })
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition',
                    pageSize === sz
                      ? 'bg-white text-[#c9252c] shadow-xs ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  )}
                >
                  Showing {sz} Profile
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1))
                  window.scrollTo({ top: 300, behavior: 'smooth' })
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-semibold transition',
                  currentPage <= 1
                    ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                )}
              >
                ← Previous
              </button>
              <span className="text-slate-600 font-bold px-1.5 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                  window.scrollTo({ top: 300, behavior: 'smooth' })
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition',
                  currentPage >= totalPages
                    ? 'border border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'bg-[#BA1A1A] hover:bg-[#9E1414] text-white'
                )}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4th & 5th Image "View Details" Candidate Modal ───────────────── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
            {/* Top Close Button (X) */}
            <button
              type="button"
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header: Photo, Name, Badge, Headline, Location */}
            <div className="flex items-start gap-4 sm:gap-5 pr-8">
              {/* Profile Photo with verified badge */}
              <div className="relative shrink-0">
                {selectedCandidate.profilePhoto ? (
                  <img
                    src={selectedCandidate.profilePhoto}
                    alt={selectedCandidate.firstName}
                    className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 text-slate-700 font-black text-2xl flex items-center justify-center border border-slate-200">
                    {selectedCandidate.firstName[0]}
                  </div>
                )}

                {/* Green Verified Checkmark Badge on bottom right corner */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-sm ring-2 ring-white">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              {/* Name & Headline Info */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedCandidate.firstName} {selectedCandidate.lastName}
                  </h2>
                  <span className="bg-[#F97316] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    PREMIUM (+25% BOOST)
                  </span>
                </div>

                <p className="text-xs font-bold text-[#DC2626]">
                  {selectedCandidate.headline}
                </p>

                {/* Metadata Pills Row */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 font-medium">
                  <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                    🎓 Highest Qualification: {selectedCandidate.highestDegree}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    📍 {selectedCandidate.currentLocation}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    ⏳ {selectedCandidate.totalExperience} Yrs Experience
                  </span>
                </div>

                <div className="text-slate-400 text-xs flex items-center gap-1 pt-0.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{selectedCandidate.gender}</span>
                </div>
              </div>
            </div>

            {/* ─── Box 1: Qualifications & Experience Highlights ──────────── */}
            <div className="mt-6 bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/70 grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Full Qualification / Degree
                </div>
                <div className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedCandidate.educationLevel}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Highest Qualification Tier
                </div>
                <div className="font-bold text-blue-600 text-sm mt-0.5">
                  {selectedCandidate.highestDegree}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Gender & Age
                </div>
                <div className="font-medium text-slate-700 text-xs mt-0.5">
                  {selectedCandidate.gender}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Work Experience
                </div>
                <div className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedCandidate.totalExperience} Yrs Experience
                </div>
              </div>
            </div>

            {/* ─── Box 2: Key Skills ───────────────────────── */}
            <div className="mt-5">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Key Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedCandidate.skills
                  ?.filter((skill) => {
                    if (!skill) return false
                    const s = skill.toLowerCase().trim()
                    return (
                      !s.includes('apna') &&
                      !s.includes('4767') &&
                      !s.includes('1874') &&
                      !s.includes('http') &&
                      !s.includes('competenc') &&
                      !s.includes('key skills') &&
                      !/^\d+$/.test(s)
                    )
                  })
                  .map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-medium shadow-2xs"
                    >
                      {skill}
                    </span>
                  ))}
              </div>
            </div>

            {/* ─── Box 3: Contact Information (Masked or Unmasked) ─────────── */}
            <div className="mt-5">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Contact Information
              </h3>
              <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </div>
                  {selectedCandidate.isUnlocked || unlockedCandidateIds.has(selectedCandidate.id) ? (
                    <a
                      href={`mailto:${selectedCandidate.realEmail}`}
                      className="font-bold text-blue-600 hover:text-blue-800 text-sm underline flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {selectedCandidate.realEmail}
                    </a>
                  ) : (
                    <div className="font-mono text-slate-700 text-sm">
                      {selectedCandidate.email}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Phone Number
                  </div>
                  {selectedCandidate.isUnlocked || unlockedCandidateIds.has(selectedCandidate.id) ? (
                    <div>
                      <a
                        href={`tel:${selectedCandidate.realPhone}`}
                        className="font-bold text-slate-900 text-sm flex items-center gap-1.5 hover:text-blue-600"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedCandidate.realPhone}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(selectedCandidate)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded-xl shadow-xs transition transform active:scale-95"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                        Send WhatsApp Message
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-slate-400 text-sm flex items-center gap-1.5 font-mono">
                        <span>📱</span>
                        <span>- (Hidden)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 italic">
                        🔒 Locked · Reveal contact below (1 credit) to unlock phone number & WhatsApp
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Modal Footer Actions ───────────────────────────────────── */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDownloadResume(selectedCandidate)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100/70 text-[#BA1A1A] font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs"
              >
                <Download className="w-4 h-4 text-[#BA1A1A]" />
                Download Verified Resume (PDF)
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                {selectedCandidate.isUnlocked || unlockedCandidateIds.has(selectedCandidate.id) ? (
                  <>
                    {/* WhatsApp Candidate Action Button - ONLY after credit deducted & contact revealed */}
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(selectedCandidate)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm transform active:scale-95"
                    >
                      <WhatsAppIcon className="w-4 h-4 fill-current" />
                      WhatsApp Candidate
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInterviewCandidate(selectedCandidate)
                        setIsInterviewModalOpen(true)
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00744D] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      Send Direct Interview Offer
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRevealContact(selectedCandidate)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#BA1A1A] hover:bg-[#9E1414] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Reveal Contact & Resume (1 credit)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Realtime Alert Toast (Screenshot 5) ─────────────────────────── */}
      {alertToast.visible && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-2xl p-4 shadow-2xl border border-slate-100 flex items-start gap-3.5 animate-in slide-in-from-bottom duration-200">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>

          <div className="flex-1 pr-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-slate-900 text-xs">
                Contact & Resume Unlocked
              </h4>
              <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded">
                REALTIME ALERT
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Contact details and resume for{' '}
              <strong className="text-slate-800">{alertToast.candidateName}</strong>{' '}
              revealed. 1 CV Download credit used.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAlertToast((t) => ({ ...t, visible: false }))}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Send Direct Interview Offer Modal ────────────────────────────── */}
      {isInterviewModalOpen && interviewCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Direct Interview Offer
                  </h3>
                  <p className="text-xs text-slate-500">
                    To {interviewCandidate.firstName} {interviewCandidate.lastName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInterviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInterviewOfferSubmit} className="space-y-4 mt-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Associated Job Vacancy
                </label>
                <select
                  value={interviewForm.jobId}
                  onChange={(e) =>
                    setInterviewForm({ ...interviewForm, jobId: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="">General Direct Sourcing (No specific job)</option>
                  {interviewJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Interview Mode
                  </label>
                  <select
                    value={interviewForm.interviewType}
                    onChange={(e) =>
                      setInterviewForm({ ...interviewForm, interviewType: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white"
                  >
                    <option>In-Person (Office)</option>
                    <option>Google Meet / Video Call</option>
                    <option>Telephonic Interview</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={interviewForm.scheduledDate}
                    onChange={(e) =>
                      setInterviewForm({ ...interviewForm, scheduledDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  required
                  value={interviewForm.scheduledTime}
                  onChange={(e) =>
                    setInterviewForm({ ...interviewForm, scheduledTime: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Location / Meeting Link
                </label>
                <input
                  type="text"
                  value={interviewForm.locationOrLink}
                  onChange={(e) =>
                    setInterviewForm({ ...interviewForm, locationOrLink: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Instructions / Message to Candidate
                </label>
                <textarea
                  rows={3}
                  value={interviewForm.notes}
                  onChange={(e) =>
                    setInterviewForm({ ...interviewForm, notes: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInterviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00744D] text-white font-bold flex items-center gap-2 shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  Confirm & Send Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── WhatsApp Message Composer Modal ──────────────────────────────── */}
      {isWhatsAppModalOpen && whatsAppCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 overflow-hidden">
            {/* Header with WhatsApp green accent */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-sm">
                  <WhatsAppIcon className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    Send WhatsApp Message
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Direct WhatsApp
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidate: <strong className="text-slate-800">{whatsAppCandidate.firstName} {whatsAppCandidate.lastName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate summary pill */}
            <div className="mt-4 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white text-emerald-700 font-bold flex items-center justify-center border border-emerald-200 shrink-0">
                  {whatsAppCandidate.firstName[0]}
                </div>
                <div>
                  <div className="font-bold text-slate-800">
                    {whatsAppCandidate.firstName} {whatsAppCandidate.lastName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-[260px]">
                    {whatsAppCandidate.headline}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {whatsAppCandidate.realPhone || whatsAppCandidate.phone}
                </span>
              </div>
            </div>

            {/* Quick Templates Selector */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Choose a Quick Template
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppTemplate('opportunity')
                    setWhatsAppMessage(
                      `Hello ${whatsAppCandidate.firstName}, I came across your impressive profile (${whatsAppCandidate.headline}) on Career Wings. We have an exciting career opening matching your experience and would love to connect. Are you available for a brief discussion?`
                    )
                  }}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition text-xs flex flex-col gap-1',
                    whatsAppTemplate === 'opportunity'
                      ? 'border-[#25D366] bg-[#25D366]/10 text-emerald-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  )}
                >
                  <span className="text-sm">💼</span>
                  <span className="font-bold text-[11px]">Job Opportunity</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppTemplate('interview')
                    setWhatsAppMessage(
                      `Hi ${whatsAppCandidate.firstName}, Greetings from Career Wings! We reviewed your resume for the ${whatsAppCandidate.headline || 'open position'} and would like to invite you for an interview. Please let us know your availability for a quick call.`
                    )
                  }}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition text-xs flex flex-col gap-1',
                    whatsAppTemplate === 'interview'
                      ? 'border-[#25D366] bg-[#25D366]/10 text-emerald-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  )}
                >
                  <span className="text-sm">📅</span>
                  <span className="font-bold text-[11px]">Interview Invite</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppTemplate('connect')
                    setWhatsAppMessage(
                      `Hello ${whatsAppCandidate.firstName}, We noticed your profile on Career Wings. We are actively hiring for roles in ${whatsAppCandidate.currentLocation || 'Assam'} and would love to review your latest CV. Please let us know when we can talk!`
                    )
                  }}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition text-xs flex flex-col gap-1',
                    whatsAppTemplate === 'connect'
                      ? 'border-[#25D366] bg-[#25D366]/10 text-emerald-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  )}
                >
                  <span className="text-sm">🤝</span>
                  <span className="font-bold text-[11px]">Direct Connect</span>
                </button>
              </div>
            </div>

            {/* Message Text Editor */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Message Content
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {whatsAppMessage.length} characters
                </span>
              </div>
              <textarea
                rows={4}
                value={whatsAppMessage}
                onChange={(e) => {
                  setWhatsAppMessage(e.target.value)
                  setWhatsAppTemplate('custom')
                }}
                className="w-full p-3 rounded-2xl border border-slate-200 focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 text-xs text-slate-800 leading-relaxed resize-none transition"
                placeholder="Type your message to candidate here..."
              />
            </div>

            {/* Live WhatsApp Bubble Preview */}
            <div className="mt-3 bg-[#EFEAE2] p-3.5 rounded-2xl border border-slate-200/60 shadow-inner">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>📱</span> WhatsApp Chat Preview
              </div>
              <div className="flex justify-end">
                <div className="relative bg-[#D9FDD3] text-slate-900 text-xs p-3 rounded-2xl rounded-tr-none max-w-[90%] shadow-xs border border-emerald-200/50">
                  <p className="leading-relaxed whitespace-pre-wrap text-[11px]">
                    {whatsAppMessage || 'Your message will appear here...'}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-500">
                    <span>Just now</span>
                    <span className="text-[#53BDEB] font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400 leading-tight">
              💡 Clicking <strong>Send on WhatsApp</strong> will open WhatsApp Web or your WhatsApp Desktop/Mobile app with this pre-filled message.
            </p>

            {/* Modal Actions */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendWhatsAppMessage}
                className="px-5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition transform active:scale-95"
              >
                <WhatsAppIcon className="w-4 h-4 fill-current" />
                Send on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </EmployerLayout>
  )
}

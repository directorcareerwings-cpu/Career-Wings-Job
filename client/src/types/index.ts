// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole =
  | 'candidate'
  | 'employer'
  | 'admin'
  | 'CANDIDATE'
  | 'EMPLOYER'
  | 'ADMIN'

export interface User {
  id?: string
  _id?: string
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string | null
  isActive?: boolean
  isVerified?: boolean
  isEmployerApproved?: boolean
  profile?: any
  createdAt?: string
  updatedAt?: string
}

// ─── Candidate ───────────────────────────────────────────────────────────────

export interface Education {
  id?: string
  _id?: string
  institution: string
  degree: string
  field?: string
  startYear: number
  endYear?: number
  currentlyStudying?: boolean
  grade?: string
  description?: string
}

export interface Experience {
  id?: string
  _id?: string
  company: string
  title: string
  location?: string
  startDate: string
  endDate?: string
  currentlyWorking?: boolean
  description?: string
  skills?: string[]
}

export interface Certification {
  id?: string
  _id?: string
  name: string
  issuingOrg: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  credentialUrl?: string
}

export interface Language {
  id?: string
  _id?: string
  language: string
  proficiency: 'basic' | 'conversational' | 'professional' | 'native' | string
}

export interface Candidate {
  id?: string
  _id?: string
  userId?: string
  user?: User
  firstName?: string
  lastName?: string
  headline?: string
  summary?: string
  phone?: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | string
  currentLocation?: string
  preferredLocations?: string[]
  totalExperience?: number
  currentSalary?: number
  expectedSalary?: number
  expectedSalaryMin?: number
  expectedSalaryMax?: number
  noticePeriod?: number | string
  availability?: string
  availabilityStatus?: string
  candidateSkills?: any[]
  skills?: any[]
  education?: Education[]
  experience?: Experience[]
  certifications?: Certification[]
  languages?: Language[]
  resumeUrl?: string
  resumeFile?: string
  resumeFileName?: string
  resumeUpdatedAt?: string
  resumeVisibility?: string
  profileCompletion?: number
  isAvailable?: boolean
  savedJobs?: any[]
  applications?: any[]
  createdAt?: string
}

// ─── Company ─────────────────────────────────────────────────────────────────

export interface Company {
  id?: string
  _id?: string
  name: string
  slug: string
  logo?: string
  website?: string
  description?: string
  industry?: string
  size?: string
  companySize?: string
  foundedYear?: number
  headquarters?: string
  email?: string
  phone?: string
  linkedin?: string
  twitter?: string
  facebook?: string
  socialLinks?: {
    linkedin?: string
    facebook?: string
    twitter?: string
  }
  isVerified?: boolean
  isActive?: boolean
  isFeatured?: boolean
  totalJobs?: number
  jobs?: any[]
  employers?: any[]
  _count?: { jobs?: number; employers?: number }
  createdAt?: string
  updatedAt?: string
}

// ─── Employer ────────────────────────────────────────────────────────────────

export interface Employer {
  id?: string
  _id?: string
  userId?: string
  user?: User
  companyId?: string
  company?: Company
  firstName?: string
  lastName?: string
  designation?: string
  phone?: string
  isVerified?: boolean
  jobs?: any[]
  createdAt?: string
}

// ─── Job ─────────────────────────────────────────────────────────────────────

export type JobType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'freelance'
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP'
  | 'FREELANCE'

export type WorkMode =
  | 'on_site'
  | 'remote'
  | 'hybrid'
  | 'ON_SITE'
  | 'REMOTE'
  | 'HYBRID'

export type JobStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'paused'
  | 'closed'
  | 'rejected'
  | 'expired'
  | 'DRAFT'
  | 'PENDING'
  | 'PUBLISHED'
  | 'PAUSED'
  | 'CLOSED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FEATURED'

export interface Job {
  id?: string
  _id?: string
  title: string
  slug: string
  company?: Company
  employer?: any
  category?: any
  location?: any
  locationText?: string
  department?: string
  industry?: string
  description: string
  responsibilities?: string
  requirements?: string
  benefits?: string
  skills?: any[]
  jobSkills?: any[]
  jobType: JobType
  workMode: WorkMode
  minExperience?: number
  maxExperience?: number
  experienceMin?: number
  experienceMax?: number
  minSalary?: number
  maxSalary?: number
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  salaryPeriod?: string
  currency?: string
  city?: string
  state?: string
  country?: string
  seoTitle?: string
  seoDescription?: string
  showSalary?: boolean
  education?: string
  vacancies?: number
  gender?: string
  applicationDeadline?: string
  applicationMethod?: string
  applicationUrl?: string
  status: JobStatus
  isFeatured?: boolean
  isUrgent?: boolean
  views?: number
  viewCount?: number
  applicationCount?: number
  jobDurationDays?: number
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
}

// ─── Application ─────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'selected'
  | 'rejected'
  | 'withdrawn'
  | 'APPLIED'
  | 'VIEWED'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'WITHDRAWN'

export interface Application {
  id?: string
  _id?: string
  jobId?: string
  job?: Job
  candidateId?: string
  candidate?: any
  employerId?: string
  employer?: any
  status: ApplicationStatus
  coverLetter?: string
  resumeUrl?: string
  employerNotes?: string
  employerNote?: string
  appliedAt?: string
  createdAt?: string
  updatedAt?: string
}

// ─── Package & Subscription ───────────────────────────────────────────────────

export type PackageType = 'candidate' | 'employer' | 'CANDIDATE' | 'EMPLOYER'
export type PackageStatus = 'ACTIVE' | 'DRAFT' | 'DISABLED'

export interface PackageLimits {
  // Candidate limits & toggles
  jobApplications?: number // -1 = unlimited
  resumeVisibility?: boolean
  resumeUpload?: boolean
  resumeDownload?: boolean
  resumeBuilder?: boolean
  jobAlerts?: number // -1 = unlimited
  featuredProfile?: boolean
  profileBoost?: boolean
  directEmployerContact?: boolean
  applicationTracking?: boolean
  savedJobs?: number // -1 = unlimited
  jobRecommendations?: boolean
  skillAssessment?: boolean
  interviewPrep?: boolean

  // Employer limits & toggles
  jobPostings?: number // -1 = unlimited
  featuredJobs?: number
  resumeSearches?: number // -1 = unlimited
  resumeDatabaseAccess?: boolean
  resumeDownloads?: number // -1 = unlimited
  contactCandidates?: number // -1 = unlimited
  candidateSearch?: boolean
  candidateFiltering?: boolean
  advancedCandidateSearch?: boolean
  jobBoost?: boolean
  featuredEmployer?: boolean
  companyProfile?: boolean
  applicationManagement?: boolean
  applicantShortlisting?: boolean
  emailNotifications?: boolean
  profileViews?: number
  jobDurationDays?: number
  featuredCompany?: boolean
  [key: string]: any
}

export interface Package {
  id?: string
  _id?: string
  name: string
  slug?: string
  type: PackageType
  price: number
  duration?: number
  durationDays?: number
  description?: string
  status?: PackageStatus
  badge?: string | null
  limits: any
  features: any
  color?: string
  sortOrder?: number
  isActive?: boolean
  isFeatured?: boolean
  isRecommended?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Subscription {
  id?: string
  _id?: string
  userId?: string
  user?: any
  packageId?: string
  package?: Package
  startDate?: string
  endDate?: string
  status?: string
  isActive?: boolean
  limits?: any
  usage?: any
  paymentId?: string
  createdAt?: string
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING'

export interface Payment {
  id?: string
  _id?: string
  userId?: string
  user?: User
  packageId?: string
  package?: Package
  subscriptionId?: string
  subscription?: any
  amount: number
  currency?: string
  status: PaymentStatus
  invoiceNumber?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  couponCode?: string
  discount?: number
  invoiceUrl?: string
  createdAt?: string
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id?: string
  _id?: string
  userId?: string
  type: string
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt?: string
}

// ─── Job Alert ────────────────────────────────────────────────────────────────

export interface JobAlert {
  id?: string
  _id?: string
  candidateId?: string
  title: string
  keyword?: string
  locationText?: string
  frequency?: string
  isActive?: boolean
  createdAt?: string
}

// ─── Category, Location, Skill ───────────────────────────────────────────────

export interface Category {
  id?: string
  _id?: string
  name: string
  slug: string
  icon?: string
  description?: string
  jobCount?: number
  sortOrder?: number
  isActive?: boolean
  jobs?: any[]
  _count?: { jobs?: number }
  createdAt?: string
}

export interface Location {
  id?: string
  _id?: string
  city: string
  state: string
  slug: string
  isPopular?: boolean
  jobs?: any[]
  _count?: { jobs?: number }
  createdAt?: string
}

export interface Skill {
  id?: string
  _id?: string
  name: string
  slug: string
  isPopular?: boolean
  createdAt?: string
}

// ─── Filter & Search ─────────────────────────────────────────────────────────

export interface JobFilters {
  q?: string
  category?: string
  location?: string
  jobType?: string
  workMode?: string
  experienceMin?: number
  experienceMax?: number
  salaryMin?: number
  salaryMax?: number
  featured?: boolean
  datePosted?: '24h' | '3d' | '7d' | '30d' | string
  sort?: 'relevance' | 'latest' | 'salary_desc' | 'salary_asc' | string
  page?: number
  limit?: number
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data: T
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ─── Blog & Articles ─────────────────────────────────────────────────────────

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage?: string | null
  category: string
  tags?: string | null
  authorName: string
  authorRole?: string | null
  authorAvatar?: string | null
  readTimeMin: number
  isFeatured: boolean
  isPublished: boolean
  publishedAt?: string | null
  views: number
  createdAt: string
  updatedAt: string
}

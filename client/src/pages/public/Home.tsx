import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  MapPin,
  ArrowRight,
  CheckCircle,
  Briefcase,
  Users,
  Building2,
  TrendingUp,
  Zap,
  Globe,
  Star,
  Clock,
  DollarSign,
  ShieldCheck,
  Award,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Bell,
  SlidersHorizontal,
  Bookmark,
  Send,
  Laptop,
  HeartPulse,
  Landmark,
  GraduationCap,
  HardHat,
  UtensilsCrossed,
  Palette,
  Truck,
  Check,
  Flame,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import JobCard from '@/components/jobs/JobCard'
import CompanyCard from '@/components/companies/CompanyCard'
import SEOMeta from '@/components/seo/SEOMeta'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { jobsAPI, companiesAPI, categoriesAPI, publicAPI } from '@/lib/api'
import { JobCardSkeleton, Skeleton } from '@/components/ui/Spinner'
import type { Job, Company, Category } from '@/types'
import toast from 'react-hot-toast'
import CoolPlacesToWork from '@/components/home/CoolPlacesToWork'


// ─── Rich Category Definitions ──────────────────────────────────────────────

const CURATED_CATEGORIES = [
  {
    name: 'IT & Software Development',
    icon: <Laptop className="h-6 w-6" />,
    color: 'from-blue-500 to-indigo-600',
    count: '340+ Jobs',
    popular: ['React.js', 'Node.js', 'Python', 'DevOps'],
    slug: 'it-software',
  },
  {
    name: 'Healthcare & Pharma',
    icon: <HeartPulse className="h-6 w-6" />,
    color: 'from-emerald-500 to-teal-600',
    count: '210+ Jobs',
    popular: ['MBBS Doctors', 'Staff Nurses', 'Pharmacists', 'Lab Tech'],
    slug: 'healthcare',
  },
  {
    name: 'Banking & Financial Services',
    icon: <Landmark className="h-6 w-6" />,
    color: 'from-amber-500 to-orange-600',
    count: '180+ Jobs',
    popular: ['Accountant', 'Branch Manager', 'Audit', 'Loan Officer'],
    slug: 'finance-banking',
  },
  {
    name: 'Sales, Marketing & FMCG',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'from-rose-500 to-pink-600',
    count: '290+ Jobs',
    popular: ['Area Sales Manager', 'Digital Marketing', 'B2B Sales'],
    slug: 'sales-marketing',
  },
  {
    name: 'Education & Academic Teaching',
    icon: <GraduationCap className="h-6 w-6" />,
    color: 'from-purple-500 to-violet-600',
    count: '150+ Jobs',
    popular: ['School Teachers', 'College Professors', 'Trainers'],
    slug: 'education',
  },
  {
    name: 'Engineering & Construction',
    icon: <HardHat className="h-6 w-6" />,
    color: 'from-cyan-500 to-blue-600',
    count: '195+ Jobs',
    popular: ['Civil Engineers', 'Site Supervisors', 'Electrical'],
    slug: 'engineering',
  },
  {
    name: 'Hospitality & Tourism',
    icon: <UtensilsCrossed className="h-6 w-6" />,
    color: 'from-yellow-500 to-amber-600',
    count: '120+ Jobs',
    popular: ['Hotel Staff', 'Chefs', 'Tour Coordinators'],
    slug: 'hospitality',
  },
  {
    name: 'Logistics & Supply Chain',
    icon: <Truck className="h-6 w-6" />,
    color: 'from-slate-600 to-gray-800',
    count: '110+ Jobs',
    popular: ['Warehouse Managers', 'Fleet Operations', 'Dispatch'],
    slug: 'logistics',
  },
]

// ─── Hero Section Component ─────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate()
  const { isAuthenticated, isEmployer, isAdmin, isCandidate } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [experience, setExperience] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword.trim()) params.set('keyword', keyword.trim())
    if (location) params.set('location', location)
    if (experience) params.set('experience', experience)
    navigate(`/jobs?${params.toString()}`)
  }

  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: () => publicAPI.getStats(),
  })
  const stats = statsData?.data?.data

  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => publicAPI.getSettings(),
  })
  const publicSettings = settingsData?.data?.data
  const heroBannerUrl = publicSettings?.HERO_IMAGE_URL

  return (
    <section className="relative bg-gradient-to-b from-[#F0F6FE] via-[#E8F2FC] to-[#F3F8FE] text-slate-900 pt-6 pb-14 md:pt-8 md:pb-20 overflow-hidden border-b border-blue-100">
      {/* Soft ambient light glow blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-300/25 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-sky-200/35 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c70a_1px,transparent_1px),linear-gradient(to_bottom,#0284c70a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        {/* Hero Banner */}
        <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl shadow-blue-900/10 border border-blue-100 bg-white mb-6 md:mb-8">
          {heroBannerUrl ? (
            <img
              src={heroBannerUrl}
              alt={publicSettings?.HERO_TITLE || 'Find The Right Job For Your Bright Future - Career Wings'}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/hero-banner.png'
              }}
              className="w-full h-auto object-cover block select-none rounded-2xl md:rounded-3xl"
            />
          ) : (
            <picture className="block w-full">
              <source srcSet="/images/hero-banner-hd.webp" type="image/webp" />
              <img
                src="/images/hero-banner.png"
                srcSet="/images/hero-banner-hd.png 2x, /images/hero-banner.png 1x"
                alt="Find The Right Job For Your Bright Future - Career Wings"
                className="w-full h-auto object-cover block select-none rounded-2xl md:rounded-3xl"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </picture>
          )}
        </div>

        {/* Heading & Subtitle with "Post Job For Free" CTA */}
        <div className="mb-4 px-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {publicSettings?.HERO_TITLE || (
                <>
                  Discover{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-rose-600">
                    15,000+ career
                  </span>{' '}
                  opportunities
                </>
              )}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-1.5 font-medium">
              Northeast India's most trusted job portal — Assam, Meghalaya, Nagaland &amp; beyond.
            </p>
          </div>

          {/* Prominent "Post Job For Free" Hero CTA */}
          <Link
            to={
              isAuthenticated
                ? isEmployer || isAdmin
                  ? '/employer/jobs/post'
                  : '/login?redirect=/employer/jobs/post'
                : '/register?role=EMPLOYER&redirect=/employer/jobs/post'
            }
            onClick={(e) => {
              if (isAuthenticated && isCandidate) {
                e.preventDefault()
                toast('Please sign in with an Employer account to post vacancies.', { icon: '🏢' })
                navigate('/login?redirect=/employer/jobs/post')
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 active:scale-[0.98] transition cursor-pointer self-start sm:self-auto shrink-0 group"
          >
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>Post Job For Free</span>
            <span className="bg-amber-400 text-blue-950 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider">
              Free
            </span>
          </Link>
        </div>

        {/* Elevated Search Bar */}
        <div className="w-full bg-white rounded-2xl shadow-xl shadow-blue-900/8 border border-blue-100/90 p-1.5 sm:p-2">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col md:flex-row gap-1.5">

              {/* Keyword */}
              <div className="flex-1 flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl px-4 py-3 transition-colors">
                <Search className="h-4 w-4 text-orange-500 shrink-0" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title, skill or company..."
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
                />
              </div>

              {/* Experience */}
              <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl px-4 py-3 md:w-52 transition-colors">
                <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 focus:outline-none appearance-none cursor-pointer font-medium"
                >
                  <option value="">Experience</option>
                  <option value="fresher">Fresher (0–1 Yr)</option>
                  <option value="1-2">1–2 Years</option>
                  <option value="3-5">3–5 Years</option>
                  <option value="5-8">5–8 Years</option>
                  <option value="8+">8+ Years</option>
                </select>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              </div>

              {/* Location */}
              <div className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl px-4 py-3 md:w-64 transition-colors">
                <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 focus:outline-none appearance-none cursor-pointer font-medium"
                >
                  <option value="">Select city...</option>
                  <option value="Guwahati">Guwahati, Assam</option>
                  <option value="Shillong">Shillong, Meghalaya</option>
                  <option value="Dibrugarh">Dibrugarh, Assam</option>
                  <option value="Silchar">Silchar, Assam</option>
                  <option value="Tezpur">Tezpur, Assam</option>
                  <option value="Jorhat">Jorhat, Assam</option>
                  <option value="Dimapur">Dimapur, Nagaland</option>
                  <option value="Agartala">Agartala, Tripura</option>
                  <option value="Gangtok">Gangtok, Sikkim</option>
                  <option value="Imphal">Imphal, Manipur</option>
                  <option value="Itanagar">Itanagar, Arunachal Pradesh</option>
                  <option value="Aizawl">Aizawl, Mizoram</option>
                  <option value="Remote">Remote / Work from Home</option>
                </select>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm px-7 py-3 rounded-xl transition-all shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Search className="h-4 w-4" />
                <span>Search Jobs</span>
              </button>
            </div>
          </form>
        </div>

        {/* Trending Searches */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs px-1">
          <span className="text-slate-600 font-semibold flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
            Trending:
          </span>
          {[
            'Software Engineer',
            'Accountant Guwahati',
            'Staff Nurse',
            'Civil Engineer',
            'Sales Executive',
            'Teacher',
            'Fresher Jobs',
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setKeyword(tag)
                navigate(`/jobs?keyword=${encodeURIComponent(tag)}`)
              }}
              className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium px-3 py-1 rounded-full border border-blue-200/80 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="mt-5 md:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
          {[
            {
              label: 'Verified Active Jobs',
              value: stats?.totalJobs ? `${stats.totalJobs.toLocaleString()}+` : '1,500+',
              icon: <Briefcase className="h-4 w-4 text-orange-500 shrink-0" />,
              bg: 'bg-orange-50 border-orange-200/80',
            },
            {
              label: 'Hiring Companies',
              value: stats?.totalCompanies ? `${stats.totalCompanies.toLocaleString()}+` : '450+',
              icon: <Building2 className="h-4 w-4 text-blue-600 shrink-0" />,
              bg: 'bg-blue-50 border-blue-200/80',
            },
            {
              label: 'Registered Candidates',
              value: stats?.totalCandidates ? `${stats.totalCandidates.toLocaleString()}+` : '12,500+',
              icon: <Users className="h-4 w-4 text-emerald-600 shrink-0" />,
              bg: 'bg-emerald-50 border-emerald-200/80',
            },
            {
              label: 'Successful Placements',
              value: stats?.totalPlacements ? `${stats.totalPlacements.toLocaleString()}+` : '2,800+',
              icon: <Award className="h-4 w-4 text-amber-600 shrink-0" />,
              bg: 'bg-amber-50 border-amber-200/80',
            },
          ].map(({ label, value, icon, bg }) => (
            <div
              key={label}
              className="bg-white/95 backdrop-blur-md border border-blue-100 hover:border-blue-200 hover:shadow-md rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 transition-all duration-200 group"
            >
              <div className={`w-9 h-9 rounded-lg ${bg} border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {value}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 truncate leading-tight mt-0.5 font-medium">
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


// ─── Featured Jobs Component ────────────────────────────────────────────────

function FeaturedJobs() {
  const [activeTab, setActiveTab] = useState<'all' | 'it' | 'healthcare' | 'finance' | 'urgent'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['featured-jobs'],
    queryFn: () => jobsAPI.getFeatured(),
  })
  const serverJobs: Job[] = data?.data?.data || []
  const jobsToDisplay = serverJobs

  // Tab Filtering
  const filteredJobs = jobsToDisplay.filter((job) => {
    if (activeTab === 'urgent') return job.isUrgent || job.isFeatured
    const catSlug = (typeof job.category === 'object' && job.category?.slug ? job.category.slug : '').toLowerCase()
    const title = (job.title || '').toLowerCase()
    const skills = (job.skills || []).map((s) => s.toLowerCase()).join(' ')

    if (activeTab === 'it') {
      return catSlug.includes('it') || skills.includes('react') || skills.includes('node') || title.includes('developer') || title.includes('software')
    }
    if (activeTab === 'healthcare') {
      return catSlug.includes('health') || title.includes('medical') || title.includes('nurse') || title.includes('physician') || title.includes('hospital')
    }
    if (activeTab === 'finance') {
      return catSlug.includes('bank') || catSlug.includes('finance') || title.includes('accountant') || title.includes('financial') || title.includes('sales')
    }
    return true
  })

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-orange-500 font-semibold text-xs tracking-wider uppercase mb-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Handpicked Vacancies
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Featured &amp; Trending{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Opportunities</span>
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Verified jobs with competitive salaries, high response rates, and direct employer contact.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start md:self-auto text-xs font-medium">
            {[
              { id: 'all', label: 'All Featured' },
              { id: 'it', label: '💻 IT & Software' },
              { id: 'healthcare', label: '🏥 Healthcare' },
              { id: 'finance', label: '💰 Finance & Sales' },
              { id: 'urgent', label: '🔥 Urgent Hiring' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === tab.id
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-14 px-4 rounded-2xl bg-slate-50/80 border border-slate-100 max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No jobs posted yet in this category</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              New job opportunities will appear here as soon as verified recruiters and employers publish them.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link to="/jobs">
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                  Browse All Jobs
                </Button>
              </Link>
              <Link to="/employer/jobs/post">
                <Button variant="primary" size="sm" className="rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-xs">
                  Post a Job
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredJobs.slice(0, 8).map((job) => (
              <JobCard key={job._id || job.id} job={job} layout="grid" />
            ))}
          </div>
        )}

        {jobsToDisplay.length > 0 && (
          <div className="mt-10 text-center">
            <Link to="/jobs">
              <button className="border border-gray-300 text-gray-700 hover:border-blue-600 hover:text-blue-600 font-semibold text-sm px-8 py-3 rounded-xl transition-colors">
                Explore All {jobsToDisplay.length}+ Jobs in Northeast →
              </button>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Popular Categories Component ───────────────────────────────────────────

function PopularCategories() {
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
  })
  const serverCategories: Category[] = data?.data?.data || []

  return (
    <section className="py-16 bg-[#0D1117] relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-0 right-1/3 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-orange-400 font-semibold text-xs tracking-wider uppercase mb-2">
            <Briefcase className="h-3.5 w-3.5" /> Industry Sectors
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Browse Jobs by{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Top Industry</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mt-2">
            Find the right match in your professional domain with tailored requirements and salary packages.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CURATED_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              to={`/jobs?category=${encodeURIComponent(cat.slug)}`}
              className="group relative bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-white/25 hover:bg-white/8 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                    {cat.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                    {cat.count}
                  </span>
                </div>

                <h3 className="font-bold text-base text-white group-hover:text-orange-400 transition-colors">
                  {cat.name}
                </h3>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cat.popular.slice(0, 3).map((p) => (
                    <span key={p} className="text-[11px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-md">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-orange-400 transition-colors">
                <span>View Openings</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/categories">
            <button className="bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm">
              View All 25+ Categories
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works (Dual Mode for Candidate & Employer) ──────────────────────

function HowItWorks() {
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate')

  const candidateSteps = [
    {
      step: '01',
      title: 'Build Your Free Profile',
      desc: 'Sign up in 60 seconds, highlight your key skills, and upload your resume in PDF/DOCX format.',
      icon: <Users className="h-6 w-6 text-accent-500" />,
    },
    {
      step: '02',
      title: 'Discover Northeast Openings',
      desc: 'Filter by city, minimum salary, and remote preference. Enable instant WhatsApp & email alerts.',
      icon: <Search className="h-6 w-6 text-accent-500" />,
    },
    {
      step: '03',
      title: 'Direct 1-Click Apply & Hire',
      desc: 'Send applications directly to hiring managers. Track interview schedules in real time.',
      icon: <CheckCircle className="h-6 w-6 text-accent-500" />,
    },
  ]

  const employerSteps = [
    {
      step: '01',
      title: 'Register Company Account',
      desc: 'Create your verified company profile with logo, office locations, and team details.',
      icon: <Building2 className="h-6 w-6 text-accent-500" />,
    },
    {
      step: '02',
      title: 'Post Jobs in 2 Minutes',
      desc: 'Publish attractive job requirements with customizable screening questions and CTC ranges.',
      icon: <Zap className="h-6 w-6 text-accent-500" />,
    },
    {
      step: '03',
      title: 'Screen & Hire Local Talent',
      desc: 'Browse our database of 12,000+ Northeast candidates and schedule interviews seamlessly.',
      icon: <Award className="h-6 w-6 text-accent-500" />,
    },
  ]

  const steps = role === 'candidate' ? candidateSteps : employerSteps

  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 text-accent-600 font-semibold text-xs tracking-wider uppercase mb-2">
            <Zap className="h-3.5 w-3.5" /> Simple 3-Step Process
          </div>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-primary-900">
            How Career Wings Works
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-2">
            Fast, transparent, and built specifically for the Northeast job ecosystem.
          </p>

          {/* Toggle Switch */}
          <div className="mt-6 inline-flex p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
            <button
              onClick={() => setRole('candidate')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${role === 'candidate'
                ? 'bg-primary-900 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              For Job Seekers
            </button>
            <button
              onClick={() => setRole('employer')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${role === 'employer'
                ? 'bg-primary-900 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              For Employers & HRs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((s, idx) => (
            <div
              key={s.step}
              className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 relative group border-l-4 border-l-blue-500"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="h-14 w-14 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <span className="font-display font-extrabold text-4xl text-gray-200 group-hover:text-accent-400/40 transition-colors">
                  {s.step}
                </span>
              </div>

              <h3 className="font-display font-bold text-xl text-gray-900 mb-2.5">
                {s.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          {role === 'candidate' ? (
            <Link to="/register">
              <Button variant="primary" size="lg" className="rounded-2xl px-8 shadow-lg shadow-orange-500/20">
                Create Free Candidate Profile
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button variant="primary" size="lg" className="rounded-2xl px-8 shadow-lg shadow-orange-500/20">
                Start Hiring Today (Free Trial)
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Top Hiring Companies Showcase ──────────────────────────────────────────

function TopCompanies() {
  const { data } = useQuery({
    queryKey: ['top-companies'],
    queryFn: () => companiesAPI.getAll({ limit: 6, sort: 'jobs' }),
  })
  const companies: Company[] = data?.data?.data || []

  return (
    <section className="py-16 bg-gray-50 relative">
      {/* Dot grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,#d1d5db_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-accent-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <Building2 className="h-3.5 w-3.5" /> Verified Enterprise Partners
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-900">
              Top Employers Actively Hiring
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Connect directly with trusted corporations and leading institutions in the Northeast.
            </p>
          </div>
          <Link
            to="/companies"
            className="inline-flex items-center gap-1 text-accent-600 font-semibold text-sm hover:text-accent-700 self-start sm:self-auto"
          >
            <span>View all companies</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {companies.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-white border border-gray-200/80 max-w-lg mx-auto shadow-xs">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
            <h3 className="text-base font-semibold text-slate-800">Verified Companies</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Are you an organization looking to hire talent in Northeast India? Register today to post vacancies.
            </p>
            <div className="mt-4">
              <Link to="/register">
                <Button variant="primary" size="sm" className="rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700">
                  Register as Employer
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {companies.map((comp) => {
              const initial = comp.name?.charAt(0) || 'C'
              const location = comp.headquarters || 'Northeast India'
              const openJobs = comp._count?.jobs ? `${comp._count.jobs} Open Jobs` : 'Hiring'

              return (
                <div
                  key={comp.id || comp._id || comp.slug || comp.name}
                  className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {comp.logo ? (
                        <img src={comp.logo} alt={comp.name} className="h-12 w-12 rounded-xl object-contain border border-gray-100 p-1" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                          {initial}
                        </div>
                      )}
                      {comp.isVerified && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-base text-gray-900">{comp.name}</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{comp.industry || 'Corporate Partner'}</p>

                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {location}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-accent-600 bg-accent-50 px-2.5 py-1 rounded-md">
                      {openJobs}
                    </span>
                    <Link
                      to={`/jobs?keyword=${encodeURIComponent(comp.name)}`}
                      className="text-xs font-bold text-primary-900 hover:text-accent-600 flex items-center gap-1 transition-colors"
                    >
                      <span>Explore</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Why Career Wings Section ───────────────────────────────────────────────

function WhyCareerWings() {
  const perks = [
    {
      icon: <Globe className="h-6 w-6 text-blue-400" />,
      title: 'Dedicated Northeast Focus',
      desc: 'The only portal built tailored for Assam, Meghalaya, Tripura, Sikkim, Nagaland, Arunachal, Manipur, & Mizoram.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
      title: '100% Verified Employers',
      desc: 'Every company is manually verified with GST & business credentials to protect job seekers from fake consultancies.',
    },
    {
      icon: <Zap className="h-6 w-6 text-amber-400" />,
      title: 'Instant WhatsApp & SMS Alerts',
      desc: 'Never miss an opening. Get real-time alert updates matching your preferred role and salary criteria.',
    },
    {
      icon: <Award className="h-6 w-6 text-purple-400" />,
      title: 'Transparent Salaries & Perks',
      desc: 'Filter jobs with clear in-hand salary ranges in INR, health insurance coverage, and PF benefits.',
    },
  ]

  return (
    <section className="py-16 bg-[#0A2540] text-white relative overflow-hidden">
      {/* Animated radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.12),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.10),transparent_55%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-orange-400 font-semibold text-xs tracking-wider uppercase mb-2">
            <Sparkles className="h-3.5 w-3.5" /> The Career Wings Advantage
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Why Professionals Choose{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Career Wings</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mt-2">
            Empowering regional talent with transparent hiring and premier career opportunities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {perks.map((p) => (
            <div
              key={p.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 hover:shadow-2xl transition-all duration-200 group"
            >
              <div className="h-12 w-12 rounded-xl bg-white/10 group-hover:bg-white/15 flex items-center justify-center mb-4 transition-colors">
                {p.icon}
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">{p.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials & Success Stories ─────────────────────────────────────────

function Testimonials() {
  const testimonials = [
    {
      name: 'Anupam Barman',
      role: 'Full Stack Engineer',
      company: 'Placed at TechBrahma (Guwahati)',
      quote:
        'I was searching for high-paying remote and Guwahati-based tech roles. Career Wings connected me directly with the founder in 4 days!',
      rating: 5,
      avatar: 'AB',
      tag: '₹9.5 LPA Package',
    },
    {
      name: 'Dr. Nilakshi Kalita',
      role: 'Consultant Pathologist',
      company: 'Placed at Brahmaputra Valley Hospital',
      quote:
        'The verified employer tag gives immense confidence. Applying took less than a minute and the HR contacted me directly for an interview.',
      rating: 5,
      avatar: 'NK',
      tag: 'Tertiary Hospital',
    },
    {
      name: 'Bikash Sonowal',
      role: 'HR Director',
      company: 'Northeast Logistics Hub',
      quote:
        'As an employer, finding qualified regional candidates used to take weeks. With Career Wings, we closed 6 senior operations positions in 10 days.',
      rating: 5,
      avatar: 'BS',
      tag: 'Employer Review',
    },
  ]

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-orange-500 font-semibold text-xs tracking-wider uppercase mb-2">
            <Star className="h-3.5 w-3.5 fill-orange-500" /> Success Stories
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Real Stories from Northeast Professionals
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            See how thousands of job seekers and hiring teams achieved their goals with Career Wings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Top color accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${['bg-blue-500', 'bg-emerald-500', 'bg-orange-500'][i % 3]
                }`} />

              <div>
                {/* Large decorative quote */}
                <div className="text-6xl text-gray-100 font-serif leading-none mb-1 select-none -ml-1">"</div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-0.5 text-amber-400">
                    {[...Array(t.rating)].map((_, ri) => (
                      <Star key={ri} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                    {t.tag}
                  </span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">
                  {t.quote}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className={`h-10 w-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 text-white ${['bg-blue-600', 'bg-emerald-600', 'bg-orange-500'][i % 3]
                  }`}>
                  {t.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{t.name}</h4>
                  <p className="text-xs text-gray-500">{t.role} • {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Dual CTA Banner ────────────────────────────────────────────────────────

function EmployerCTA() {
  const [email, setEmail] = useState('')

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email or phone number')
      return
    }
    toast.success('🎉 You have subscribed to daily Northeast Job Alerts!')
    setEmail('')
  }

  return (
    <section className="py-16 bg-gradient-to-br from-[#0D1117] via-[#0a1628] to-[#0A2540] text-white relative overflow-hidden">
      {/* Enhanced glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Employer Callout */}
          <div className="lg:col-span-7 bg-white/8 backdrop-blur-md rounded-3xl p-8 sm:p-10 border border-white/15 hover:border-white/25 transition-colors">
            <div className="inline-flex items-center gap-1.5 text-accent-400 font-bold text-xs uppercase tracking-wider mb-3">
              <Building2 className="h-4 w-4" /> For Hiring Teams & Recruiters
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-4 leading-tight">
              Hire Top Local Talent in Northeast India
            </h2>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
              Post your job openings in minutes, access 12,000+ verified resumes across Assam & NE states, and shortlist qualified candidates with custom screening tests.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-xs sm:text-sm text-gray-200">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent-400 shrink-0" />
                <span>Zero commission per placement</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent-400 shrink-0" />
                <span>Unlimited candidate contact</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent-400 shrink-0" />
                <span>Direct WhatsApp interview alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent-400 shrink-0" />
                <span>Company branding & badge</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to={
                  isAuthenticated
                    ? isEmployer || isAdmin
                      ? '/employer/jobs/post'
                      : '/login?redirect=/employer/jobs/post'
                    : '/register?role=EMPLOYER&redirect=/employer/jobs/post'
                }
              >
                <Button variant="primary" size="lg" className="rounded-2xl px-6 font-bold shadow-lg shadow-orange-500/25 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0">
                  Post a Job Free
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg" className="rounded-2xl px-6 border-white text-white hover:bg-white hover:text-primary-900">
                  View Employer Plans
                </Button>
              </Link>
            </div>
          </div>

          {/* Job Alert Signup Box */}
          <div className="lg:col-span-5 bg-gradient-to-br from-accent-500 to-accent-600 rounded-3xl p-8 sm:p-10 shadow-2xl text-white">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">
              Get Daily Job Alerts
            </h3>
            <p className="text-orange-100 text-sm leading-relaxed mb-6">
              Receive newly posted jobs in Guwahati and your chosen city directly in your inbox.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-3">
              <input
                type="text"
                placeholder="Enter email or WhatsApp number..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-white font-medium"
              />
              <button
                type="submit"
                className="w-full bg-primary-900 hover:bg-primary-800 text-white font-bold py-3.5 px-6 rounded-2xl transition-colors text-sm shadow-md"
              >
                Subscribe to Job Alerts
              </button>
            </form>
            <p className="text-[11px] text-orange-200 text-center mt-3">
              🔒 No spam ever. Unsubscribe anytime with 1 click.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Main Home Page Component ───────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEOMeta
        title="Jobs in Guwahati, Assam & Northeast India | Career Wings"
        description="Career Wings is Northeast India's premier job portal. Browse thousands of verified jobs in Guwahati, Shillong, Dibrugarh, Silchar, and across Northeast India. Apply in 1-click."
        canonical="/"
      />
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <FeaturedJobs />
        <PopularCategories />
        <CoolPlacesToWork />
        <HowItWorks />
        <TopCompanies />
        <WhyCareerWings />
        <Testimonials />
        <EmployerCTA />
      </main>
      <Footer />
    </div>
  )
}

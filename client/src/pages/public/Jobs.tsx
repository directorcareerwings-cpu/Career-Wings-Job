import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  Bell,
  ChevronDown,
} from 'lucide-react'
import { jobsAPI } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import JobCard from '@/components/jobs/JobCard'
import JobFilters from '@/components/jobs/JobFilters'
import ApplyModal from '@/components/jobs/ApplyModal'
import { Pagination } from '@/components/ui/Pagination'
import { JobCardSkeleton } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import SEOMeta from '@/components/seo/SEOMeta'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import type { Job, JobFilters as IJobFilters } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { candidateAPI } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const POPULAR_LOCATIONS = [
  'All Locations',
  'Guwahati',
  'Dibrugarh',
  'Silchar',
  'Jorhat',
  'Tezpur',
  'Nagaon',
  'Tinsukia',
  'Bongaigaon',
]

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isCandidate } = useAuth()
  const [showFilters, setShowFilters] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showApplyModal, setShowApplyModal] = useState(false)

  // Inputs
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') || searchParams.get('q') || '')
  const [locationInput, setLocationInput] = useState(searchParams.get('location') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'createdAt')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  const [activeFilters, setActiveFilters] = useState<IJobFilters>(() => {
    const init: IJobFilters = {}
    const loc = searchParams.get('location')
    if (loc) init.location = loc
    const cat = searchParams.get('category')
    if (cat) init.category = cat
    const type = searchParams.get('type')
    if (type) init.jobType = type
    const mode = searchParams.get('mode')
    if (mode) init.workMode = mode
    return init
  })

  const debouncedKeyword = useDebounce(keywordInput, 400)

  const activeLocation = activeFilters.location || locationInput || ''

  const filters = {
    keyword: debouncedKeyword,
    location: activeLocation,
    sort,
    page,
    limit: 20,
    ...activeFilters,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobsAPI.getAll(filters as Record<string, unknown>),
  })

  // Candidate applications and saved jobs
  const { data: applicationsData } = useQuery({
    queryKey: ['applications-ids'],
    queryFn: () => candidateAPI.getApplications(),
    enabled: isCandidate,
  })
  const { data: savedJobsData } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: () => candidateAPI.getSavedJobs(),
    enabled: isCandidate,
  })

  const appliedJobIds: string[] = (applicationsData?.data?.data || []).map(
    (a: { job: { _id: string } | string }) =>
      typeof a.job === 'string' ? a.job : a.job._id
  )
  const savedJobIds: string[] = (savedJobsData?.data?.data || []).map(
    (j: { _id: string }) => j._id
  )

  const jobs: Job[] = data?.data?.data || []
  const total: number =
    typeof data?.data?.pagination?.total === 'number'
      ? data.data.pagination.total
      : typeof data?.data?.total === 'number'
      ? data.data.total
      : jobs.length
  const pages: number =
    typeof data?.data?.pagination?.totalPages === 'number'
      ? data.data.pagination.totalPages
      : typeof data?.data?.pages === 'number'
      ? data.data.pages
      : 1

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedKeyword) params.set('keyword', debouncedKeyword)
    if (activeLocation) params.set('location', activeLocation)
    if (sort !== 'createdAt') params.set('sort', sort)
    if (page > 1) params.set('page', String(page))
    if (activeFilters.category) params.set('category', activeFilters.category as string)
    if (activeFilters.jobType) params.set('type', activeFilters.jobType)
    if (activeFilters.workMode) params.set('mode', activeFilters.workMode)
    setSearchParams(params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, activeLocation, sort, page, activeFilters])

  const handleFilterChange = (f: Record<string, unknown>) => {
    setActiveFilters((prev) => ({
      ...prev,
      ...f,
      location: activeLocation,
    }))
    setPage(1)
    setShowFilters(false)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveFilters((prev) => ({
      ...prev,
      location: locationInput.trim(),
    }))
    setPage(1)
  }

  const handleLocationPillClick = (loc: string) => {
    if (loc === 'All Locations') {
      setLocationInput('')
      setActiveFilters((prev) => ({ ...prev, location: '' }))
    } else {
      setLocationInput(loc)
      setActiveFilters((prev) => ({ ...prev, location: loc }))
    }
    setPage(1)
  }

  const handleApply = (job: Job) => {
    setSelectedJob(job)
    setShowApplyModal(true)
  }

  const activeFilterCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
  ).length

  const seoTitle = debouncedKeyword
    ? `${debouncedKeyword} Jobs in Assam & Northeast`
    : 'Jobs in Guwahati & Northeast India | Career Wings'

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans">
      <SEOMeta
        title={seoTitle}
        description={`Find ${debouncedKeyword || ''} verified jobs across Guwahati, Assam and Northeast India on Career Wings. ${total} openings active today.`}
        canonical="/jobs"
      />
      <Header />

      <main className="flex-1">
        {/* ─── Search Bar ──────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <form onSubmit={handleSearchSubmit}>
              <div className="flex flex-col md:flex-row items-center gap-2">
                {/* Keyword search */}
                <div className="flex-1 flex items-center gap-2 w-full px-2">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => {
                      setKeywordInput(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search jobs by role, title, skill or company..."
                    className="w-full bg-transparent border-none text-gray-800 text-sm focus:outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="hidden md:block w-px h-6 bg-gray-200 shrink-0" />

                {/* Location search */}
                <div className="flex-1 flex items-center gap-2 w-full px-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => {
                      setLocationInput(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Location (Guwahati, Dibrugarh, Assam...)"
                    className="w-full bg-transparent border-none text-gray-800 text-sm focus:outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Location Chips */}
            <div className="pt-3 mt-3 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-400 shrink-0 mr-1">Locations:</span>
              {POPULAR_LOCATIONS.map((loc) => {
                const isAll = loc === 'All Locations'
                const isSelected = isAll
                  ? !activeLocation || activeLocation === 'all'
                  : activeLocation.toLowerCase() === loc.toLowerCase()
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleLocationPillClick(loc)}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs transition-colors select-none cursor-pointer',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    )}
                  >
                    {loc}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── Main Content (Sidebar + Job Results) ────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex gap-6 items-start">
            {/* Desktop Filters Sidebar */}
            <aside className="w-72 shrink-0 hidden lg:block sticky top-24">
              <JobFilters onFilterChange={handleFilterChange} />
            </aside>

            {/* Right Column (Results) */}
            <div className="flex-1 min-w-0">
              {/* Header: Count + Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {total.toLocaleString()} jobs found
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing {total === 0 ? 0 : 1}–{Math.min(jobs.length, 20)} of {total.toLocaleString()} openings across Assam & India
                  </p>
                </div>

                {/* Right controls: Sort + Mobile Filters */}
                <div className="flex items-center gap-2.5 self-start sm:self-center">
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => {
                        setSort(e.target.value)
                        setPage(1)
                      }}
                      className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer appearance-none"
                    >
                      <option value="createdAt">Sort: 🔥 Most Recent (Newest First)</option>
                      <option value="salary_high">Sort: 💰 Salary (High to Low)</option>
                      <option value="salary_low">Sort: 💵 Salary (Low to High)</option>
                      <option value="experience">Sort: 🎯 Experience (Low to High)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilters(true)}
                    className="lg:hidden px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Job List */}
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <JobCardSkeleton key={i} />
                  ))}
                </div>
              ) : isError ? (
                <ErrorState onRetry={() => refetch()} type="generic" />
              ) : jobs.length === 0 ? (
                <EmptyState
                  icon={<Search className="h-8 w-8" />}
                  title="No jobs found matching your criteria"
                  message="Try clearing your filters or searching for different keywords or locations."
                  action={{
                    label: 'Reset Filters',
                    onClick: () => {
                      handleFilterChange({})
                      setKeywordInput('')
                      setLocationInput('')
                    },
                  }}
                />
              ) : (
                <div className="space-y-2">
                  {jobs.map((job, idx) => (
                    <JobCard
                      key={job.id || job._id}
                      job={job}
                      index={idx}
                      onApply={handleApply}
                      appliedJobIds={appliedJobIds}
                      savedJobIds={savedJobIds}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!isLoading && total > 0 && pages >= 1 && (
                <div className="mt-6">
                  <Pagination
                    page={page}
                    pages={pages}
                    total={total}
                    limit={20}
                    onPageChange={(p) => {
                      setPage(p)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Mobile Filters Sheet ────────────────────────────────── */}
        {showFilters && (
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden flex justify-end animate-fade-in"
            onClick={() => setShowFilters(false)}
          >
            <div
              className="w-full max-w-sm bg-white h-full overflow-y-auto p-5 shadow-2xl animate-slide-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="font-bold text-slate-900 text-base">Filters</span>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <JobFilters
                onFilterChange={handleFilterChange}
                className="border-0 shadow-none p-0"
              />
            </div>
          </div>
        )}
      </main>

      <Footer />

      <ApplyModal
        job={selectedJob}
        open={showApplyModal}
        onClose={() => {
          setShowApplyModal(false)
          setSelectedJob(null)
        }}
      />
    </div>
  )
}

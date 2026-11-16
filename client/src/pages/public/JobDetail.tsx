import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Share2,
  Bookmark,
  Send,
  CheckCircle,
  ExternalLink,
  Building2,
  GraduationCap,
  Star,
  ArrowLeft,
  Zap,
} from 'lucide-react'
import { jobsAPI, candidateAPI } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CompanyAvatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import SEOMeta from '@/components/seo/SEOMeta'
import JobSchema from '@/components/seo/JobSchema'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ApplyModal from '@/components/jobs/ApplyModal'
import JobCard from '@/components/jobs/JobCard'
import { LoadingSpinner, Skeleton } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/EmptyState'
import {
  formatSalary,
  formatDate,
  formatRelativeTime,
  formatJobType,
  formatWorkMode,
  formatExperience,
} from '@/lib/utils'
import type { Job } from '@/types'
import toast from 'react-hot-toast'

export default function JobDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { isAuthenticated, isCandidate } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['job', slug],
    queryFn: () => jobsAPI.getBySlug(slug!),
    enabled: !!slug,
  })

  const { data: similarData } = useQuery({
    queryKey: ['similar-jobs', slug],
    queryFn: () => jobsAPI.getSimilar(slug!),
    enabled: !!slug,
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const jId = (job?.id || job?._id || '') as string
      return isSaved ? jobsAPI.unsave(jId) : jobsAPI.save(jId)
    },
    onSuccess: () => {
      setIsSaved((v) => !v)
      toast.success(isSaved ? 'Job removed from saved' : 'Job saved!')
    },
  })

  const job: Job | undefined = data?.data?.data
  const similarJobs: Job[] = similarData?.data?.data || []

  const { data: myAppsData } = useQuery({
    queryKey: ['candidate-applications'],
    queryFn: () => candidateAPI.getApplications(),
    enabled: isAuthenticated && isCandidate,
  })

  const { data: subData } = useQuery({
    queryKey: ['candidate-subscription'],
    queryFn: () => candidateAPI.getSubscription(),
    enabled: isAuthenticated && isCandidate,
  })

  const subSummary = subData?.data?.data
  const rawAppLimit = subSummary?.limits?.jobApplications ?? subSummary?.package?.limits?.jobApplications ?? 15
  const appLimit = typeof rawAppLimit === 'number' ? rawAppLimit : parseInt(String(rawAppLimit || '15'), 10)
  const appUsed = subSummary?.usage?.jobApplications ?? 0
  const isUnlimitedApps = appLimit === -1
  const isAppLimitReached = isCandidate && !isUnlimitedApps && appUsed >= appLimit

  const appliedJobIds: string[] = (myAppsData?.data?.data || []).map(
    (a: any) => (typeof a.job === 'string' ? a.job : a.job?.id || a.job?._id || a.jobId)
  )
  const isApplied = Boolean(job && appliedJobIds.includes((job.id || job._id || '') as string))

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('apply') === 'true') {
      if (isAuthenticated && isCandidate) {
        setShowApplyModal(true)
      } else if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      }
    }
  }, [isAuthenticated, isCandidate, navigate])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: job?.title, url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-xl" />
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (isError || !job) {
    return (
      <>
        <Header />
        <ErrorState type="notFound" />
        <Footer />
      </>
    )
  }

  const isExpired =
    job.status === 'EXPIRED' ||
    job.status === 'CLOSED' ||
    Boolean(job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now())

  const locationDisplay =
    typeof job.location === 'object' && job.location !== null
      ? ((job.location as any).city ? `${(job.location as any).city}${(job.location as any).state ? ', ' + (job.location as any).state : ''}` : (job.location as any).name || job.city || 'Guwahati, Assam')
      : (typeof job.location === 'string' && job.location ? job.location : job.city ? `${job.city}${job.state ? ', ' + job.state : ''}` : job.locationText || 'Guwahati, Assam')

  const minSal = job.salaryMin ?? job.minSalary
  const maxSal = job.salaryMax ?? job.maxSalary
  const currency = job.salaryCurrency || job.currency || 'INR'
  const isMonthlySalary = (job.salaryPeriod || 'MONTHLY').toUpperCase() === 'MONTHLY'

  const salaryDisplayText = (() => {
    if (job.showSalary === false) return null
    if (!minSal && !maxSal) return null
    if (minSal && maxSal) {
      if (isMonthlySalary) {
        return `₹ ${minSal.toLocaleString('en-IN')} - ${maxSal.toLocaleString('en-IN')}/mo`
      }
      return formatSalary(minSal, maxSal, currency)
    }
    if (minSal) {
      return isMonthlySalary ? `From ₹ ${minSal.toLocaleString('en-IN')}/mo` : `From ₹ ${minSal.toLocaleString('en-IN')}/yr`
    }
    if (maxSal) {
      return isMonthlySalary ? `Up to ₹ ${maxSal.toLocaleString('en-IN')}/mo` : `Up to ₹ ${maxSal.toLocaleString('en-IN')}/yr`
    }
    return null
  })()

  const minExp = job.experienceMin ?? job.minExperience
  const maxExp = job.experienceMax ?? job.maxExperience
  const expDisplayText = formatExperience(minExp, maxExp)

  const educationText = job.education || (job as any).educationLevel || (job as any).highestDegree
  const skillsList = (job.skills && job.skills.length > 0)
    ? job.skills
    : (job.jobSkills && job.jobSkills.length > 0)
    ? job.jobSkills.map((js: any) => js.skill?.name || js.skill || js)
    : []

  return (
    <>
      <SEOMeta
        title={`${job.title} at ${job.company?.name || 'Career Wings'}`}
        description={`${job.title} job in ${locationDisplay}. ${job.company?.name || 'Career Wings'} is hiring. Apply now on Career Wings.`}
        canonical={`/jobs/${slug}`}
        noindex={isExpired}
      />
      <JobSchema job={job} />
      <Header />

      <main className="bg-gray-50 min-h-screen">
        {/* Back button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main */}
            <div className="lg:col-span-2 space-y-4">
              {/* Header card */}
              <Card className="p-6">
                {isExpired && (
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      <strong>Notice:</strong> This job vacancy has expired or is no longer accepting new applications.
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <CompanyAvatar
                    logo={job.company?.logo}
                    name={job.company?.name || ''}
                    size="xl"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h1 className="font-display text-xl md:text-2xl font-bold text-primary-900">
                          {job.title}
                        </h1>
                        <Link
                          to={`/companies/${job.company?.slug}`}
                          className="text-accent-600 hover:text-accent-700 font-medium text-sm mt-1 inline-block"
                        >
                          {job.company?.name}
                        </Link>
                      </div>
                      {job.isFeatured && (
                        <Badge variant="accent">
                          <Star className="h-3 w-3 fill-current" />
                          Featured
                        </Badge>
                      )}
                    </div>

                    {/* Quick info */}
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {locationDisplay}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        {formatJobType(job.jobType)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatRelativeTime(job.createdAt || new Date().toISOString())}
                      </span>
                      {salaryDisplayText && (
                        <span className="flex items-center gap-1 text-green-700 font-medium">
                          <DollarSign className="h-4 w-4" />
                          {salaryDisplayText}
                        </span>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="default">{formatWorkMode(job.workMode)}</Badge>
                      {job.vacancies && (
                        <Badge variant="info">
                          <Users className="h-3 w-3" />
                          {job.vacancies} Vacancies
                        </Badge>
                      )}
                      {job.applicationDeadline && (
                        <Badge variant="warning">
                          <Calendar className="h-3 w-3" />
                          Apply by {formatDate(job.applicationDeadline)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop actions */}
                <div className="hidden md:flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
                  {isExpired ? (
                    <Button
                      variant="outline"
                      size="lg"
                      disabled
                      className="opacity-60 cursor-not-allowed text-xs font-semibold"
                    >
                      Applications Closed
                    </Button>
                  ) : isApplied ? (
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold shadow-2xs">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Application Submitted
                    </span>
                  ) : isAppLimitReached ? (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        disabled
                        className="opacity-70 cursor-not-allowed text-xs font-bold border-amber-300 bg-amber-50 text-amber-900"
                        title={`Your application limit has been reached (${appUsed} / ${appLimit}). Upgrade your package to apply for more jobs.`}
                      >
                        Application Limit Reached ({appUsed} / {appLimit})
                      </Button>
                      <Link
                        to="/subscription"
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-orange-500" />
                        Upgrade Package to Apply
                      </Link>
                    </div>
                  ) : isCandidate ? (
                    <Button
                      variant="primary"
                      size="lg"
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-6 py-2.5 shadow-xs"
                      leftIcon={<Send className="h-4 w-4" />}
                      onClick={() => setShowApplyModal(true)}
                    >
                      Apply Now
                    </Button>
                  ) : !isAuthenticated ? (
                    <Link to={`/login?redirect=${encodeURIComponent(`/jobs/${slug}`)}`}>
                      <Button variant="primary" size="lg" className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-6 py-2.5 shadow-xs" leftIcon={<Send className="h-4 w-4" />}>
                        Apply Now (Login)
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm px-6 py-2.5 shadow-xs"
                      onClick={() => toast.error('Please switch to a Job Seeker account to apply.')}
                      leftIcon={<Send className="h-4 w-4" />}
                    >
                      Apply Now
                    </Button>
                  )}
                  {isCandidate && (
                    <Button
                      variant="outline"
                      size="lg"
                      leftIcon={<Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current text-accent-500' : ''}`} />}
                      onClick={() => saveMutation.mutate()}
                      loading={saveMutation.isPending}
                    >
                      {isSaved ? 'Saved' : 'Save Job'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>

              {/* Description */}
              <Card className="p-6">
                <h2 className="font-display font-bold text-lg text-primary-900 mb-4">
                  Job Description
                </h2>
                <div
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </Card>

              {job.responsibilities && (
                <Card className="p-6">
                  <h2 className="font-display font-bold text-lg text-primary-900 mb-4">
                    Responsibilities
                  </h2>
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: job.responsibilities }}
                  />
                </Card>
              )}

              {job.requirements && (
                <Card className="p-6">
                  <h2 className="font-display font-bold text-lg text-primary-900 mb-4">
                    Requirements
                  </h2>
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: job.requirements }}
                  />
                </Card>
              )}

              {job.benefits && (
                <Card className="p-6">
                  <h2 className="font-display font-bold text-lg text-primary-900 mb-4">
                    Benefits
                  </h2>
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: job.benefits }}
                  />
                </Card>
              )}

              {/* Skills */}
              {skillsList.length > 0 && (
                <Card className="p-6">
                  <h2 className="font-display font-bold text-lg text-primary-900 mb-4">
                    Required Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill: any, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-primary-50 text-primary-800 rounded-full text-sm font-medium border border-primary-100"
                      >
                        {typeof skill === 'string' ? skill : skill.name || String(skill)}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Similar Jobs */}
              {similarJobs.length > 0 && (
                <div>
                  <h2 className="font-display font-bold text-lg text-primary-900 mb-4">
                    Similar Jobs
                  </h2>
                  <div className="space-y-3">
                    {similarJobs.slice(0, 4).map((j) => (
                      <JobCard key={j.id || j._id} job={j} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Job overview */}
              <Card className="p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Job Overview</h3>
                <dl className="space-y-3">
                  {[
                    { label: 'Job Type', value: formatJobType(job.jobType), icon: Briefcase },
                    { label: 'Work Mode', value: formatWorkMode(job.workMode), icon: MapPin },
                    { label: 'Experience', value: expDisplayText, icon: GraduationCap },
                    { label: 'Location', value: locationDisplay, icon: MapPin },
                    ...(salaryDisplayText ? [{ label: 'Salary', value: salaryDisplayText, icon: DollarSign }] : []),
                    ...(job.vacancies ? [{ label: 'Vacancies', value: String(job.vacancies), icon: Users }] : []),
                    ...(job.applicationDeadline ? [{ label: 'Deadline', value: formatDate(job.applicationDeadline), icon: Calendar }] : []),
                    ...(educationText ? [{ label: 'Education', value: educationText, icon: GraduationCap }] : []),
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="h-8 w-8 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">{label}</dt>
                        <dd className="text-sm font-medium text-gray-900">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>

                {/* Sidebar Apply CTA */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  {isExpired ? (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold text-center">
                      Applications Closed
                    </div>
                  ) : isApplied ? (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-2xs">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Already Applied</span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2"
                      onClick={() => {
                        if (!isAuthenticated) {
                          navigate(`/login?redirect=${encodeURIComponent(`/jobs/${slug}`)}`)
                        } else if (!isCandidate) {
                          toast.error('Please log in with a Job Seeker account to apply.')
                        } else {
                          setShowApplyModal(true)
                        }
                      }}
                    >
                      <Send className="h-4 w-4" />
                      <span>Apply for this Job</span>
                    </Button>
                  )}
                </div>
              </Card>

              {/* Company info */}
              {job.company && (
                <Card className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">About Company</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <CompanyAvatar logo={job.company.logo} name={job.company.name} size="md" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{job.company.name}</p>
                      {job.company.industry && (
                        <p className="text-xs text-gray-500">{job.company.industry}</p>
                      )}
                    </div>
                  </div>
                  {job.company.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                      {job.company.description}
                    </p>
                  )}
                  <Link to={`/companies/${job.company.slug}`}>
                    <Button variant="outline" size="sm" className="w-full" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                      View Company
                    </Button>
                  </Link>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Mobile sticky apply bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center gap-3 safe-bottom z-30 shadow-lg">
          {isCandidate && (
            <Button
              variant="outline"
              size="md"
              className="shrink-0"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current text-accent-500' : ''}`} />
              <span className="hidden xs:inline">{isSaved ? 'Saved' : 'Save'}</span>
            </Button>
          )}
          {isExpired ? (
            <div className="flex-1 py-2.5 text-xs font-bold text-center text-slate-500 bg-slate-100 rounded-xl border border-slate-200">
              Applications Closed
            </div>
          ) : isApplied ? (
            <div className="flex-1 py-2.5 text-xs font-bold text-center text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Application Submitted</span>
            </div>
          ) : isAppLimitReached ? (
            <Link
              to="/subscription"
              className="flex-1 py-2.5 text-xs font-bold text-center text-amber-900 bg-amber-100/90 rounded-xl border border-amber-300 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
              <span>Limit Reached — Upgrade to Apply</span>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate(`/login?redirect=${encodeURIComponent(`/jobs/${slug}`)}`)
                } else if (!isCandidate) {
                  toast.error('Please switch to a Job Seeker account to apply.')
                } else {
                  setShowApplyModal(true)
                }
              }}
            >
              <Send className="h-4 w-4 mr-1" />
              <span>Apply Now</span>
            </Button>
          )}
        </div>
      </main>

      <Footer />

      <ApplyModal
        job={job}
        open={showApplyModal}
        onClose={() => setShowApplyModal(false)}
      />
    </>
  )
}

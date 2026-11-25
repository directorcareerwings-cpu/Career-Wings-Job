import React from 'react'
import { Helmet } from 'react-helmet-async'
import type { Job } from '@/types'

interface JobSchemaProps {
  job: Job
}

const SITE_URL = 'https://careerwings.in'

/**
 * Maps database employment types to standard Schema.org values
 */
function mapEmploymentType(type?: string): string {
  if (!type) return 'FULL_TIME'
  const normalized = type.toUpperCase().replace(/[-\s]/g, '_')
  switch (normalized) {
    case 'FULL_TIME':
    case 'FULLTIME':
      return 'FULL_TIME'
    case 'PART_TIME':
    case 'PARTTIME':
      return 'PART_TIME'
    case 'CONTRACT':
    case 'CONTRACTOR':
      return 'CONTRACTOR'
    case 'FREELANCE':
      return 'CONTRACTOR'
    case 'INTERNSHIP':
    case 'INTERN':
      return 'INTERN'
    case 'TEMPORARY':
    case 'TEMP':
      return 'TEMPORARY'
    case 'VOLUNTEER':
      return 'VOLUNTEER'
    case 'PER_DIEM':
      return 'PER_DIEM'
    default:
      return 'OTHER'
  }
}

function mapSalaryUnitText(period?: string): string {
  const p = (period || 'MONTHLY').toUpperCase()
  if (p === 'YEARLY' || p === 'ANNUAL' || p === 'ANNUALLY') return 'YEAR'
  if (p === 'HOURLY') return 'HOUR'
  if (p === 'WEEKLY') return 'WEEK'
  if (p === 'DAILY') return 'DAY'
  return 'MONTH'
}

/**
 * Strips unsafe tags and ensures valid HTML paragraphs for JobPosting.description
 */
function formatHtmlBlock(htmlOrText?: string): string {
  if (!htmlOrText) return ''
  let cleaned = htmlOrText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .trim()

  if (!cleaned) return ''
  if (!/<(p|div|ul|ol|li|br|h[1-6])\b/i.test(cleaned)) {
    cleaned = cleaned
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('')
  }
  return cleaned
}

function buildFullJobHtmlDescription(job: Job): string {
  const parts: string[] = []
  const mainDesc = formatHtmlBlock(job.description)
  if (mainDesc) parts.push(mainDesc)

  const responsibilities = formatHtmlBlock(job.responsibilities)
  if (responsibilities) parts.push(`<p><strong>Responsibilities:</strong></p>${responsibilities}`)

  const requirements = formatHtmlBlock(job.requirements)
  if (requirements) parts.push(`<p><strong>Requirements:</strong></p>${requirements}`)

  const benefits = formatHtmlBlock(job.benefits)
  if (benefits) parts.push(`<p><strong>Benefits:</strong></p>${benefits}`)

  return parts.join('') || '<p>Full job details and online application available on Career Wings.</p>'
}

export default function JobSchema({ job }: JobSchemaProps) {
  const anyJob = job as any
  const isExpired =
    job.status === 'EXPIRED' ||
    job.status === 'CLOSED' ||
    Boolean(job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now()) ||
    Boolean(anyJob.expiresAt && new Date(anyJob.expiresAt).getTime() < Date.now())

  const jobUrl = `${SITE_URL}/jobs/${job.slug}`

  // Always generate Breadcrumbs
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Jobs',
        item: `${SITE_URL}/jobs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: job.title,
        item: jobUrl,
      },
    ],
  }

  // Do not emit active JobPosting schema for closed/expired listings
  if (isExpired) {
    return (
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(breadcrumbsSchema)}</script>
      </Helmet>
    )
  }

  const rawDatePosted = job.publishedAt || job.createdAt || new Date().toISOString()
  const datePosted = new Date(rawDatePosted).toISOString()

  const rawValidThrough =
    job.applicationDeadline ||
    anyJob.expiresAt ||
    new Date(new Date(datePosted).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
  const validThrough = new Date(rawValidThrough).toISOString()

  const companyName = job.company?.name || 'Career Wings Employer'
  const companyProfileUrl = job.company?.slug ? `${SITE_URL}/companies/${job.company.slug}` : SITE_URL
  const hiringOrg: any = {
    '@type': 'Organization',
    name: companyName,
    sameAs: job.company?.website || companyProfileUrl,
    logo: job.company?.logo
      ? (job.company.logo.startsWith('http') ? job.company.logo : `${SITE_URL}${job.company.logo}`)
      : `${SITE_URL}/images/logo.png`,
  }

  const workMode = (job.workMode || '').toUpperCase()
  const isRemote = workMode === 'REMOTE'
  const isHybrid = workMode === 'HYBRID'
  const locality =
    job.city ||
    (typeof job.location === 'string' ? job.location : job.location?.city) ||
    'Guwahati'
  const region =
    job.state ||
    (typeof job.location === 'object' ? job.location?.state : null) ||
    'Assam'
  const streetAddress = anyJob.locationText || `${locality}, ${region}, India`

  const jobPostingSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: buildFullJobHtmlDescription(job),
    identifier: {
      '@type': 'PropertyValue',
      name: 'Career Wings',
      value: String(job.id || job._id || job.slug),
    },
    datePosted,
    validThrough,
    employmentType: mapEmploymentType(job.jobType),
    hiringOrganization: hiringOrg,
    url: jobUrl,
  }

  if (job.category?.name) {
    jobPostingSchema.occupationalCategory = job.category.name
  }

  if (isRemote) {
    jobPostingSchema.jobLocationType = 'TELECOMMUTE'
    jobPostingSchema.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'India',
    }
  } else {
    jobPostingSchema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress,
        addressLocality: locality,
        addressRegion: region,
        addressCountry: 'IN',
      },
    }
    if (isHybrid) {
      jobPostingSchema.jobLocationType = 'TELECOMMUTE'
      jobPostingSchema.applicantLocationRequirements = {
        '@type': 'Country',
        name: 'India',
      }
    }
  }

  const minSal = Number(job.salaryMin ?? job.minSalary ?? 0)
  const maxSal = Number(job.salaryMax ?? job.maxSalary ?? 0)
  if (job.showSalary !== false && (minSal > 0 || maxSal > 0)) {
    const min = minSal > 0 ? minSal : maxSal
    const max = maxSal > 0 ? maxSal : minSal
    const unitText = mapSalaryUnitText(job.salaryPeriod)

    const quantValue: any = {
      '@type': 'QuantitativeValue',
      unitText,
    }
    if (min === max) {
      quantValue.value = min
    } else {
      quantValue.minValue = Math.min(min, max)
      quantValue.maxValue = Math.max(min, max)
    }

    jobPostingSchema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salaryCurrency || job.currency || 'INR',
      value: quantValue,
    }
  }

  jobPostingSchema.directApply = job.applicationMethod === 'PORTAL' || !job.applicationUrl

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jobPostingSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbsSchema)}</script>
    </Helmet>
  )
}

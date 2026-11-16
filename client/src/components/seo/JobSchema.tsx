import React from 'react'
import { Helmet } from 'react-helmet-async'
import type { Job } from '@/types'

interface JobSchemaProps {
  job: Job
}

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

/**
 * Strips dangerous HTML tags and cleans description for JSON-LD compliance
 */
function cleanDescription(htmlOrText?: string): string {
  if (!htmlOrText) return ''
  return htmlOrText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .trim()
}

export default function JobSchema({ job }: JobSchemaProps) {
  const isExpired =
    job.status === 'EXPIRED' ||
    job.status === 'CLOSED' ||
    (job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now())

  const siteUrl = 'https://careerwings.in'
  const jobUrl = `${siteUrl}/jobs/${job.slug}`

  // Always generate Breadcrumbs
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${siteUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Jobs',
        item: `${siteUrl}/jobs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: job.title,
        item: jobUrl,
      },
    ],
  }

  // If expired or closed, do not emit active JobPosting schema to comply with Google safety guidelines
  if (isExpired) {
    return (
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(breadcrumbsSchema)}</script>
      </Helmet>
    )
  }

  // Calculate validThrough (expiry date or 60 days default)
  const defaultValidThrough =
    job.applicationDeadline ||
    new Date(new Date(job.createdAt || Date.now()).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()

  // Hiring organization details from database
  const companyName = job.company?.name || 'Career Wings Employer'
  const hiringOrg: any = {
    '@type': 'Organization',
    name: companyName,
  }
  if (job.company?.website) {
    hiringOrg.sameAs = job.company.website
  }
  if (job.company?.logo) {
    hiringOrg.logo = job.company.logo.startsWith('http')
      ? job.company.logo
      : `${siteUrl}${job.company.logo}`
  }

  const isRemote = (job.workMode || '').toUpperCase() === 'REMOTE'
  const locality =
    job.city ||
    (typeof job.location === 'string' ? job.location : job.location?.city) ||
    'Guwahati'
  const region =
    job.state ||
    (typeof job.location === 'object' ? job.location?.state : null) ||
    'Assam'

  const jobPostingSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: cleanDescription(job.description),
    identifier: {
      '@type': 'PropertyValue',
      name: 'Career Wings',
      value: (job.id || job._id || job.slug).toString(),
    },
    datePosted: job.publishedAt || job.createdAt || new Date().toISOString(),
    validThrough: defaultValidThrough,
    employmentType: mapEmploymentType(job.jobType),
    hiringOrganization: hiringOrg,
    url: jobUrl,
  }

  // Remote vs Location-based
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
        addressLocality: locality,
        addressRegion: region,
        addressCountry: 'IN',
      },
    }
  }

  // Salary information (only when showSalary !== false and real figures exist)
  const minSal = job.salaryMin || job.minSalary
  const maxSal = job.salaryMax || job.maxSalary
  if (job.showSalary !== false && (minSal || maxSal)) {
    const min = minSal || maxSal || 0
    const max = maxSal || minSal || min
    const period = (job.salaryPeriod || 'MONTHLY').toUpperCase()
    const unitText = period === 'YEARLY' ? 'YEAR' : period === 'HOURLY' ? 'HOUR' : 'MONTH'

    const quantValue: any = {
      '@type': 'QuantitativeValue',
      unitText,
    }
    if (min === max) {
      quantValue.value = min
    } else {
      quantValue.minValue = min
      quantValue.maxValue = max
    }

    jobPostingSchema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salaryCurrency || job.currency || 'INR',
      value: quantValue,
    }
  }

  // Direct Apply (PORTAL application)
  if (job.applicationMethod === 'PORTAL' || !job.applicationUrl) {
    jobPostingSchema.directApply = true
  } else {
    jobPostingSchema.directApply = false
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jobPostingSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbsSchema)}</script>
    </Helmet>
  )
}

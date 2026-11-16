import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSalary(min?: number, max?: number, currency = 'INR'): string {
  if (!min && !max) return 'Salary not disclosed'
  const symbol = currency === 'INR' ? '₹' : '$'
  const fmt = (n: number) => {
    if (n >= 100000) return `${symbol}${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    if (n >= 1000) return `${symbol}${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
    return `${symbol}${n}`
  }
  if (min && max) return `${fmt(min)} – ${fmt(max)}/yr`
  if (min) return `From ${fmt(min)}/yr`
  if (max) return `Up to ${fmt(max)}/yr`
  return 'Not disclosed'
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt)
  } catch {
    return ''
  }
}

export function formatRelativeTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return ''
  }
}

export function formatExperience(min?: number, max?: number): string {
  if (min === undefined && max === undefined) return 'Any experience'
  if (min === 0 && max === 0) return 'Fresher'
  if (min !== undefined && max !== undefined) return `${min}–${max} yrs`
  if (min !== undefined) return `${min}+ yrs`
  if (max !== undefined) return `Up to ${max} yrs`
  return ''
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function formatJobType(type: string): string {
  if (!type) return ''
  const key = String(type).toLowerCase()
  const map: Record<string, string> = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    internship: 'Internship',
    freelance: 'Freelance',
  }
  return map[key] || capitalize(key.replace(/_/g, ' '))
}

export function formatWorkMode(mode: string): string {
  if (!mode) return ''
  const key = String(mode).toLowerCase()
  const map: Record<string, string> = {
    on_site: 'On-site',
    remote: 'Remote',
    hybrid: 'Hybrid',
  }
  return map[key] || capitalize(key.replace(/_/g, ' '))
}

export function formatApplicationStatus(status: string): string {
  const map: Record<string, string> = {
    applied: 'Applied',
    viewed: 'Viewed',
    shortlisted: 'Shortlisted',
    interview: 'Interview',
    selected: 'Selected',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  }
  return map[status] || status
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    shortlisted: 'bg-yellow-100 text-yellow-700',
    interview: 'bg-orange-100 text-orange-700',
    selected: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    withdrawn: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    published: 'bg-green-100 text-green-700',
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    paused: 'bg-orange-100 text-orange-700',
    closed: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-blue-100 text-blue-700',
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

export function buildQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      if (Array.isArray(v)) {
        v.forEach((item) => qs.append(k, String(item)))
      } else {
        qs.set(k, String(v))
      }
    }
  })
  return qs.toString()
}

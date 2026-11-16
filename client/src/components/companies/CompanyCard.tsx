import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Briefcase } from 'lucide-react'
import { CompanyAvatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Company } from '@/types'

interface CompanyCardProps {
  company: Company
}

export default function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link to={`/companies/${company.slug}`}>
      <div className="bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 p-5">
        <div className="flex items-start gap-4">
          <CompanyAvatar
            logo={company.logo}
            name={company.name}
            size="lg"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{company.name}</h3>
              {company.isVerified && (
                <Badge variant="success" size="sm">Verified</Badge>
              )}
            </div>
            {company.industry && (
              <p className="text-xs text-gray-500 mt-0.5">{company.industry}</p>
            )}
            {company.headquarters && (
              <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <MapPin className="h-3 w-3" />
                {company.headquarters}
              </p>
            )}
            <div className="flex items-center gap-1 mt-2">
              <Briefcase className="h-3.5 w-3.5 text-accent-500" />
              <span className="text-xs font-medium text-accent-600">
                {company.totalJobs ?? 0} open job{(company.totalJobs ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

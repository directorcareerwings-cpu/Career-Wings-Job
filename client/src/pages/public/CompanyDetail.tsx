import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { companiesAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import JobCard from '@/components/jobs/JobCard'
import { Building2, MapPin, Globe, Mail, Phone, Users, Calendar, CheckCircle, Briefcase } from 'lucide-react'
import { Company, Job } from '@/types'

export default function CompanyDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      if (!slug) return
      setLoading(true)
      try {
        const res = await companiesAPI.getBySlug(slug)
        setCompany(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 animate-pulse space-y-6">
          <div className="h-48 bg-white rounded-2xl" />
          <div className="h-96 bg-white rounded-2xl" />
        </div>
        <Footer />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Building2 className="w-16 h-16 text-slate-300 mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Company Not Found</h2>
          <p className="text-slate-500 mt-1 mb-6">The company profile you are looking for does not exist or has been removed.</p>
          <Link to="/companies" className="btn-primary">Browse Companies</Link>
        </div>
        <Footer />
      </div>
    )
  }

  const jobs = company.jobs || []

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title={`${company.name} Careers & Job Vacancies | Career Wings`}
        description={`Explore open job vacancies at ${company.name} in Guwahati & Northeast India. Apply directly on Career Wings.`}
      />
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Company Header Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200 overflow-hidden">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="w-full h-full object-contain p-2" />
              ) : (
                <Building2 className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{company.name}</h1>
                {company.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500 mt-2">
                {company.industry && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    {company.industry}
                  </span>
                )}
                {company.headquarters && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {company.headquarters}
                  </span>
                )}
                {company.companySize && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    {company.companySize} employees
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-orange-600 hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {company.description && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">About Company</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{company.description}</p>
            </div>
          )}
        </div>

        {/* Active Jobs Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Open Positions at {company.name} ({jobs.length})
            </h2>
          </div>

          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={{ ...job, company }} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No active job openings right now</p>
              <p className="text-sm mt-1">Check back later or browse other openings in Guwahati.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

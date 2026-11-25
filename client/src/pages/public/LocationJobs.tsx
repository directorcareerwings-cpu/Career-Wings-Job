import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { locationsAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import JobCard from '@/components/jobs/JobCard'
import { MapPin, ArrowLeft } from 'lucide-react'
import { Location, Job } from '@/types'

export default function LocationJobs() {
  const { slug } = useParams<{ slug: string }>()
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLocationJobs = async () => {
      if (!slug) return
      setLoading(true)
      try {
        const res = await locationsAPI.getBySlug(slug)
        setLocation(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLocationJobs()
  }, [slug])

  const jobs = location?.jobs || []
  const canonicalPath =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/jobs-in-')
      ? window.location.pathname
      : slug
      ? `/locations/${slug}`
      : '/locations'
  const locationSchema = location
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://careerwings.in/' },
          { '@type': 'ListItem', position: 2, name: 'Locations', item: 'https://careerwings.in/locations' },
          { '@type': 'ListItem', position: 3, name: `${location.city}, ${location.state}`, item: `https://careerwings.in${canonicalPath}` },
        ],
      }
    : undefined

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title={`Jobs in ${location?.city || 'Assam'}, ${location?.state || 'Northeast India'} | Career Wings`}
        description={`Explore verified job vacancies in ${location?.city || 'Guwahati'}, ${location?.state || 'Assam'}. Direct recruitment, zero placement fees on Career Wings.`}
        canonical={canonicalPath}
        schema={locationSchema}
      />
      <Header />

      <section className="bg-slate-900 text-white py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <Link to="/locations" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> All Locations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Jobs in {location?.city}, {location?.state}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {jobs.length} verified job opening{jobs.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse" />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-lg mx-auto">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No active jobs in {location?.city}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Check back soon or explore openings in nearby cities.
            </p>
            <Link to="/jobs" className="btn-primary">View All Jobs</Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

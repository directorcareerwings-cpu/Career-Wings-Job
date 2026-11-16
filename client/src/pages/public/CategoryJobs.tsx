import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { categoriesAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import JobCard from '@/components/jobs/JobCard'
import { Folder, ArrowLeft } from 'lucide-react'
import { Category, Job } from '@/types'

export default function CategoryJobs() {
  const { slug } = useParams<{ slug: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategoryJobs = async () => {
      if (!slug) return
      setLoading(true)
      try {
        const res = await categoriesAPI.getBySlug(slug)
        setCategory(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCategoryJobs()
  }, [slug])

  const jobs = category?.jobs || []

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title={`${category?.name || 'Category'} Jobs in Guwahati & Northeast | Career Wings`}
        description={`Find verified ${category?.name} jobs in Guwahati, Assam & Pan-India on Career Wings.`}
      />
      <Header />

      <section className="bg-slate-900 text-white py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <Link to="/categories" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> All Categories
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {category?.name || 'Category Jobs'}
          </h1>
          {category?.description && (
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">{category.description}</p>
          )}
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
            <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No jobs currently listed in this category</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Be the first to know when new openings are published.
            </p>
            <Link to="/jobs" className="btn-primary">Browse All Jobs</Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

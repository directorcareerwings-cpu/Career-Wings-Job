import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { companiesAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import CompanyCard from '@/components/companies/CompanyCard'
import { Search, Building2, MapPin, Briefcase } from 'lucide-react'
import { Company } from '@/types'

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('')

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true)
      try {
        const res = await companiesAPI.getAll({ q: query, industry })
        setCompanies(res.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(fetchCompanies, 300)
    return () => clearTimeout(timer)
  }, [query, industry])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title="Top Hiring Companies in Guwahati & Northeast | Career Wings"
        description="Browse top verified employers, IT firms, hospitals, and MNCs hiring in Guwahati, Assam and across Northeast India."
        canonical="/companies"
      />
      <Header />

      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Top Hiring Companies in Northeast India
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto mb-8">
            Connect with verified organizations, corporations, and startups in Assam actively recruiting on Career Wings.
          </p>

          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search company name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none"
              />
            </div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="py-2.5 px-4 rounded-xl bg-white text-slate-900 text-sm focus:outline-none"
            >
              <option value="">All Industries</option>
              <option value="IT & Software Development">IT & Software</option>
              <option value="Healthcare & Hospital">Healthcare</option>
              <option value="Civil & Construction EPC">Civil & EPC</option>
              <option value="Banking & Financial Services">Banking</option>
              <option value="Human Resources & Staffing">Staffing</option>
            </select>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-48" />
            ))}
          </div>
        ) : companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 p-8 max-w-lg mx-auto">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No companies found</h3>
            <p className="text-sm text-slate-500 mt-1">Try clearing your search terms or filters.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

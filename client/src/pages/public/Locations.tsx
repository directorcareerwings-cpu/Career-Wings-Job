import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { locationsAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { MapPin, ArrowRight } from 'lucide-react'
import { Location } from '@/types'

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLocs = async () => {
      try {
        const res = await locationsAPI.getAll()
        setLocations(res.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLocs()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title="Jobs by City & Location in Assam & Northeast | Career Wings"
        description="Search job vacancies by location: Guwahati, Dibrugarh, Silchar, Jorhat, Shillong, Dimapur, Kolkata and more on Career Wings."
      />
      <Header />

      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Jobs by Location in Northeast India
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            Find jobs near your home in Guwahati, across Assam, and all 8 northeastern states.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {locations.map((loc) => (
              <Link
                key={loc.id}
                to={`/locations/${loc.slug}`}
                className="group bg-white rounded-xl p-5 border border-slate-100 hover:border-orange-500/30 hover:shadow-lg transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition text-sm">
                      {loc.city}
                    </h3>
                    <p className="text-xs text-slate-400">{loc.state}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {loc._count?.jobs ?? 0} jobs
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

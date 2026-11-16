import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { categoriesAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Code, Briefcase, Activity, TrendingUp, HardHat, GraduationCap,
  Users, ShoppingBag, Truck, Coffee, ArrowRight, Folder
} from 'lucide-react'
import { Category } from '@/types'

const iconMap: Record<string, React.ReactNode> = {
  Code: <Code className="w-6 h-6 text-blue-500" />,
  Briefcase: <Briefcase className="w-6 h-6 text-indigo-500" />,
  Activity: <Activity className="w-6 h-6 text-red-500" />,
  TrendingUp: <TrendingUp className="w-6 h-6 text-emerald-500" />,
  HardHat: <HardHat className="w-6 h-6 text-amber-500" />,
  GraduationCap: <GraduationCap className="w-6 h-6 text-purple-500" />,
  Users: <Users className="w-6 h-6 text-cyan-500" />,
  ShoppingBag: <ShoppingBag className="w-6 h-6 text-pink-500" />,
  Truck: <Truck className="w-6 h-6 text-orange-500" />,
  Coffee: <Coffee className="w-6 h-6 text-rose-500" />,
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await categoriesAPI.getAll()
        setCategories(res.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchCats()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title="Explore Job Categories in Guwahati & Northeast | Career Wings"
        description="Browse jobs by industry & category: IT, Banking, Healthcare, Civil Construction, Sales, and Teaching in Assam."
      />
      <Header />

      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Browse Jobs by Industry & Role
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            Find the right job matching your exact qualification and domain across Northeast India.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-36" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.slug}`}
                className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5 transition flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                  {cat.icon && iconMap[cat.icon] ? iconMap[cat.icon] : <Folder className="w-6 h-6 text-slate-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition flex items-center justify-between">
                    <span>{cat.name}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition" />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description || 'Verified job opportunities'}</p>
                  <span className="inline-block mt-3 text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                    {cat._count?.jobs ? `${cat._count.jobs} Openings` : 'Explore Jobs'}
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

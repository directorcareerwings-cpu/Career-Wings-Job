import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { publicAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { useAuthStore } from '@/stores/auth.store'
import { Check, Zap, Building2, User, HelpCircle, ArrowRight } from 'lucide-react'
import { Package } from '@/types'
import toast from 'react-hot-toast'

export default function Pricing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()

  const roleParam = searchParams.get('role') || searchParams.get('type')
  const initialTab =
    roleParam?.toUpperCase() === 'CANDIDATE' || user?.role === 'CANDIDATE'
      ? 'CANDIDATE'
      : 'EMPLOYER'

  const [tab, setTab] = useState<'CANDIDATE' | 'EMPLOYER'>(initialTab)
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (roleParam?.toUpperCase() === 'CANDIDATE' && tab !== 'CANDIDATE') {
      setTab('CANDIDATE')
    } else if (roleParam?.toUpperCase() === 'EMPLOYER' && tab !== 'EMPLOYER') {
      setTab('EMPLOYER')
    }
  }, [roleParam])

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true)
      try {
        const res = await publicAPI.getPackages(tab)
        const pkgs = (res.data.data || []) as Package[]
        // Strictly filter to ensure matching type
        setPackages(pkgs.filter((p) => String(p.type).toUpperCase() === tab))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPackages()
  }, [tab])

  const handleSelectPackage = (pkg: Package) => {
    if (!user) {
      navigate(`/login?redirect=/checkout?packageId=${pkg.id}`)
      return
    }
    const pkgType = String(pkg.type).toUpperCase()
    if (user.role === 'CANDIDATE' && pkgType === 'EMPLOYER') {
      toast.error('Employer packages are for company accounts. Please select a Candidate package.')
      setTab('CANDIDATE')
      return
    }
    if (user.role === 'EMPLOYER' && pkgType === 'CANDIDATE') {
      toast.error('Candidate packages are for job seekers. Please select an Employer package.')
      setTab('EMPLOYER')
      return
    }
    navigate(`/checkout?packageId=${pkg.id}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title="Subscription Plans & Packages | Career Wings"
        description="Affordable recruitment packages for employers and career boosters for job seekers. Transparent pricing in INR for Northeast India."
        canonical="/pricing"
      />
      <Header />

      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-orange-400 font-semibold text-xs tracking-widest uppercase mb-2 inline-block">
            Transparent Pricing
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Simple, Value-Driven Plans for Everyone
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Choose the package that aligns with your recruitment targets or career growth. Upgrade or cancel anytime.
          </p>

          {/* Toggle Switch */}
          <div className="inline-flex p-1.5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setTab('EMPLOYER')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition ${
                tab === 'EMPLOYER'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              For Employers / Recruiters
            </button>
            <button
              type="button"
              onClick={() => setTab('CANDIDATE')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition ${
                tab === 'CANDIDATE'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              For Job Seekers
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-pulse h-96" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {packages.map((pkg) => {
              const features: string[] = typeof pkg.features === 'string'
                ? JSON.parse(pkg.features || '[]')
                : (pkg.features || [])

              return (
                <div
                  key={pkg.id}
                  className={`relative bg-white rounded-3xl p-8 border transition flex flex-col justify-between ${
                    pkg.isFeatured
                      ? 'border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500'
                      : 'border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  {pkg.isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> Recommended
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
                    <p className="text-xs text-slate-500 min-h-[36px] mb-6">{pkg.description}</p>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-extrabold text-slate-900">
                        {pkg.price === 0 ? 'Free' : `₹${pkg.price.toLocaleString('en-IN')}`}
                      </span>
                      {pkg.price > 0 && (
                        <span className="text-xs font-medium text-slate-400">
                          / {pkg.durationDays} days
                        </span>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-6 mb-8 space-y-3.5">
                      {features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                          <div className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPackage(pkg)}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                      pkg.isFeatured
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {pkg.price === 0 ? 'Get Started' : 'Choose Plan'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'How does payment work for packages?',
                a: 'We support all major Indian payment methods via Razorpay: UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, and Net Banking. All transactions are 100% secure.',
              },
              {
                q: 'What happens when employer resume search credits expire?',
                a: 'Once your search credits are exhausted, you can renew your package or upgrade to a higher tier plan with larger database access limits.',
              },
              {
                q: 'Are candidate registrations completely free?',
                a: 'Yes, job seekers can register, search, and apply for jobs under our standard free plan. Booster plans offer priority ranking in recruiter search results.',
              },
              {
                q: 'Can I get a GST invoice for my corporate employer package?',
                a: 'Yes, full tax invoices with your company GSTIN and billing address are automatically generated and downloadable from your employer dashboard.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h4 className="font-semibold text-slate-900 text-base mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

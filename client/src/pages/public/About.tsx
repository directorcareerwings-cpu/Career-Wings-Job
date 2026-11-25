import React from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { CheckCircle2, Users, MapPin, Award, ShieldCheck, HeartHandshake } from 'lucide-react'

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title="About Career Wings | Guwahati's Leading Recruitment Agency & Job Portal"
        description="Learn about Career Wings - premier recruitment and placement agency connecting verified talent with employers across Northeast India."
        canonical="/about"
      />
      <Header />

      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-orange-400 font-semibold text-xs tracking-widest uppercase mb-2 inline-block">
            Empowering Careers Since 2017
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Connecting Northeast India's Best Talent with Top Employers
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Career Wings is Guwahati's premier job placement and recruitment consultancy. We bridge the gap between ambitious job seekers and verified companies with 100% transparency and zero registration fees.
          </p>
        </div>
      </section>

      {/* Mission & Values */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">100% Verified Jobs</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Every job posting and recruiter profile on Career Wings undergoes strict verification to ensure authentic, safe employment.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Northeast Focused</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Rooted in Guwahati, Assam, we specialize in understanding the regional employment landscape of Assam, Meghalaya, and all 8 NE states.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Zero Candidate Fees</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              We never charge any placement commission from job seekers. Register, apply, and get interviewed with complete peace of mind.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              Our Journey & Commitment
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">
              Established in Guwahati, Assam, Career Wings was founded with a singular mission: to provide the youth and professionals of Northeast India access to credible, quality career opportunities without exploitation.
            </p>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
              Over the years, we have placed thousands of candidates in leading corporations across IT, civil engineering, banking, healthcare, FMCG, and hospitality.
            </p>

            <ul className="space-y-3">
              {[
                'Over 15,000+ candidates registered on our portal',
                '500+ verified partner employers and recruiters',
                'Comprehensive database search with advanced AI filters',
                'Dedicated local office in Guwahati for personalized guidance',
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full md:w-80 bg-slate-900 text-white rounded-2xl p-8 text-center flex-shrink-0">
            <span className="text-3xl font-extrabold text-orange-400">7+ Years</span>
            <p className="text-xs uppercase tracking-wider text-slate-400 mt-1 mb-6">Of Recruitment Excellence</p>

            <div className="border-t border-slate-800 pt-6 space-y-4 text-left text-xs text-slate-300">
              <div>
                <strong className="block text-white text-sm">Head Office</strong>
                Zoo Road Tiniali, Hriday Ranjan Path, By Lane 6, House No 5, Guwahati, Assam 781003
              </div>
              <div>
                <strong className="block text-white text-sm">Phone</strong>
                +91-8876211864
              </div>
              <div>
                <strong className="block text-white text-sm">Email</strong>
                info@careerwings.in
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

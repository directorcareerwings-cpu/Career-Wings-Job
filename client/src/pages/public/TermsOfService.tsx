import React from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta title="Terms of Service | Career Wings" />
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm prose prose-slate max-w-none">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">Terms of Service</h1>
          <p className="text-sm text-slate-400 mb-8">Effective Date: September 2026</p>

          <p className="text-slate-600 leading-relaxed">
            By accessing or using Career Wings (careerwings.in), you acknowledge that you have read, understood, and agreed to be bound by the following terms and conditions.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">1. Candidate Terms</h3>
          <p className="text-slate-600 leading-relaxed">
            Job seekers agree to provide accurate, truthful academic credentials, work history, and contact details. Career Wings provides access to verified listings but does not guarantee employment or selection by third-party recruiters.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">2. Employer Terms</h3>
          <p className="text-slate-600 leading-relaxed">
            Employers must only post legitimate, lawful job vacancies. Any posting requiring upfront security deposits from candidates, multi-level marketing schemes, or fraudulent schemes is strictly prohibited and subject to immediate suspension and legal report.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">3. Packages & Usage Limits</h3>
          <p className="text-slate-600 leading-relaxed">
            Subscription credits (job postings, candidate views, and resume downloads) are bound by the package terms selected during checkout and expire at the end of the subscription validity period.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">4. Jurisdiction</h3>
          <p className="text-slate-600 leading-relaxed">
            These terms are governed in accordance with the laws of India, with exclusive jurisdiction in the courts of Guwahati, Assam.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

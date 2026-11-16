import React from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'

export default function RefundPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta title="Cancellation & Refund Policy | Career Wings" />
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm prose prose-slate max-w-none">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">Refund & Cancellation Policy</h1>
          <p className="text-sm text-slate-400 mb-8">Effective Date: September 2026</p>

          <p className="text-slate-600 leading-relaxed">
            Thank you for subscribing to Career Wings. We strive to provide transparent, high-value recruitment and career services.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">1. Subscriptions & Digital Packages</h3>
          <p className="text-slate-600 leading-relaxed">
            Due to the digital nature of recruitment credits (instant resume search access, database unlocks, job posting publication), payments made for candidate or employer booster packages are generally non-refundable once activated.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">2. Duplicate Transactions & Gateway Errors</h3>
          <p className="text-slate-600 leading-relaxed">
            If a payment was charged multiple times due to a network lag or bank error, the surplus amount will be refunded automatically to the original source method within 5–7 banking days upon verification.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">3. Claiming a Refund</h3>
          <p className="text-slate-600 leading-relaxed">
            To submit a transaction query, email <a href="mailto:info@careerwings.in" className="text-orange-600">info@careerwings.in</a> with your Order ID, invoice copy, and reason for grievance.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

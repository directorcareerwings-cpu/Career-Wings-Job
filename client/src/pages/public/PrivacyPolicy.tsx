import React from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta title="Privacy Policy | Career Wings" canonical="/privacy-policy" />
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-sm prose prose-slate max-w-none">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-sm text-slate-400 mb-8">Last Updated: September 2026</p>

          <p className="text-slate-600 leading-relaxed">
            Career Wings ("we", "our", or "us"), operating at <strong>careerwings.in</strong>, values and respects your personal privacy. This Privacy Policy details the policies and practices regarding the collection, storage, use, and disclosure of personal data when candidates and employers access our services.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">1. Information We Collect</h3>
          <p className="text-slate-600 leading-relaxed">
            • <strong>Candidate Data:</strong> Name, contact details, email address, resume, academic qualifications, employment records, skills, preferred work locations, and expected remuneration.
          </p>
          <p className="text-slate-600 leading-relaxed">
            • <strong>Employer & Corporate Data:</strong> Company name, registered address, GST identification, hiring executive details, job requirements, and verification documents.
          </p>
          <p className="text-slate-600 leading-relaxed">
            • <strong>Payment Information:</strong> Billing addresses and transaction records. We do not store raw debit/credit card numbers or UPI PINs on our servers; payments are processed securely via RBI-compliant gateway partners (Razorpay).
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">2. How We Use Your Data</h3>
          <p className="text-slate-600 leading-relaxed">
            We use collected data solely to deliver recruitment services: facilitating candidate job applications, assisting verified employers in locating qualified talent, generating automated job alerts, preventing fraudulent activities, and complying with statutory obligations.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">3. Resume Privacy & Security</h3>
          <p className="text-slate-600 leading-relaxed">
            Candidates maintain granular control over their profile visibility. When set to 'Private', personal contact details and resume downloads are restricted from general candidate searches.
          </p>

          <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">4. Contact Information</h3>
          <p className="text-slate-600 leading-relaxed">
            For privacy inquiries or data removal requests, contact our grievance officer at:
            <br />
            <strong>Career Wings</strong>
            <br />
            Zoo Road Tiniali, Hriday Ranjan Path, By Lane 6, House No 5, Guwahati, Assam 781003
            <br />
            Email: <a href="mailto:info@careerwings.in" className="text-orange-600">info@careerwings.in</a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

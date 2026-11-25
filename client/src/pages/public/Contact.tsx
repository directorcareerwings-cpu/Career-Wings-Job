import React, { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
      toast.success('Your message has been received! Our Guwahati office will get in touch shortly.')
    }, 800)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title="Contact Career Wings | Office in Guwahati, Assam"
        description="Get in touch with Career Wings recruitment team. Visit our Zoo Road Guwahati office or call +91-8876211864 for job inquiries and hiring solutions."
        canonical="/contact"
      />
      <Header />

      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Get in Touch with Us</h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Have questions about candidate placements or hiring talent in Assam? We are here to assist you.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Card */}
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Office Information</h2>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-sm">
                <strong className="block font-semibold text-slate-900 mb-0.5">Career Wings Guwahati</strong>
                <span className="text-slate-500 leading-relaxed">
                  Zoo Road Tiniali, Hriday Ranjan Path, By Lane 6, House No 5, Guwahati, Assam 781003
                </span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-sm">
                <strong className="block font-semibold text-slate-900 mb-0.5">Phone & Helpline</strong>
                <a href="tel:+918876211864" className="text-orange-600 hover:underline block font-medium">
                  +91 88762 11864
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-sm">
                <strong className="block font-semibold text-slate-900 mb-0.5">Email Inquiries</strong>
                <a href="mailto:info@careerwings.in" className="text-slate-600 hover:text-slate-900 block">
                  info@careerwings.in
                </a>
                <a href="mailto:hr.careerwings2017@gmail.com" className="text-slate-400 text-xs block mt-0.5">
                  hr.careerwings2017@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-sm">
                <strong className="block font-semibold text-slate-900 mb-0.5">Operating Hours</strong>
                <span className="text-slate-500 block">Monday – Saturday: 09:30 AM – 06:30 PM</span>
                <span className="text-slate-400 text-xs block">Sunday: Closed</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
            {sent ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent Successfully</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                  Thank you for reaching out to Career Wings. Our recruitment representative will contact you within 24 business hours.
                </p>
                <button
                  type="button"
                  onClick={() => { setSent(false); setFormData({ name: '', email: '', phone: '', subject: '', message: '' }) }}
                  className="btn-outline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Send Us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Candidate inquiry / Employer recruitment"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    {loading ? 'Sending...' : 'Submit Message'}
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

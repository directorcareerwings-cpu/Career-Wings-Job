import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Facebook, Linkedin, Twitter, Heart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { publicAPI } from '@/lib/api'
import { cn } from '@/lib/utils'

const footerLinks = {
  forCandidates: [
    { label: 'Browse Jobs', to: '/jobs' },
    { label: 'Companies', to: '/companies' },
    { label: 'Job Categories', to: '/categories' },
    { label: 'Jobs by Location', to: '/locations' },
    { label: 'Job Alerts', to: '/job-alerts' },
    { label: 'Candidate Plans', to: '/pricing' },
  ],
  forEmployers: [
    { label: 'Post a Job', to: '/employer/jobs/post' },
    { label: 'Search Resumes', to: '/employer/candidates' },
    { label: 'Employer Dashboard', to: '/employer/dashboard' },
    { label: 'Employer Plans', to: '/pricing' },
    { label: 'Analytics', to: '/employer/analytics' },
  ],
  company: [
    { label: 'About Us', to: '/about' },
    { label: 'Contact', to: '/contact' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Blog', to: '/blog' },
    { label: 'Terms of Service', to: '/terms-of-service' },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/privacy-policy' },
    { label: 'Terms of Service', to: '/terms-of-service' },
    { label: 'Refund Policy', to: '/refund-policy' },
  ],
}

export default function Footer() {
  const year = new Date().getFullYear()

  const { data: settingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => publicAPI.getSettings(),
  })
  const settings = settingsData?.data?.data
  const logoUrl = settings?.SITE_LOGO_URL || '/images/logo.png'
  const isCustomLogo = Boolean(settings?.SITE_LOGO_URL && settings.SITE_LOGO_URL !== '/images/logo.png')
  const showText = settings?.SHOW_LOGO_TEXT !== 'false'

  return (
    <footer className="bg-primary-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <img
                src={logoUrl}
                alt={settings?.SITE_NAME || 'Career Wings'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/logo.png'
                }}
                className={cn(
                  'object-contain transition-transform group-hover:scale-105',
                  isCustomLogo
                    ? 'h-10 w-auto max-w-[180px] bg-white/10 p-1 rounded-xl'
                    : 'h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm'
                )}
              />
              {showText && (
                <div className="flex flex-col leading-none">
                  <span className="font-display font-extrabold text-2xl text-white tracking-tight">
                    CAREER <span className="text-[#FF5252]">WINGS</span>
                  </span>
                  <span className="text-[10px] font-medium tracking-wider text-primary-300 uppercase mt-0.5">
                    {settings?.TAGLINE || 'Jobs Today • A Brighter Tomorrow'}
                  </span>
                </div>
              )}
            </Link>
            <p className="text-sm text-primary-200 leading-relaxed mb-4 max-w-xs">
              Northeast India's leading job portal connecting talented professionals with top employers across Assam, Meghalaya, Manipur, and beyond.
            </p>
            <div className="space-y-2 text-sm text-primary-300">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent-400 shrink-0" />
                <span>Guwahati, Assam — 781001</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent-400 shrink-0" />
                <a href="tel:+918876211864" className="hover:text-white transition-colors">
                  +91 88762 11864
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-400 shrink-0" />
                <a href="mailto:hello@careerwings.in" className="hover:text-white transition-colors">
                  hello@careerwings.in
                </a>
              </div>
            </div>

            {/* Social */}
            <div className="flex gap-3 mt-5">
              {[
                { icon: <Facebook className="h-4 w-4" />, href: '#', label: 'Facebook' },
                { icon: <Linkedin className="h-4 w-4" />, href: '#', label: 'LinkedIn' },
                { icon: <Twitter className="h-4 w-4" />, href: '#', label: 'Twitter' },
              ].map(({ icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="h-9 w-9 rounded-lg bg-primary-800 hover:bg-accent-500 flex items-center justify-center transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* For Candidates */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-300 mb-4">
              For Candidates
            </h3>
            <ul className="space-y-2">
              {footerLinks.forCandidates.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-primary-200 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Employers */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-300 mb-4">
              For Employers
            </h3>
            <ul className="space-y-2">
              {footerLinks.forEmployers.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-primary-200 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Legal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-300 mb-4">
              Company
            </h3>
            <ul className="space-y-2 mb-6">
              {footerLinks.company.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-primary-200 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-300 mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-primary-200 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* App download */}
        <div className="bg-primary-800 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white">Career Wings App — Coming Soon!</p>
            <p className="text-sm text-primary-300">Get job alerts on the go. Available soon on iOS & Android.</p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-primary-700 rounded-lg text-sm text-primary-300 cursor-not-allowed">
              App Store (Soon)
            </div>
            <div className="px-4 py-2 bg-primary-700 rounded-lg text-sm text-primary-300 cursor-not-allowed">
              Play Store (Soon)
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-800 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-primary-400">
          <p>© {year} Career Wings. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="h-3.5 w-3.5 text-accent-500 fill-accent-500" /> in Guwahati, India
          </p>
        </div>
      </div>
    </footer>
  )
}

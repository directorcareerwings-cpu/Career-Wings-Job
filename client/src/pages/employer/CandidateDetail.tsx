import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { User, MapPin, Briefcase, GraduationCap, Download, Bookmark, Phone, Mail, ArrowLeft, Award, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { Candidate } from '@/types'
import { downloadProfessionalCandidatePDF, getEnrichedCandidateSkills } from '@/lib/resumePdfBuilder'

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return
      try {
        const res = await employerAPI.getCandidateDetail(id)
        setCandidate(res.data.data)
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load candidate details')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id])

  const handleDownloadPDF = async () => {
    if (!candidate) return
    const c = candidate as any
    try {
      toast.loading(`Generating AI professional resume PDF for ${c.firstName}...`, { id: 'pdf-toast' })
      await downloadProfessionalCandidatePDF(c, Boolean(c.isUnlocked))
      toast.success(`Downloaded ${c.firstName}'s resume in PDF format!`, { id: 'pdf-toast' })
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF resume', { id: 'pdf-toast' })
    }
  }

  if (loading) {
    return (
      <EmployerLayout>
        <div className="max-w-4xl bg-white rounded-3xl p-8 border border-slate-100 animate-pulse h-96" />
      </EmployerLayout>
    )
  }

  if (!candidate) {
    return (
      <EmployerLayout>
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4">Candidate profile not found or restricted.</p>
          <Link to="/employer/candidates" className="btn-primary">Return to Search</Link>
        </div>
      </EmployerLayout>
    )
  }

  return (
    <EmployerLayout>
      <SEOMeta title={`${candidate.firstName} ${candidate.lastName} | Career Wings`} />

      <div className="max-w-4xl space-y-6">
        <Link
          to="/employer/candidates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Candidate Search
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 font-black text-2xl flex items-center justify-center flex-shrink-0">
                {candidate.firstName?.[0] || 'C'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {candidate.firstName} {candidate.lastName}
                </h1>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">{candidate.headline}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {candidate.currentLocation || 'Assam, India'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {(candidate as any).isUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    const rawPhone = (candidate as any).phone || (candidate as any).user?.phone || ''
                    const cleanPhone = rawPhone.replace(/[^0-9]/g, '')
                    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone || '919854122340'
                    const msg = encodeURIComponent(
                      `Hello ${candidate.firstName}, Greetings from Career Wings! We reviewed your profile (${candidate.headline || 'candidate'}) and would like to connect regarding exciting career opportunities.`
                    )
                    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank')
                    toast.success(`Opening WhatsApp chat with ${candidate.firstName}...`)
                  }}
                  className="px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.889 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.487-8.412z" />
                    </svg>
                    WhatsApp Candidate
                  </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!candidate?.id) return
                      const res = await employerAPI.revealCandidateContact(candidate.id)
                      const data = res.data?.data
                      setCandidate((prev: any) => ({
                        ...prev,
                        isUnlocked: true,
                        phone: data?.phone || prev?.phone,
                        email: data?.email || prev?.email,
                        user: { ...(prev?.user || {}), email: data?.email || prev?.user?.email },
                      }))
                      toast.success('Contact revealed! 1 credit deducted.')
                    } catch (err: any) {
                      toast.error('Failed to unlock contact. Please check your CV quota.')
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#BA1A1A] hover:bg-[#9E1414] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Eye className="w-4 h-4" /> Reveal Contact & Resume (1 credit)
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-xs py-2.5"
              >
                <Download className="w-4 h-4" /> Download Resume (PDF)
              </button>
            </div>
          </div>

          {candidate.summary && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Executive Bio
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {candidate.summary}
              </p>
            </div>
          )}

          {/* Contact & Communication Channels Card */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Phone</p>
                {(candidate as any).isUnlocked ? (
                  <div className="mt-0.5">
                    <a
                      href={`tel:${(candidate as any).phone || (candidate as any).user?.phone}`}
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 block"
                    >
                      {(candidate as any).phone || (candidate as any).user?.phone}
                    </a>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                      ✔ Contact Unlocked
                    </span>
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <span className="font-mono text-slate-400 text-sm">📱 - (Hidden)</span>
                    <p className="text-[11px] text-slate-400 italic mt-0.5">Reveal contact above to unlock phone & WhatsApp</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Email</p>
                {(candidate as any).isUnlocked ? (
                  <div className="mt-0.5">
                    <a
                      href={`mailto:${(candidate as any).email || (candidate as any).user?.email}`}
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 block"
                    >
                      {(candidate as any).email || (candidate as any).user?.email}
                    </a>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                      ✔ Verified Email
                    </span>
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <span className="font-mono text-slate-400 text-sm">
                      {(candidate as any).email || 'ca***@example.com'}
                    </span>
                    <p className="text-[11px] text-slate-400 italic mt-0.5">Reveal contact above to view full email</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills & Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500" /> Core Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {getEnrichedCandidateSkills(candidate as any).map((sk, idx) => (
                <span
                  key={`${sk}-${idx}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  {sk}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-orange-500" /> Education & Background
            </h3>
            <div className="space-y-3">
              {candidate.education?.map((edu: any) => (
                <div key={edu.id} className="text-xs">
                  <strong className="block font-bold text-slate-900 text-sm">{edu.degree}</strong>
                  <span className="text-slate-500">{edu.institution} ({edu.startYear} - {edu.endYear || 'Present'})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </EmployerLayout>
  )
}

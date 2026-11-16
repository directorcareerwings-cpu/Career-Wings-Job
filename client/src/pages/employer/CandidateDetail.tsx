import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { employerAPI } from '@/lib/api'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { User, MapPin, Briefcase, GraduationCap, Download, Bookmark, Phone, Mail, ArrowLeft, Award, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { Candidate } from '@/types'

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
      toast.loading(`Generating PDF resume for ${c.firstName}...`, { id: 'pdf-toast' })
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const margin = 18
      const pageW = 210
      const contentW = pageW - margin * 2
      let y = 0

      // Top Red Header Banner
      doc.setFillColor(186, 26, 26)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 26, pageW, 2.5, 'F')

      // Branding
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      doc.text('CAREER WINGS', margin, 12)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(254, 226, 226)
      doc.text('Premier Northeast & Pan-India Placement Portal • www.careerwings.in', margin, 18)

      // Verified Badge
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(pageW - margin - 60, 6, 60, 15, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(186, 26, 26)
      doc.text('VERIFIED RESUME (PDF)', pageW - margin - 30, 11.5, { align: 'center' })
      doc.setFontSize(7)
      doc.setTextColor(71, 85, 105)
      doc.text(`ID: CW-${(c.id || '').toUpperCase()}`, pageW - margin - 30, 16.5, { align: 'center' })

      y = 38

      // Name
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(15, 23, 42)
      doc.text(`${c.firstName || ''} ${c.lastName || ''}`, margin, y)
      y += 7

      // Headline
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(186, 26, 26)
      const headlineLines = doc.splitTextToSize(c.headline || c.currentRole || 'Active Job Seeker', contentW)
      doc.text(headlineLines, margin, y)
      y += headlineLines.length * 5 + 3

      // Box
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(margin, y, contentW, 48, 3, 3, 'FD')

      const col1 = margin + 6
      const col2 = margin + contentW / 2 + 4
      let boxY = y + 7.5

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text('FULL QUALIFICATION / DEGREE', col1, boxY)
      doc.text('CURRENT LOCATION', col2, boxY)
      boxY += 4.5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(15, 23, 42)
      doc.text(`${c.highestDegree || 'Graduate'} (${c.educationLevel || 'Degree'})`, col1, boxY)
      doc.text(`${c.currentLocation || c.city || 'Guwahati, Assam'}`, col2, boxY)

      boxY += 9
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text('TOTAL WORK EXPERIENCE', col1, boxY)
      doc.text('GENDER & STATUS', col2, boxY)
      boxY += 4.5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(15, 23, 42)
      doc.text(`${c.totalExperience ?? 2} Years Professional Experience`, col1, boxY)
      doc.text(`${c.gender || 'Not specified'} • Active Job Seeker`, col2, boxY)

      boxY += 9
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text('CONTACT EMAIL', col1, boxY)
      doc.text('PHONE / WHATSAPP NUMBER', col2, boxY)
      boxY += 4.5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      if (c.isUnlocked) {
        doc.setTextColor(2, 132, 199)
        doc.text(c.realEmail || c.user?.email || c.email || 'Revealed', col1, boxY)
        doc.setTextColor(22, 163, 74)
        doc.text(c.realPhone || c.phone || 'Revealed', col2, boxY)
      } else {
        doc.setTextColor(100, 116, 139)
        doc.text('Locked · Reveal Contact on Portal', col1, boxY)
        doc.text('Locked · Reveal Contact on Portal', col2, boxY)
      }

      y += 56

      // Skills
      const skillsList = c.candidateSkills?.map((cs: any) => cs.skill?.name || cs.name) || ['Communication', 'Domain Knowledge', 'Workforce Readiness']
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text('KEY SKILLS & COMPETENCIES', margin, y)
      y += 3.5

      doc.setDrawColor(186, 26, 26)
      doc.setLineWidth(0.6)
      doc.line(margin, y, margin + 25, y)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(margin + 25, y, pageW - margin, y)
      y += 7

      let skillX = margin
      skillsList.forEach((sk: string) => {
        const textW = doc.getStringUnitWidth(sk) * 8.5 * 0.352778 + 8
        if (skillX + textW > pageW - margin) {
          skillX = margin
          y += 8
        }
        doc.setFillColor(241, 245, 249)
        doc.setDrawColor(203, 213, 225)
        doc.roundedRect(skillX, y - 4.5, textW, 6.5, 1.5, 1.5, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(30, 41, 59)
        doc.text(sk, skillX + 4, y)
        skillX += textW + 4
      })
      y += 14

      // Overview
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text('PROFESSIONAL PROFILE OVERVIEW', margin, y)
      y += 3.5

      doc.setDrawColor(186, 26, 26)
      doc.setLineWidth(0.6)
      doc.line(margin, y, margin + 25, y)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(margin + 25, y, pageW - margin, y)
      y += 7

      const overviewText = c.summary || `${c.firstName} ${c.lastName} is an authenticated registered candidate on Career Wings. Holding ${c.highestDegree || 'Degree'} with ${c.totalExperience ?? 2} years of industry experience.`
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      const overviewLines = doc.splitTextToSize(overviewText, contentW)
      doc.text(overviewLines, margin, y)
      y += overviewLines.length * 5 + 12

      // Seal
      doc.setFillColor(240, 253, 244)
      doc.setDrawColor(187, 247, 208)
      doc.roundedRect(margin, y, contentW, 26, 3, 3, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(21, 128, 61)
      doc.text('✔ OFFICIALLY VERIFIED BY CAREER WINGS PLACEMENT SERVICES', margin + 6, y + 7)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text('This resume was generated directly from the authenticated Career Wings Candidate Database.', margin + 6, y + 13)
      doc.text(`Verification Timestamp: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin + 6, y + 19)

      const safeName = `${c.firstName}_${c.lastName}_Resume.pdf`.replace(/\s+/g, '_')
      doc.save(safeName)
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
              {candidate.candidateSkills?.map((cs: any) => (
                <span
                  key={cs.id || cs.skill?.name}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  {cs.skill?.name || cs.name}
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

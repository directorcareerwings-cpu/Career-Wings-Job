import React from 'react'
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Globe,
  Briefcase,
  GraduationCap,
  Sparkles,
  Award,
  Languages as LangIcon,
} from 'lucide-react'

export interface ResumeData {
  personalInfo: {
    fullName: string
    targetRole: string
    email: string
    phone: string
    location: string
    linkedin?: string
    portfolio?: string
  }
  summary: string
  experience: Array<{
    id: string
    title: string
    company: string
    location?: string
    startDate: string
    endDate: string
    isCurrent?: boolean
    description: string
  }>
  education: Array<{
    id: string
    degree: string
    institution: string
    fieldOfStudy?: string
    startYear: string
    endYear?: string
    grade?: string
  }>
  skills: string[]
  projects?: Array<{
    id: string
    title: string
    link?: string
    description: string
  }>
  certifications?: string[]
  languages?: string[]
  templateId: 'modern' | 'executive' | 'tech'
  themeColor: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MODERN CORPORATE TEMPLATE (BALANCED, CLEAN, TOP ATS SCORE)
// ─────────────────────────────────────────────────────────────────────────────

export function ModernTemplate({ resume }: { resume: ResumeData }) {
  const { personalInfo, summary, experience, education, skills, certifications, languages, themeColor } = resume

  return (
    <div
      className="bg-white text-slate-800 p-8 sm:p-10 font-sans shadow-lg max-w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 text-[13px] leading-relaxed transition-all"
      style={{ color: '#1e293b' }}
    >
      {/* Header */}
      <header className="border-b-2 pb-5 mb-5" style={{ borderColor: themeColor }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: themeColor }}>
          {personalInfo.fullName || 'Your Full Name'}
        </h1>
        <p className="text-sm font-semibold tracking-wide uppercase mt-1 text-slate-600">
          {personalInfo.targetRole || 'Target Professional Role'}
        </p>

        {/* Contact Info Bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-600">
          {personalInfo.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" style={{ color: themeColor }} />
              <span>{personalInfo.email}</span>
            </span>
          )}
          {personalInfo.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" style={{ color: themeColor }} />
              <span>{personalInfo.phone}</span>
            </span>
          )}
          {personalInfo.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" style={{ color: themeColor }} />
              <span>{personalInfo.location}</span>
            </span>
          )}
          {personalInfo.linkedin && (
            <span className="flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5" style={{ color: themeColor }} />
              <span>{personalInfo.linkedin}</span>
            </span>
          )}
          {personalInfo.portfolio && (
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" style={{ color: themeColor }} />
              <span>{personalInfo.portfolio}</span>
            </span>
          )}
        </div>
      </header>

      {/* Professional Summary */}
      {summary && (
        <section className="mb-5">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 border-b pb-1"
            style={{ color: themeColor, borderColor: '#e2e8f0' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Professional Summary</span>
          </h2>
          <p className="text-slate-700 leading-relaxed text-justify text-xs sm:text-[12.5px]">{summary}</p>
        </section>
      )}

      {/* Work Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-5">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-1"
            style={{ color: themeColor, borderColor: '#e2e8f0' }}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Work Experience</span>
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id} className="break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{exp.title}</span>
                    <span className="text-slate-600 text-xs font-medium"> • {exp.company}</span>
                    {exp.location && <span className="text-slate-400 text-xs"> ({exp.location})</span>}
                  </div>
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate || 'Present'}
                  </span>
                </div>
                {exp.description && (
                  <div className="mt-1.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed pl-1">
                    {exp.description.split('\n').map((line, idx) => (
                      <p key={idx} className="mb-1 flex items-start gap-1.5">
                        <span className="text-slate-400 select-none">•</span>
                        <span>{line.replace(/^[•\-\*]\s*/, '')}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="mb-5">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-1"
            style={{ color: themeColor, borderColor: '#e2e8f0' }}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Education</span>
          </h2>
          <div className="space-y-2.5">
            {education.map((edu) => (
              <div key={edu.id} className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 break-inside-avoid">
                <div>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{edu.degree}</span>
                  {edu.fieldOfStudy && <span className="text-slate-700 text-xs"> in {edu.fieldOfStudy}</span>}
                  <p className="text-xs text-slate-600">{edu.institution}</p>
                </div>
                <div className="text-xs text-slate-500 font-medium sm:text-right shrink-0">
                  <span>{edu.startYear} {edu.endYear ? `– ${edu.endYear}` : ''}</span>
                  {edu.grade && <span className="block text-[11px] text-slate-400">Score: {edu.grade}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section className="mb-5">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2 border-b pb-1"
            style={{ color: themeColor, borderColor: '#e2e8f0' }}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Key Competencies & Technical Skills</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs font-medium border"
                style={{
                  backgroundColor: `${themeColor}0a`,
                  borderColor: `${themeColor}25`,
                  color: themeColor,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Certifications & Languages Footer Row */}
      {((certifications && certifications.length > 0) || (languages && languages.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 break-inside-avoid">
          {certifications && certifications.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-700 flex items-center gap-1.5">
                <Award className="w-3 h-3" style={{ color: themeColor }} />
                <span>Certifications</span>
              </h3>
              <ul className="text-xs text-slate-600 space-y-1">
                {certifications.map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {languages && languages.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-700 flex items-center gap-1.5">
                <LangIcon className="w-3 h-3" style={{ color: themeColor }} />
                <span>Languages</span>
              </h3>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {languages.map((l, i) => (
                  <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXECUTIVE MINIMALIST TEMPLATE (FORMAL, CLEAN, ATS COMPLIANT)
// ─────────────────────────────────────────────────────────────────────────────

export function ExecutiveTemplate({ resume }: { resume: ResumeData }) {
  const { personalInfo, summary, experience, education, skills, certifications, themeColor } = resume

  return (
    <div
      className="bg-white text-slate-800 p-8 sm:p-12 font-serif shadow-lg max-w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 text-[13px] leading-relaxed"
      style={{ color: '#0f172a' }}
    >
      {/* Centered Formal Header */}
      <header className="text-center border-b pb-4 mb-6" style={{ borderColor: '#cbd5e1' }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase" style={{ color: themeColor }}>
          {personalInfo.fullName || 'Your Full Name'}
        </h1>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mt-1 font-sans">
          {personalInfo.targetRole || 'Target Role'}
        </p>

        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 mt-2.5 text-xs text-slate-600 font-sans">
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.location && personalInfo.phone && <span>•</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.phone && personalInfo.email && <span>•</span>}
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.linkedin && (
            <>
              <span>•</span>
              <span>{personalInfo.linkedin}</span>
            </>
          )}
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider font-sans border-b pb-1 mb-2 text-slate-900">
            Professional Summary
          </h2>
          <p className="text-xs leading-relaxed text-justify text-slate-700">{summary}</p>
        </section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider font-sans border-b pb-1 mb-3 text-slate-900">
            Professional Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id} className="break-inside-avoid">
                <div className="flex justify-between items-baseline font-sans">
                  <span className="font-bold text-xs sm:text-sm text-slate-900">{exp.title}</span>
                  <span className="text-xs text-slate-500 italic">
                    {exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate || 'Present'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-600 font-sans mb-1">
                  {exp.company} {exp.location ? `| ${exp.location}` : ''}
                </div>
                {exp.description && (
                  <div className="text-xs text-slate-700 pl-3 border-l-2 border-slate-200 mt-1 space-y-1">
                    {exp.description.split('\n').map((line, i) => (
                      <p key={i}>{line.replace(/^[•\-\*]\s*/, '')}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider font-sans border-b pb-1 mb-3 text-slate-900">
            Education
          </h2>
          <div className="space-y-3 font-sans">
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline break-inside-avoid">
                <div>
                  <div className="font-bold text-xs text-slate-900">{edu.institution}</div>
                  <div className="text-xs text-slate-600">
                    {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {edu.startYear} {edu.endYear ? `– ${edu.endYear}` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section className="mb-6 font-sans">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b pb-1 mb-2.5 text-slate-900">
            Core Expertise & Skills
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            {skills.join('  •  ')}
          </p>
        </section>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <section className="font-sans break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wider border-b pb-1 mb-2 text-slate-900">
            Certifications & Honors
          </h2>
          <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
            {certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TECH / DEVELOPER TEMPLATE (SIDEBAR ACCENTS, HIGH CONTRAST)
// ─────────────────────────────────────────────────────────────────────────────

export function TechTemplate({ resume }: { resume: ResumeData }) {
  const { personalInfo, summary, experience, education, skills, certifications, themeColor } = resume

  return (
    <div
      className="bg-white text-slate-800 p-8 font-mono shadow-lg max-w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 text-xs leading-relaxed"
      style={{ color: '#0f172a' }}
    >
      {/* Top Banner */}
      <div className="p-4 rounded-xl text-white mb-6" style={{ backgroundColor: themeColor }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{personalInfo.fullName || 'Full Name'}</h1>
            <p className="text-xs font-semibold tracking-wider text-slate-200 mt-0.5">
              &gt; {personalInfo.targetRole || 'Software Engineer'}
            </p>
          </div>
          <div className="text-[11px] text-slate-200 space-y-0.5 sm:text-right font-mono">
            {personalInfo.email && <div>{personalInfo.email}</div>}
            {personalInfo.phone && <div>{personalInfo.phone}</div>}
            {personalInfo.location && <div>{personalInfo.location}</div>}
            {personalInfo.linkedin && <div>{personalInfo.linkedin}</div>}
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-5 p-3 rounded-lg bg-slate-50 border border-slate-200 font-sans text-xs">
          <span className="font-bold text-slate-900 block mb-1 uppercase tracking-wide text-[11px]">
            // About Me
          </span>
          <p className="text-slate-700 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Skills Pill Cloud */}
      {skills && skills.length > 0 && (
        <div className="mb-5 font-sans">
          <div className="font-bold text-slate-900 uppercase tracking-wide text-[11px] mb-2 pb-1 border-b border-slate-200">
            // Tech Stack & Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <div className="mb-5 font-sans">
          <div className="font-bold text-slate-900 uppercase tracking-wide text-[11px] mb-3 pb-1 border-b border-slate-200">
            // Experience
          </div>
          <div className="space-y-4">
            {experience.map((exp) => (
              <div key={exp.id} className="break-inside-avoid">
                <div className="flex justify-between items-baseline font-mono text-xs">
                  <span className="font-bold text-slate-900">{exp.title} @ {exp.company}</span>
                  <span className="text-slate-400 text-[11px]">
                    [{exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate || 'Present'}]
                  </span>
                </div>
                {exp.description && (
                  <div className="mt-1 text-xs text-slate-600 pl-3 border-l-2 border-slate-300 space-y-1">
                    {exp.description.split('\n').map((l, i) => (
                      <p key={i}>$ {l.replace(/^[•\-\*]\s*/, '')}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <div className="font-sans break-inside-avoid">
          <div className="font-bold text-slate-900 uppercase tracking-wide text-[11px] mb-2.5 pb-1 border-b border-slate-200">
            // Education
          </div>
          <div className="space-y-2">
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline text-xs">
                <div>
                  <span className="font-bold text-slate-900">{edu.degree}</span>
                  <span className="text-slate-600"> • {edu.institution}</span>
                </div>
                <span className="font-mono text-slate-400 text-[11px]">{edu.startYear}-{edu.endYear}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

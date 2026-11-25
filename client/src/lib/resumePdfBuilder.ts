import type { jsPDF as JsPDFType } from 'jspdf'

export interface ResumeCandidateInput {
  id: string
  firstName?: string | null
  lastName?: string | null
  headline?: string | null
  currentLocation?: string | null
  city?: string | null
  state?: string | null
  educationLevel?: string | null
  highestDegree?: string | null
  college?: string | null
  totalExperience?: number | null
  gender?: string | null
  dateOfBirth?: string | null
  currentRole?: string | null
  currentCompany?: string | null
  currentSalary?: number | null
  expectedSalaryMin?: number | null
  noticePeriod?: string | null
  preferredLocations?: string | null
  summary?: string | null
  jobAppliedFor?: string | null
  priorityTier?: 'PREMIUM' | 'BASIC' | 'NONE' | string
  activeUntil?: string | null
  email?: string | null
  realEmail?: string | null
  phone?: string | null
  realPhone?: string | null
  isUnlocked?: boolean
  skills?: string[]
  candidateSkills?: Array<{ skill?: { name?: string }; name?: string }>
  appliedJobs?: Array<{
    id?: string
    status?: string
    appliedAt?: string
    jobTitle?: string | null
    companyName?: string | null
    location?: string | null
  }>
  education?: Array<{
    id?: string
    degree: string
    fieldOfStudy?: string | null
    institution: string
    startYear?: number | null
    endYear?: number | null
    grade?: string | null
  }>
  experience?: Array<{
    id?: string
    title: string
    company: string
    location?: string | null
    startDate?: string | Date | null
    endDate?: string | Date | null
    isCurrent?: boolean
    description?: string | null
  }>
  certifications?: Array<{
    id?: string
    name: string
    issuer?: string | null
    issueDate?: string | Date | null
  }>
  languages?: Array<{
    id?: string
    language?: string | null
    name?: string | null
    proficiency?: string | null
  }>
  user?: {
    email?: string | null
  }
}

interface RoleDomainProfile {
  domainName: string
  objectiveTemplate: (ctx: { role: string; expText: string; skillsPhrase: string; eduPhrase: string }) => string
  highlights: string[]
}

const DOMAIN_PROFILES: Record<string, RoleDomainProfile> = {
  backoffice: {
    domainName: 'Operations, Back Office & Administration',
    objectiveTemplate: ({ role, expText, skillsPhrase, eduPhrase }) =>
      `Detail-oriented and organized ${role} with ${expText}, backed by ${eduPhrase}. Proficient in ${skillsPhrase}, office documentation, spreadsheet reporting, and cross-team coordination to ensure timely administrative execution.`,
    highlights: [
      'Maintained accurate operational logs, Excel trackers, and MIS documentation with high attention to data integrity.',
      'Coordinated daily back-office workflows, scheduling, and client correspondence to keep deliverables on track.',
      'Streamlined record-keeping and reporting turnaround through structured spreadsheet and administrative workflows.',
    ],
  },
  sales: {
    domainName: 'Sales & Business Development',
    objectiveTemplate: ({ role, expText, skillsPhrase, eduPhrase }) =>
      `Result-oriented and persuasive ${role} with ${expText} and ${eduPhrase}. Skilled in ${skillsPhrase}, client acquisition, consultative selling, and expanding regional market coverage to consistently exceed revenue targets.`,
    highlights: [
      'Managed end-to-end client outreach, product demonstrations, and consultative pitch follow-ups to drive conversions.',
      'Built strong customer relationships and maintained an organized follow-up pipeline to maximize retention.',
      'Identified high-potential market segments and supported territory growth through disciplined field and CRM execution.',
    ],
  },
  finance: {
    domainName: 'Finance, Accounts & Taxation',
    objectiveTemplate: ({ role, expText, skillsPhrase, eduPhrase }) =>
      `Analytical and diligent ${role} with ${expText}, supported by ${eduPhrase}. Competent in ${skillsPhrase}, ledger reconciliation, statutory compliance (GST/TDS), and financial reporting with strong accuracy.`,
    highlights: [
      'Prepared and reconciled day-to-day ledgers, vouchers, and financial statements in line with accounting standards.',
      'Assisted in monthly GST/TDS compliance checks, billing audits, and timely expense tracking.',
      'Supported financial MIS reporting and variance reviews using spreadsheet modeling and accounting software.',
    ],
  },
  software: {
    domainName: 'Software & IT Systems',
    objectiveTemplate: ({ role, expText, skillsPhrase, eduPhrase }) =>
      `Analytical and solution-focused ${role} with ${expText} and ${eduPhrase}. Hands-on capability in ${skillsPhrase}, building reliable applications, troubleshooting technical issues, and delivering maintainable software modules.`,
    highlights: [
      'Developed, tested, and maintained clean application components while adhering to code quality and timeline goals.',
      'Diagnosed system issues, improved query/workflow reliability, and documented technical configurations clearly.',
      'Collaborated across technical and product stakeholders to ship user-ready software enhancements.',
    ],
  },
  logistics: {
    domainName: 'Logistics, Delivery & Supply Chain',
    objectiveTemplate: ({ role, expText, skillsPhrase, eduPhrase }) =>
      `Dependable and efficiency-driven ${role} with ${expText} and ${eduPhrase}. Skilled in ${skillsPhrase}, timely dispatch execution, route planning, and customer handover protocols in fast-paced fulfillment environments.`,
    highlights: [
      'Executed time-bound deliveries and pickup schedules while maintaining high SLA adherence and customer satisfaction.',
      'Verified consignment manifests, package accuracy, and proof-of-delivery records with zero reconciliation gaps.',
      'Coordinated closely with hub supervisors and dispatch teams to optimize daily route efficiency and turnaround.',
    ],
  },
  support: {
    domainName: 'Customer Support & Front Office',
    objectiveTemplate: ({ role, expText, skillsPhrase, eduPhrase }) =>
      `Empathetic and articulate ${role} with ${expText} and ${eduPhrase}. Experienced in ${skillsPhrase}, resolving client queries smoothly, managing inbound/outbound communication, and upholding service excellence.`,
    highlights: [
      'Resolved customer inquiries promptly across voice, chat, and front-desk touchpoints with high service ratings.',
      'Maintained accurate CRM/ticket logs and escalated complex cases cleanly for faster resolution.',
      'Delivered courteous, solution-focused communication aligned with organizational service standards.',
    ],
  },
  marketing: {
    domainName: 'Marketing & Brand Growth',
    objectiveTemplate: ({ role, expText, skillsPhrase, eduPhrase }) =>
      `Creative and metrics-focused ${role} with ${expText} and ${eduPhrase}. Capable in ${skillsPhrase}, digital/field campaign execution, audience engagement, and lead generation tracking.`,
    highlights: [
      'Executed multi-channel promotional campaigns and content initiatives to drive brand awareness and qualified leads.',
      'Tracked campaign performance metrics and optimized messaging for stronger audience reach and engagement.',
      'Coordinated creative assets, vendor timelines, and event activations seamlessly.',
    ],
  },
  general: {
    domainName: 'Professional Workforce',
    objectiveTemplate: ({ role, expText, skillsPhrase, eduPhrase }) =>
      `Motivated and adaptable ${role} with ${expText}, holding ${eduPhrase}. Equipped with core capabilities in ${skillsPhrase}, committed to operational reliability, rapid learning, and contributing measurable value to team objectives.`,
    highlights: [
      'Delivered assigned responsibilities consistently while adhering to organizational quality standards and deadlines.',
      'Collaborated effectively with supervisors and peers to streamline daily tasks and resolve operational bottlenecks.',
      'Demonstrated strong work ethic, punctual reporting, and readiness to adapt to evolving business requirements.',
    ],
  },
}

const PLACEHOLDER_VALUES = new Set([
  'not available',
  'n/a',
  'na',
  'none',
  'nil',
  'null',
  'undefined',
  'not specified',
  'not provided',
  'any',
  '-',
  '--',
  '---',
  '.',
])

const JUNK_SKILL_TOKENS = new Set([
  'job',
  'jobs',
  'work',
  'career',
  'careers',
  'vacancy',
  'vacancies',
  'opening',
  'openings',
  'resume',
  'cv',
  'skill',
  'skills',
  'fresher',
  'other',
  'any',
  'none',
  'nil',
  'na',
  'n/a',
  'null',
  'undefined',
  'not available',
  'not specified',
  'not provided',
  'professional communications',
  'job search readiness',
  'industry domain',
])

const AI_SKILL_SETS: Array<{ pattern: RegExp; skills: string[] }> = [
  {
    pattern: /(back\s*office|office\s*assistant|data\s*entry|admin|clerk|reception|mis|operator)/,
    skills: [
      'MS Office & Advanced Excel',
      'Office Administration',
      'Data Entry & MIS Reporting',
      'Document Management',
      'Scheduling & Coordination',
      'Email Correspondence',
      'Business Communication',
      'Time Management',
    ],
  },
  {
    pattern: /(sales|slaes|business\s*dev|bde|bdm|retail|store|field|amul|fmcg|distributor)/,
    skills: [
      'Sales Operations',
      'Client Relationship Management',
      'Lead Generation & Follow-up',
      'Order & Billing Coordination',
      'Market & Territory Coverage',
      'Persuasive Communication',
      'Negotiation Skills',
    ],
  },
  {
    pattern: /(account|finance|tally|tax|gst|audit|bank|ca\b|b\.?com|m\.?com)/,
    skills: [
      'Accounting & Reconciliation',
      'Tally Prime / ERP',
      'MS Excel & Financial Reporting',
      'GST & TDS Compliance',
      'Billing & Voucher Auditing',
      'Analytical Accuracy',
    ],
  },
  {
    pattern: /(delivery|courier|driver|rider|logistics|warehouse|supply|dispatch|blinkit|zomato|swiggy|flipkart)/,
    skills: [
      'Route & Dispatch Coordination',
      'On-Time Order Fulfillment',
      'Inventory & Package Handling',
      'Customer Handover Protocol',
      'Mobile Tracking & POS Apps',
      'Time Management',
    ],
  },
  {
    pattern: /(support|customer|telecall|bpo|voice|helpdesk|front\s*office|care)/,
    skills: [
      'Customer Query Resolution',
      'Voice & Chat Support',
      'Front Desk Coordination',
      'CRM & Ticket Tracking',
      'Active Listening',
      'Client Communication',
    ],
  },
  {
    pattern: /(soft|dev|engineer|program|tech|web|react|node|java|python|it\b|computer|bca|mca)/,
    skills: [
      'Software & Web Development',
      'Database Management (SQL)',
      'Troubleshooting & Debugging',
      'Technical Documentation',
      'System & Workflow Analysis',
      'Collaborative Problem Solving',
    ],
  },
  {
    pattern: /(market|seo|digital|social|brand|content)/,
    skills: [
      'Digital Marketing & SEO',
      'Social Media Campaigns',
      'Lead Generation',
      'Content & Copy Coordination',
      'Campaign Analytics',
      'Market Research',
    ],
  },
  {
    pattern: /(hr|human\s*resource|recruit|talent|staffing|payroll)/,
    skills: [
      'Talent Sourcing & Screening',
      'Interview Coordination',
      'HR Documentation & Onboarding',
      'Attendance & Payroll Tracking',
      'Interpersonal Communication',
    ],
  },
  {
    pattern: /(teach|tutor|faculty|lecturer|trainer|education|school|b\.?ed)/,
    skills: [
      'Curriculum Delivery',
      'Classroom Management',
      'Student Assessment & Mentoring',
      'Lesson Planning',
      'Presentation Skills',
    ],
  },
  {
    pattern: /(health|nurse|gnm|pharma|medical|hospital|clinic|mbbs|b\.?pharm)/,
    skills: [
      'Patient Care & Assistance',
      'Clinical Documentation',
      'Inventory & Pharmacy Compliance',
      'Safety & Hygiene Protocols',
      'Empathetic Communication',
    ],
  },
]

const GENERAL_AI_SKILLS = [
  'Business Communication',
  'MS Office & Computer Skills',
  'Client & Team Coordination',
  'Documentation & Reporting',
  'Problem Solving',
  'Time Management',
]

/**
 * Normalizes text for jsPDF built-in Helvetica font (strips emojis/unsupported Unicode).
 */
export function toPdfText(raw: string | null | undefined): string {
  if (!raw) return ''
  return String(raw)
    .replace(/₹/g, 'Rs. ')
    .replace(/[•·]/g, '|')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

export function cleanPlaceholder(raw: string | null | undefined): string {
  const txt = toPdfText(raw)
  if (!txt) return ''
  if (PLACEHOLDER_VALUES.has(txt.toLowerCase())) return ''
  return txt
}

function resolveDomainProfile(roleHint: string): RoleDomainProfile {
  const r = roleHint.toLowerCase()
  if (/(back\s*office|data\s*entry|admin|clerk|office\s*assistant|reception|mis|operator)/.test(r)) {
    return DOMAIN_PROFILES.backoffice
  }
  if (/(delivery|courier|driver|rider|logistics|warehouse|supply|dispatch|blinkit|zomato|swiggy|flipkart)/.test(r)) {
    return DOMAIN_PROFILES.logistics
  }
  if (/(account|finance|tally|tax|gst|audit|bank|ca\b|b\.?com|m\.?com)/.test(r)) {
    return DOMAIN_PROFILES.finance
  }
  if (/(sale|slaes|business\s*dev|bde|bdm|marketing\s*exec|retail|store|field|amul|fmcg)/.test(r)) {
    return DOMAIN_PROFILES.sales
  }
  if (/(support|customer|telecall|bpo|voice|helpdesk|front\s*office|care)/.test(r)) {
    return DOMAIN_PROFILES.support
  }
  if (/(soft|dev|engineer|program|tech|web|react|node|java|python|it\b|computer|bca|mca)/.test(r)) {
    return DOMAIN_PROFILES.software
  }
  if (/(market|seo|digital|social|brand|content)/.test(r)) {
    return DOMAIN_PROFILES.marketing
  }
  return DOMAIN_PROFILES.general
}

export function isValidCandidateSkill(raw: string | null | undefined): boolean {
  const sk = cleanPlaceholder(raw)
  if (!sk) return false
  const s = sk.toLowerCase()
  if (s.length <= 1 || JUNK_SKILL_TOKENS.has(s)) return false
  if (
    s.includes('apna') ||
    s.includes('4767') ||
    s.includes('1874') ||
    s.includes('http') ||
    s.includes('competenc') ||
    s.includes('key skills') ||
    s.includes('not available') ||
    /^\d+$/.test(s)
  ) {
    return false
  }
  return true
}

export function cleanCandidateSkills(cand: ResumeCandidateInput): string[] {
  const rawSkills =
    cand.skills && cand.skills.length > 0
      ? cand.skills
      : (cand.candidateSkills || []).map((cs) => cs.skill?.name || cs.name || '')

  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of rawSkills) {
    const sk = cleanPlaceholder(raw)
    if (!isValidCandidateSkill(sk)) continue
    const key = sk.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(sk)
    }
  }
  return result
}

/**
 * Combines candidate's genuine profile skills with AI-generated domain/role-matched skills
 * so every downloaded resume PDF displays 6-8 relevant skills without junk entries like "jobs".
 */
export function getEnrichedCandidateSkills(cand: ResumeCandidateInput): string[] {
  const realSkills = cleanCandidateSkills(cand)
  const seen = new Set(realSkills.map((s) => s.toLowerCase()))
  const merged = [...realSkills]

  const contextHint = [
    cand.jobAppliedFor,
    ...(cand.appliedJobs || []).map((a) => a.jobTitle),
    cand.currentRole,
    cand.currentCompany,
    ...(cand.experience || []).map((e) => `${e.title} ${e.company}`),
    cleanPlaceholder(cand.headline),
    cleanPlaceholder(cand.highestDegree),
    cleanPlaceholder(cand.educationLevel),
    ...realSkills,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  // Collect skills from every matching role/domain pattern (target job + prior experience + education)
  for (const group of AI_SKILL_SETS) {
    if (group.pattern.test(contextHint)) {
      for (const aiSkill of group.skills) {
        if (merged.length >= 8) break
        const key = aiSkill.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          merged.push(aiSkill)
        }
      }
    }
    if (merged.length >= 8) break
  }

  // Ensure at least 6 relevant core competencies on every resume
  if (merged.length < 6) {
    for (const fallback of GENERAL_AI_SKILLS) {
      if (merged.length >= 6) break
      const key = fallback.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(fallback)
      }
    }
  }

  return merged
}

function parsePreferredLocations(raw: string | null | undefined): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((x) => toPdfText(String(x))).filter(Boolean).join(', ')
    }
  } catch {
    // Plain text fallback
  }
  return toPdfText(raw)
}

function cleanUserSummary(raw: string | null | undefined): string {
  if (!raw) return ''
  // Remove auto-appended metadata tag already shown in dedicated "Job Applied For" section
  const stripped = raw
    .replace(/\|\s*Job Applied For:\s*[^|\n]+/gi, '')
    .replace(/^Job Applied For:\s*[^|\n]+/gi, '')
    .trim()
  return toPdfText(stripped)
}

function formatYearOrDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return toPdfText(String(d))
  return dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function buildAIProfileSummary(cand: ResumeCandidateInput, skills: string[]): { summary: string; highlights: string[] } {
  const targetRole =
    cleanPlaceholder(cand.jobAppliedFor) ||
    cleanPlaceholder(cand.appliedJobs?.[0]?.jobTitle) ||
    cleanPlaceholder(cand.currentRole) ||
    cleanPlaceholder(cand.headline).replace(/^Applied for:\s*/i, '') ||
    'Professional Candidate'

  const roleHint = `${targetRole} ${cand.currentRole || ''} ${cand.currentCompany || ''} ${cand.headline || ''} ${skills.join(' ')}`
  const domain = resolveDomainProfile(roleHint)

  const expNum = Number(cand.totalExperience ?? 0)
  const cleanCompany = cleanPlaceholder(cand.currentCompany)
  const expText =
    expNum > 0
      ? `${expNum} year${expNum === 1 ? '' : 's'} of practical industry experience${
          cleanCompany ? ` (most recently at ${cleanCompany})` : ''
        }`
      : 'a solid academic foundation and readiness to deliver impact from day one'

  const degreePart = cleanPlaceholder(cand.highestDegree)
  const levelPart = cleanPlaceholder(cand.educationLevel)
  const collegePart = cleanPlaceholder(cand.college) || cleanPlaceholder(cand.education?.[0]?.institution)

  let eduPhrase = ''
  if (degreePart && levelPart && !degreePart.toLowerCase().includes(levelPart.toLowerCase())) {
    eduPhrase = `${degreePart} (${levelPart})`
  } else {
    eduPhrase = degreePart || (levelPart ? `${levelPart} qualification` : 'relevant academic qualification')
  }
  if (collegePart) {
    eduPhrase += ` from ${collegePart}`
  }

  const skillsPhrase =
    skills.length > 0
      ? skills.slice(0, 4).join(', ')
      : 'communication, structured problem solving, and workplace adaptability'

  let generated = domain.objectiveTemplate({
    role: targetRole,
    expText,
    skillsPhrase,
    eduPhrase,
  })

  const extraNote: string[] = []
  const cleanLoc = cleanPlaceholder(cand.currentLocation)
  if (cleanLoc) {
    extraNote.push(`Based in ${cleanLoc}`)
  }
  const prefLocs = parsePreferredLocations(cand.preferredLocations)
  if (prefLocs) {
    extraNote.push(`open to opportunities in ${prefLocs}`)
  }
  const cleanNotice = cleanPlaceholder(cand.noticePeriod)
  if (cleanNotice) {
    extraNote.push(`available within ${cleanNotice} notice period`)
  }
  if (extraNote.length > 0) {
    generated += ` ${extraNote.join(', ')}.`
  }

  const existingCustom = cleanUserSummary(cand.summary)
  const finalSummary =
    existingCustom && existingCustom.length > 25 && !existingCustom.toLowerCase().startsWith('applied for')
      ? `${generated}\n\nCandidate Profile Note: ${existingCustom}`
      : generated

  return {
    summary: finalSummary,
    highlights: domain.highlights,
  }
}

/**
 * Generates an executive, AI-enhanced multi-section Career Wings PDF resume
 * containing all candidate details while strictly preserving email/phone masking logic.
 */
export async function buildProfessionalCandidatePDFDoc(
  cand: ResumeCandidateInput,
  isUnlocked: boolean
): Promise<{ doc: JsPDFType; fileName: string }> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const margin = 16
  const pageW = 210
  const pageH = 297
  const contentW = pageW - margin * 2
  const bottomLimit = pageH - 18
  let y = 0

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage()
      y = 18
    }
  }

  const drawSectionHeading = (title: string) => {
    ensureSpace(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    doc.text(title.toUpperCase(), margin, y)
    y += 2.5

    doc.setDrawColor(186, 26, 26)
    doc.setLineWidth(0.7)
    doc.line(margin, y, margin + 26, y)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.25)
    doc.line(margin + 26, y, pageW - margin, y)
    y += 5.5
  }

  const firstName = toPdfText(cand.firstName) || 'Verified'
  const lastName = toPdfText(cand.lastName) || 'Candidate'
  const fullName = `${firstName} ${lastName}`.trim()

  const headlineText =
    cleanPlaceholder(cand.currentRole) && cleanPlaceholder(cand.currentCompany)
      ? `${cleanPlaceholder(cand.currentRole)} at ${cleanPlaceholder(cand.currentCompany)}`
      : cleanPlaceholder(cand.headline) || cleanPlaceholder(cand.currentRole) || 'Active Job Seeker'

  const cleanSkills = getEnrichedCandidateSkills(cand)
  const aiContent = buildAIProfileSummary(cand, cleanSkills)

  // ─── 1. EXECUTIVE TOP BANNER ──────────────────────────────────────────────
  doc.setFillColor(186, 26, 26) // Career Wings Crimson
  doc.rect(0, 0, pageW, 24, 'F')
  doc.setFillColor(15, 23, 42) // Navy Accent
  doc.rect(0, 22.5, pageW, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('CAREER WINGS', margin, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(254, 226, 226)
  doc.text('Verified Talent Profile & AI-Structured Resume  |  www.careerwings.in', margin, 17)

  // Right Verified Pill
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(pageW - margin - 54, 5, 54, 13.5, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(186, 26, 26)
  doc.text('VERIFIED RESUME PDF', pageW - margin - 27, 10.5, { align: 'center' })
  doc.setFontSize(6.5)
  doc.setTextColor(71, 85, 105)
  doc.text(`ID: CW-${toPdfText(cand.id).slice(-8).toUpperCase()}`, pageW - margin - 27, 15, { align: 'center' })

  y = 33

  // ─── 2. CANDIDATE NAME, HEADLINE & STATUS PILLS ──────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text(fullName, margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(186, 26, 26)
  const headlineLines = doc.splitTextToSize(headlineText, contentW)
  doc.text(headlineLines, margin, y)
  y += headlineLines.length * 4.5 + 1.5

  // Target role / priority tier strip
  const appliedPosition = toPdfText(cand.jobAppliedFor) || toPdfText(cand.appliedJobs?.[0]?.jobTitle)
  if (appliedPosition || cand.priorityTier === 'PREMIUM' || cand.priorityTier === 'BASIC') {
    let badgeX = margin
    if (appliedPosition) {
      const label = `APPLIED FOR: ${appliedPosition}`
      const w = Math.min(contentW, doc.getStringUnitWidth(label) * 7.5 * 0.352778 + 7)
      doc.setFillColor(254, 242, 242)
      doc.setDrawColor(254, 202, 202)
      doc.roundedRect(badgeX, y - 3.5, w, 5.5, 1.5, 1.5, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(185, 28, 28)
      doc.text(label, badgeX + 3.5, y)
      badgeX += w + 3
    }
    if (cand.priorityTier === 'PREMIUM' || cand.priorityTier === 'BASIC') {
      const tierLabel = cand.priorityTier === 'PREMIUM' ? 'PRIORITY VERIFIED (+25%)' : 'VERIFIED CANDIDATE'
      const w = doc.getStringUnitWidth(tierLabel) * 7 * 0.352778 + 7
      if (badgeX + w <= pageW - margin) {
        doc.setFillColor(cand.priorityTier === 'PREMIUM' ? 254 : 239, cand.priorityTier === 'PREMIUM' ? 243 : 246, cand.priorityTier === 'PREMIUM' ? 199 : 255)
        doc.roundedRect(badgeX, y - 3.5, w, 5.5, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(cand.priorityTier === 'PREMIUM' ? 180 : 29, cand.priorityTier === 'PREMIUM' ? 83 : 78, cand.priorityTier === 'PREMIUM' ? 9 : 216)
        doc.text(tierLabel, badgeX + 3.5, y)
      }
    }
    y += 5.5
  }

  // ─── 3. CANDIDATE METADATA & PRIVACY-SAFE CONTACT CARD ───────────────────
  const rawEmail = toPdfText(cand.realEmail || cand.user?.email || cand.email) || 'candidate@example.com'
  const maskedEmail = toPdfText(cand.email) || rawEmail.replace(/^(..)(.*)(@.*)$/, (_, a, _b, c) => `${a}***${c}`)
  const rawPhone = toPdfText(cand.realPhone || cand.phone) || 'Not provided'

  const emailDisplay = isUnlocked ? rawEmail : `${maskedEmail} (Locked - Reveal on portal)`
  const phoneDisplay = isUnlocked ? rawPhone : 'Hidden / Locked (Reveal on portal)'

  const prefLocations = parsePreferredLocations(cand.preferredLocations)
  const salaryParts: string[] = []
  if (cand.currentSalary && Number(cand.currentSalary) > 0) {
    salaryParts.push(`Current: Rs. ${Number(cand.currentSalary).toLocaleString('en-IN')}`)
  }
  if (cand.expectedSalaryMin && Number(cand.expectedSalaryMin) > 0) {
    salaryParts.push(`Expected: Rs. ${Number(cand.expectedSalaryMin).toLocaleString('en-IN')}`)
  }

  const leftItems: Array<{ label: string; value: string; color?: [number, number, number] }> = [
    {
      label: 'EMAIL ADDRESS',
      value: emailDisplay,
      color: isUnlocked ? [2, 132, 199] : [100, 116, 139],
    },
    {
      label: 'PHONE / WHATSAPP',
      value: phoneDisplay,
      color: isUnlocked ? [22, 163, 74] : [100, 116, 139],
    },
    {
      label: 'CURRENT LOCATION',
      value:
        [toPdfText(cand.currentLocation), toPdfText(cand.state)]
          .filter((v, i, arr) => v && (i === 0 || !arr[0].toLowerCase().includes(v.toLowerCase())))
          .join(', ') || 'Assam, India',
    },
    {
      label: 'PREFERRED LOCATIONS',
      value: prefLocations || 'Flexible / Northeast & Pan-India',
    },
  ]

  const qualDisplay = (() => {
    const deg = cleanPlaceholder(cand.highestDegree)
    const lvl = cleanPlaceholder(cand.educationLevel)
    if (deg && lvl && !deg.toLowerCase().includes(lvl.toLowerCase())) return `${deg} (${lvl})`
    return deg || lvl || 'Verified Qualification'
  })()

  const rightItems: Array<{ label: string; value: string; color?: [number, number, number] }> = [
    {
      label: 'HIGHEST QUALIFICATION',
      value: qualDisplay,
    },
    {
      label: 'TOTAL WORK EXPERIENCE',
      value: `${cand.totalExperience ?? 0} Year${Number(cand.totalExperience ?? 0) === 1 ? '' : 's'} Experience`,
    },
    {
      label: 'NOTICE PERIOD & AVAILABILITY',
      value: `${cleanPlaceholder(cand.noticePeriod) || 'Immediate / Negotiable'} | ${cleanPlaceholder(cand.gender) || 'Verified Profile'}${cleanPlaceholder(cand.dateOfBirth) ? ` | DOB: ${cleanPlaceholder(cand.dateOfBirth)}` : ''}`,
    },
    {
      label: 'COMPENSATION & INSTITUTE',
      value:
        salaryParts.length > 0
          ? salaryParts.join(' | ')
          : cleanPlaceholder(cand.college) || 'As per company standards',
    },
  ]

  const colW = contentW / 2 - 8
  const rowCount = Math.max(leftItems.length, rightItems.length)
  const boxHeight = rowCount * 11.5 + 6

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, contentW, boxHeight, 2.5, 2.5, 'FD')

  const col1X = margin + 5
  const col2X = margin + contentW / 2 + 3

  for (let i = 0; i < rowCount; i++) {
    const rowY = y + 6.5 + i * 11.5
    const left = leftItems[i]
    const right = rightItems[i]

    if (left) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.8)
      doc.setTextColor(148, 163, 184)
      doc.text(left.label, col1X, rowY)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      const c = left.color || [15, 23, 42]
      doc.setTextColor(c[0], c[1], c[2])
      const clipped = doc.splitTextToSize(left.value, colW)[0] || ''
      doc.text(clipped, col1X, rowY + 4.2)
    }

    if (right) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.8)
      doc.setTextColor(148, 163, 184)
      doc.text(right.label, col2X, rowY)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      const c = right.color || [15, 23, 42]
      doc.setTextColor(c[0], c[1], c[2])
      const clipped = doc.splitTextToSize(right.value, colW)[0] || ''
      doc.text(clipped, col2X, rowY + 4.2)
    }
  }

  y += boxHeight + 7

  // ─── 4. AI-SYNTHESIZED EXECUTIVE SUMMARY ──────────────────────────────────
  drawSectionHeading('Executive Career Summary')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  const summaryLines = doc.splitTextToSize(aiContent.summary, contentW)
  for (const line of summaryLines) {
    ensureSpace(5)
    doc.text(line, margin, y)
    y += 4.3
  }
  y += 4

  // ─── 5. JOB APPLIED FOR & PORTAL APPLICATIONS ─────────────────────────────
  const hasApplied = Boolean(toPdfText(cand.jobAppliedFor)) || (cand.appliedJobs && cand.appliedJobs.length > 0)
  if (hasApplied) {
    drawSectionHeading('Job Applied For & Application History')

    if (toPdfText(cand.jobAppliedFor)) {
      ensureSpace(12)
      doc.setFillColor(254, 242, 242)
      doc.setDrawColor(254, 202, 202)
      doc.roundedRect(margin, y - 2, contentW, 10, 1.5, 1.5, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.8)
      doc.setTextColor(185, 28, 28)
      doc.text(`Target / Applied Position: ${toPdfText(cand.jobAppliedFor)}`, margin + 4, y + 4)
      y += 12
    }

    if (cand.appliedJobs && cand.appliedJobs.length > 0) {
      for (const app of cand.appliedJobs) {
        ensureSpace(12)
        const title = toPdfText(app.jobTitle) || 'Job Application'
        const metaParts = [
          toPdfText(app.companyName),
          toPdfText(app.location),
          app.appliedAt ? `Applied: ${new Date(app.appliedAt).toLocaleDateString('en-IN')}` : '',
          app.status ? `Status: ${toPdfText(app.status)}` : '',
        ].filter(Boolean)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(15, 23, 42)
        doc.text(`- ${title}`, margin, y)
        y += 4.2

        if (metaParts.length > 0) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(100, 116, 139)
          const metaLines = doc.splitTextToSize(metaParts.join('  |  '), contentW - 6)
          doc.text(metaLines, margin + 3, y)
          y += metaLines.length * 3.8 + 2
        }
      }
      y += 2
    }
  }

  // ─── 6. PROFESSIONAL WORK EXPERIENCE ──────────────────────────────────────
  const expList = cand.experience && cand.experience.length > 0 ? cand.experience : []
  const hasRoleFallback = Boolean(toPdfText(cand.currentRole) || toPdfText(cand.currentCompany))

  if (expList.length > 0 || hasRoleFallback) {
    drawSectionHeading('Work Experience & Key Contributions')

    const entries =
      expList.length > 0
        ? expList
        : [
            {
              title: toPdfText(cand.currentRole) || 'Executive / Associate',
              company: toPdfText(cand.currentCompany) || 'Previous Organization',
              location: toPdfText(cand.currentLocation),
              isCurrent: true,
              description: null,
            },
          ]

    entries.forEach((exp, idx) => {
      ensureSpace(22)
      const expTitle = toPdfText(exp.title) || 'Role'
      const expCompany = toPdfText(exp.company) || ''
      const expLoc = toPdfText(exp.location)
      const periodStart = formatYearOrDate(exp.startDate)
      const periodEnd = exp.isCurrent ? 'Present' : formatYearOrDate(exp.endDate)
      const periodText = periodStart || periodEnd ? `${periodStart}${periodStart && periodEnd ? ' - ' : ''}${periodEnd}` : exp.isCurrent ? 'Current Role' : ''

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(15, 23, 42)
      doc.text(`${expTitle}${expCompany ? `  |  ${expCompany}` : ''}`, margin, y)

      if (periodText) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(186, 26, 26)
        doc.text(periodText, pageW - margin, y, { align: 'right' })
      }
      y += 4.3

      if (expLoc) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(expLoc, margin, y)
        y += 4
      }

      const rawDesc = toPdfText(exp.description)
      const bullets = rawDesc
        ? rawDesc
            .split(/\n|[.;](?=\s+[A-Z])/)
            .map((b) => b.trim())
            .filter((b) => b.length > 4)
        : idx === 0
        ? aiContent.highlights
        : []

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(51, 65, 85)
      for (const bullet of bullets.slice(0, 4)) {
        const bLines = doc.splitTextToSize(`- ${bullet}`, contentW - 4)
        ensureSpace(bLines.length * 4 + 1)
        doc.text(bLines, margin + 2, y)
        y += bLines.length * 3.9 + 1
      }
      y += 3
    })
  } else {
    // Fresher / Career Readiness Strengths
    drawSectionHeading('Core Strengths & Role Readiness')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(51, 65, 85)
    for (const hl of aiContent.highlights) {
      const lines = doc.splitTextToSize(`- ${hl}`, contentW - 4)
      ensureSpace(lines.length * 4 + 1)
      doc.text(lines, margin + 2, y)
      y += lines.length * 3.9 + 1.2
    }
    y += 3
  }

  // ─── 7. EDUCATION & ACADEMIC QUALIFICATIONS ────────────────────────────────
  drawSectionHeading('Education & Academic Qualifications')

  const fallbackDegree = cleanPlaceholder(cand.highestDegree) || cleanPlaceholder(cand.educationLevel) || 'Academic Qualification'
  const fallbackInst = cleanPlaceholder(cand.college)
  const eduList = cand.education && cand.education.length > 0 ? cand.education : []
  if (eduList.length > 0) {
    for (const edu of eduList) {
      ensureSpace(12)
      const deg = cleanPlaceholder(edu.degree) || fallbackDegree
      const field = cleanPlaceholder(edu.fieldOfStudy)
      const inst = cleanPlaceholder(edu.institution) || fallbackInst
      const yr = edu.startYear || edu.endYear ? `${edu.startYear || ''}${edu.startYear && edu.endYear ? ' - ' : ''}${edu.endYear || ''}` : ''
      const grade = cleanPlaceholder(edu.grade)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(15, 23, 42)
      doc.text(`${deg}${field ? ` (${field})` : ''}`, margin, y)

      if (yr) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.text(yr, pageW - margin, y, { align: 'right' })
      }
      y += 4.3

      const subParts = [inst, grade ? `Score / Grade: ${grade}` : ''].filter(Boolean)
      if (subParts.length > 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(71, 85, 105)
        doc.text(subParts.join('  |  '), margin, y)
        y += 5.5
      } else {
        y += 2
      }
    }
  } else {
    ensureSpace(11)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(15, 23, 42)
    doc.text(qualDisplay, margin, y)
    y += 4.3
    if (fallbackInst) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(71, 85, 105)
      doc.text(`Institution: ${fallbackInst}`, margin, y)
      y += 5
    }
  }
  y += 3

  // ─── 8. KEY SKILLS & CORE COMPETENCIES ────────────────────────────────────
  drawSectionHeading('Key Skills & Core Competencies')
  const displaySkills = cleanSkills

  let skillX = margin
  for (const sk of displaySkills) {
    const textW = doc.getStringUnitWidth(sk) * 8 * 0.352778 + 7
    if (skillX + textW > pageW - margin) {
      skillX = margin
      y += 7.5
      ensureSpace(9)
    }
    doc.setFillColor(241, 245, 249)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(skillX, y - 4, textW, 5.8, 1.4, 1.4, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(30, 41, 59)
    doc.text(sk, skillX + 3.5, y)
    skillX += textW + 3
  }
  y += 9

  // ─── 9. CERTIFICATIONS & LANGUAGES (IF PRESENT) ───────────────────────────
  const certs = cand.certifications && cand.certifications.length > 0 ? cand.certifications : []
  const langs = cand.languages && cand.languages.length > 0 ? cand.languages : []

  if (certs.length > 0 || langs.length > 0) {
    drawSectionHeading('Certifications & Languages')
    if (certs.length > 0) {
      for (const cert of certs) {
        ensureSpace(6)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(15, 23, 42)
        doc.text(`- ${toPdfText(cert.name)}${cert.issuer ? ` (${toPdfText(cert.issuer)})` : ''}`, margin, y)
        y += 4.5
      }
    }
    if (langs.length > 0) {
      ensureSpace(7)
      const langStr = langs
        .map((l) => `${toPdfText(l.language || l.name)}${l.proficiency ? ` (${toPdfText(l.proficiency)})` : ''}`)
        .filter((s) => s.trim().length > 0)
        .join(', ')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(51, 65, 85)
      const langLines = doc.splitTextToSize(`Languages Known: ${langStr}`, contentW)
      doc.text(langLines, margin, y)
      y += langLines.length * 4 + 2
    }
    y += 3
  }

  // ─── 10. VERIFICATION SEAL BOX ────────────────────────────────────────────
  ensureSpace(24)
  doc.setFillColor(240, 253, 244)
  doc.setDrawColor(187, 247, 208)
  doc.roundedRect(margin, y, contentW, 20, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(21, 128, 61)
  doc.text('OFFICIALLY VERIFIED BY CAREER WINGS PLACEMENT SERVICES', margin + 5, y + 6.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text(
    'AI-structured professional resume compiled directly from verified Career Wings candidate profile data.',
    margin + 5,
    y + 11.5
  )
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}  |  Candidate ID: CW-${toPdfText(cand.id).slice(-8).toUpperCase()}${!isUnlocked ? '  |  Contact masked until unlocked on portal' : ''}`,
    margin + 5,
    y + 16.5
  )

  // ─── PAGE NUMBERS FOOTER ON ALL PAGES ─────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Career Wings Placement Services  |  www.careerwings.in  |  Confidential Recruiter Document  |  Page ${p} of ${totalPages}`,
      pageW / 2,
      pageH - 7,
      { align: 'center' }
    )
  }

  const safeName = `${firstName}_${lastName}_Resume.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_+/g, '_')
  return { doc, fileName: safeName }
}

export async function downloadProfessionalCandidatePDF(cand: ResumeCandidateInput, isUnlocked: boolean): Promise<string> {
  const { doc, fileName } = await buildProfessionalCandidatePDFDoc(cand, isUnlocked)
  doc.save(fileName)
  return fileName
}

// ─── Minimal Zero-Dependency STORE ZIP Archive Builder ────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export function createZipArchiveBlob(entries: Array<{ name: string; data: Uint8Array }>): Blob {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const data = entry.data
    const crc = crc32(data)

    const localHeader = new ArrayBuffer(30 + nameBytes.length)
    const lv = new DataView(localHeader)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    new Uint8Array(localHeader, 30).set(nameBytes)

    const lhBytes = new Uint8Array(localHeader)
    localParts.push(lhBytes, data)

    const centralHeader = new ArrayBuffer(46 + nameBytes.length)
    const cv = new DataView(centralHeader)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    new Uint8Array(centralHeader, 46).set(nameBytes)

    centralParts.push(new Uint8Array(centralHeader))
    offset += lhBytes.length + data.length
  }

  let centralSize = 0
  for (const part of centralParts) centralSize += part.length

  const eocd = new ArrayBuffer(22)
  const ev = new DataView(eocd)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const parts: BlobPart[] = [
    ...localParts.map((u) => new Uint8Array(u) as BlobPart),
    ...centralParts.map((u) => new Uint8Array(u) as BlobPart),
    new Uint8Array(eocd),
  ]

  return new Blob(parts, { type: 'application/zip' })
}

/**
 * Career Wings - Intelligent AI Blog Cover Image Generator
 * Generates photorealistic, high-resolution 1200x630 AI cover images
 * optimized for Northeast India, Assam & Guwahati career guides.
 */

export type AIImageStyle =
  | 'it_tech'
  | 'corporate_office'
  | 'interview_hr'
  | 'guwahati_business'
  | 'bpo_calling'
  | 'banking_finance'
  | 'freshers_students'
  | 'remote_work'

export interface AIImagePreset {
  id: AIImageStyle
  label: string
  category: string
  promptKeywords: string
  curatedFallback: string
}

export const AI_IMAGE_STYLES: AIImagePreset[] = [
  {
    id: 'it_tech',
    label: '💻 IT & Software Tech',
    category: 'Technology',
    promptKeywords:
      'photorealistic modern tech company office in Guwahati Assam, Indian software engineers collaborating, multiple computer monitors with code, modern startup interior, warm cinematic lighting, 8k, professional photography, hyper-detailed, no text watermarks',
    curatedFallback:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&h=630&q=80',
  },
  {
    id: 'corporate_office',
    label: '🏢 Corporate & Business',
    category: 'Management',
    promptKeywords:
      'photorealistic Indian corporate conference room, professional executives discussing business strategy, modern glass office building, sunlit, premium executive atmosphere, 8k, award winning commercial photography, clean, no text',
    curatedFallback:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&h=630&q=80',
  },
  {
    id: 'interview_hr',
    label: '🤝 Job Interview & HR',
    category: 'Hiring',
    promptKeywords:
      'photorealistic job interview in Guwahati modern corporate office, professional HR manager speaking with confident young Indian candidate, resume document on table, natural bright lighting, 8k, no text',
    curatedFallback:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&h=630&q=80',
  },
  {
    id: 'guwahati_business',
    label: '🌆 Guwahati & Assam Hub',
    category: 'Regional Hub',
    promptKeywords:
      'photorealistic panoramic aerial view of Guwahati city Assam, GS road commercial business district, modern glass buildings, Brahmaputra river bridge in background, sunset golden hour, 8k, drone photography, no text',
    curatedFallback:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&h=630&q=80',
  },
  {
    id: 'bpo_calling',
    label: '📞 BPO & Customer Support',
    category: 'Customer Service',
    promptKeywords:
      'photorealistic customer service call center office in Guwahati, smiling young Indian professional with headset speaking politely, modern corporate desk, bright ambient lighting, 8k, no text',
    curatedFallback:
      'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=1200&h=630&q=80',
  },
  {
    id: 'banking_finance',
    label: '📊 Banking & Accounts',
    category: 'Finance',
    promptKeywords:
      'photorealistic banking and finance office in Assam, Indian accountant reviewing balance sheet on modern laptop, corporate finance desk, clean sharp focus, 8k, professional aesthetic, no text',
    curatedFallback:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&h=630&q=80',
  },
  {
    id: 'freshers_students',
    label: '🎓 Freshers & Graduates',
    category: 'Entry Level',
    promptKeywords:
      'photorealistic young Indian college graduates in Assam celebrating job placement, holding offer letter, smiling enthusiastically, modern campus garden, sunny day, 8k, inspiring career portrait, no text',
    curatedFallback:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&h=630&q=80',
  },
  {
    id: 'remote_work',
    label: '💼 Remote & Work From Home',
    category: 'Remote Work',
    promptKeywords:
      'photorealistic clean modern home office in Northeast India, young professional working on laptop, warm indoor plants, coffee cup, sunny window, cozy professional atmosphere, 8k, no text',
    curatedFallback:
      'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=1200&h=630&q=80',
  },
]

/**
 * Detect most relevant image style based on article topic and category
 */
export function detectImageStyle(topic: string, category?: string): AIImageStyle {
  const text = `${topic} ${category || ''}`.toLowerCase()

  if (
    text.includes('it') ||
    text.includes('software') ||
    text.includes('tech') ||
    text.includes('developer') ||
    text.includes('coding') ||
    text.includes('computer')
  ) {
    return 'it_tech'
  }

  if (
    text.includes('interview') ||
    text.includes('resume') ||
    text.includes('hr') ||
    text.includes('recruitment') ||
    text.includes('hiring') ||
    text.includes('selection')
  ) {
    return 'interview_hr'
  }

  if (
    text.includes('bpo') ||
    text.includes('telecaller') ||
    text.includes('customer') ||
    text.includes('call center') ||
    text.includes('support')
  ) {
    return 'bpo_calling'
  }

  if (
    text.includes('bank') ||
    text.includes('account') ||
    text.includes('finance') ||
    text.includes('tally') ||
    text.includes('gst')
  ) {
    return 'banking_finance'
  }

  if (
    text.includes('fresher') ||
    text.includes('12th') ||
    text.includes('10th') ||
    text.includes('graduate') ||
    text.includes('hs pass') ||
    text.includes('student') ||
    text.includes('entry level')
  ) {
    return 'freshers_students'
  }

  if (
    text.includes('remote') ||
    text.includes('work from home') ||
    text.includes('wfh') ||
    text.includes('freelance') ||
    text.includes('part time')
  ) {
    return 'remote_work'
  }

  if (
    text.includes('guwahati') ||
    text.includes('assam') ||
    text.includes('gs road') ||
    text.includes('beltola') ||
    text.includes('dispur') ||
    text.includes('zoo road') ||
    text.includes('location')
  ) {
    return 'guwahati_business'
  }

  return 'corporate_office'
}

/**
 * Generate AI image URL with high-detail prompt and unique seed
 */
export function generateAIImageUrl(options: {
  topic: string
  category?: string
  style?: AIImageStyle
  customPrompt?: string
  seed?: number
}): {
  url: string
  prompt: string
  style: AIImageStyle
  preset: AIImagePreset
} {
  const chosenStyle = options.style || detectImageStyle(options.topic, options.category)
  const preset =
    AI_IMAGE_STYLES.find((p) => p.id === chosenStyle) || AI_IMAGE_STYLES[0]

  let prompt: string
  if (options.customPrompt && options.customPrompt.trim()) {
    prompt = options.customPrompt.trim()
  } else {
    const cleanTopic = options.topic
      .replace(/[^\w\s-]/gi, '')
      .trim()
      .slice(0, 70)
    prompt = `Editorial career photo for "${cleanTopic}". ${preset.promptKeywords}`
  }

  const seed = options.seed || Math.floor(Math.random() * 900000) + 100000

  // Pollinations AI generator (1200x630 OpenGraph / Blog banner standard)
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?width=1200&height=630&nologo=true&seed=${seed}`

  return {
    url,
    prompt,
    style: chosenStyle,
    preset,
  }
}

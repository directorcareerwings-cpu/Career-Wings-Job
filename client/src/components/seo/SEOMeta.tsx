import React from 'react'
import { Helmet } from 'react-helmet-async'

interface SEOMetaProps {
  title?: string
  description?: string
  keywords?: string
  canonical?: string
  image?: string | null
  type?: 'website' | 'article'
  noindex?: boolean
  schema?: Record<string, any> | Record<string, any>[]
}

const SITE_NAME = 'Career Wings'
const SITE_URL = 'https://careerwings.in'
const DEFAULT_DESC =
  'Career Wings — Find jobs in Guwahati, Assam and Northeast India. Browse thousands of job openings from top companies.'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`

function normalizeCanonicalUrl(canonical?: string): string | undefined {
  if (!canonical) return undefined
  if (/^https?:\/\//i.test(canonical)) return canonical
  const cleanedPath = canonical.startsWith('/') ? canonical : `/${canonical}`
  return `${SITE_URL}${cleanedPath}`
}

function normalizeImageUrl(image?: string | null): string {
  if (!image) return DEFAULT_IMAGE
  if (/^https?:\/\//i.test(image)) return image
  const cleanedPath = image.startsWith('/') ? image : `/${image}`
  return `${SITE_URL}${cleanedPath}`
}

export function SEOMeta({
  title,
  description = DEFAULT_DESC,
  keywords,
  canonical,
  image,
  type = 'website',
  noindex = false,
  schema,
}: SEOMetaProps) {
  const fullTitle = title
    ? /career\s*wings/i.test(title)
      ? title
      : `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Jobs in Northeast India`

  const canonicalUrl = normalizeCanonicalUrl(canonical)
  const resolvedImage = normalizeImageUrl(image)
  const robotsDirective = noindex
    ? 'noindex,nofollow'
    : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robotsDirective} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={resolvedImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />

      {/* Structured Data */}
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  )
}

export default SEOMeta

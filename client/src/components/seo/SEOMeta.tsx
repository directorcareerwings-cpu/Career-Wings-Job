import React from 'react'
import { Helmet } from 'react-helmet-async'

interface SEOMetaProps {
  title?: string
  description?: string
  canonical?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

const SITE_NAME = 'Career Wings'
const SITE_URL = 'https://careerwings.in'
const DEFAULT_DESC =
  'Career Wings — Find jobs in Guwahati, Assam and Northeast India. Browse thousands of job openings from top companies.'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`

export function SEOMeta({
  title,
  description = DEFAULT_DESC,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
}: SEOMetaProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Jobs in Northeast India`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={`${SITE_URL}${canonical}`} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonical && <meta property="og:url" content={`${SITE_URL}${canonical}`} />}
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}

export default SEOMeta

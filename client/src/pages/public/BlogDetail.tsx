import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import {
  Clock,
  Calendar,
  Eye,
  User,
  ArrowLeft,
  Share2,
  Bookmark,
  CheckCircle,
  Briefcase,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Building2,
  Tag,
} from 'lucide-react'
import { blogAPI } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import SEOMeta from '@/components/seo/SEOMeta'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Spinner'
import type { BlogPost } from '@/types'
import toast from 'react-hot-toast'

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, isEmployer, isAdmin } = useAuth()
  const [copied, setCopied] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-post-detail', slug],
    queryFn: () => blogAPI.getPostBySlug(slug!),
    enabled: Boolean(slug),
  })

  const post: BlogPost | undefined = data?.data?.data?.post
  const relatedPosts: BlogPost[] = data?.data?.data?.relatedPosts || []

  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://www.careerwings.in/blog/${slug}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShareWhatsApp = () => {
    if (!post) return
    const text = encodeURIComponent(`Check out this article on Career Wings: ${post.title}\n\n${currentUrl}`)
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleShareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`, '_blank')
  }

  const handleShareTwitter = () => {
    if (!post) return
    const text = encodeURIComponent(`${post.title} via @CareerWings`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(currentUrl)}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-[360px] w-full rounded-3xl" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-grow max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            !
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Article Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">
            The article you are looking for may have been moved, unpublished, or does not exist.
          </p>
          <Button onClick={() => navigate('/blog')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog Directory
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  // Parse tags if present
  let parsedTags: string[] = []
  if (post.tags) {
    try {
      parsedTags = JSON.parse(post.tags)
    } catch {
      parsedTags = post.tags.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }

  // Article JSON-LD Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage
      ? (post.coverImage.startsWith('http') ? post.coverImage : `https://careerwings.in${post.coverImage}`)
      : 'https://careerwings.in/images/hero-banner-hd.png',
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: {
      '@type': 'Person',
      name: post.authorName,
      jobTitle: post.authorRole || 'Career Advisor',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Career Wings',
      logo: {
        '@type': 'ImageObject',
        url: 'https://careerwings.in/images/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://careerwings.in/blog/${post.slug}`,
    },
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEOMeta
        title={`${post.title} | Career Wings Blog`}
        description={post.excerpt}
        canonical={`/blog/${post.slug}`}
        image={post.coverImage || undefined}
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
      </Helmet>

      <Header />

      <main className="flex-grow">
        {/* Breadcrumb Navigation */}
        <div className="bg-slate-50 border-b border-slate-200/80 py-3.5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto no-scrollbar">
            <Link to="/" className="hover:text-blue-900 font-medium whitespace-nowrap">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Link to="/blog" className="hover:text-blue-900 font-medium whitespace-nowrap">Blog</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-800 font-semibold truncate">{post.title}</span>
          </div>
        </div>

        {/* Article Header */}
        <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <Link
              to={`/blog?category=${encodeURIComponent(post.category)}`}
              className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs font-black uppercase tracking-wider transition"
            >
              {post.category}
            </Link>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {post.readTimeMin} min read
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-5 font-display">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal mb-8 border-l-4 border-orange-500 pl-4 py-1 italic bg-orange-50/40 rounded-r-xl">
            {post.excerpt}
          </p>

          {/* Author & Meta bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {post.authorName.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">{post.authorName}</div>
                <div className="text-xs text-slate-500 font-medium">
                  {post.authorRole || 'Career Advisor'} &bull; Published on {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold mr-1 hidden sm:inline">Share:</span>
              <button
                onClick={handleShareWhatsApp}
                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition cursor-pointer"
                title="Share via WhatsApp"
              >
                <span className="text-xs font-bold">WA</span>
              </button>
              <button
                onClick={handleShareLinkedIn}
                className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center transition cursor-pointer"
                title="Share on LinkedIn"
              >
                <span className="text-xs font-bold">in</span>
              </button>
              <button
                onClick={handleShareTwitter}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
                title="Share on X"
              >
                <span className="text-xs font-bold">X</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Copy Article Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Featured Cover Image */}
        {post.coverImage && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-10">
            <div className="rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 max-h-[480px]">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Article Body Content */}
        <article className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
          <div
            className="prose prose-slate prose-lg max-w-none 
              prose-headings:font-display prose-headings:font-extrabold prose-headings:text-slate-900 
              prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2
              prose-h3:text-xl sm:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-blue-950
              prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-5
              prose-li:text-slate-700 prose-li:my-1
              prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-orange-50/50 prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-blockquote:text-slate-800 prose-blockquote:font-medium
              prose-strong:text-slate-900 prose-strong:font-bold"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {parsedTags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-2">
                <Tag className="w-3.5 h-3.5" /> Tags:
              </span>
              {parsedTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Author Bio Card */}
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white font-bold flex items-center justify-center text-2xl shrink-0 shadow-md shadow-blue-900/20">
              {post.authorName.charAt(0)}
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
                Written by
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">{post.authorName}</h4>
              <p className="text-xs font-medium text-slate-500 mb-3">{post.authorRole || 'Career Advisor at Career Wings'}</p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Dedicated to helping job seekers across Assam and Northeast India connect with verified employers, build high-impact resumes, and advance their professional journey with 100% transparent hiring.
              </p>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="bg-slate-50 border-t border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                    Related Career Guides
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    More articles in {post.category}
                  </p>
                </div>
                <Link
                  to="/blog"
                  className="text-xs font-bold text-blue-900 hover:text-orange-600 transition flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/blog/${rel.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                        {rel.category}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 leading-snug group-hover:text-blue-900 transition mt-2 mb-2 line-clamp-2">
                        {rel.title}
                      </h4>
                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                        {rel.excerpt}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>{new Date(rel.publishedAt || rel.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="flex items-center gap-1 text-blue-900 font-bold group-hover:text-orange-600">
                        Read <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA Box */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
              Take the next step in your career today
            </h3>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-6">
              Search verified job openings in Guwahati, Dibrugarh, Silchar, and across Northeast India. No middle-men, no placement fees.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/jobs">
                <Button size="lg" className="rounded-2xl px-6 bg-orange-600 hover:bg-orange-700 text-white font-bold border-0 shadow-lg shadow-orange-600/30">
                  Search 15,000+ Jobs
                </Button>
              </Link>
              <Link
                to={
                  isAuthenticated
                    ? isEmployer || isAdmin
                      ? '/employer/jobs/post'
                      : '/login?redirect=/employer/jobs/post'
                    : '/register?role=EMPLOYER&redirect=/employer/jobs/post'
                }
                rel={isAuthenticated && (isEmployer || isAdmin) ? undefined : 'nofollow'}
              >
                <Button size="lg" variant="outline" className="rounded-2xl px-6 border-white/30 text-white hover:bg-white/10 font-bold">
                  Post a Job for Free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

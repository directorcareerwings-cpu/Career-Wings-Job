import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  BookOpen,
  Clock,
  Eye,
  Calendar,
  ArrowRight,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Tag,
  User,
  Share2,
  CheckCircle,
  Briefcase,
} from 'lucide-react'
import { blogAPI } from '@/lib/api'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import SEOMeta from '@/components/seo/SEOMeta'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Spinner'
import type { BlogPost } from '@/types'

const CATEGORIES = [
  'All',
  'Career Advice',
  'Resume Tips',
  'Interview Tips',
  'Hiring & Recruitment',
  'Industry Insights',
]

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || 'All'
  const initialSearch = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [searchInput, setSearchInput] = useState(initialSearch)

  // Fetch blog posts
  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-posts', activeCategory, initialSearch, page],
    queryFn: () =>
      blogAPI.getPosts({
        category: activeCategory !== 'All' ? activeCategory : undefined,
        search: initialSearch.trim() || undefined,
        page,
        limit: 9,
      }),
  })

  const posts: BlogPost[] = data?.data?.data?.posts || []
  const pagination = data?.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 }

  // Separate featured article if on page 1 and no search
  const featuredPost =
    page === 1 && !initialSearch && activeCategory === 'All'
      ? posts.find((p) => p.isFeatured) || posts[0]
      : null

  const regularPosts = featuredPost
    ? posts.filter((p) => p.id !== featuredPost.id)
    : posts

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextParams = new URLSearchParams(searchParams)
    if (searchInput.trim()) {
      nextParams.set('search', searchInput.trim())
    } else {
      nextParams.delete('search')
    }
    nextParams.set('page', '1')
    setSearchParams(nextParams)
  }

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat)
    const nextParams = new URLSearchParams(searchParams)
    if (cat !== 'All') {
      nextParams.set('category', cat)
    } else {
      nextParams.delete('category')
    }
    nextParams.set('page', '1')
    setSearchParams(nextParams)
  }

  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(newPage))
    setSearchParams(nextParams)
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEOMeta
        title="Career Wings Blog | Career Advice, Resume Tips & Job Insights in Northeast India"
        description="Read expert career guides, resume tips, interview preparation strategies, and hiring trends tailored for job seekers and employers in Assam and Northeast India."
        canonical="/blog"
      />

      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_50%)] pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Career Wings Editorial &amp; Career Insights</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight font-display">
              Navigate Your Career in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">
                Northeast India
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              Actionable interview guides, resume templates, local hiring trends, and career roadmaps curated by Assam's leading talent experts.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto relative flex items-center">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search articles (e.g., Resume, Interview, Guwahati IT jobs)..."
                  className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white/15 transition"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Categories Pills Navigation */}
        <section className="bg-white border-b border-slate-200/80 sticky top-16 z-20 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Featured Post Card (Hero Spotlight) */}
          {featuredPost && (
            <div className="mb-14">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-600 mb-4">
                <Sparkles className="w-4 h-4" />
                <span>Featured Guide</span>
              </div>

              <div className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg hover:shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-7 relative overflow-hidden bg-slate-900 min-h-[260px] sm:min-h-[340px]">
                  <img
                    src={featuredPost.coverImage || '/images/hero-banner.png'}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:hidden" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                      {featuredPost.category}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 md:p-10 flex flex-col justify-between">
                  <div>
                    <div className="hidden lg:inline-block mb-3">
                      <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
                        {featuredPost.category}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-blue-900 transition-colors mb-3">
                      <Link to={`/blog/${featuredPost.slug}`}>
                        {featuredPost.title}
                      </Link>
                    </h2>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed line-clamp-3 mb-6">
                      {featuredPost.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                        {featuredPost.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {featuredPost.authorName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{new Date(featuredPost.publishedAt || featuredPost.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {featuredPost.readTimeMin} min read
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/blog/${featuredPost.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs"
                    >
                      <span>Read Guide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Header */}
          <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                {activeCategory === 'All' ? 'Latest Articles & Career Insights' : `${activeCategory} Articles`}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {pagination.total} published guides to accelerate your career
              </p>
            </div>

            {initialSearch && (
              <button
                onClick={() => {
                  setSearchInput('')
                  const next = new URLSearchParams(searchParams)
                  next.delete('search')
                  setSearchParams(next)
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold"
              >
                Clear Search
              </button>
            )}
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                  <Skeleton className="h-44 w-full rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="text-center py-16 bg-white rounded-3xl border border-red-100 p-8">
              <p className="text-red-600 font-bold mb-2">Unable to load blog articles right now.</p>
              <p className="text-slate-500 text-xs mb-4">Please try refreshing the page.</p>
              <Button size="sm" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && posts.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-800 mb-1">No articles found</h4>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
                We couldn't find any articles matching your search or category filter. Try selecting "All" or using different keywords.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveCategory('All')
                  setSearchInput('')
                  setSearchParams({})
                }}
              >
                Reset Filters
              </Button>
            </div>
          )}

          {/* Regular Posts Grid */}
          {!isLoading && regularPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularPosts.map((post) => (
                <article
                  key={post.id}
                  className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Cover Image */}
                    <div className="relative aspect-video overflow-hidden bg-slate-900">
                      <img
                        src={post.coverImage || '/images/hero-banner.png'}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-blue-950 text-[11px] font-black uppercase tracking-wider shadow-xs">
                          {post.category}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {post.readTimeMin} min read
                        </span>
                      </div>

                      <h4 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-900 transition-colors mb-2.5 line-clamp-2">
                        <Link to={`/blog/${post.slug}`}>
                          {post.title}
                        </Link>
                      </h4>

                      <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 pb-6 pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {post.authorName.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                        {post.authorName}
                      </span>
                    </div>

                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-xs font-bold text-blue-900 group-hover:text-orange-600 transition-colors flex items-center gap-1"
                    >
                      <span>Read More</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition cursor-pointer ${
                    page === p
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}

              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>

        {/* Career Wings Job Seeker CTA */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Northeast India Job Opportunities</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                Ready to put these tips into practice?
              </h3>
              <p className="text-slate-300 text-sm sm:text-base max-w-xl">
                Explore 15,000+ verified job vacancies in Guwahati, Assam, Meghalaya, and across Northeast India with zero placement charges.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <Link to="/jobs">
                <Button size="lg" className="rounded-2xl px-6 bg-orange-600 hover:bg-orange-700 text-white font-bold border-0 shadow-lg shadow-orange-600/30">
                  Explore Jobs
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="rounded-2xl px-6 border-white/30 text-white hover:bg-white/10 font-bold">
                  Create Free Profile
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

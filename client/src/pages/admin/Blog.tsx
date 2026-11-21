import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  Save,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import AdminLayout from '@/components/layout/AdminLayout'
import { blogAPI } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Spinner'
import type { BlogPost } from '@/types'
import toast from 'react-hot-toast'

const PRESET_CATEGORIES = [
  'Career Advice',
  'Resume Tips',
  'Interview Tips',
  'Hiring & Recruitment',
  'Industry Insights',
  'Workplace Culture',
]

export default function AdminBlog() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')
  const [page, setPage] = useState(1)

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formCategory, setFormCategory] = useState('Career Advice')
  const [formExcerpt, setFormExcerpt] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCoverImage, setFormCoverImage] = useState('')
  const [formAuthorName, setFormAuthorName] = useState('Career Wings Editorial Team')
  const [formAuthorRole, setFormAuthorRole] = useState('Career Advisor')
  const [formReadTimeMin, setFormReadTimeMin] = useState(5)
  const [formIsFeatured, setFormIsFeatured] = useState(false)
  const [formIsPublished, setFormIsPublished] = useState(true)

  // Fetch admin posts
  const { data, isLoading } = useQuery({
    queryKey: ['admin-blog-posts', page, search, statusFilter],
    queryFn: () =>
      blogAPI.adminGetPosts({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  })

  const posts: BlogPost[] = data?.data?.data?.posts || []
  const pagination = data?.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 }

  // Quick stats
  const totalCount = pagination.total || 0
  const publishedCount = posts.filter((p) => p.isPublished).length
  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0)

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newPost: any) => blogAPI.adminCreatePost(newPost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
      toast.success('Article created and published successfully!')
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create article')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => blogAPI.adminUpdatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
      toast.success('Article updated successfully!')
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update article')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogAPI.adminDeletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
      toast.success('Article deleted successfully')
      setDeleteConfirmId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete article')
    },
  })

  const openCreateModal = () => {
    setEditingPost(null)
    setFormTitle('')
    setFormSlug('')
    setFormCategory('Career Advice')
    setFormExcerpt('')
    setFormContent(
      `<h2>Introduction</h2>\n<p>Write your article opening here...</p>\n\n<h3>Key Point 1</h3>\n<p>Explain your recommendation...</p>\n\n<blockquote>\n"Important insight or takeaway quote here"\n</blockquote>\n\n<h3>Summary & Actionable Steps</h3>\n<ul>\n  <li>Action step 1</li>\n  <li>Action step 2</li>\n</ul>`
    )
    setFormCoverImage('/images/hero-banner.png')
    setFormAuthorName('Career Wings Editorial Team')
    setFormAuthorRole('Career Advisor')
    setFormReadTimeMin(5)
    setFormIsFeatured(false)
    setFormIsPublished(true)
    setIsModalOpen(true)
  }

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post)
    setFormTitle(post.title)
    setFormSlug(post.slug)
    setFormCategory(post.category)
    setFormExcerpt(post.excerpt)
    setFormContent(post.content)
    setFormCoverImage(post.coverImage || '')
    setFormAuthorName(post.authorName)
    setFormAuthorRole(post.authorRole || 'Career Advisor')
    setFormReadTimeMin(post.readTimeMin)
    setFormIsFeatured(post.isFeatured)
    setFormIsPublished(post.isPublished)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPost(null)
  }

  const handleTitleChange = (val: string) => {
    setFormTitle(val)
    if (!editingPost) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormSlug(generated)
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formExcerpt.trim() || !formContent.trim()) {
      toast.error('Please fill in Title, Excerpt, and Article Content.')
      return
    }

    const payload = {
      title: formTitle.trim(),
      slug: formSlug.trim() || undefined,
      category: formCategory,
      excerpt: formExcerpt.trim(),
      content: formContent.trim(),
      coverImage: formCoverImage.trim() || undefined,
      authorName: formAuthorName.trim(),
      authorRole: formAuthorRole.trim(),
      readTimeMin: formReadTimeMin,
      isFeatured: formIsFeatured,
      isPublished: formIsPublished,
    }

    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleTogglePublish = (post: BlogPost) => {
    updateMutation.mutate({
      id: post.id,
      data: { isPublished: !post.isPublished },
    })
  }

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-blue-900" />
              <span>Blog &amp; Career Articles</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Publish SEO-optimized career advice, resume templates, and hiring insights for Northeast India.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Blog</span>
            </a>
            <Button
              onClick={openCreateModal}
              className="bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Write New Article</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Articles
            </div>
            <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              Active / Published
            </div>
            <div className="text-2xl font-black text-emerald-600">{publishedCount}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
              Total Pageviews
            </div>
            <div className="text-2xl font-black text-orange-600">{totalViews}</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by title, excerpt, author..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-900"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-blue-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No articles found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No blog posts match your current filter. Click "Write New Article" to publish your first guide.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Article Details</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Author</th>
                    <th className="py-3.5 px-4">Views</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6 max-w-sm">
                        <div className="flex items-center gap-2 mb-1">
                          {post.isFeatured && (
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Featured
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 line-clamp-1 text-sm">
                          {post.title}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                          /blog/{post.slug}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 text-xs font-semibold">
                          {post.category}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs font-medium text-slate-700">
                        {post.authorName}
                      </td>

                      <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          {post.views}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                            post.isPublished
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {post.isPublished ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-900 transition rounded-lg hover:bg-slate-100"
                            title="Preview live"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => openEditModal(post)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 transition rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Edit Article"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(post.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Delete Article"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing Page {page} of {pagination.totalPages}</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Create / Edit Article Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {editingPost ? 'Edit Blog Article' : 'Write New Career Guide'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fill in details below to publish to Career Wings Blog &amp; Google News Sitemap.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Article Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., Top In-Demand IT Careers in Guwahati for 2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-900 font-semibold"
                  />
                </div>

                {/* Slug & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      required
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="top-in-demand-it-careers-guwahati"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 focus:outline-none focus:border-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-900 font-medium bg-white"
                    >
                      {PRESET_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Short Summary / Excerpt * (Used in Search Results &amp; Cards)
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formExcerpt}
                    onChange={(e) => setFormExcerpt(e.target.value)}
                    placeholder="Provide a concise 2-sentence summary of the article..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-900 leading-relaxed"
                  />
                </div>

                {/* Cover Image URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cover Image URL
                  </label>
                  <input
                    type="text"
                    value={formCoverImage}
                    onChange={(e) => setFormCoverImage(e.target.value)}
                    placeholder="/images/hero-banner.png or https://example.com/cover.jpg"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-900 font-mono"
                  />
                </div>

                {/* Author Name, Role & Read Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Author Name
                    </label>
                    <input
                      type="text"
                      value={formAuthorName}
                      onChange={(e) => setFormAuthorName(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Author Role
                    </label>
                    <input
                      type="text"
                      value={formAuthorRole}
                      onChange={(e) => setFormAuthorRole(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Est. Read Time (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={formReadTimeMin}
                      onChange={(e) => setFormReadTimeMin(parseInt(e.target.value, 10) || 5)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Article Content (HTML / Formatted Text) *
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Supports &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;blockquote&gt;
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Write article content here..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:border-blue-900 bg-slate-50/50"
                  />
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsPublished}
                      onChange={(e) => setFormIsPublished(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900"
                    />
                    <span>Publish Immediately</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-600"
                    />
                    <span className="flex items-center gap-1 text-orange-600">
                      <Sparkles className="w-3.5 h-3.5" /> Spotlight as Featured Hero Guide
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    <span>{editingPost ? 'Save Changes' : 'Publish Article'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">Delete Article?</h4>
              <p className="text-xs text-slate-500 mb-5">
                This action cannot be undone. The article and its public URL will be permanently removed.
              </p>
              <div className="flex items-center justify-center gap-2.5">
                <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteConfirmId)}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

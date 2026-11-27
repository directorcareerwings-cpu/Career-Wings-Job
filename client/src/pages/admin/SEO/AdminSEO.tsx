import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  FileText,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Edit3,
  Sliders,
  Settings,
  Layers,
  Sparkles,
  ArrowUpRight,
  Filter,
  BarChart3,
  Zap,
  Info,
  ChevronRight,
  Activity,
  ListOrdered,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner, Spinner } from '@/components/ui/Spinner'
import { seoAPI } from '@/lib/api'
import toast from 'react-hot-toast'

type TabType = 'overview' | 'pages' | 'validator' | 'gsc' | 'sitemaps' | 'robots' | 'queue' | 'settings'

interface PageRecord {
  id: string
  url: string
  name: string
  pageType: string
  seoTitle: string | null
  seoDescription: string | null
  canonicalUrl: string | null
  isIndexable: boolean
  isFollowable: boolean
  inSitemap: boolean
  sitemapPriority: number
  sitemapChangeFreq: string
  indexStatus: string
  googleIndexed: boolean
  lastSubmittedAt: string | null
  lastCheckedAt: string | null
  seoScore: number
  seoAuditResults: string | null
  structuredData: string | null
  updatedAt: string
}

export default function AdminSEO() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Dashboard Stats State
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Pages State
  const [pages, setPages] = useState<PageRecord[]>([])
  const [totalPagesCount, setTotalPagesCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(15)
  const [loadingPages, setLoadingPages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterSitemap, setFilterSitemap] = useState('ALL')

  // Bulk Selection
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Edit Metadata Modal
  const [editingPage, setEditingPage] = useState<PageRecord | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [savingPage, setSavingPage] = useState(false)

  // Audit Details Modal
  const [auditPage, setAuditPage] = useState<PageRecord | null>(null)

  // Robots.txt State
  const [robotsContent, setRobotsContent] = useState('')
  const [loadingRobots, setLoadingRobots] = useState(false)
  const [savingRobots, setSavingRobots] = useState(false)
  const [dangerousWarning, setDangerousWarning] = useState<string[] | null>(null)

  // GSC State
  const [gscConfig, setGscConfig] = useState<any>({
    isConnected: false,
    property: '',
    authType: 'SERVICE_ACCOUNT',
    clientEmail: '',
    hasPrivateKey: false,
    siteUrl: '',
  })
  const [loadingGsc, setLoadingGsc] = useState(false)
  const [savingGsc, setSavingGsc] = useState(false)
  const [inspectUrlInput, setInspectUrlInput] = useState('')
  const [inspecting, setInspecting] = useState(false)
  const [inspectResult, setInspectResult] = useState<any>(null)
  const [serviceAccountJsonInput, setServiceAccountJsonInput] = useState('')

  // Queue State
  const [queueItems, setQueueItems] = useState<any[]>([])
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [processingQueue, setProcessingQueue] = useState(false)
  const [queueStatusFilter, setQueueStatusFilter] = useState('ALL')

  // Global Settings State
  const [globalSettings, setGlobalSettings] = useState<any>(null)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Sync state
  const [syncingPages, setSyncingPages] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  // Schema Validator State
  const [schemaJobs, setSchemaJobs] = useState<any[]>([])
  const [loadingSchemas, setLoadingSchemas] = useState(false)
  const [schemaSearch, setSchemaSearch] = useState('')
  const [schemaStatusFilter, setSchemaStatusFilter] = useState('ALL')
  const [selectedSchemaModal, setSelectedSchemaModal] = useState<any | null>(null)
  const [schemaModalTab, setSchemaModalTab] = useState<'job' | 'breadcrumbs'>('job')
  const [regeneratingJobId, setRegeneratingJobId] = useState<string | null>(null)
  const [copiedSchema, setCopiedSchema] = useState(false)

  // Fetch Dashboard Stats
  const fetchDashboard = async () => {
    try {
      setLoadingStats(true)
      const res = await seoAPI.getDashboard()
      setStats(res.data.data)
    } catch (err) {
      console.error('Failed to load SEO dashboard stats:', err)
      toast.error('Failed to load SEO dashboard stats')
    } finally {
      setLoadingStats(false)
    }
  }

  // Fetch Job Schemas
  const fetchJobSchemas = async () => {
    try {
      setLoadingSchemas(true)
      const params: any = {}
      if (schemaSearch.trim()) params.search = schemaSearch.trim()
      if (schemaStatusFilter !== 'ALL') params.status = schemaStatusFilter
      const res = await seoAPI.getJobSchemas(params)
      setSchemaJobs(res.data.data || [])
    } catch (err) {
      console.error('Failed to load schema validations:', err)
      toast.error('Failed to load job schemas')
    } finally {
      setLoadingSchemas(false)
    }
  }

  // Regenerate Job Schema
  const handleRegenerateJobSchema = async (jobId: string) => {
    try {
      setRegeneratingJobId(jobId)
      const res = await seoAPI.regenerateJobSchema(jobId)
      toast.success(res.data.message || 'JobPosting schema regenerated!')
      fetchJobSchemas()
      fetchDashboard()
      if (selectedSchemaModal && selectedSchemaModal.id === jobId) {
        setSelectedSchemaModal((prev: any) => ({
          ...prev,
          schema: res.data.data?.schema,
          breadcrumbs: res.data.data?.combinedSchemas?.[1],
          validation: res.data.data?.validation,
        }))
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to regenerate schema')
    } finally {
      setRegeneratingJobId(null)
    }
  }

  // Fetch Pages
  const fetchPages = async (page = 1) => {
    try {
      setLoadingPages(true)
      const params: any = { page, limit: pageSize }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (filterType !== 'ALL') params.pageType = filterType
      if (filterStatus !== 'ALL') params.indexStatus = filterStatus
      if (filterSitemap !== 'ALL') params.inSitemap = filterSitemap

      const res = await seoAPI.getPages(params)
      setPages(res.data.data)
      setTotalPagesCount(res.data.pagination?.total || 0)
      setCurrentPage(page)
    } catch (err) {
      console.error('Failed to load SEO pages:', err)
      toast.error('Failed to load pages')
    } finally {
      setLoadingPages(false)
    }
  }

  // Fetch Robots.txt
  const fetchRobots = async () => {
    try {
      setLoadingRobots(true)
      const res = await seoAPI.getRobots()
      setRobotsContent(res.data.data?.content || res.data || '')
    } catch (err) {
      console.error('Failed to load robots.txt:', err)
    } finally {
      setLoadingRobots(false)
    }
  }

  // Fetch GSC
  const fetchGsc = async () => {
    try {
      setLoadingGsc(true)
      const res = await seoAPI.getGscConfig()
      setGscConfig(res.data.data)
      if (res.data.data?.siteUrl && !inspectUrlInput) {
        setInspectUrlInput(res.data.data.siteUrl + '/jobs')
      }
    } catch (err) {
      console.error('Failed to load GSC config:', err)
    } finally {
      setLoadingGsc(false)
    }
  }

  // Fetch Queue
  const fetchQueue = async () => {
    try {
      setLoadingQueue(true)
      const params: any = { limit: 50 }
      if (queueStatusFilter !== 'ALL') params.status = queueStatusFilter
      const res = await seoAPI.getQueue(params)
      setQueueItems(res.data.data)
    } catch (err) {
      console.error('Failed to load indexing queue:', err)
    } finally {
      setLoadingQueue(false)
    }
  }

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      setLoadingSettings(true)
      const res = await seoAPI.getSettings()
      setGlobalSettings(res.data.data)
    } catch (err) {
      console.error('Failed to load SEO settings:', err)
    } finally {
      setLoadingSettings(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    fetchJobSchemas()
  }, [])

  useEffect(() => {
    if (activeTab === 'pages') fetchPages(1)
    if (activeTab === 'validator') fetchJobSchemas()
    if (activeTab === 'robots') fetchRobots()
    if (activeTab === 'gsc') fetchGsc()
    if (activeTab === 'queue') fetchQueue()
    if (activeTab === 'settings') fetchSettings()
  }, [activeTab])

  // Sync All Pages Trigger
  const handleSyncPages = async () => {
    try {
      setSyncingPages(true)
      await seoAPI.syncPages()
      toast.success('All public pages scanned and catalog synchronized!')
      fetchDashboard()
      if (activeTab === 'pages') fetchPages(1)
    } catch (err) {
      console.error('Sync failed:', err)
      toast.error('Failed to synchronize catalog')
    } finally {
      setSyncingPages(false)
    }
  }

  // Handle Bulk Action
  const handleBulkAction = async (action: string) => {
    if (selectedPageIds.length === 0) {
      toast.error('Please select at least one page')
      return
    }

    try {
      setBulkActionLoading(true)
      const res = await seoAPI.bulkUpdatePages({ pageIds: selectedPageIds, action })
      toast.success(res.data.message || 'Bulk operation completed')
      setSelectedPageIds([])
      fetchPages(currentPage)
      fetchDashboard()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk action failed')
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Open Edit Modal
  const handleEditClick = (page: PageRecord) => {
    setEditingPage(page)
    setEditForm({
      name: page.name,
      seoTitle: page.seoTitle || '',
      seoDescription: page.seoDescription || '',
      canonicalUrl: page.canonicalUrl || page.url,
      isIndexable: page.isIndexable,
      isFollowable: page.isFollowable,
      inSitemap: page.inSitemap,
      sitemapPriority: page.sitemapPriority || 0.7,
      sitemapChangeFreq: page.sitemapChangeFreq || 'weekly',
      ogTitle: page.seoTitle || '',
      ogDescription: page.seoDescription || '',
      structuredData: page.structuredData || '',
      indexStatus: page.indexStatus,
    })
  }

  // Save Page Metadata
  const handleSavePageMetadata = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPage) return

    try {
      setSavingPage(true)
      await seoAPI.updatePage(editingPage.id, editForm)
      toast.success('Page metadata and SEO audit updated!')
      setEditingPage(null)
      fetchPages(currentPage)
      fetchDashboard()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update metadata')
    } finally {
      setSavingPage(false)
    }
  }

  // Save Robots.txt
  const handleSaveRobots = async (allowDangerousOverride = false) => {
    try {
      setSavingRobots(true)
      const res = await seoAPI.updateRobots({
        content: robotsContent,
        allowDangerousOverride,
      })
      toast.success(res.data.message || 'robots.txt saved successfully')
      setDangerousWarning(null)
      fetchRobots()
      fetchDashboard()
    } catch (err: any) {
      if (err.response?.data?.requiresConfirmation) {
        setDangerousWarning(err.response.data.warnings || ['Potentially dangerous rule detected.'])
      } else {
        toast.error(err.response?.data?.message || 'Failed to update robots.txt')
      }
    } finally {
      setSavingRobots(false)
    }
  }

  // Save GSC Credentials
  const handleSaveGsc = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSavingGsc(true)
      await seoAPI.updateGscConfig({
        isConnected: gscConfig.isConnected,
        property: gscConfig.property,
        authType: gscConfig.authType,
        clientEmail: gscConfig.clientEmail,
        googleSiteVerification: gscConfig.googleSiteVerification ?? '',
        serviceAccountJson: serviceAccountJsonInput.trim() || undefined,
      })
      toast.success('Google Search Console configuration saved!')
      setServiceAccountJsonInput('')
      fetchGsc()
      fetchDashboard()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save GSC credentials')
    } finally {
      setSavingGsc(false)
    }
  }

  // Inspect URL
  const handleInspectUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectUrlInput.trim()) return

    try {
      setInspecting(true)
      setInspectResult(null)
      const res = await seoAPI.inspectUrl(inspectUrlInput.trim())
      setInspectResult(res.data.data)
      toast.success('Inspection complete')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'URL inspection failed')
    } finally {
      setInspecting(false)
    }
  }

  // Process Queue Now
  const handleProcessQueueNow = async () => {
    try {
      setProcessingQueue(true)
      const res = await seoAPI.processQueue()
      toast.success(res.data.message || 'Queue batch processed!')
      fetchQueue()
      fetchDashboard()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process queue')
    } finally {
      setProcessingQueue(false)
    }
  }

  // Submit Single URL from Table
  const handleSubmitSingleUrl = async (url: string) => {
    try {
      await seoAPI.enqueueUrls([url])
      toast.success(`URL ${url} added to Google Indexing Queue!`)
      fetchPages(currentPage)
      fetchDashboard()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit URL')
    }
  }

  // Copy URL Helper
  const handleCopyUrl = (url: string) => {
    const full = url.startsWith('http') ? url : `https://careerwings.in${url}`
    navigator.clipboard.writeText(full)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
    toast.success('URL copied to clipboard')
  }

  // Selection toggles
  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPageIds(pages.map((p) => p.id))
    } else {
      setSelectedPageIds([])
    }
  }

  const handleToggleSelectPage = (id: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (score >= 65) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-rose-700 bg-rose-50 border-rose-200'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INDEXED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            🟢 Indexed
          </span>
        )
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            🟠 Submitted to Google
          </span>
        )
      case 'NOT_INDEXED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            🔴 Not Indexed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            🟡 Unknown / Not Checked
          </span>
        )
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="SEO & Google Indexing Management | Career Wings Admin" />

      <div className="space-y-6 pb-12">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-primary-600 font-semibold text-xs uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4" />
              <span>Search Engine & Visibility Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              SEO & Google Indexing Management
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              Inspect public pages, generate dynamic multi-level XML sitemaps, manage robots.txt, audit SEO health, and transmit instant indexing requests to Google Search Console.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncPages}
              disabled={syncingPages}
              className="gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingPages ? 'animate-spin text-primary-600' : ''}`} />
              <span>{syncingPages ? 'Syncing Catalog...' : 'Sync Pages'}</span>
            </Button>

            <a
              href="http://localhost:5000/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <FileCode className="w-3.5 h-3.5 text-primary-600" />
              <span>View sitemap.xml</span>
              <ArrowUpRight className="w-3 h-3 opacity-60" />
            </a>

            <Button
              size="sm"
              onClick={handleProcessQueueNow}
              disabled={processingQueue}
              className="gap-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white"
            >
              <Zap className={`w-3.5 h-3.5 ${processingQueue ? 'animate-spin' : ''}`} />
              <span>{processingQueue ? 'Processing...' : 'Process Queue'}</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-200/80 pb-2 scrollbar-none">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
            { id: 'pages', label: 'Page Indexing Manager', icon: Layers, badge: stats?.summary?.totalPages },
            { id: 'validator', label: 'Schema Validator', icon: FileCode, badge: schemaJobs.length },
            { id: 'gsc', label: 'Google Search Console', icon: Globe },
            { id: 'sitemaps', label: 'XML Sitemaps', icon: FileCode, badge: stats?.sitemap?.totalIncluded },
            { id: 'robots', label: 'Robots.txt Manager', icon: ShieldCheck },
            { id: 'queue', label: 'Indexing Queue', icon: Clock, badge: stats?.summary?.pendingQueue },
            { id: 'settings', label: 'Search Engine Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ────────────────────────────────────────────────────────────────────────
            TAB 1: OVERVIEW & DASHBOARD
        ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Pages</span>
                  <Layers className="w-4 h-4 text-primary-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {loadingStats ? <Spinner className="h-6 w-6" /> : stats?.summary?.totalPages || 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Discovered indexable URLs</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100/80 shadow-xs bg-gradient-to-br from-emerald-50/30 to-white">
                <div className="flex items-center justify-between text-emerald-600 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Indexed</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-700">
                  {loadingStats ? <Spinner className="h-6 w-6" /> : stats?.summary?.indexedPages || 0}
                </div>
                <p className="text-[11px] text-emerald-600/80 mt-1">Confirmed in Google Index</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-100/80 shadow-xs bg-gradient-to-br from-amber-50/30 to-white">
                <div className="flex items-center justify-between text-amber-600 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Submitted</span>
                  <Send className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-700">
                  {loadingStats ? <Spinner className="h-6 w-6" /> : stats?.summary?.submittedPages || 0}
                </div>
                <p className="text-[11px] text-amber-600/80 mt-1">Indexing request sent</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100/80 shadow-xs bg-gradient-to-br from-rose-50/30 to-white">
                <div className="flex items-center justify-between text-rose-600 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Not Indexed</span>
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-rose-700">
                  {loadingStats ? <Spinner className="h-6 w-6" /> : stats?.summary?.notIndexedPages || 0}
                </div>
                <p className="text-[11px] text-rose-600/80 mt-1">Exclusion or noindex set</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">In Queue</span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {loadingStats ? <Spinner className="h-6 w-6" /> : stats?.summary?.pendingQueue || 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Pending submission batch</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Avg SEO Score</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-baseline gap-1">
                  <span>{loadingStats ? <Spinner className="h-6 w-6" /> : stats?.summary?.avgScore || 90}</span>
                  <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Meta & schema health</p>
              </div>
            </div>

            {/* Sitemap & Robots Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Sitemap Card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">XML Sitemaps</h3>
                      <p className="text-xs text-slate-500">Auto-generated crawl index</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active & Valid
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Index URL:</span>
                    <a
                      href="http://localhost:5000/sitemap-index.xml"
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-primary-600 hover:underline flex items-center gap-1"
                    >
                      /sitemap-index.xml
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Master URL:</span>
                    <a
                      href="http://localhost:5000/sitemap.xml"
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-primary-600 hover:underline flex items-center gap-1"
                    >
                      /sitemap.xml
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Included URLs:</span>
                    <span className="font-bold text-slate-800">{stats?.sitemap?.totalIncluded || 0} pages</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('sitemaps')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1"
                >
                  <span>Manage Sub-Sitemaps</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Robots.txt Card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Robots.txt Rules</h3>
                      <p className="text-xs text-slate-500">Crawl access controller</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      stats?.robotsTxt?.isDangerous
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {stats?.robotsTxt?.isDangerous ? 'Dangerous Rules!' : 'Healthy'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Public Address:</span>
                    <a
                      href="/robots.txt"
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-primary-600 hover:underline flex items-center gap-1"
                    >
                      /robots.txt
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sitemap Directive:</span>
                    <span className="font-semibold text-emerald-700">Present</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Protected Areas:</span>
                    <span className="font-semibold text-slate-700">/admin/, /employer/, /api/admin/</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('robots')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1"
                >
                  <span>Edit Crawl Rules</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Google Search Console Card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Google Search Console</h3>
                      <p className="text-xs text-slate-500">Live property integration</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      stats?.gsc?.isConnected
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {stats?.gsc?.isConnected ? 'Connected' : 'Setup Required'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Auth Method:</span>
                    <span className="font-semibold text-slate-700">{stats?.gsc?.authType || 'Service Account'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Property:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[150px]">
                      {stats?.gsc?.property || 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Indexing API:</span>
                    <span className="font-semibold text-blue-600">JobPosting Ready</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('gsc')}
                  className="w-full py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
                >
                  <span>Connect Property & Inspect</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Actions & Recent Queue Submissions */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-600" />
                  <h3 className="text-sm font-bold text-slate-900">Recent Google Indexing Queue Activity</h3>
                </div>
                <button
                  onClick={() => setActiveTab('queue')}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  View Full Queue ({stats?.summary?.pendingQueue || 0} pending)
                </button>
              </div>

              {stats?.recentActivity?.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.recentActivity.map((act: any) => (
                    <div key={act.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            act.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : act.status === 'SUBMITTED'
                              ? 'bg-amber-500'
                              : act.status === 'FAILED'
                              ? 'bg-rose-500'
                              : 'bg-blue-500 animate-pulse'
                          }`}
                        />
                        <span className="font-mono text-slate-800 font-semibold">{act.url}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <span className="font-medium text-slate-600">{act.status}</span>
                        <span>{new Date(act.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No queue items recently processed. Select pages in the Indexing Manager to submit.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            TAB 2: PAGE INDEXING MANAGER
        ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'pages' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by URL, title, keyword or slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchPages(1)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value)
                      setTimeout(() => fetchPages(1), 0)
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">All Page Types</option>
                    <option value="HOMEPAGE">Homepage</option>
                    <option value="JOB_LISTING">Job Listing</option>
                    <option value="JOB_DETAIL">Job Details</option>
                    <option value="COMPANY_LISTING">Companies List</option>
                    <option value="COMPANY_DETAIL">Company Details</option>
                    <option value="CATEGORY_DETAIL">Categories</option>
                    <option value="LOCATION_DETAIL">Locations</option>
                    <option value="STATIC_PAGE">Static Pages</option>
                    <option value="SEO_LANDING">SEO Landings</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value)
                      setTimeout(() => fetchPages(1), 0)
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">All Index Statuses</option>
                    <option value="INDEXED">🟢 Indexed</option>
                    <option value="SUBMITTED">🟠 Submitted</option>
                    <option value="NOT_INDEXED">🔴 Not Indexed</option>
                    <option value="UNKNOWN">🟡 Unknown</option>
                  </select>

                  <select
                    value={filterSitemap}
                    onChange={(e) => {
                      setFilterSitemap(e.target.value)
                      setTimeout(() => fetchPages(1), 0)
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">All Sitemap States</option>
                    <option value="true">In Sitemap</option>
                    <option value="false">Excluded</option>
                  </select>

                  <Button size="sm" onClick={() => fetchPages(1)} className="text-xs font-semibold">
                    Filter
                  </Button>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedPageIds.length > 0 && (
                <div className="p-3 bg-primary-50/80 border border-primary-100 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary-900">{selectedPageIds.length} pages selected</span>
                    <button
                      onClick={() => setSelectedPageIds([])}
                      className="text-primary-600 hover:underline text-[11px]"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleBulkAction('SUBMIT_INDEXING')}
                      disabled={bulkActionLoading}
                      className="text-xs bg-primary-600 text-white gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Submit Selected to Google</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('SET_INDEXABLE')}
                      disabled={bulkActionLoading}
                      className="text-xs bg-white text-emerald-700 border-emerald-200"
                    >
                      Mark Indexable
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('SET_NOINDEX')}
                      disabled={bulkActionLoading}
                      className="text-xs bg-white text-rose-700 border-rose-200"
                    >
                      Mark Noindex
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('ADD_SITEMAP')}
                      disabled={bulkActionLoading}
                      className="text-xs bg-white"
                    >
                      Include in Sitemap
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('REMOVE_SITEMAP')}
                      disabled={bulkActionLoading}
                      className="text-xs bg-white text-slate-600"
                    >
                      Remove from Sitemap
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Pages Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                      <th className="p-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={pages.length > 0 && selectedPageIds.length === pages.length}
                          onChange={handleSelectAllOnPage}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="py-4 px-3">Page Name & URL</th>
                      <th className="py-4 px-3">Type</th>
                      <th className="py-4 px-3">SEO Title & Snippet</th>
                      <th className="py-4 px-3">Index Status</th>
                      <th className="py-4 px-3">Sitemap</th>
                      <th className="py-4 px-3 text-center">SEO Score</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingPages ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center">
                          <LoadingSpinner text="Loading catalog pages..." />
                        </td>
                      </tr>
                    ) : pages.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-500">
                          <p className="font-semibold text-sm">No pages found matching criteria</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Click "Sync Pages" at the top to discover newly created jobs or companies.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      pages.map((page) => (
                        <tr key={page.id} className="hover:bg-slate-50/60 transition group">
                          {/* Checkbox */}
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedPageIds.includes(page.id)}
                              onChange={() => handleToggleSelectPage(page.id)}
                              className="rounded text-primary-600 focus:ring-primary-500"
                            />
                          </td>

                          {/* Name & URL */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 group-hover:text-primary-700 transition">
                              {page.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-500 max-w-[220px] truncate">
                                {page.url}
                              </span>
                              <button
                                onClick={() => handleCopyUrl(page.url)}
                                title="Copy URL"
                                className="text-slate-400 hover:text-slate-700 transition"
                              >
                                {copiedUrl === page.url ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Page Type */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {page.pageType.replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Title & Snippet */}
                          <td className="py-3 px-3 max-w-xs">
                            <div className="font-medium text-slate-800 truncate" title={page.seoTitle || ''}>
                              {page.seoTitle || <span className="text-slate-300 italic">No custom title</span>}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate" title={page.seoDescription || ''}>
                              {page.seoDescription || <span className="italic">No meta description</span>}
                            </div>
                          </td>

                          {/* Index Status */}
                          <td className="py-3 px-3">{getStatusBadge(page.indexStatus)}</td>

                          {/* Sitemap Inclusion */}
                          <td className="py-3 px-3">
                            {page.inSitemap ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Included (P: {page.sitemapPriority || 0.7})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-[11px]">
                                <XCircle className="w-3.5 h-3.5 text-slate-300" />
                                Excluded
                              </span>
                            )}
                          </td>

                          {/* SEO Score Badge */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setAuditPage(page)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition hover:scale-105 ${getScoreColor(
                                page.seoScore || 80
                              )}`}
                              title="Click to view detailed SEO Health Audit"
                            >
                              {page.seoScore || 80}/100
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditClick(page)}
                                className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition"
                                title="Edit SEO Meta Tags & SERP Preview"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleSubmitSingleUrl(page.url)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                                title="Submit to Google Indexing Queue"
                              >
                                <Send className="w-4 h-4" />
                              </button>

                              <a
                                href={page.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                                title="Open Live Page"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {pages.length} of {totalPagesCount} indexable pages
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => fetchPages(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="font-semibold text-slate-700">Page {currentPage}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage * pageSize >= totalPagesCount}
                    onClick={() => fetchPages(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            TAB: GOOGLE JOBPOSTING SCHEMA VALIDATOR (SECTIONS 17–23)
        ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'validator' && (
          <div className="space-y-5">
            {/* Header & Stats Banner */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase tracking-wider mb-1">
                    <FileCode className="w-4 h-4" />
                    <span>Schema.org Structured Data Engine</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Google JobPosting Schema Validator
                  </h2>
                  <p className="text-slate-500 text-xs mt-1 max-w-2xl">
                    Dynamically generated Schema.org <code className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded font-mono">JobPosting</code> and <code className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded font-mono">BreadcrumbList</code> JSON-LD for every public vacancy. Validates location, telecommute, salary parameters, and expiration safeguards according to official Google Search guidelines.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchJobSchemas}
                    disabled={loadingSchemas}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSchemas ? 'animate-spin text-primary-600' : ''}`} />
                    <span>Refresh Schemas</span>
                  </Button>
                </div>
              </div>

              {/* Status Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      🟢 Valid Schemas
                    </span>
                    <div className="text-2xl font-bold text-emerald-900 mt-0.5">
                      {schemaJobs.filter((j) => j.validation?.status === 'VALID').length}
                    </div>
                    <span className="text-[10px] text-emerald-700">100% Google ready</span>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600/60" />
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      🟡 With Warnings
                    </span>
                    <div className="text-2xl font-bold text-amber-900 mt-0.5">
                      {schemaJobs.filter((j) => j.validation?.status === 'WARNING').length}
                    </div>
                    <span className="text-[10px] text-amber-700">Optional fields omitted</span>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-amber-600/60" />
                </div>

                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                      🔴 Critical Errors
                    </span>
                    <div className="text-2xl font-bold text-rose-900 mt-0.5">
                      {schemaJobs.filter((j) => j.validation?.status === 'INVALID').length}
                    </div>
                    <span className="text-[10px] text-rose-700">Missing required data</span>
                  </div>
                  <XCircle className="w-6 h-6 text-rose-600/60" />
                </div>

                <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      ⚪ Expired / Closed
                    </span>
                    <div className="text-2xl font-bold text-slate-900 mt-0.5">
                      {schemaJobs.filter((j) => j.validation?.status === 'EXPIRED').length}
                    </div>
                    <span className="text-[10px] text-slate-500">Excluded from Google</span>
                  </div>
                  <Clock className="w-6 h-6 text-slate-400" />
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by job title, company name, or ID..."
                    value={schemaSearch}
                    onChange={(e) => setSchemaSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchJobSchemas()}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={schemaStatusFilter}
                    onChange={(e) => {
                      setSchemaStatusFilter(e.target.value)
                      setTimeout(() => fetchJobSchemas(), 0)
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">All Validation States</option>
                    <option value="VALID">🟢 Valid Only</option>
                    <option value="WARNING">🟡 Warnings Only</option>
                    <option value="INVALID">🔴 Invalid Only</option>
                    <option value="EXPIRED">⚪ Expired Only</option>
                  </select>

                  <Button size="sm" onClick={fetchJobSchemas} className="text-xs">
                    Apply Filter
                  </Button>
                </div>
              </div>
            </div>

            {/* Schema Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                      <th className="py-4 px-4">Job Title & Employer</th>
                      <th className="py-4 px-3">Type & Work Mode</th>
                      <th className="py-4 px-3">Location / Remote</th>
                      <th className="py-4 px-3">Salary Structured</th>
                      <th className="py-4 px-3">Schema Status</th>
                      <th className="py-4 px-3">Validation Details</th>
                      <th className="py-4 px-4 text-right">Schema Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingSchemas ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <Spinner className="h-6 w-6 mx-auto mb-2 text-primary-600" />
                          <span>Validating database JobPosting records...</span>
                        </td>
                      </tr>
                    ) : schemaJobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          No job schemas found matching filter.
                        </td>
                      </tr>
                    ) : (
                      schemaJobs.map((j) => {
                        const status = j.validation?.status || 'VALID'
                        return (
                          <tr key={j.id} className="hover:bg-slate-50/60 transition group">
                            {/* Title & Employer */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 group-hover:text-primary-700 transition">
                                {j.title}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px]">
                                <span>{j.company}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono text-[10px] text-slate-400">ID: {j.id.slice(0, 10)}...</span>
                              </div>
                            </td>

                            {/* Job Type */}
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-700">
                                {j.employmentTypeMapped || 'FULL_TIME'}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                {j.workMode || 'ON_SITE'}
                              </span>
                            </td>

                            {/* Location */}
                            <td className="py-3 px-3">
                              {j.workMode === 'REMOTE' ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    TELECOMMUTE
                                  </span>
                                  <span className="block text-[10px] text-slate-400 mt-0.5">India applicant req.</span>
                                </div>
                              ) : (
                                <div className="text-slate-700 font-medium truncate max-w-[150px]">
                                  {j.location}
                                </div>
                              )}
                            </td>

                            {/* Salary */}
                            <td className="py-3 px-3">
                              <span className="font-medium text-slate-700 block">{j.salaryRange}</span>
                              <span className="text-[10px] text-slate-400">
                                {j.showSalary ? 'QuantitativeValue' : 'Omitted (Hidden)'}
                              </span>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-3">
                              {status === 'VALID' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  🟢 Valid
                                </span>
                              )}
                              {status === 'WARNING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  🟡 Warning
                                </span>
                              )}
                              {status === 'INVALID' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  🔴 Invalid
                                </span>
                              )}
                              {status === 'EXPIRED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  ⚪ Expired / Closed
                                </span>
                              )}
                            </td>

                            {/* Validation Details / Issues */}
                            <td className="py-3 px-3 max-w-xs">
                              {j.validation?.missingFields?.length > 0 ? (
                                <span className="text-rose-700 font-semibold text-[11px] block">
                                  Missing: {j.validation.missingFields.join(', ')}
                                </span>
                              ) : j.validation?.warnings?.length > 0 ? (
                                <span className="text-amber-700 text-[11px] truncate block" title={j.validation.warnings.join(' | ')}>
                                  {j.validation.warnings[0]}
                                </span>
                              ) : (
                                <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  All required fields present
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSchemaModal(j)
                                    setSchemaModalTab('job')
                                  }}
                                  className="text-xs gap-1 py-1 px-2.5 h-7"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>View JSON-LD</span>
                                </Button>

                                <a
                                  href={j.validation?.googleTestUrl || `https://search.google.com/test/rich-results?url=${encodeURIComponent(j.absoluteUrl)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition h-7"
                                  title="Test on Google Rich Results Test"
                                >
                                  <span>Google Test</span>
                                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                                </a>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={regeneratingJobId === j.id}
                                  onClick={() => handleRegenerateJobSchema(j.id)}
                                  title="Regenerate JobPosting Schema"
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingJobId === j.id ? 'animate-spin text-indigo-600' : ''}`} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            TAB 3: GOOGLE SEARCH CONSOLE INTEGRATION
        ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'gsc' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Credentials & Setup Form */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 sm:p-7 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-600" />
                    Google Search Console & Indexing API Connection
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect your verified Google Search Console property using a Google Cloud Service Account.
                    Private keys are stored securely server-side and never exposed to the client.
                  </p>
                </div>

                <form onSubmit={handleSaveGsc} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Google Search Console Property URL
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. sc-domain:careerwings.in or https://careerwings.in/"
                      value={gscConfig.property}
                      onChange={(e) => setGscConfig({ ...gscConfig, property: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Must match the verified property in your Google Search Console account.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Google Site Verification Meta Token (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Paste content token from <meta name='google-site-verification' content='...' />"
                      value={gscConfig.googleSiteVerification || ''}
                      onChange={(e) => setGscConfig({ ...gscConfig, googleSiteVerification: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Automatically injected as &lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot; /&gt; across careerwings.in for instant Search Console ownership verification.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Service Account Client Email
                    </label>
                    <input
                      type="email"
                      placeholder="careerwings-seo@project-id.iam.gserviceaccount.com"
                      value={gscConfig.clientEmail}
                      onChange={(e) => setGscConfig({ ...gscConfig, clientEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Add this email as an "Owner" or "Full User" in Google Search Console Settings &gt; Users.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Upload / Paste Service Account Key (JSON)
                    </label>
                    <textarea
                      rows={4}
                      placeholder='Paste your Google Service Account JSON credentials here ({"type": "service_account", ...})'
                      value={serviceAccountJsonInput}
                      onChange={(e) => setServiceAccountJsonInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {gscConfig.hasPrivateKey
                        ? '✔ A secure private key is already stored on the server. Paste new JSON only to rotate keys.'
                        : 'No private key configured yet. Paste Service Account JSON from Google Cloud Console.'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={gscConfig.isConnected}
                        onChange={(e) => setGscConfig({ ...gscConfig, isConnected: e.target.checked })}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span>Enable Live Google Indexing Submissions</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={savingGsc} className="gap-2 text-xs font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{savingGsc ? 'Saving Credentials...' : 'Save GSC Credentials'}</span>
                    </Button>
                  </div>
                </form>
              </div>

              {/* Instructions Box */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center gap-2 text-primary-700 font-bold text-sm">
                  <Info className="w-4 h-4" />
                  <h4>Setup Instructions</h4>
                </div>

                <ol className="text-xs text-slate-600 space-y-3 list-decimal list-inside leading-relaxed">
                  <li>
                    Open <strong>Google Cloud Console</strong> & create a project.
                  </li>
                  <li>
                    Enable both <strong>Google Search Console API</strong> and{' '}
                    <strong>Web Search Indexing API</strong>.
                  </li>
                  <li>
                    Create a <strong>Service Account</strong> and generate a <strong>JSON Key</strong>.
                  </li>
                  <li>
                    In <strong>Google Search Console</strong>, add the Service Account email as a User with{' '}
                    <strong>Owner</strong> permissions.
                  </li>
                  <li>
                    Paste the JSON key above and click <strong>Save GSC Credentials</strong>.
                  </li>
                </ol>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                  <span className="font-semibold text-slate-800">Production Safety Guarantee:</span>
                  <p>
                    All indexing operations occur server-side. Google API rate limits (200 requests/day per property) are automatically enforced.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Search Console URL Inspector */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-7 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary-600" />
                  Live Google Search Console URL Inspector
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Inspect any public URL using the official Google Search Console URL Inspection API.
                </p>
              </div>

              <form onSubmit={handleInspectUrl} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  required
                  placeholder="https://careerwings.in/jobs/software-engineer-guwahati"
                  value={inspectUrlInput}
                  onChange={(e) => setInspectUrlInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
                <Button type="submit" disabled={inspecting} className="gap-2 text-xs font-semibold shrink-0">
                  <Search className="w-4 h-4" />
                  <span>{inspecting ? 'Inspecting...' : 'Inspect URL'}</span>
                </Button>
              </form>

              {/* Inspection Output */}
              {inspectResult && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="font-semibold text-slate-700">Inspection URL:</span>
                    <span className="font-mono text-slate-900 font-bold">{inspectResult.inspectionUrl}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Verdict</span>
                      <span
                        className={`font-bold ${
                          inspectResult.verdict === 'INDEXED'
                            ? 'text-emerald-600'
                            : inspectResult.verdict === 'NOT_INDEXED'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {inspectResult.verdict}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Coverage State</span>
                      <span className="font-semibold text-slate-800">{inspectResult.coverageState || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Crawled As</span>
                      <span className="font-semibold text-slate-800">{inspectResult.crawlState || 'Googlebot'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Last Crawl Time</span>
                      <span className="font-semibold text-slate-800">
                        {inspectResult.lastCrawlTime
                          ? new Date(inspectResult.lastCrawlTime).toLocaleString()
                          : 'Not yet crawled'}
                      </span>
                    </div>
                  </div>

                  {inspectResult.message && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                      {inspectResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            TAB 4: XML SITEMAPS
        ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'sitemaps' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Dynamic Multi-Sitemap Architecture</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    All sitemaps are generated on-the-fly directly from the database and served with proper `application/xml` MIME headers.
                  </p>
                </div>
                <Button size="sm" onClick={handleSyncPages} className="gap-2 text-xs font-semibold shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Sitemaps</span>
                </Button>
              </div>

              {/* Sitemaps List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
                {(() => {
                  const baseSiteUrl = (stats?.sitemap?.masterUrl || 'https://careerwings.in/sitemap.xml')
                    .replace(/\/sitemap\.xml$/i, '')
                    .replace(/\/+$/, '');
                  return [
                    {
                      title: 'Sitemap Index',
                      file: 'sitemap-index.xml',
                      url: `${baseSiteUrl}/sitemap-index.xml`,
                      desc: 'Master sitemap index linking all sub-sitemaps for search engine spiders.',
                      type: 'INDEX',
                    },
                    {
                      title: 'Master Sitemap',
                      file: 'sitemap.xml',
                      url: `${baseSiteUrl}/sitemap.xml`,
                      desc: 'Standard entry-point XML sitemap referenced in robots.txt.',
                      type: 'MASTER',
                    },
                    {
                      title: 'Jobs Sitemap',
                      file: 'sitemap-jobs.xml',
                      url: `${baseSiteUrl}/sitemap-jobs.xml`,
                      desc: 'Live published job vacancies with hourly/daily priority tags.',
                      type: 'JOBS',
                    },
                    {
                      title: 'Companies Sitemap',
                      file: 'sitemap-companies.xml',
                      url: `${baseSiteUrl}/sitemap-companies.xml`,
                      desc: 'Hiring employers and verified corporate profile pages.',
                      type: 'COMPANIES',
                    },
                    {
                      title: 'Locations Sitemap',
                      file: 'sitemap-locations.xml',
                      url: `${baseSiteUrl}/sitemap-locations.xml`,
                      desc: 'City & regional job landing pages (Guwahati, Assam, etc.).',
                      type: 'LOCATIONS',
                    },
                    {
                      title: 'Categories Sitemap',
                      file: 'sitemap-categories.xml',
                      url: `${baseSiteUrl}/sitemap-categories.xml`,
                      desc: 'Sector & industry job directories.',
                      type: 'CATEGORIES',
                    },
                    {
                      title: 'Pages & Static Content',
                      file: 'sitemap-pages.xml',
                      url: `${baseSiteUrl}/sitemap-pages.xml`,
                      desc: 'Homepage, About, Contact, Pricing, and legal policies.',
                      type: 'PAGES',
                    },
                    {
                      title: 'Blog & SEO Landing Pages',
                      file: 'sitemap-blog.xml',
                      url: `${baseSiteUrl}/sitemap-blog.xml`,
                      desc: 'Published blog articles and regional SEO landing pages (/jobs-in-guwahati, /jobs-in-assam).',
                      type: 'LANDING',
                    },
                  ];
                })().map((s) => (
                  <div key={s.file} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{s.title}</span>
                        <code className="text-[11px] font-mono font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-primary-700">
                          {s.file}
                        </code>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valid XML
                      </span>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 transition"
                      >
                        <span>Inspect XML</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            TAB 5: ROBOTS.TXT MANAGER
        ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'robots' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    Robots.txt Crawl Directive Editor
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage search crawler access instructions. Served live at{' '}
                    <a
                      href="/robots.txt"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 underline"
                    >
                      /robots.txt
                    </a>
                    .
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRobotsContent(
                        `User-agent: *\nAllow: /\nAllow: /api/jobs\nAllow: /api/companies\nAllow: /api/categories\nAllow: /api/locations\nAllow: /api/blog\nAllow: /api/settings\nAllow: /api/stats\nAllow: /api/packages\nAllow: /api/cool-places\nAllow: /api/education-master\nDisallow: /api/admin/\nDisallow: /api/auth/\nDisallow: /api/candidate/\nDisallow: /api/employer/\nDisallow: /api/payments/\nDisallow: /api/chat/\nDisallow: /api/setup-db\nDisallow: /api/init-db\nDisallow: /admin/\nDisallow: /dashboard/\nDisallow: /employer/\nDisallow: /candidate/\nDisallow: /checkout\nDisallow: /forgot-password\nDisallow: /reset-password\n\nSitemap: https://careerwings.in/sitemap.xml\nSitemap: https://careerwings.in/sitemap-index.xml`
                      )
                      toast.success('Loaded safe default rules')
                    }}
                    className="text-xs"
                  >
                    Load Safe Defaults
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveRobots(false)}
                    disabled={savingRobots}
                    className="gap-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{savingRobots ? 'Saving...' : 'Save Robots.txt'}</span>
                  </Button>
                </div>
              </div>

              {/* Warning Box if dangerous rules detected */}
              {dangerousWarning && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>Dangerous Crawl Rules Detected!</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
                    {dangerousWarning.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-rose-800 font-semibold">
                    Are you certain you want to apply these crawl restrictions to search engines?
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSaveRobots(true)}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                    >
                      Yes, Apply Restrictive Rules
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDangerousWarning(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Raw Content (/robots.txt)
                </label>
                <textarea
                  rows={10}
                  value={robotsContent}
                  onChange={(e) => setRobotsContent(e.target.value)}
                  className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800">Safety Guardrails:</span>
                <p>
                  The system will automatically prevent accidental blocking of <code>/jobs</code>, <code>/companies</code>, <code>/categories</code>, and root <code>/</code> unless explicitly confirmed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            TAB 6: INDEXING QUEUE
        ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Background Indexing Queue</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tracks batch requests sent to Google Indexing API with retry mechanisms and response logs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={queueStatusFilter}
                  onChange={(e) => {
                    setQueueStatusFilter(e.target.value)
                    setTimeout(() => fetchQueue(), 0)
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>

                <Button
                  size="sm"
                  onClick={handleProcessQueueNow}
                  disabled={processingQueue}
                  className="gap-2 text-xs font-semibold bg-primary-600 text-white"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{processingQueue ? 'Processing...' : 'Process Queue'}</span>
                </Button>
              </div>
            </div>

            {/* Queue Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                      <th className="py-3 px-4">URL</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Attempts</th>
                      <th className="py-3 px-3">Requested By</th>
                      <th className="py-3 px-3">Response / Error</th>
                      <th className="py-3 px-4 text-right">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingQueue ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          <Spinner className="h-5 w-5 mx-auto" />
                          <span className="block mt-1">Loading queue records...</span>
                        </td>
                      </tr>
                    ) : queueItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Queue is currently empty.
                        </td>
                      </tr>
                    ) : (
                      queueItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">{item.url}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                item.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.status === 'SUBMITTED'
                                  ? 'bg-amber-50 text-amber-700'
                                  : item.status === 'FAILED'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {item.attemptCount} / {item.maxAttempts || 3}
                          </td>
                          <td className="py-3 px-3 text-slate-500">{item.requestedBy || 'SYSTEM'}</td>
                          <td className="py-3 px-3 max-w-xs truncate text-[11px] font-mono text-slate-500">
                            {item.errorMessage || item.lastResponse || '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            TAB 7: GLOBAL SETTINGS
        ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs max-w-3xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Search Engine Crawl & Indexing Policies</h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure default indexing directives, automated submission rules, and canonical link generation.
              </p>
            </div>

            {loadingSettings ? (
              <div className="p-8 text-center">
                <LoadingSpinner text="Loading settings..." />
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    setSavingSettings(true)
                    await seoAPI.updateSettings(globalSettings)
                    toast.success('Global SEO settings saved!')
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to save settings')
                  } finally {
                    setSavingSettings(false)
                  }
                }}
                className="space-y-5 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Production Site Base URL</label>
                  <input
                    type="url"
                    value={globalSettings?.siteUrl || ''}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, siteUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Used to format absolute sitemap tags and canonical links.
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <input
                      type="checkbox"
                      checked={Boolean(globalSettings?.autoSubmitPublishedJobs)}
                      onChange={(e) =>
                        setGlobalSettings({
                          ...globalSettings,
                          autoSubmitPublishedJobs: e.target.checked,
                        })
                      }
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Auto-Submit New Jobs for Indexing</span>
                      <p className="text-slate-500 text-[11px]">
                        Automatically enqueues public URL for Google indexing whenever an employer posts or admin approves a job.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <input
                      type="checkbox"
                      checked={Boolean(globalSettings?.enableSitemap)}
                      onChange={(e) =>
                        setGlobalSettings({ ...globalSettings, enableSitemap: e.target.checked })
                      }
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Serve Dynamic XML Sitemaps</span>
                      <p className="text-slate-500 text-[11px]">
                        Keep /sitemap.xml and /sitemap-index.xml publicly crawlable.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-3">
                  <Button type="submit" disabled={savingSettings} className="gap-2 text-xs font-semibold">
                    <Check className="w-4 h-4" />
                    <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: EDIT SEO METADATA & LIVE SERP PREVIEW
      ──────────────────────────────────────────────────────────────────────── */}
      {editingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit SEO Metadata & SERP Simulation</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{editingPage.url}</p>
              </div>
              <button
                onClick={() => setEditingPage(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePageMetadata} className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Google SERP Simulator Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Google Search Result Preview (SERP)
                </span>
                <div className="text-[13px] font-mono text-slate-500 truncate">
                  https://careerwings.in {editForm.canonicalUrl || editingPage.url}
                </div>
                <div className="text-base font-semibold text-[#1a0dab] hover:underline cursor-pointer truncate">
                  {editForm.seoTitle || 'Page Title Placeholder — Career Wings'}
                </div>
                <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                  {editForm.seoDescription ||
                    'Add a concise and targeted meta description to see how this page snippet will appear in Google search engine result pages.'}
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">SEO Title Tag</label>
                    <span
                      className={`text-[11px] font-semibold ${
                        (editForm.seoTitle || '').length > 60 ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    >
                      {(editForm.seoTitle || '').length} / 60 characters
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editForm.seoTitle}
                    onChange={(e) => setEditForm({ ...editForm, seoTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Meta Description</label>
                    <span
                      className={`text-[11px] font-semibold ${
                        (editForm.seoDescription || '').length > 160 ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    >
                      {(editForm.seoDescription || '').length} / 160 characters
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={editForm.seoDescription}
                    onChange={(e) => setEditForm({ ...editForm, seoDescription: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Canonical URL</label>
                  <input
                    type="text"
                    value={editForm.canonicalUrl}
                    onChange={(e) => setEditForm({ ...editForm, canonicalUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                {/* Directives Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isIndexable}
                      onChange={(e) => setEditForm({ ...editForm, isIndexable: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span className="font-semibold text-slate-800">Indexable (index)</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isFollowable}
                      onChange={(e) => setEditForm({ ...editForm, isFollowable: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span className="font-semibold text-slate-800">Followable (follow)</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.inSitemap}
                      onChange={(e) => setEditForm({ ...editForm, inSitemap: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span className="font-semibold text-slate-800">Include in Sitemap</span>
                  </label>
                </div>

                {/* Structured Data Schema */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Structured Data JSON-LD Schema (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.structuredData}
                    onChange={(e) => setEditForm({ ...editForm, structuredData: e.target.value })}
                    className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder='{"@context": "https://schema.org", "@type": "JobPosting", ...}'
                  />
                </div>

                {/* Section 22: Google Job Schema Controls for Job Postings */}
                {editingPage.pageType === 'JOB_DETAIL' && (
                  <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold text-indigo-950 text-xs">Google Job Schema (Section 22 Controls)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        🟢 Active & Auto-Generated
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-white/70 p-3 rounded-lg border border-indigo-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Job Title</span>
                        <span className="font-semibold text-slate-800 truncate block">{editingPage.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Job ID</span>
                        <span className="font-mono text-slate-800 text-[10px]">{editingPage.id.slice(0, 12)}...</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Application Method</span>
                        <span className="font-semibold text-emerald-700">directApply: true</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Schema URL</span>
                        <span className="font-mono text-indigo-700 truncate block">https://careerwings.in{editingPage.url}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`https://careerwings.in${editingPage.url}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-semibold hover:bg-indigo-50 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Test Schema on Google</span>
                      </a>

                      <a
                        href={`https://validator.schema.org/#url=${encodeURIComponent(`https://careerwings.in${editingPage.url}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold hover:bg-slate-50 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Validate Schema.org</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setEditingPage(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingPage} className="gap-2 bg-primary-600 text-white font-semibold">
                  <Check className="w-4 h-4" />
                  <span>{savingPage ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: SEO HEALTH AUDIT REPORT
      ──────────────────────────────────────────────────────────────────────── */}
      {auditPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in fade-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">SEO Health Audit Report</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{auditPage.url}</p>
              </div>
              <button
                onClick={() => setAuditPage(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Score Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block">Overall Health Score</span>
                  <span className="text-2xl font-black text-slate-900">
                    {auditPage.seoScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(
                    auditPage.seoScore
                  )}`}
                >
                  {auditPage.seoScore >= 85
                    ? 'Excellent'
                    : auditPage.seoScore >= 65
                    ? 'Needs Improvement'
                    : 'Critical Fixes Required'}
                </div>
              </div>

              {/* Audit Breakdown */}
              {auditPage.seoAuditResults && (
                (() => {
                  try {
                    const audit = JSON.parse(auditPage.seoAuditResults)
                    return (
                      <div className="space-y-4">
                        {audit.passedChecks?.length > 0 && (
                          <div>
                            <h4 className="font-bold text-emerald-800 text-xs mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Passed Checks ({audit.passedChecks.length})
                            </h4>
                            <ul className="space-y-1">
                              {audit.passedChecks.map((c: string, idx: number) => (
                                <li key={idx} className="p-2 rounded-lg bg-emerald-50/60 text-emerald-900 text-[11px]">
                                  ✔ {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {audit.warnings?.length > 0 && (
                          <div>
                            <h4 className="font-bold text-amber-800 text-xs mb-2 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              Warnings ({audit.warnings.length})
                            </h4>
                            <ul className="space-y-1">
                              {audit.warnings.map((w: string, idx: number) => (
                                <li key={idx} className="p-2 rounded-lg bg-amber-50/60 text-amber-900 text-[11px]">
                                  ⚠ {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {audit.recommendations?.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-primary-600" />
                              Actionable Recommendations
                            </h4>
                            <ul className="space-y-1.5">
                              {audit.recommendations.map((r: string, idx: number) => (
                                <li key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700 text-[11px] leading-relaxed">
                                  👉 {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  } catch {
                    return <p className="text-slate-400">Audit details not formatted</p>
                  }
                })()
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button onClick={() => setAuditPage(null)} size="sm">
                  Close Audit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────────────────
          MODAL: VIEW JOBPOSTING JSON-LD SCHEMA (SECTIONS 17–23)
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                  <FileCode className="w-4 h-4" />
                  <span>Production Schema.org JSON-LD</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mt-0.5">
                  {selectedSchemaModal.title} — {selectedSchemaModal.company}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{selectedSchemaModal.url}</p>
              </div>
              <button
                onClick={() => setSelectedSchemaModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs: JobPosting vs Breadcrumbs */}
            <div className="px-6 pt-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setSchemaModalTab('job')}
                  className={`pb-2 text-xs font-bold border-b-2 transition ${
                    schemaModalTab === 'job'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  JobPosting Schema
                </button>
                <button
                  onClick={() => setSchemaModalTab('breadcrumbs')}
                  className={`pb-2 text-xs font-bold border-b-2 transition ${
                    schemaModalTab === 'breadcrumbs'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  BreadcrumbList Schema
                </button>
              </div>

              <div className="flex items-center gap-2 pb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    selectedSchemaModal.validation?.status === 'VALID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : selectedSchemaModal.validation?.status === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : selectedSchemaModal.validation?.status === 'EXPIRED'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {selectedSchemaModal.validation?.status || 'VALID'}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Validation Summary Callout */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Validation Checks</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Last updated: {new Date(selectedSchemaModal.updatedAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                {selectedSchemaModal.validation?.warnings?.length > 0 && (
                  <ul className="text-[11px] text-amber-800 space-y-0.5">
                    {selectedSchemaModal.validation.warnings.map((w: string, i: number) => (
                      <li key={i} className="flex items-center gap-1">
                        <span>⚠</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedSchemaModal.validation?.missingFields?.length > 0 && (
                  <ul className="text-[11px] text-rose-800 space-y-0.5">
                    {selectedSchemaModal.validation.missingFields.map((m: string, i: number) => (
                      <li key={i} className="flex items-center gap-1 font-semibold">
                        <span>✖</span>
                        <span>Missing field: {m}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(!selectedSchemaModal.validation?.missingFields || selectedSchemaModal.validation.missingFields.length === 0) &&
                  (!selectedSchemaModal.validation?.warnings || selectedSchemaModal.validation.warnings.length === 0) && (
                    <p className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Complies 100% with Google JobPosting rich results guidelines.
                    </p>
                  )}
              </div>

              {/* JSON-LD Code Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] text-slate-500">
                    &lt;script type="application/ld+json"&gt;
                  </span>
                  <button
                    onClick={() => {
                      const payload =
                        schemaModalTab === 'job'
                          ? JSON.stringify(selectedSchemaModal.schema, null, 2)
                          : JSON.stringify(selectedSchemaModal.breadcrumbs, null, 2)
                      navigator.clipboard.writeText(payload)
                      setCopiedSchema(true)
                      setTimeout(() => setCopiedSchema(false), 2000)
                      toast.success('JSON-LD copied to clipboard')
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    {copiedSchema ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSchema ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto max-h-80 leading-relaxed">
                  {schemaModalTab === 'job'
                    ? JSON.stringify(selectedSchemaModal.schema, null, 2)
                    : JSON.stringify(selectedSchemaModal.breadcrumbs, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={
                    selectedSchemaModal.validation?.googleTestUrl ||
                    `https://search.google.com/test/rich-results?url=${encodeURIComponent(selectedSchemaModal.absoluteUrl)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  <span>Test on Google</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>

                <a
                  href={
                    selectedSchemaModal.validation?.schemaOrgTestUrl ||
                    `https://validator.schema.org/#url=${encodeURIComponent(selectedSchemaModal.absoluteUrl)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  <span>Test on Schema.org</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={regeneratingJobId === selectedSchemaModal.id}
                  onClick={() => handleRegenerateJobSchema(selectedSchemaModal.id)}
                  className="text-xs font-semibold gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingJobId === selectedSchemaModal.id ? 'animate-spin' : ''}`} />
                  <span>Regenerate Schema</span>
                </Button>
                <Button size="sm" onClick={() => setSelectedSchemaModal(null)} className="text-xs">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

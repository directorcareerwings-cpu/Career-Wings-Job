import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Key,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Zap,
  Search,
  Filter,
  ArrowUpRight,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Globe,
  CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PaymentItem {
  id: string
  userId: string
  packageId?: string | null
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  razorpayOrderId?: string | null
  razorpayPaymentId?: string | null
  invoiceNumber?: string | null
  discountAmount?: number
  failureReason?: string | null
  createdAt: string
  user?: {
    id: string
    email: string
    role?: string
  } | null
  package?: {
    id: string
    name: string
    type: string
  } | null
}

interface PaymentStats {
  totalRevenue: number
  totalCount: number
  successCount: number
  pendingCount: number
  failedCount: number
}

interface RazorpayConfig {
  keyId: string
  hasKeySecret: boolean
  keySecretMasked: string
  hasWebhookSecret: boolean
  webhookSecretMasked: string
  mode: 'TEST' | 'LIVE'
  isEnabled: boolean
  autoCapture: boolean
}

export default function AdminPayments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'razorpay' ? 'razorpay' : 'transactions'
  const [activeTab, setActiveTab] = useState<'transactions' | 'razorpay'>(initialTab)

  // Transactions State
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalCount: 0,
    successCount: 0,
    pendingCount: 0,
    failedCount: 0,
  })
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Razorpay Config State
  const [config, setConfig] = useState<RazorpayConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  const [formData, setFormData] = useState({
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    mode: 'TEST' as 'TEST' | 'LIVE',
    isEnabled: true,
    autoCapture: true,
  })
  const [showSecret, setShowSecret] = useState(false)
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false)

  const webhookEndpoint = `${window.location.origin}/api/payments/webhook`

  // Sync tab with URL
  const handleTabChange = (tab: 'transactions' | 'razorpay') => {
    setActiveTab(tab)
    setSearchParams(tab === 'razorpay' ? { tab: 'razorpay' } : {})
  }

  // Fetch Transactions
  const fetchPayments = async () => {
    setLoadingPayments(true)
    try {
      const params: Record<string, unknown> = { page, limit: 15 }
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const res = await adminAPI.getPayments(params)
      setPayments(res.data.data || [])
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages || 1)
        setTotalCount(res.data.pagination.total || 0)
      }
    } catch (err: any) {
      console.error('Failed to fetch payments:', err)
      toast.error('Failed to load transaction audit log')
    } finally {
      setLoadingPayments(false)
    }
  }

  // Fetch Stats
  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const res = await adminAPI.getPaymentStats()
      if (res.data.data) {
        setStats(res.data.data)
      }
    } catch (err: any) {
      console.error('Failed to load payment stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  // Fetch Razorpay Config
  const fetchRazorpayConfig = async () => {
    setLoadingConfig(true)
    try {
      const res = await adminAPI.getRazorpayConfig()
      const data: RazorpayConfig = res.data.data
      setConfig(data)
      setFormData({
        keyId: data.keyId || '',
        keySecret: '', // Always empty initially for security
        webhookSecret: '',
        mode: data.mode || 'TEST',
        isEnabled: data.isEnabled !== false,
        autoCapture: data.autoCapture !== false,
      })
    } catch (err: any) {
      console.error('Failed to fetch Razorpay config:', err)
      toast.error('Failed to load Razorpay settings')
    } finally {
      setLoadingConfig(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [page, statusFilter])

  useEffect(() => {
    fetchStats()
    fetchRazorpayConfig()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPayments()
  }

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(identifier)
    setTimeout(() => setCopiedText(null), 2000)
    toast.success('Copied to clipboard')
  }

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookEndpoint)
    setCopiedWebhookUrl(true)
    setTimeout(() => setCopiedWebhookUrl(false), 2500)
    toast.success('Webhook endpoint URL copied')
  }

  // Save Razorpay Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.keyId.trim()) {
      toast.error('Razorpay Key ID is required')
      return
    }

    setSavingConfig(true)
    setTestResult(null)
    try {
      const payload: any = {
        keyId: formData.keyId.trim(),
        mode: formData.mode,
        isEnabled: formData.isEnabled,
        autoCapture: formData.autoCapture,
      }
      if (formData.keySecret.trim()) {
        payload.keySecret = formData.keySecret.trim()
      }
      if (formData.webhookSecret.trim()) {
        payload.webhookSecret = formData.webhookSecret.trim()
      }

      const res = await adminAPI.updateRazorpayConfig(payload)
      const data: RazorpayConfig = res.data.data
      setConfig(data)
      setFormData((prev) => ({
        ...prev,
        keySecret: '',
        webhookSecret: '',
      }))
      toast.success('Razorpay configuration updated successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save configuration')
    } finally {
      setSavingConfig(false)
    }
  }

  // Test Razorpay Connection
  const handleTestConnection = async () => {
    setTestingConnection(true)
    setTestResult(null)
    try {
      const payload: any = {}
      if (formData.keyId.trim()) payload.keyId = formData.keyId.trim()
      if (formData.keySecret.trim()) payload.keySecret = formData.keySecret.trim()

      const res = await adminAPI.testRazorpayConnection(payload)
      setTestResult({
        success: true,
        message: res.data.message || 'Razorpay connection verified successfully!',
        details: res.data.data,
      })
      toast.success('Razorpay connection verified!')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to authenticate with Razorpay API'
      setTestResult({
        success: false,
        message: msg,
      })
      toast.error(msg)
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="Razorpay Payment Gateway & Transactions | Career Wings Admin" />

      <div className="space-y-7">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Payments & Razorpay
              </h1>
              {config && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                    !config.isEnabled
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : config.mode === 'LIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !config.isEnabled
                        ? 'bg-slate-400'
                        : config.mode === 'LIVE'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-amber-500'
                    }`}
                  />
                  {!config.isEnabled ? 'Gateway Disabled' : `${config.mode} Mode Active`}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Configure Razorpay API credentials, verify gateway status, and audit all financial transactions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'transactions') {
                  fetchPayments()
                  fetchStats()
                } else {
                  fetchRazorpayConfig()
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <a
              href="https://dashboard.razorpay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition"
            >
              <span>Razorpay Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => handleTabChange('transactions')}
            className={`flex items-center gap-2.5 py-3.5 px-5 font-semibold text-sm border-b-2 transition -mb-px ${
              activeTab === 'transactions'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Transactions & Financial Audit</span>
            {totalCount > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'transactions'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('razorpay')}
            className={`flex items-center gap-2.5 py-3.5 px-5 font-semibold text-sm border-b-2 transition -mb-px ${
              activeTab === 'razorpay'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Razorpay Integration Settings</span>
            <span
              className={`w-2 h-2 rounded-full ${
                config?.isEnabled
                  ? config?.mode === 'LIVE'
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                  : 'bg-slate-300'
              }`}
            />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TRANSACTIONS & FINANCIAL AUDIT */}
        {/* ========================================================================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Total Volume
                  </span>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingStats ? (
                      <span className="inline-block w-24 h-7 bg-slate-100 animate-pulse rounded" />
                    ) : (
                      `₹${stats.totalRevenue.toLocaleString('en-IN')}`
                    )}
                  </div>
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Settled revenue
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Successful Orders
                  </span>
                  <div className="text-2xl font-bold text-emerald-600">
                    {loadingStats ? (
                      <span className="inline-block w-16 h-7 bg-slate-100 animate-pulse rounded" />
                    ) : (
                      stats.successCount
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium mt-1 block">
                    Subscription activations
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Pending Orders
                  </span>
                  <div className="text-2xl font-bold text-amber-600">
                    {loadingStats ? (
                      <span className="inline-block w-16 h-7 bg-slate-100 animate-pulse rounded" />
                    ) : (
                      stats.pendingCount
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium mt-1 block">
                    Awaiting customer checkout
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Failed / Disputed
                  </span>
                  <div className="text-2xl font-bold text-rose-600">
                    {loadingStats ? (
                      <span className="inline-block w-16 h-7 bg-slate-100 animate-pulse rounded" />
                    ) : (
                      stats.failedCount
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium mt-1 block">
                    Signature or bank declines
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice number, Razorpay Order ID, Payment ID, or customer email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
              </form>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status)
                      setPage(1)
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
                      statusFilter === status
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status === 'ALL' ? 'All Statuses' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              {loadingPayments ? (
                <div className="p-8 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900">No Transactions Found</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                    {searchQuery || statusFilter !== 'ALL'
                      ? 'No transactions matched your search or status criteria.'
                      : 'No payments have been recorded yet. Orders created via Razorpay will be automatically audited here.'}
                  </p>
                  {(searchQuery || statusFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('ALL')
                        setPage(1)
                      }}
                      className="mt-4 px-4 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                        <th className="py-3.5 px-4 font-semibold">Customer & Role</th>
                        <th className="py-3.5 px-4 font-semibold">Package / Item</th>
                        <th className="py-3.5 px-4 font-semibold">Invoice No</th>
                        <th className="py-3.5 px-4 font-semibold">Razorpay IDs</th>
                        <th className="py-3.5 px-4 font-semibold">Amount</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                            <div>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div className="text-slate-400 text-[11px] font-mono">
                              {new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-900 text-xs">
                              {p.user?.email || 'Unknown Customer'}
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {p.user?.role || 'USER'}
                            </span>
                          </td>

                          {/* Package */}
                          <td className="py-3.5 px-4">
                            {p.package ? (
                              <div>
                                <span className="font-medium text-slate-900 text-xs block">
                                  {p.package.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {p.package.type} Plan
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Manual / Direct</span>
                            )}
                          </td>

                          {/* Invoice */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              {p.invoiceNumber || p.id.slice(0, 10)}
                            </span>
                          </td>

                          {/* Razorpay IDs */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {p.razorpayOrderId && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-medium">Order:</span>
                                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[120px]">
                                    {p.razorpayOrderId}
                                  </span>
                                  <button
                                    onClick={() => handleCopy(p.razorpayOrderId!, `order-${p.id}`)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                    title="Copy Razorpay Order ID"
                                  >
                                    {copiedText === `order-${p.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                              {p.razorpayPaymentId && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-medium">Pay:</span>
                                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[120px]">
                                    {p.razorpayPaymentId}
                                  </span>
                                  <button
                                    onClick={() => handleCopy(p.razorpayPaymentId!, `pay-${p.id}`)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                    title="Copy Razorpay Payment ID"
                                  >
                                    {copiedText === `pay-${p.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                              {!p.razorpayOrderId && !p.razorpayPaymentId && (
                                <span className="text-[11px] text-slate-400 italic">No external gateway ID</span>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{p.amount.toLocaleString('en-IN')}
                            </span>
                            {p.discountAmount ? (
                              <span className="block text-[10px] text-emerald-600 font-medium">
                                Saved ₹{p.discountAmount}
                              </span>
                            ) : null}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                p.status === 'SUCCESS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {p.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                              {p.status === 'PENDING' && <Clock className="w-3 h-3" />}
                              {p.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                              {p.status}
                            </span>
                            {p.failureReason && (
                              <span className="block text-[10px] text-rose-500 max-w-[130px] truncate mt-0.5" title={p.failureReason}>
                                {p.failureReason}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="py-3 px-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Page <span className="font-bold text-slate-900">{page}</span> of{' '}
                    <span className="font-bold text-slate-900">{totalPages}</span> ({totalCount} total)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RAZORPAY GATEWAY INTEGRATION */}
        {/* ========================================================================= */}
        {activeTab === 'razorpay' && (
          <div className="space-y-6 max-w-4xl">
            {/* Status Announcement Banner */}
            <div
              className={`rounded-2xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !formData.isEnabled
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : formData.mode === 'LIVE'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    !formData.isEnabled
                      ? 'bg-slate-200 text-slate-600'
                      : formData.mode === 'LIVE'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {!formData.isEnabled
                      ? 'Razorpay Gateway is Currently Disabled'
                      : formData.mode === 'LIVE'
                      ? 'Razorpay Live Production Mode Active'
                      : 'Razorpay Test / Sandbox Mode Active'}
                  </h3>
                  <p className="text-xs opacity-80 mt-0.5 max-w-xl">
                    {!formData.isEnabled
                      ? 'Checkout is paused. Users attempting to purchase packages will see a maintenance notice.'
                      : formData.mode === 'LIVE'
                      ? 'Real payments via UPI, Credit Cards, NetBanking, and Wallets are being processed in live INR.'
                      : 'Mock transactions are enabled for testing. Use official Razorpay test cards & UPI handles.'}
                  </p>
                </div>
              </div>

              {/* Master Gateway Toggle */}
              <div className="flex items-center gap-3 self-end sm:self-center bg-white/70 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-xs font-bold text-slate-800">
                  {formData.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600" />
                </label>
              </div>
            </div>

            {/* Test Connection Alert / Feedback */}
            {testResult && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 transition ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-xs">
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.details && (
                    <div className="mt-1 font-mono text-[11px] opacity-85">
                      Mode: {testResult.details.mode} | Orders API Access: OK
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Configuration Form */}
            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* Credentials Card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-orange-600" />
                    API Credentials & Environment
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate and manage your API keys from the Razorpay Dashboard under Account & Settings &gt; API Keys.
                  </p>
                </div>

                {/* Environment Mode Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Gateway Environment Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, mode: 'TEST' }))}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition ${
                        formData.mode === 'TEST'
                          ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                          formData.mode === 'TEST'
                            ? 'border-amber-500 bg-amber-500'
                            : 'border-slate-300'
                        }`}
                      >
                        {formData.mode === 'TEST' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div>
                        <strong className="block text-xs font-bold text-slate-900">
                          Test / Sandbox Mode
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          Safe sandbox for testing with virtual money. Keys start with <code className="font-mono text-amber-700">rzp_test_</code>
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, mode: 'LIVE' }))}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition ${
                        formData.mode === 'LIVE'
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                          formData.mode === 'LIVE'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-300'
                        }`}
                      >
                        {formData.mode === 'LIVE' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div>
                        <strong className="block text-xs font-bold text-slate-900">
                          Live Production Mode
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          Accepts real payments from users into your verified bank. Keys start with <code className="font-mono text-emerald-700">rzp_live_</code>
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Key ID */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Razorpay Key ID <span className="text-rose-500">*</span>
                    </label>
                    {config?.keyId && (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Configured
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={formData.mode === 'LIVE' ? 'rzp_live_xxxxxxxxxxxxxxxx' : 'rzp_test_xxxxxxxxxxxxxxxx'}
                    value={formData.keyId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, keyId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 font-mono text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Public key shared with client checkout script to display the Razorpay payment modal.
                  </p>
                </div>

                {/* Key Secret */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Razorpay Key Secret
                    </label>
                    {config?.hasKeySecret && (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Secret Saved ({config.keySecretMasked})
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      placeholder={config?.hasKeySecret ? 'Leave blank to keep existing stored secret' : 'Enter Razorpay Key Secret'}
                      value={formData.keySecret}
                      onChange={(e) => setFormData((prev) => ({ ...prev, keySecret: e.target.value }))}
                      className="w-full pl-3.5 pr-10 py-2.5 font-mono text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Private server secret used to authenticate orders and cryptographically verify payment signatures. Never exposed to the browser.
                  </p>
                </div>

                {/* Auto Capture Toggle */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div>
                    <strong className="block text-xs font-bold text-slate-900">
                      Auto-Capture Authorized Payments
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Automatically capture approved payments immediately without requiring manual settlement.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCapture}
                      onChange={(e) => setFormData((prev) => ({ ...prev, autoCapture: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600" />
                  </label>
                </div>
              </div>

              {/* Webhook Configuration Card */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-600" />
                    Webhook Synchronization
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Razorpay sends instantaneous server-to-server HTTP POST notifications for captured, refunded, or failed transactions.
                  </p>
                </div>

                {/* Webhook URL Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Webhook Endpoint URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookEndpoint}
                      className="flex-1 px-3.5 py-2.5 font-mono text-xs bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWebhookUrl}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shrink-0"
                    >
                      {copiedWebhookUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Webhook Secret */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Razorpay Webhook Secret
                    </label>
                    {config?.hasWebhookSecret && (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Configured ({config.webhookSecretMasked})
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={config?.hasWebhookSecret ? 'Leave blank to keep existing webhook secret' : 'Enter Webhook Secret set in Razorpay'}
                    value={formData.webhookSecret}
                    onChange={(e) => setFormData((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                    className="w-full px-3.5 py-2.5 font-mono text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Matches the secret token you configure in Razorpay Dashboard &gt; Settings &gt; Webhooks.
                  </p>
                </div>

                {/* Subscribed Events Reference */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <span className="font-bold text-slate-800 block">Recommended Webhook Events:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>payment.captured</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>payment.failed</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>order.paid</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || (!formData.keyId && !config?.keyId)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing Razorpay API...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>1-Click Test API Connection</span>
                    </>
                  )}
                </button>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {savingConfig ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Razorpay Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Setup Instructions Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 text-white">
                <HelpCircle className="w-4 h-4 text-orange-400" />
                Quick Setup Checklist for Razorpay
              </h3>
              <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                <li>
                  Sign in to your dashboard at{' '}
                  <a
                    href="https://dashboard.razorpay.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:underline font-semibold"
                  >
                    dashboard.razorpay.com
                  </a>
                  .
                </li>
                <li>
                  Navigate to <strong>Account & Settings &gt; API Keys</strong>. Click <em>Generate Key</em> or copy your existing Test/Live keys.
                </li>
                <li>
                  Paste the <strong>Key ID</strong> and <strong>Key Secret</strong> into the form above and select your environment mode.
                </li>
                <li>
                  Click <strong>1-Click Test API Connection</strong> to ensure orders can be created successfully.
                </li>
                <li>
                  Add the webhook endpoint URL under <strong>Account & Settings &gt; Webhooks</strong> and subscribe to <code className="text-orange-300">payment.captured</code> and <code className="text-orange-300">payment.failed</code>.
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

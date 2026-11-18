import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { adminAPI } from '@/lib/api'
import {
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Eye,
  ShieldCheck,
  Server,
  Key,
  Globe,
  FileText,
  Search,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EmailStats {
  totalSent: number
  totalFailed: number
  totalQueued: number
  last24Hours: number
  successRate: number
}

interface SmtpConfigState {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  hasPassword: boolean
  maskedPassword: string
  fromEmail: string
  fromName: string
  replyTo: string
  isEnabled: boolean
  mode: string
}

interface EmailLogItem {
  id: string
  recipientEmail: string
  emailType: string
  subject: string
  templateName: string
  status: 'SENT' | 'FAILED' | 'QUEUED' | 'BOUNCED'
  providerMessageId?: string | null
  sentAt?: string | null
  failedAt?: string | null
  failureReason?: string | null
  attemptCount: number
  htmlBody?: string | null
  createdAt: string
}

interface EmailTemplateItem {
  key: string
  name: string
  category: string
  subject: string
  variables: string[]
  description: string
}

export default function EmailManagement() {
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'templates' | 'dns'>('config')

  // Stats
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalFailed: 0,
    totalQueued: 0,
    last24Hours: 0,
    successRate: 100,
  })

  // Config
  const [config, setConfig] = useState<SmtpConfigState>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    hasPassword: false,
    maskedPassword: '',
    fromEmail: 'no-reply@careerwings.in',
    fromName: 'Career Wings',
    replyTo: 'support@careerwings.in',
    isEnabled: true,
    mode: 'SANDBOX_DEVELOPMENT',
  })
  const [savingConfig, setSavingConfig] = useState(false)

  // Test Email Modal
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Logs
  const [logs, setLogs] = useState<EmailLogItem[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Preview Modal
  const [previewLog, setPreviewLog] = useState<EmailLogItem | null>(null)

  // Templates
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([])

  // Load stats and config on mount
  useEffect(() => {
    fetchStats()
    fetchConfig()
    fetchTemplates()
  }, [])

  // Load logs when filters or tab changes
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    }
  }, [activeTab, logPage, statusFilter, typeFilter])

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getEmailStats()
      setStats(res.data.data)
    } catch (err) {
      console.error('Failed to load email stats', err)
    }
  }

  const fetchConfig = async () => {
    try {
      const res = await adminAPI.getEmailConfig()
      setConfig(res.data.data)
    } catch (err) {
      console.error('Failed to load email config', err)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await adminAPI.getEmailTemplates()
      setTemplates(res.data.data)
    } catch (err) {
      console.error('Failed to load email templates', err)
    }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await adminAPI.getEmailLogs({
        page: logPage,
        limit: 15,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        search: searchQuery || undefined,
      })
      setLogs(res.data.data || [])
      setTotalLogs(res.data.meta?.total || 0)
    } catch (err) {
      console.error('Failed to load email logs', err)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      await adminAPI.updateEmailConfig(config as any)
      toast.success('SMTP Configuration saved successfully')
      fetchConfig()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save configuration')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testRecipient) return
    setSendingTest(true)
    try {
      const res = await adminAPI.sendTestEmail({ toEmail: testRecipient })
      toast.success(res.data.message || 'Test email queued successfully')
      setTestEmailOpen(false)
      fetchStats()
      if (activeTab === 'logs') fetchLogs()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  const handleRetryEmail = async (id: string) => {
    try {
      await adminAPI.retryEmail(id)
      toast.success('Retry requested. Check logs in a few moments.')
      fetchLogs()
      fetchStats()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Retry failed')
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="Email & Notification System | Admin Console | Career Wings" />

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Mail className="w-7 h-7 text-orange-600" />
              <span>Email & Notification Subsystem</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Centralized transactional email engine for Career Wings official domain (@careerwings.in), OTP delivery, and audit logging.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTestRecipient(config.user || 'admin@careerwings.in')
                setTestEmailOpen(true)
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Email</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Delivered Emails</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalSent}</p>
            <span className="text-[11px] text-emerald-600 font-medium">Successfully transmitted</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Failed / Bounced</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalFailed}</p>
            <span className="text-[11px] text-red-500 font-medium">Requires attention</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Queue Backlog</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalQueued}</p>
            <span className="text-[11px] text-slate-400 font-medium">Pending dispatch</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Success Rate</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.successRate}%</p>
            <span className="text-[11px] text-blue-600 font-medium">Delivery reliability</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Last 24 Hours</span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.last24Hours}</p>
            <span className="text-[11px] text-purple-600 font-medium">Transmissions</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'config'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>SMTP Server Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'logs'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Email Logs</span>
            {stats.totalFailed > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {stats.totalFailed}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'templates'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Template Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dns')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'dns'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Domain DNS & SPF / DKIM</span>
          </button>
        </div>

        {/* TAB 1: SMTP CONFIGURATION */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Career Wings Mail Provider</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the outbound SMTP server credentials for all official emails sent to candidates, employers, and administrators.
                </p>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  config.mode === 'PRODUCTION_SMTP'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {config.mode === 'PRODUCTION_SMTP' ? '● Live SMTP Connected' : '● Safe Development Sandbox'}
              </span>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Server Host
                  </label>
                  <input
                    type="text"
                    required
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    placeholder="mail.careerwings.in or smtp.sendgrid.net"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Hostname of your professional mail relay.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    required
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 587 })}
                    placeholder="587"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Typically 587 (STARTTLS) or 465 (SSL/TLS).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Username / Email
                  </label>
                  <input
                    type="text"
                    value={config.user}
                    onChange={(e) => setConfig({ ...config, user: e.target.value })}
                    placeholder="no-reply@careerwings.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Password
                  </label>
                  <input
                    type="password"
                    value={config.pass}
                    onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                    placeholder={config.hasPassword ? '•••••••••••• (Leave blank to keep existing)' : 'Enter SMTP password'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Credentials remain server-side and are never exposed.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official From Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={config.fromEmail}
                    onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                    placeholder="no-reply@careerwings.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official From Name
                  </label>
                  <input
                    type="text"
                    required
                    value={config.fromName}
                    onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                    placeholder="Career Wings"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Support Reply-To Email
                  </label>
                  <input
                    type="email"
                    required
                    value={config.replyTo}
                    onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
                    placeholder="support@careerwings.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.secure}
                      onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                      className="w-4 h-4 accent-orange-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700">Use SSL / TLS Connection</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isEnabled}
                      onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                      className="w-4 h-4 accent-orange-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700">Email Subsystem Enabled</span>
                  </label>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingConfig ? 'Saving Settings...' : 'Save SMTP Configuration'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: AUDIT EMAIL LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {/* Filters bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                    placeholder="Search recipient or subject..."
                    className="pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:border-orange-500 w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SENT">Delivered (SENT)</option>
                  <option value="FAILED">Failed / Error</option>
                  <option value="QUEUED">Queued</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Event Types</option>
                  <option value="OTP_VERIFICATION">OTP Verification</option>
                  <option value="WELCOME">Welcome</option>
                  <option value="PASSWORD_RESET_OTP">Password Reset</option>
                  <option value="PACKAGE_ASSIGNED">Package Assigned</option>
                  <option value="PAYMENT_SUCCESS">Payment Success</option>
                  <option value="JOB_APPROVED">Job Approved</option>
                  <option value="NEW_APPLICATION_EMPLOYER">New Application</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLogs}
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Refresh Logs"
                >
                  <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-xs text-slate-500 font-medium">Total: {totalLogs} emails</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-4">Type & Subject</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Provider ID / Error</th>
                    <th className="py-3.5 px-4">Sent At</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Loading email records...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No email activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {log.recipientEmail}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mr-2">
                            {log.emailType}
                          </span>
                          <span className="text-slate-700 font-medium">{log.subject}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.status === 'SENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.status === 'FAILED'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate font-mono text-[11px] text-slate-500">
                          {log.status === 'FAILED' ? (
                            <span className="text-red-600 font-sans" title={log.failureReason || ''}>
                              {log.failureReason || 'Failed'}
                            </span>
                          ) : (
                            log.providerMessageId || 'sandbox-verified'
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {log.htmlBody && (
                              <button
                                type="button"
                                onClick={() => setPreviewLog(log)}
                                className="p-1.5 text-slate-600 hover:text-orange-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Preview HTML Email"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {log.status === 'FAILED' && (
                              <button
                                type="button"
                                onClick={() => handleRetryEmail(log.id)}
                                className="p-1.5 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 transition cursor-pointer"
                                title="Retry Delivery"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalLogs > 15 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={logPage <= 1}
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">Page {logPage}</span>
                <button
                  type="button"
                  disabled={logPage * 15 >= totalLogs}
                  onClick={() => setLogPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.key} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                    {tpl.category}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{tpl.key}</span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{tpl.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px] block font-semibold">Subject Line:</span>
                  <span className="text-slate-800 font-semibold">{tpl.subject}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Available Variables:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.variables.map((v) => (
                      <code
                        key={v}
                        className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100 font-mono text-[11px]"
                      >
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: DOMAIN DNS & DELIVERABILITY */}
        {activeTab === 'dns' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Career Wings Official Domain Deliverability</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                To guarantee 100% inbox placement and prevent user emails from ending up in Spam or Junk folders, configure these DNS records on your domain registrar for <strong>careerwings.in</strong>:
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">1. SPF (Sender Policy Framework)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                    TXT Record
                  </span>
                </div>
                <p className="text-xs text-slate-600">Authorizes your mail server to send emails on behalf of careerwings.in:</p>
                <code className="block p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 select-all">
                  v=spf1 include:_spf.careerwings.in ~all
                </code>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">2. DKIM (DomainKeys Identified Mail)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                    CNAME / TXT Record
                  </span>
                </div>
                <p className="text-xs text-slate-600">Cryptographically signs outbound emails to prove authenticity:</p>
                <code className="block p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 select-all">
                  careerwings._domainkey.careerwings.in
                </code>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">3. DMARC (Domain-based Message Authentication)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                    TXT Record
                  </span>
                </div>
                <p className="text-xs text-slate-600">Protects domain against phishing and unauthorized spoofing:</p>
                <code className="block p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 select-all">
                  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@careerwings.in; pct=100
                </code>
              </div>
            </div>
          </div>
        )}

        {/* SEND TEST EMAIL MODAL */}
        {testEmailOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-600" />
                  <span>Send Test Email</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setTestEmailOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <p className="text-xs text-slate-500">
                This triggers an end-to-end transactional email through the active Career Wings mail queue to verify SMTP credentials and deliverability.
              </p>

              <form onSubmit={handleSendTestEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="youremail@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-orange-500 text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTestEmailOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingTest}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingTest ? 'Sending...' : 'Send Test Mail'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PREVIEW HTML MODAL */}
        {previewLog && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">{previewLog.subject}</h3>
                  <p className="text-[11px] text-slate-500">To: {previewLog.recipientEmail} &bull; Type: {previewLog.emailType}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewLog(null)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-slate-100">
                <iframe
                  srcDoc={previewLog.htmlBody || '<p>No preview content available</p>'}
                  title="Email Preview"
                  className="w-full h-full bg-white rounded-xl shadow-xs border border-slate-200"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

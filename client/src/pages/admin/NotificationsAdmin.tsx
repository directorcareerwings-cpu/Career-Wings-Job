import React, { useState } from 'react'
import { adminAPI } from '@/lib/api'
import AdminLayout from '@/components/layout/AdminLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { Bell, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NotificationsAdmin() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [role, setRole] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await adminAPI.sendNotification({
        title,
        message,
        role: role || undefined,
        link: link || undefined,
      })
      toast.success('Broadcast notification sent successfully!')
      setTitle('')
      setMessage('')
      setLink('')
    } catch {
      toast.error('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminLayout>
      <SEOMeta title="Broadcast Notifications (Admin) | Career Wings" />

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Broadcast Notification</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Send platform-wide notifications to candidates, employers, or all registered users.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Notification Headline
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Special Discount on Recruiter Plans"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target User Group
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
              >
                <option value="">All Registered Users</option>
                <option value="CANDIDATE">Job Seekers Only</option>
                <option value="EMPLOYER">Employers / Recruiters Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target URL (Optional)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/pricing or /jobs"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Message Body
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Details of the announcement..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Broadcast Notification'}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

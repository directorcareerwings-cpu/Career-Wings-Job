import React, { useState, useEffect } from 'react'
import { candidateAPI } from '@/lib/api'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import {
  Bell,
  CheckCheck,
  Clock,
  CalendarCheck,
  MapPin,
  Briefcase,
  Building2,
  MessageSquare,
  Send,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Notification } from '@/types'

// ─── Parse interview offer message lines ──────────────────────────────────────
function parseInterviewMessage(message: string) {
  const lines = message.split('\n').filter(Boolean)
  const find = (prefix: string) => {
    const line = lines.find((l) => l.includes(prefix))
    return line ? line.replace(/^[^\:]+\:\s*/, '').trim() : ''
  }
  return {
    position: find('Position'),
    company:  find('Company'),
    dateTime: find('Date'),
    mode:     find('Mode'),
    location: find('Location'),
    notes:    find('Message'),
  }
}

// ─── Interview Offer Card ─────────────────────────────────────────────────────
function InterviewCard({ n }: { n: Notification }) {
  const info = parseInterviewMessage(n.message || '')

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition ${
        n.isRead
          ? 'bg-white border-slate-200'
          : 'bg-gradient-to-br from-teal-50 to-emerald-50/60 border-teal-300 shadow-md'
      }`}
    >
      {/* Teal header strip */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Send className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{n.title}</p>
          <p className="text-teal-100 text-[11px] flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {n.createdAt
              ? new Date(n.createdAt).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : 'Recently'}
          </p>
        </div>
        {!n.isRead && (
          <span className="shrink-0 text-[10px] font-bold bg-white text-teal-700 px-2 py-0.5 rounded-full">
            NEW
          </span>
        )}
      </div>

      {/* Details grid */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {info.position && (
          <div className="flex items-start gap-2.5">
            <Briefcase className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Position</p>
              <p className="text-sm font-bold text-slate-800">{info.position}</p>
            </div>
          </div>
        )}
        {info.company && (
          <div className="flex items-start gap-2.5">
            <Building2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Company</p>
              <p className="text-sm font-bold text-slate-800">{info.company}</p>
            </div>
          </div>
        )}
        {info.dateTime && (
          <div className="flex items-start gap-2.5">
            <CalendarCheck className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Date &amp; Time</p>
              <p className="text-sm font-bold text-slate-800">{info.dateTime}</p>
            </div>
          </div>
        )}
        {info.mode && (
          <div className="flex items-start gap-2.5">
            <Send className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Interview Mode</p>
              <p className="text-sm font-bold text-slate-800">{info.mode}</p>
            </div>
          </div>
        )}
        {info.location && (
          <div className="flex items-start gap-2.5 sm:col-span-2">
            <MapPin className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Location / Link</p>
              <p className="text-sm text-slate-700">{info.location}</p>
            </div>
          </div>
        )}
        {info.notes && (
          <div className="flex items-start gap-2.5 sm:col-span-2 bg-teal-50 rounded-xl px-3 py-2.5 border border-teal-100">
            <MessageSquare className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wide mb-0.5">
                Message from Employer
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">{info.notes}</p>
            </div>
          </div>
        )}
        {/* Fallback: show raw message if nothing parsed */}
        {!info.position && !info.company && n.message && (
          <p className="sm:col-span-2 text-xs text-slate-600 whitespace-pre-line">{n.message}</p>
        )}
      </div>
    </div>
  )
}

// ─── Standard Notification Card ───────────────────────────────────────────────
function StandardCard({ n }: { n: Notification }) {
  return (
    <div
      className={`p-5 rounded-2xl border transition flex items-start gap-4 ${
        n.isRead
          ? 'bg-white border-slate-100'
          : 'bg-orange-50/40 border-orange-200 shadow-sm'
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bell className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {n.createdAt
              ? new Date(n.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
              : 'Recently'}
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">{n.message}</p>
      </div>
      {!n.isRead && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CandidateNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'interview' | 'other'>('all')

  const fetchNotifs = async () => {
    try {
      const res = await candidateAPI.getNotifications()
      setNotifications(res.data.data?.notifications || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifs()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await candidateAPI.markAllNotificationsRead()
      toast.success('All marked as read')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      toast.error('Failed to update')
    }
  }

  const interviewNotifs = notifications.filter((n) => n.type === 'INTERVIEW')
  const otherNotifs = notifications.filter((n) => n.type !== 'INTERVIEW')
  const visibleNotifs =
    activeTab === 'all' ? notifications : activeTab === 'interview' ? interviewNotifs : otherNotifs

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <CandidateLayout>
      <SEOMeta title="Notifications | Career Wings" />

      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Interview invitations, application updates, and system alerts.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Tab filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {(
            [
              { key: 'all',       label: 'All',               count: notifications.length },
              { key: 'interview', label: '🎯 Interview Offers', count: interviewNotifs.length },
              { key: 'other',     label: '🔔 Other',           count: otherNotifs.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse" />
            ))}
          </div>
        ) : visibleNotifs.length > 0 ? (
          <div className="space-y-3">
            {visibleNotifs.map((n) =>
              n.type === 'INTERVIEW' ? (
                <InterviewCard key={n.id} n={n} />
              ) : (
                <StandardCard key={n.id} n={n} />
              )
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
            {activeTab === 'interview' ? (
              <>
                <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-700 text-base">No interview invitations yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  When an employer sends you a Direct Interview Offer, it will appear here.
                </p>
              </>
            ) : (
              <>
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-700 text-base">No notifications</p>
                <p className="text-xs text-slate-400 mt-1">You're all caught up with your latest alerts.</p>
              </>
            )}
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}

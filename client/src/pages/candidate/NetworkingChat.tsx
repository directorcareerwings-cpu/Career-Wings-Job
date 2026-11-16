import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import CandidateLayout from '@/components/layout/CandidateLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { chatAPI } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import {
  MessageSquare,
  Search,
  Send,
  Briefcase,
  MapPin,
  ExternalLink,
  CheckCheck,
  Sparkles,
  RefreshCw,
  Building2,
  Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

interface EmployerInfo {
  id: string
  userId: string
  firstName: string
  lastName: string
  phone?: string | null
  designation?: string | null
  company?: {
    id: string
    name: string
    logo?: string | null
    industry?: string | null
  } | null
}

interface JobInfo {
  id: string
  title: string
  slug: string
  city?: string | null
  workMode?: string | null
  jobType?: string | null
}

interface ConversationItem {
  id: string
  employerId: string
  candidateId: string
  jobId?: string | null
  employer: EmployerInfo
  job?: JobInfo | null
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

interface MessageItem {
  id: string
  conversationId: string
  senderId: string
  senderRole: string
  message: string
  isRead: boolean
  createdAt: string
}

const CANDIDATE_QUICK_REPLIES = [
  '✅ Thank you for reaching out! I am interested in this opportunity.',
  '📅 I am available for an interview. Please share the time slots.',
  '💼 My current CTC is __ and expected CTC is __. Notice period is __ days.',
  '📄 Please find my updated resume attached. Portfolio: __',
  '🙏 I appreciate the offer, but I have accepted another position.',
]

export default function CandidateNetworkingChat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all')

  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    try {
      const res = await chatAPI.getConversations()
      const list: ConversationItem[] = res.data?.data || []
      setConversations(list)

      if (!activeConversation && list.length > 0) {
        setActiveConversation(list[0])
      } else if (activeConversation) {
        const updated = list.find((c) => c.id === activeConversation.id)
        if (updated) setActiveConversation(updated)
      }
    } catch (err) {
      console.error('Failed to load conversations', err)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      return
    }

    setIsLoadingMessages(true)
    chatAPI
      .getMessages(activeConversation.id)
      .then((res) => {
        setMessages(res.data?.data?.messages || [])
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, unreadCount: 0 } : c))
        )
      })
      .catch((err) => {
        console.error('Failed to load messages', err)
      })
      .finally(() => {
        setIsLoadingMessages(false)
      })
  }, [activeConversation?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Background polling every 4 seconds
  useEffect(() => {
    if (!activeConversation) return
    const interval = setInterval(() => {
      chatAPI
        .getMessages(activeConversation.id)
        .then((res) => {
          const fetched: MessageItem[] = res.data?.data?.messages || []
          setMessages((prev) => (fetched.length !== prev.length ? fetched : prev))
        })
        .catch(() => null)
    }, 4000)
    return () => clearInterval(interval)
  }, [activeConversation?.id])

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : messageInput
    if (!textToSend.trim() || !activeConversation || isSending) return

    const trimmed = textToSend.trim()
    if (!customText) setMessageInput('')
    setIsSending(true)

    const tempId = `temp-${Date.now()}`
    const optimisticMsg: MessageItem = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user?.id || 'candidate',
      senderRole: 'CANDIDATE',
      message: trimmed,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await chatAPI.sendMessage(activeConversation.id, trimmed)
      if (res.data?.data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? res.data.data : m)))
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? { ...c, lastMessage: trimmed, lastMessageAt: new Date().toISOString() }
              : c
          )
        )
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send message')
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  const filteredConversations = conversations.filter((c) => {
    const companyName = (c.employer?.company?.name || '').toLowerCase()
    const employerName = `${c.employer?.firstName || ''} ${c.employer?.lastName || ''}`.toLowerCase()
    const jobTitle = (c.job?.title || '').toLowerCase()
    const query = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !query || companyName.includes(query) || employerName.includes(query) || jobTitle.includes(query)
    const matchesTab = filterTab === 'all' || (filterTab === 'unread' && c.unreadCount > 0)
    return matchesSearch && matchesTab
  })

  const formatMsgDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'h:mm a')
    } catch {
      return ''
    }
  }

  const getEmployerDisplayName = (conv: ConversationItem) => {
    const company = conv.employer?.company?.name
    const name = `${conv.employer?.firstName || ''} ${conv.employer?.lastName || ''}`.trim()
    return company || name || 'Recruiter'
  }

  const getEmployerSubtitle = (conv: ConversationItem) => {
    const name = `${conv.employer?.firstName || ''} ${conv.employer?.lastName || ''}`.trim()
    const designation = conv.employer?.designation || 'Recruiter'
    return name ? `${name} · ${designation}` : designation
  }

  return (
    <CandidateLayout>
      <SEOMeta
        title="Messages | Career Wings"
        description="View and reply to messages from recruiters and employers on Career Wings."
      />

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[620px]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">My Messages</h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chat with recruiters and respond to job opportunities
              </p>
            </div>
          </div>
          <button
            onClick={fetchConversations}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANE */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200/80 flex flex-col bg-white">
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search companies or jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilterTab('all')}
                  className={cn(
                    'flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition',
                    filterTab === 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  All ({conversations.length})
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={cn(
                    'flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition',
                    filterTab === 'unread' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  Unread ({conversations.filter((c) => c.unreadCount > 0).length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {isLoadingConversations ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Loading messages...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">No messages yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchQuery
                        ? 'Try a different search term.'
                        : 'Recruiters will message you when they find your profile interesting.'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeConversation?.id === conv.id
                  const companyName = getEmployerDisplayName(conv)
                  const logo = conv.employer?.company?.logo

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversation(conv)}
                      className={cn(
                        'w-full text-left p-3.5 flex items-start gap-3 transition-colors relative',
                        isSelected
                          ? 'bg-blue-50/50 border-l-4 border-blue-500'
                          : 'hover:bg-slate-50/80'
                      )}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        {logo ? (
                          <img
                            src={logo}
                            alt={companyName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                            {companyName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{companyName}</h4>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {conv.lastMessageAt
                              ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })
                              : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mb-1">
                          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{conv.job?.title || getEmployerSubtitle(conv)}</span>
                        </div>
                        <p className={cn('text-xs truncate', conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'text-slate-500')}>
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                      </div>

                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 mt-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE */}
          <div className="hidden md:flex flex-1 flex-col bg-slate-50/30">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {activeConversation.employer?.company?.logo ? (
                        <img
                          src={activeConversation.employer.company.logo}
                          alt={activeConversation.employer.company.name || ''}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700 font-bold text-sm flex items-center justify-center border border-blue-200">
                          {getEmployerDisplayName(activeConversation).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {getEmployerDisplayName(activeConversation)}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-full">
                          Verified Recruiter
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>{getEmployerSubtitle(activeConversation)}</span>
                        {activeConversation.employer?.company?.industry && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {activeConversation.employer.company.industry}
                          </span>
                        )}
                        {activeConversation.job && (
                          <span className="text-blue-600 font-medium">
                            • Re: {activeConversation.job.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeConversation.employer?.phone && (
                      <a
                        href={`https://wa.me/91${activeConversation.employer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition"
                      >
                        WhatsApp
                      </a>
                    )}
                    {activeConversation.job && (
                      <Link
                        to={`/jobs/${activeConversation.job.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        View Job
                      </Link>
                    )}
                  </div>
                </div>

                {/* Job Context Strip */}
                {activeConversation.job && (
                  <div className="px-6 py-2 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border-b border-blue-100/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        Regarding:{' '}
                        <strong className="text-slate-900 font-semibold">
                          {activeConversation.job.title}
                        </strong>
                      </span>
                      {activeConversation.job.city && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3" />
                          {activeConversation.job.city}
                        </span>
                      )}
                      {activeConversation.job.workMode && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                          {activeConversation.job.workMode}
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/jobs/${activeConversation.job.slug}`}
                      target="_blank"
                      className="text-blue-600 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      View Vacancy <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {isLoadingMessages ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-blue-500 mb-3">
                        <Star className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 mb-1">New opportunity!</h4>
                      <p className="text-xs max-w-sm text-slate-500">
                        A recruiter has initiated this conversation. Reply to express your interest.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.senderRole === 'CANDIDATE' || msg.senderId === user?.id
                      const showAvatar =
                        !isMe && (index === 0 || messages[index - 1]?.senderRole !== msg.senderRole)

                      return (
                        <div
                          key={msg.id}
                          className={cn('flex gap-2.5 max-w-[80%]', isMe ? 'ml-auto flex-row-reverse' : 'mr-auto')}
                        >
                          {!isMe && (
                            <div className="w-8 h-8 rounded-full shrink-0 mt-1">
                              {showAvatar ? (
                                activeConversation.employer?.company?.logo ? (
                                  <img
                                    src={activeConversation.employer.company.logo}
                                    alt="Employer"
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                                    {getEmployerDisplayName(activeConversation).slice(0, 2).toUpperCase()}
                                  </div>
                                )
                              ) : (
                                <div className="w-8 h-8" />
                              )}
                            </div>
                          )}

                          <div
                            className={cn(
                              'group relative p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs',
                              isMe
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <div className={cn('flex items-center gap-1 justify-end mt-1 text-[10px]', isMe ? 'text-blue-100/90' : 'text-slate-400')}>
                              <span>{formatMsgDate(msg.createdAt)}</span>
                              {isMe && (
                                <CheckCheck
                                  className={cn('w-3 h-3', msg.isRead ? 'text-emerald-300' : 'text-blue-200/70')}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies */}
                <div className="px-4 py-2 bg-white/70 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Quick Reply:
                  </span>
                  {CANDIDATE_QUICK_REPLIES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(tmpl)}
                      className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-[11px] font-medium transition border border-slate-200/60"
                    >
                      {tmpl.slice(0, 38)}...
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-4 bg-white border-t border-slate-200/80">
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage() }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Reply to ${getEmployerDisplayName(activeConversation)}... (Press Enter to send)`}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={isSending}
                      className="flex-1 px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || isSending}
                      className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Your Recruiter Messages</h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Select a conversation to read and reply to recruiter messages. Stay responsive to improve your chances!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </CandidateLayout>
  )
}

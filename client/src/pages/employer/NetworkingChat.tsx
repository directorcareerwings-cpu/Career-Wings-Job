import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import EmployerLayout from '@/components/layout/EmployerLayout'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { chatAPI, employerAPI } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Mail,
  FileText,
  CheckCheck,
  Check,
  Calendar,
  Sparkles,
  Plus,
  X,
  User,
  Briefcase,
  MapPin,
  ExternalLink,
  Clock,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

interface CandidateInfo {
  id: string
  userId: string
  firstName: string
  lastName: string
  profilePhoto?: string | null
  headline?: string | null
  currentRole?: string | null
  currentCompany?: string | null
  currentLocation?: string | null
  totalExperience?: number | null
  phone?: string | null
  resumeFile?: string | null
  candidateSkills?: { skill: { name: string } }[]
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
  candidate: CandidateInfo
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

const QUICK_TEMPLATES = [
  '📅 Can we schedule a brief 15-minute phone interview tomorrow?',
  '💼 Could you please confirm your current CTC, expected CTC, and notice period?',
  '📄 Please share your updated resume and portfolio link with us.',
  '📍 Are you available for an on-site interview at our Guwahati office?',
  '🎉 Congratulations! You have been shortlisted for the next round.',
]

export default function NetworkingChat() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const candidateParam = searchParams.get('candidateId')
  const jobParam = searchParams.get('jobId')

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all')

  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // New Chat Modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [availableCandidates, setAvailableCandidates] = useState<any[]>([])
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false)
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('')
  const [selectedCandidateForNewChat, setSelectedCandidateForNewChat] = useState<any | null>(null)
  const [initialMsgInput, setInitialMsgInput] = useState(
    'Hi, we reviewed your profile on Career Wings and would like to connect regarding an opening.'
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load conversations list
  const fetchConversations = async (selectCandidateId?: string) => {
    try {
      const res = await chatAPI.getConversations()
      const list: ConversationItem[] = res.data?.data || []
      setConversations(list)

      if (selectCandidateId) {
        const found = list.find((c) => c.candidateId === selectCandidateId)
        if (found) {
          setActiveConversation(found)
        }
      } else if (!activeConversation && list.length > 0) {
        setActiveConversation(list[0])
      } else if (activeConversation) {
        const updated = list.find((c) => c.id === activeConversation.id)
        if (updated) {
          setActiveConversation(updated)
        }
      }
    } catch (err) {
      console.error('Failed to load conversations', err)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  // Handle URL candidateId parameter (e.g. from ATS or Candidate database)
  useEffect(() => {
    if (candidateParam) {
      chatAPI
        .startConversation({ candidateId: candidateParam, jobId: jobParam || undefined })
        .then((res) => {
          fetchConversations(candidateParam)
        })
        .catch(() => {
          fetchConversations()
        })
    } else {
      fetchConversations()
    }
  }, [candidateParam, jobParam])

  // Load messages whenever active conversation changes
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
        // Mark conversation unread count as 0 locally
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

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Background polling for new messages every 4 seconds
  useEffect(() => {
    if (!activeConversation) return

    const interval = setInterval(() => {
      chatAPI
        .getMessages(activeConversation.id)
        .then((res) => {
          const fetched: MessageItem[] = res.data?.data?.messages || []
          setMessages((prev) => {
            if (fetched.length !== prev.length) {
              return fetched
            }
            return prev
          })
        })
        .catch(() => null)
    }, 4000)

    return () => clearInterval(interval)
  }, [activeConversation?.id])

  // Send message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : messageInput
    if (!textToSend.trim() || !activeConversation || isSending) return

    const trimmed = textToSend.trim()
    if (!customText) setMessageInput('')
    setIsSending(true)

    // Optimistic message
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: MessageItem = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user?.id || 'employer',
      senderRole: 'EMPLOYER',
      message: trimmed,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await chatAPI.sendMessage(activeConversation.id, trimmed)
      if (res.data?.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.data.data : m))
        )
        // Update last message in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  lastMessage: trimmed,
                  lastMessageAt: new Date().toISOString(),
                }
              : c
          )
        )
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send message')
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  // Open New Chat Modal
  const openNewChatModal = async () => {
    setIsNewChatModalOpen(true)
    setIsLoadingCandidates(true)
    try {
      const res = await chatAPI.getAvailableCandidates()
      setAvailableCandidates(res.data?.data || [])
    } catch (err) {
      toast.error('Failed to load candidate list')
    } finally {
      setIsLoadingCandidates(false)
    }
  }

  const handleStartNewChat = async () => {
    if (!selectedCandidateForNewChat) return
    try {
      const res = await chatAPI.startConversation({
        candidateId: selectedCandidateForNewChat.id,
        jobId: selectedCandidateForNewChat.appliedJob?.id || undefined,
        initialMessage: initialMsgInput,
      })
      const conv = res.data?.data
      setIsNewChatModalOpen(false)
      setSelectedCandidateForNewChat(null)
      toast.success('Conversation started!')
      await fetchConversations(selectedCandidateForNewChat.id)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start conversation')
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const fullName = `${c.candidate?.firstName || ''} ${c.candidate?.lastName || ''}`.toLowerCase()
    const jobTitle = (c.job?.title || '').toLowerCase()
    const query = searchQuery.toLowerCase().trim()
    const matchesSearch = !query || fullName.includes(query) || jobTitle.includes(query)
    const matchesTab = filterTab === 'all' || (filterTab === 'unread' && c.unreadCount > 0)
    return matchesSearch && matchesTab
  })

  // Format date grouping helper
  const formatMsgDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return format(d, 'h:mm a')
    } catch {
      return ''
    }
  }

  return (
    <EmployerLayout>
      <SEOMeta
        title="Networking Chat | Career Wings Employer Portal"
        description="Connect and chat directly with candidates across Northeast India on Career Wings."
      />

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[620px]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E53935] flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  Networking Chat
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Recruiter Network
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instant messaging, candidate engagement, and interview coordination
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchConversations()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Refresh messages"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openNewChatModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Start New Chat
            </button>
          </div>
        </div>

        {/* Dual-Pane Chat Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* ─── LEFT PANE: Conversations List ─── */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-200/80 flex flex-col bg-white">
            {/* Search & Tabs */}
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search candidates or jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilterTab('all')}
                  className={cn(
                    'flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition',
                    filterTab === 'all'
                      ? 'bg-red-50 text-[#E53935]'
                      : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  All Chats ({conversations.length})
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={cn(
                    'flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition',
                    filterTab === 'unread'
                      ? 'bg-red-50 text-[#E53935]'
                      : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  Unread (
                  {conversations.filter((c) => c.unreadCount > 0).length})
                </button>
              </div>
            </div>

            {/* Conversation List Scroll */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {isLoadingConversations ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Loading discussions...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">No conversations found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchQuery
                        ? 'Try modifying your search filter.'
                        : 'Initiate a chat with applicants or candidates.'}
                    </p>
                  </div>
                  <button
                    onClick={openNewChatModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Start First Chat
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeConversation?.id === conv.id
                  const candidateName = `${conv.candidate?.firstName || 'Candidate'} ${
                    conv.candidate?.lastName || ''
                  }`.trim()
                  const roleOrJob =
                    conv.job?.title ||
                    conv.candidate?.currentRole ||
                    conv.candidate?.headline ||
                    'Candidate'

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversation(conv)}
                      className={cn(
                        'w-full text-left p-3.5 flex items-start gap-3 transition-colors relative',
                        isSelected
                          ? 'bg-red-50/50 border-l-4 border-[#E53935]'
                          : 'hover:bg-slate-50/80'
                      )}
                    >
                      {/* Avatar with status */}
                      <div className="relative shrink-0 mt-0.5">
                        {conv.candidate?.profilePhoto ? (
                          <img
                            src={conv.candidate.profilePhoto}
                            alt={candidateName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                            {candidateName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {candidateName}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {conv.lastMessageAt
                              ? formatDistanceToNow(new Date(conv.lastMessageAt), {
                                  addSuffix: false,
                                })
                              : ''}
                          </span>
                        </div>

                        {/* Job or role tag */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mb-1">
                          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{roleOrJob}</span>
                        </div>

                        {/* Last message preview */}
                        <p
                          className={cn(
                            'text-xs truncate',
                            conv.unreadCount > 0
                              ? 'font-bold text-slate-900'
                              : 'text-slate-500'
                          )}
                        >
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                      </div>

                      {/* Unread Pill */}
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 mt-1 px-1.5 py-0.5 rounded-full bg-[#E53935] text-white text-[10px] font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ─── RIGHT PANE: Active Chat Room ─── */}
          <div className="hidden md:flex flex-1 flex-col bg-slate-50/30">
            {activeConversation ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {activeConversation.candidate?.profilePhoto ? (
                        <img
                          src={activeConversation.candidate.profilePhoto}
                          alt={activeConversation.candidate.firstName}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200">
                          {activeConversation.candidate?.firstName?.[0]}
                          {activeConversation.candidate?.lastName?.[0]}
                        </div>
                      )}
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeConversation.candidate?.firstName}{' '}
                          {activeConversation.candidate?.lastName}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-full">
                          Active in Network
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        {activeConversation.candidate?.currentLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {activeConversation.candidate.currentLocation}
                          </span>
                        )}
                        {activeConversation.candidate?.totalExperience !== undefined && (
                          <span>
                            • {activeConversation.candidate.totalExperience} Yrs Exp
                          </span>
                        )}
                        {activeConversation.job && (
                          <span className="text-[#E53935] font-medium">
                            • Applied: {activeConversation.job.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2">
                    {activeConversation.candidate?.phone && (
                      <a
                        href={`https://wa.me/91${activeConversation.candidate.phone.replace(
                          /\D/g,
                          ''
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition"
                        title="Chat via WhatsApp"
                      >
                        WhatsApp
                      </a>
                    )}
                    {activeConversation.candidate?.phone && (
                      <a
                        href={`tel:${activeConversation.candidate.phone}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        Call
                      </a>
                    )}
                    <Link
                      to={`/employer/candidates/${activeConversation.candidateId}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      View Profile
                    </Link>
                  </div>
                </div>

                {/* Job Context Strip (if linked to a job) */}
                {activeConversation.job && (
                  <div className="px-6 py-2 bg-gradient-to-r from-red-50/70 to-amber-50/70 border-b border-red-100/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Briefcase className="w-3.5 h-3.5 text-[#E53935]" />
                      <span>
                        Subject Job:{' '}
                        <strong className="text-slate-900 font-semibold">
                          {activeConversation.job.title}
                        </strong>
                      </span>
                      {activeConversation.job.city && (
                        <span className="text-slate-500">
                          ({activeConversation.job.city})
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/jobs/${activeConversation.job.slug}`}
                      target="_blank"
                      className="text-[#E53935] font-semibold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      View Vacancy <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {isLoadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-red-500 mb-3">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 mb-1">
                        Start the conversation
                      </h4>
                      <p className="text-xs max-w-sm text-slate-500">
                        Send a friendly hello, discuss job expectations, or invite{' '}
                        {activeConversation.candidate?.firstName} to an interview.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe =
                        msg.senderRole === 'EMPLOYER' || msg.senderId === user?.id
                      const showAvatar =
                        !isMe &&
                        (index === 0 || messages[index - 1]?.senderRole !== msg.senderRole)

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex gap-2.5 max-w-[80%]',
                            isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                          )}
                        >
                          {!isMe && (
                            <div className="w-8 h-8 rounded-full shrink-0 mt-1">
                              {showAvatar ? (
                                activeConversation.candidate?.profilePhoto ? (
                                  <img
                                    src={activeConversation.candidate.profilePhoto}
                                    alt="Candidate"
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                    {activeConversation.candidate?.firstName?.[0]}
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
                                ? 'bg-gradient-to-r from-red-600 to-[#c9252c] text-white rounded-br-xs'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                            <div
                              className={cn(
                                'flex items-center gap-1 justify-end mt-1 text-[10px]',
                                isMe ? 'text-red-100/90' : 'text-slate-400'
                              )}
                            >
                              <span>{formatMsgDate(msg.createdAt)}</span>
                              {isMe && (
                                <CheckCheck
                                  className={cn(
                                    'w-3 h-3',
                                    msg.isRead ? 'text-emerald-300' : 'text-red-200/70'
                                  )}
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

                {/* Quick Response Templates */}
                <div className="px-4 py-2 bg-white/70 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Quick Reply:
                  </span>
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(tmpl)}
                      className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-[11px] font-medium transition border border-slate-200/60"
                    >
                      {tmpl.slice(0, 38)}...
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-4 bg-white border-t border-slate-200/80">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendMessage()
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Message ${
                        activeConversation.candidate?.firstName || 'candidate'
                      }... (Press Enter to send)`}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={isSending}
                      className="flex-1 px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                    />

                    <button
                      type="submit"
                      disabled={!messageInput.trim() || isSending}
                      className="px-5 py-3 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-red-50 text-[#E53935] flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Career Wings Recruiter Chat
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-6">
                  Select a candidate from the left conversation list or start a new
                  discussion with candidates who applied to your job vacancies.
                </p>
                <button
                  onClick={openNewChatModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-4 h-4" /> Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── NEW CHAT MODAL ─── */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#E53935] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Initiate Networking Chat
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select a candidate from your applicants or active talent pool
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by candidate name or skill..."
                  value={candidateSearchQuery}
                  onChange={(e) => setCandidateSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 max-h-60">
              {isLoadingCandidates ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading candidate directory...
                </div>
              ) : availableCandidates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No candidates found.
                </div>
              ) : (
                availableCandidates
                  .filter((cand) => {
                    const name = `${cand.firstName} ${cand.lastName}`.toLowerCase()
                    const query = candidateSearchQuery.toLowerCase().trim()
                    return !query || name.includes(query)
                  })
                  .map((cand) => {
                    const isSelected = selectedCandidateForNewChat?.id === cand.id
                    return (
                      <button
                        key={cand.id}
                        onClick={() => setSelectedCandidateForNewChat(cand)}
                        className={cn(
                          'w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 transition',
                          isSelected
                            ? 'bg-red-50 border border-red-200 text-red-900'
                            : 'hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {cand.firstName?.[0]}
                            {cand.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {cand.firstName} {cand.lastName}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {cand.appliedJob
                                ? `Applied: ${cand.appliedJob.title}`
                                : cand.currentRole || cand.currentLocation || 'Northeast Candidate'}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#E53935] shrink-0" />
                        )}
                      </button>
                    )
                  })
              )}
            </div>

            {/* Initial Message Input */}
            {selectedCandidateForNewChat && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Opening Message to {selectedCandidateForNewChat.firstName}:
                </label>
                <textarea
                  rows={2}
                  value={initialMsgInput}
                  onChange={(e) => setInitialMsgInput(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition resize-none"
                />
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                disabled={!selectedCandidateForNewChat}
                onClick={handleStartNewChat}
                className="px-4 py-2 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Message & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </EmployerLayout>
  )
}

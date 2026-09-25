import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Car,
  Check,
  CheckCheck,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react'
import chatApi from '../api/chat.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useChat } from '../context/ChatContext.jsx'
import { getEcho } from '../realtime/echo.js'
import { getMessagePositionInfo } from '../utils/chatUtils.js'
import {
  getCachedConversations,
  setCachedConversations,
  getCachedMessages,
  setCachedMessages,
} from '../utils/chatCache.js'
import ChatMessageItem from '../components/chat/ChatMessageItem.jsx'
import './Messages.css'

function ThreadSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="messages-hub-thread-item messages-hub-thread-item--skeleton">
          <div className="sk sk-avatar" />
          <div className="messages-hub-thread-content">
            <div className="sk sk-line sk-line--mid" />
            <div className="sk sk-line sk-line--full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MessageSkeleton() {
  const rows = [
    { me: false, width: '62%' },
    { me: true, width: '44%' },
    { me: false, width: '71%' },
    { me: true, width: '55%' },
  ]
  return (
    <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 4px' }}>
      {rows.map((r, i) => (
        <div
          key={i}
          className="sk sk-bubble"
          style={{ width: r.width, alignSelf: r.me ? 'flex-end' : 'flex-start' }}
        />
      ))}
    </div>
  )
}

export default function Messages() {
  const { user, isAuthenticated, openLoginModal } = useAuth()
  const { unreadCount, refreshUnreadCount } = useChat()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetConvId = searchParams.get('conversation')

  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [searchFilter, setSearchFilter] = useState('')
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [mobileView, setMobileView] = useState('list') // 'list' | 'chat'

  const chatStreamRef = useRef(null)
  const messagesEndRef = useRef(null)
  const selectedConvIdRef = useRef(null)
  selectedConvIdRef.current = selectedConv?.id
  const targetConvIdRef = useRef(targetConvId)
  targetConvIdRef.current = targetConvId
  const convReqRef = useRef(0) // guards overlapping conversation-list fetches
  const msgsReqRef = useRef(0) // guards overlapping message-log fetches

  const scrollToBottom = (smooth = true) => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTo({
        top: chatStreamRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  // Fetch all conversations — cache-first: cached threads render instantly
  // with zero loader flash; the network refresh runs silently underneath.
  const applyConversationList = (list) => {
    setConversations(list)
    if (list.length === 0) return
    const currentId = selectedConvIdRef.current
    if (currentId && list.some((c) => String(c.id) === String(currentId))) return
    const target = targetConvIdRef.current
    const found = target ? list.find((c) => String(c.id) === String(target)) : null
    selectConversation(found || list[0])
  }

  const loadConversations = async () => {
    if (!isAuthenticated || !user?.id) return
    const myReq = ++convReqRef.current
    const uid = user.id

    const cached = getCachedConversations(uid)
    if (cached.length > 0) {
      applyConversationList(cached)
    } else {
      setIsLoadingConversations(true)
    }

    try {
      const res = await chatApi.getConversations()
      if (myReq !== convReqRef.current) return // stale — a newer load superseded this
      const list = res.data || []
      setCachedConversations(uid, list)
      setConversations(list)
      applyConversationList(list)
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      if (myReq === convReqRef.current) setIsLoadingConversations(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [isAuthenticated, user?.id])

  // Deep-link / back-button support: ?conversation=X selects without refetching.
  useEffect(() => {
    if (!targetConvId || conversations.length === 0) return
    if (String(selectedConvIdRef.current) === String(targetConvId)) return
    const found = conversations.find((c) => String(c.id) === String(targetConvId))
    if (found) selectConversation(found, { syncParam: false })
  }, [targetConvId, conversations])

  // Persist threads + active message log so revisits render instantly.
  useEffect(() => {
    if (user?.id && conversations.length > 0) setCachedConversations(user.id, conversations)
  }, [conversations, user?.id])

  useEffect(() => {
    if (user?.id && selectedConv?.id != null) setCachedMessages(user.id, selectedConv.id, messages)
  }, [messages, selectedConv?.id, user?.id])

  // Load one message log — cached logs render instantly with no loader
  // flash; uncached ones show a skeleton while fetching in the background.
  const fetchMessages = async (conv, myReq, uid) => {
    try {
      const res = await chatApi.getMessages(conv.id)
      if (myReq !== msgsReqRef.current) return // user already switched threads
      const list = res.data || []
      setMessages(list)
      setCachedMessages(uid, conv.id, list)

      // Fire-and-forget: don't hold the UI hostage on read receipts.
      chatApi.markAsRead(conv.id).then(() => refreshUnreadCount()).catch(() => {})

      // Decrement unread count locally in conversation list
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)),
      )
    } catch (err) {
      if (myReq === msgsReqRef.current) console.error('Failed to load conversation messages:', err)
    } finally {
      if (myReq === msgsReqRef.current) {
        setIsLoadingMessages(false)
        requestAnimationFrame(() => scrollToBottom(false))
      }
    }
  }

  // Select a conversation and load its messages
  const selectConversation = async (conv, opts = {}) => {
    if (!conv) return
    const { syncParam = true } = opts
    const myReq = ++msgsReqRef.current
    const uid = user?.id

    setSelectedConv(conv)
    setMobileView('chat')
    if (syncParam && String(targetConvIdRef.current) !== String(conv.id)) {
      setSearchParams({ conversation: conv.id })
    }

    const cached = getCachedMessages(uid, conv.id)
    if (cached !== null) {
      setMessages(cached)
      setIsLoadingMessages(false)
      requestAnimationFrame(() => scrollToBottom(false))
      fetchMessages(conv, myReq, uid) // silent refresh underneath
      return
    }

    setMessages([])
    setIsLoadingMessages(true)
    await fetchMessages(conv, myReq, uid)
  }

  useLayoutEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true)
    }
  }, [messages])

  // Realtime listeners for dedicated messages page
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    let userChannel = null
    try {
      const echo = getEcho()
      if (!echo) return undefined
      userChannel = echo.private(`user.${user.id}`)

      userChannel.listen('.message.sent', (event) => {
        const incomingMsg = event.message
        const convId = event.conversation_id

        if (selectedConvIdRef.current === convId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incomingMsg.id || m.temp_id === incomingMsg.id)) {
              return prev
            }
            return [...prev, incomingMsg]
          })
          chatApi.markAsRead(convId).catch(() => {})
        }

        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === convId)
          if (index > -1) {
            const updated = [...prev]
            const target = {
              ...updated[index],
              last_message: incomingMsg,
              last_message_at: incomingMsg.created_at,
            }
            if (selectedConvIdRef.current !== convId) {
              target.unread_count = (target.unread_count || 0) + 1
            }
            updated.splice(index, 1)
            return [target, ...updated]
          }
          return prev
        })
      })

      userChannel.listen('.message.read', (event) => {
        const { conversation_id, reader_id } = event
        if (selectedConvIdRef.current === conversation_id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender_id !== reader_id
                ? { ...m, is_read: true, status: 'seen', read_at: event.read_at }
                : m,
            ),
          )
        }
      })
    } catch (err) {
      console.warn('Realtime echo error in Messages:', err)
    }

    return () => {
      try {
        if (userChannel) {
          userChannel.stopListening('.message.sent')
          userChannel.stopListening('.message.read')
        }
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, user?.id])

  // Instant optimistic message dispatch
  const handleSend = (e) => {
    e?.preventDefault()
    const text = inputVal.trim()
    if (!text || !selectedConv?.id) return

    setInputVal('')

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const optimisticMsg = {
      id: tempId,
      temp_id: tempId,
      conversation_id: selectedConv.id,
      sender_id: user?.id,
      sender: {
        id: user?.id,
        username: user?.username,
        avatar_url: user?.avatar_url,
        is_kyc_verified: user?.is_kyc_verified,
        role: user?.role,
      },
      body: text,
      is_redacted: false,
      read_at: null,
      is_read: false,
      status: 'sending',
      created_at: new Date().toISOString(),
    }

    // 1. Immediately append to message stream
    setMessages((prev) => [...prev, optimisticMsg])

    // 2. Immediately update sidebar preview
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id
          ? { ...c, last_message: optimisticMsg, last_message_at: optimisticMsg.created_at }
          : c,
      ),
    )

    requestAnimationFrame(() => scrollToBottom(true))

    // 3. Fire API in background
    chatApi
      .sendMessage(selectedConv.id, { body: text })
      .then((res) => {
        const newMsg = {
          ...res.data,
          status: res.data.is_read || res.data.read_at ? 'seen' : 'sent',
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId || m.temp_id === tempId ? newMsg : m)),
        )
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id
              ? { ...c, last_message: newMsg, last_message_at: newMsg.created_at }
              : c,
          ),
        )
      })
      .catch((err) => {
        console.error('Failed to send message:', err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId || m.temp_id === tempId ? { ...m, status: 'failed' } : m,
          ),
        )
      })
  }

  // Retry sending a failed message
  const retryMessage = (failedMsg) => {
    if (!failedMsg || !selectedConv?.id) return
    const targetId = failedMsg.temp_id || failedMsg.id

    setMessages((prev) =>
      prev.map((m) =>
        m.id === targetId || m.temp_id === targetId ? { ...m, status: 'sending' } : m,
      ),
    )

    chatApi
      .sendMessage(selectedConv.id, { body: failedMsg.body })
      .then((res) => {
        const newMsg = {
          ...res.data,
          status: res.data.is_read || res.data.read_at ? 'seen' : 'sent',
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === targetId || m.temp_id === targetId ? newMsg : m)),
        )
      })
      .catch(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId || m.temp_id === targetId ? { ...m, status: 'failed' } : m,
          ),
        )
      })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="messages-hub-page messages-hub-page--guest">
        <div className="messages-hub-guest-card">
          <div className="messages-hub-guest-icon">
            <MessageSquare size={36} />
          </div>
          <h2>Messages & Seller Inquiries</h2>
          <p>
            Please log in or create an account to communicate directly with verified vehicle sellers
            and parts specialists.
          </p>
          <button type="button" className="btn btn-primary" onClick={openLoginModal}>
            Log In to Access Inbox
          </button>
        </div>
      </div>
    )
  }

  const filteredConversations = conversations.filter((c) => {
    const otherUsername = c.other_user?.username?.toLowerCase() || ''
    const filter = searchFilter.toLowerCase()
    return otherUsername.includes(filter)
  })

  return (
    <div className="messages-hub-page">
      <div className={`messages-hub-container messages-hub-container--mobile-${mobileView}`}>
        {/* Left Sidebar: Threads List */}
        <aside className="messages-hub-sidebar">
          <div className="messages-hub-sidebar-header">
            <div className="messages-hub-title-row">
              <h1 className="messages-hub-title">Inbox</h1>
              {unreadCount > 0 && (
                <span className="action-badge-inline">{unreadCount} unread</span>
              )}
            </div>

            {/* Search filter input */}
            <div className="messages-hub-search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search conversations by @username..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="messages-hub-threads-list">
            {isLoadingConversations && conversations.length === 0 ? (
              <ThreadSkeleton />
            ) : filteredConversations.length === 0 ? (
              <div className="messages-hub-threads-empty">
                <p>No conversations found</p>
                <span className="muted">
                  Browse cars or parts and click "Chat with Seller" to start a conversation.
                </span>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id
                const other = conv.other_user
                const otherUsername = other?.username ? `@${other.username}` : 'Member'
                const lastMsg = conv.last_message
                const lastTime = conv.last_message_at
                  ? new Date(conv.last_message_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })
                  : ''

                return (
                  <div
                    key={conv.id}
                    className={`messages-hub-thread-item ${isSelected ? 'messages-hub-thread-item--active' : ''}`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="messages-hub-thread-avatar">
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} alt={otherUsername} />
                      ) : (
                        <div className="chat-message-item__avatar-placeholder">
                          <User size={18} />
                        </div>
                      )}
                      <span className="floating-chat-drawer__online-dot" />
                    </div>

                    <div className="messages-hub-thread-content">
                      <div className="messages-hub-thread-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="messages-hub-thread-name">{otherUsername}</span>
                          {other?.is_kyc_verified && (
                            <ShieldCheck size={13} style={{ color: '#10b981' }} title="KYC Verified Seller" />
                          )}
                        </div>
                        <span className="messages-hub-thread-time">{lastTime}</span>
                      </div>

                      <div className="messages-hub-thread-bottom">
                        <p className="messages-hub-thread-preview">
                          {lastMsg ? lastMsg.body : 'No messages yet.'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="messages-hub-thread-badge">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Active Chat Conversation */}
        <section className="messages-hub-chat-area">
          {selectedConv ? (
            <>
              {/* Chat Area Header */}
              <div className="messages-hub-chat-header">
                <div className="messages-hub-chat-user">
                  <button
                    type="button"
                    className="messages-hub-mobile-back-btn"
                    onClick={() => setMobileView('list')}
                    title="Back to inbox"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="messages-hub-thread-avatar">
                    {selectedConv.other_user?.avatar_url ? (
                      <img
                        src={selectedConv.other_user.avatar_url}
                        alt={selectedConv.other_user?.username ? `@${selectedConv.other_user.username}` : 'Member'}
                      />
                    ) : (
                      <div className="chat-message-item__avatar-placeholder">
                        <User size={18} />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h2 className="messages-hub-chat-username">
                        {selectedConv.other_user?.username ? `@${selectedConv.other_user.username}` : 'Member'}
                      </h2>
                      {selectedConv.other_user?.is_kyc_verified && (
                        <ShieldCheck size={16} style={{ color: '#10b981' }} title="KYC Verified Seller" />
                      )}
                    </div>
                    <div className="floating-chat-drawer__role-pill">
                      {selectedConv.other_user?.is_kyc_verified && (
                        <span className="floating-chat-drawer__agent-badge" style={{ background: '#10b981' }}>KYC Verified</span>
                      )}
                      {selectedConv.other_user?.is_agent && (
                        <span className="floating-chat-drawer__agent-badge">Accredited Agent</span>
                      )}
                      <span>Verified {selectedConv.other_user?.role || 'Member'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PII Safety Notice Banner */}
              <div className="floating-chat-drawer__safety-banner">
                <Shield size={15} className="floating-chat-drawer__safety-icon" />
                <span>
                  <strong>Garage Safety Shield:</strong> Personal phone numbers, email addresses, and
                  external links are automatically redacted for platform buyer protection.
                </span>
              </div>

              {/* Messages Body */}
              <div className="messages-hub-chat-stream" ref={chatStreamRef}>
                {isLoadingMessages && messages.length === 0 ? (
                  <MessageSkeleton />
                ) : messages.length === 0 ? (
                  <div className="floating-chat-drawer__empty">
                    <p className="floating-chat-drawer__empty-title">Conversation Started</p>
                    <p className="floating-chat-drawer__empty-sub">
                      Send a message to discuss condition, schedule an inspection, or agree on payment.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const { position, showSenderHeader } = getMessagePositionInfo(messages, idx)
                    return (
                      <ChatMessageItem
                        key={msg.id || msg.temp_id || idx}
                        message={msg}
                        isOwnMessage={msg.sender_id === user?.id}
                        position={position}
                        showSenderHeader={showSenderHeader}
                        onRetry={() => retryMessage(msg)}
                      />
                    )
                  })
                )}
                <div ref={messagesEndRef} style={{ height: 1, minHeight: 1 }} />
              </div>

              {/* Message Composer Footer */}
              <form className="messages-hub-chat-footer" onSubmit={handleSend}>
                <textarea
                  className="messages-hub-chat-input"
                  placeholder="Type a message..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                />

                <button
                  type="submit"
                  className="floating-chat-drawer__send-btn"
                  disabled={!inputVal.trim()}
                  title="Send Message"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="messages-hub-no-selection">
              <MessageSquare size={48} className="messages-hub-no-selection-icon" />
              <h3>Select a conversation</h3>
              <p>Choose an existing discussion thread from the left or browse listings to inquire.</p>
              <Link to="/marketplace" className="btn btn-secondary">
                <Car size={16} />
                <span>Browse Cars</span>
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

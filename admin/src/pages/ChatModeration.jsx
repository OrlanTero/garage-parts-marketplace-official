import { useEffect, useState } from 'react'
import {
  MessageSquare,
  Search,
  Filter,
  ShieldAlert,
  User,
  Clock,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle,
  Tag,
  ArrowRight,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

export default function ChatModeration() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [redactedOnly, setRedactedOnly] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getChatConversations({
        q: search.trim() || undefined,
        redacted_only: redactedOnly ? true : undefined,
      })
      setConversations(res.data || [])
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [redactedOnly])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchConversations()
  }

  const handleSelectConversation = async (conv) => {
    setSelectedConversation(conv)
    setLoadingMessages(true)
    try {
      const res = await adminApi.getChatConversationMessages(conv.id)
      setMessages(res.messages || [])
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: '0 0 4px 0' }}>
            Basic Chat & Direct Messaging Moderation
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit 1:1 buyer-seller conversation threads, inspect PII safety redactions, and protect platform transactions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchConversations} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 400 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              type="text"
              placeholder="Search participant name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setRedactedOnly(!redactedOnly)}
            className={`btn btn-sm ${redactedOnly ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ShieldAlert size={14} />
            <span>{redactedOnly ? 'Showing PII Alerts Only' : 'Filter PII Redactions'}</span>
          </button>
        </div>
      </div>

      {/* Split Pane View */}
      <div className="chat-moderation-split" style={{ display: 'grid', gridTemplateColumns: selectedConversation ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Conversations List */}
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--admin-border-subtle)', fontWeight: 700, fontSize: 14 }}>
            Active Conversation Threads ({conversations.length})
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div>Loading chat logs...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              <MessageSquare size={36} style={{ color: 'var(--admin-text-muted)', marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Conversations Found</h3>
              <p style={{ margin: 0, fontSize: 14 }}>No chat sessions match your search or filter criteria.</p>
            </div>
          ) : (
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {conversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--admin-border-subtle)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(255, 90, 0, 0.06)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--admin-text-primary)' }}>
                        {conv.user_one?.name || 'User 1'} &amp; {conv.user_two?.name || 'User 2'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.last_message?.body || 'No messages yet'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="badge badge-neutral">{conv.total_messages} msgs</span>
                        {conv.has_pii_alerts && (
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <ShieldAlert size={10} /> {conv.redacted_messages_count} PII Redacted
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600 }}>
                        Inspect <ArrowRight size={11} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Conversation Message Stream */}
        {selectedConversation && (
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', height: 650 }}>
            {/* Thread Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--admin-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {selectedConversation.user_one?.name} ({selectedConversation.user_one?.role}) ↔ {selectedConversation.user_two?.name} ({selectedConversation.user_two?.role})
                </div>
                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                  Thread #{selectedConversation.id} · {selectedConversation.total_messages} total messages
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConversation(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>

            {/* Messages Body */}
            <div style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loadingMessages ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                  <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                  <div>Loading message stream...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: 32 }}>No messages in thread.</div>
              ) : (
                messages.map((msg) => {
                  const isRedacted = msg.is_redacted

                  return (
                    <div
                      key={msg.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: isRedacted ? 'rgba(239, 68, 68, 0.08)' : 'var(--admin-surface-2)',
                        border: isRedacted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--admin-border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--admin-text-primary)' }}>
                          {msg.sender?.name || 'Participant'} <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>({msg.sender?.role || 'user'})</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--admin-text-muted)' }}>
                          {new Date(msg.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ fontSize: 13, color: 'var(--admin-text-primary)', lineHeight: 1.4 }}>
                        {msg.body}
                      </div>

                      {isRedacted && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: 'var(--color-danger)', fontWeight: 600 }}>
                          <ShieldAlert size={12} /> Contact / PII Sanitized by Moderation Engine
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

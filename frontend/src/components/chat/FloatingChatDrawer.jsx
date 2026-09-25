import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  Shield,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { getMessagePositionInfo } from '../../utils/chatUtils.js'
import ChatMessageItem from './ChatMessageItem.jsx'
import './FloatingChatDrawer.css'

export default function FloatingChatDrawer() {
  const { user } = useAuth()
  const {
    isDrawerOpen,
    isDrawerMinimized,
    activeConversation,
    recipientUser,
    attachedListing,
    messages,
    isLoadingMessages,
    closeDrawer,
    toggleMinimize,
    setAttachedListing,
    sendMessage,
    retryMessage,
  } = useChat()

  const [inputVal, setInputVal] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isDrawerOpen && !isDrawerMinimized) {
      scrollToBottom()
    }
  }, [messages, isDrawerOpen, isDrawerMinimized])

  if (!isDrawerOpen) return null

  const handleSend = (e) => {
    e?.preventDefault()
    const text = inputVal.trim()
    if (!text) return

    // Immediately clear input for instant feel
    setInputVal('')

    // Fire non-blocking optimistic send
    sendMessage(text).catch((err) => {
      console.warn('Message send error caught in component:', err)
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const recipientUsername = recipientUser?.username ? `@${recipientUser.username}` : (recipientUser?.role || 'Seller')
  const recipientRole = recipientUser?.role || 'Seller'
  const isAgent = recipientUser?.is_agent
  const isKycVerified = recipientUser?.is_kyc_verified

  return (
    <div className={`floating-chat-drawer ${isDrawerMinimized ? 'floating-chat-drawer--minimized' : ''}`}>
      {/* Header */}
      <div className="floating-chat-drawer__header">
        <div className="floating-chat-drawer__recipient" onClick={toggleMinimize}>
          <div className="floating-chat-drawer__avatar-wrapper">
            {recipientUser?.avatar_url ? (
              <img src={recipientUser.avatar_url} alt={recipientUsername} className="floating-chat-drawer__avatar" />
            ) : (
              <div className="floating-chat-drawer__avatar-placeholder">
                <User size={16} />
              </div>
            )}
            <span className="floating-chat-drawer__online-dot" />
          </div>

          <div className="floating-chat-drawer__info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 className="floating-chat-drawer__name">{recipientUsername}</h3>
              {isKycVerified && (
                <ShieldCheck size={15} style={{ color: '#10b981' }} title="KYC Verified Seller" />
              )}
            </div>
            <div className="floating-chat-drawer__role-pill">
              {isKycVerified && (
                <span className="floating-chat-drawer__agent-badge" style={{ background: '#10b981' }}>Verified</span>
              )}
              {isAgent && <span className="floating-chat-drawer__agent-badge">Agent</span>}
              <span>{recipientRole}</span>
            </div>
          </div>
        </div>

        <div className="floating-chat-drawer__actions">
          {activeConversation?.id && (
            <Link
              to={`/messages?conversation=${activeConversation.id}`}
              className="floating-chat-drawer__action-btn"
              title="Open in Dedicated Inbox"
              onClick={closeDrawer}
            >
              <Maximize2 size={15} />
            </Link>
          )}

          <button
            type="button"
            className="floating-chat-drawer__action-btn"
            onClick={toggleMinimize}
            title={isDrawerMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 size={15} />
          </button>

          <button
            type="button"
            className="floating-chat-drawer__action-btn floating-chat-drawer__action-btn--close"
            onClick={closeDrawer}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Drawer Body (Hidden when Minimized) */}
      {!isDrawerMinimized && (
        <>
          {/* PII Safety Shield Banner */}
          <div className="floating-chat-drawer__safety-banner">
            <Shield size={14} className="floating-chat-drawer__safety-icon" />
            <span>Buyer Protection Active: Phone, email, & off-platform links are protected.</span>
          </div>

          {/* Messages Stream */}
          <div className="floating-chat-drawer__messages">
            {isLoadingMessages ? (
              <div className="floating-chat-drawer__loader">
                <div className="floating-chat-drawer__spinner" />
                <span>Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="floating-chat-drawer__empty">
                <p className="floating-chat-drawer__empty-title">Start a secure conversation</p>
                <p className="floating-chat-drawer__empty-sub">
                  Ask about vehicle condition, negotiation, parts compatibility, or delivery.
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
            <div ref={messagesEndRef} />
          </div>

          {/* Attached Listing Preview Chip */}
          {attachedListing && (
            <div className="floating-chat-drawer__attached-chip">
              <div className="floating-chat-drawer__attached-info">
                <Paperclip size={13} />
                <span className="floating-chat-drawer__attached-title">
                  Inquiring about: <strong>{attachedListing.title}</strong>
                </span>
                <span className="floating-chat-drawer__attached-price">
                  ₱{Number(attachedListing.price || 0).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                className="floating-chat-drawer__attached-remove"
                onClick={() => setAttachedListing(null)}
                title="Remove listing attachment"
              >
                <XCircle size={15} />
              </button>
            </div>
          )}

          {/* Input Footer */}
          <form className="floating-chat-drawer__footer" onSubmit={handleSend}>
            <textarea
              className="floating-chat-drawer__input"
              placeholder="Type your message..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              type="submit"
              className="floating-chat-drawer__send-btn"
              disabled={!inputVal.trim()}
              title="Send Message"
            >
              <Send size={16} />
            </button>
          </form>
        </>
      )}
    </div>
  )
}

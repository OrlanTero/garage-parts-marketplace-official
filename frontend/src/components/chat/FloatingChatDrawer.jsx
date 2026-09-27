import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Car,
  Maximize2,
  Minimize2,
  Package,
  Send,
  Shield,
  ShieldCheck,
  Tag,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useChat } from '../../context/ChatContext.jsx'
import { getMessagePositionInfo } from '../../utils/chatUtils.js'
import chatApi from '../../api/chat.js'
import SaleOrderStatusControl from '../SaleOrderStatusControl.jsx'
import ChatMessageItem from './ChatMessageItem.jsx'
import './FloatingChatDrawer.css'

function listingFallbackImg(type) {
  return type === 'part'
    ? 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=200&q=80'
    : 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=200&q=80'
}

function formatPrice(price) {
  return Number(price || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  })
}

export default function FloatingChatDrawer() {
  const { user } = useAuth()
  const {
    isDrawerOpen,
    isDrawerMinimized,
    activeListing,
    listingRole,
    listingConversations,
    activeConversation,
    recipientUser,
    attachedListing,
    messages,
    isLoadingMessages,
    closeDrawer,
    toggleMinimize,
    selectListingConversation,
    sendMessage,
    retryMessage,
    loadListingThread,
    offerAutoOpenKey,
    clearOfferAutoOpen,
  } = useChat()

  const [inputVal, setInputVal] = useState('')
  const [offerBoxOpen, setOfferBoxOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerError, setOfferError] = useState('')
  const [offerSending, setOfferSending] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isDrawerOpen && !isDrawerMinimized) {
      scrollToBottom()
    }
  }, [messages, isDrawerOpen, isDrawerMinimized])

  // Reset offer box whenever the listing thread changes
  useEffect(() => {
    setOfferBoxOpen(false)
    setOfferAmount('')
    setOfferError('')
  }, [activeListing?.type, activeListing?.id])

  // Listing "Make an Offer" button opens this drawer with the offer box
  // pre-opened once the listing thread is ready.
  const listingKey = activeListing?.type && activeListing?.id ? `${activeListing.type}:${activeListing.id}` : null
  useEffect(() => {
    if (
      offerAutoOpenKey &&
      listingKey &&
      offerAutoOpenKey === listingKey &&
      !isLoadingMessages &&
      activeConversation?.id
    ) {
      setOfferBoxOpen(true)
      clearOfferAutoOpen()
    }
  }, [offerAutoOpenKey, listingKey, isLoadingMessages, activeConversation?.id, clearOfferAutoOpen])

  if (!isDrawerOpen) return null

  const listingCard = activeListing?.card || attachedListing || null
  const listingType = activeListing?.type || attachedListing?.type || null
  const listingId = activeListing?.id || attachedListing?.id || null
  const listingTitle = listingCard?.title || 'Listing'
  const listingThumb = listingCard?.primary_image_url || listingFallbackImg(listingType)
  const isViewerSeller = listingRole === 'selling'

  const replyTargetName = recipientUser?.username
    ? `@${recipientUser.username}`
    : activeConversation
      ? recipientUser?.role || 'the other party'
      : null

  const handleSend = (e) => {
    e?.preventDefault()
    const text = inputVal.trim()
    if (!text || !activeConversation?.id) return

    setInputVal('')

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

  const handleSendOffer = async (e) => {
    e?.preventDefault()
    const amount = Number(offerAmount)
    if (!amount || amount < 1) {
      setOfferError('Enter a valid offer amount.')
      return
    }
    if (!activeConversation?.id || !listingType || !listingId) {
      setOfferError('Open a listing conversation to send an offer.')
      return
    }
    setOfferSending(true)
    setOfferError('')
    try {
      const itemType = listingType === 'car' ? 'car' : 'part'
      await chatApi.createDealOffer(activeConversation.id, {
        item_type: itemType,
        ...(itemType === 'car' ? { car_id: listingId } : { part_id: listingId }),
        amount,
      })
      setOfferAmount('')
      setOfferBoxOpen(false)
      await loadListingThread(listingType, listingId, activeConversation.id)
    } catch (err) {
      setOfferError(err?.response?.data?.message || 'Failed to send offer.')
    } finally {
      setOfferSending(false)
    }
  }

  const inboxLink =
    listingType && listingId
      ? `/messages?listing=${listingType}:${listingId}${activeConversation?.id ? `&conversation=${activeConversation.id}` : ''}`
      : '/messages'



  return (
    <div className={`floating-chat-drawer ${isDrawerMinimized ? 'floating-chat-drawer--minimized' : ''}`}>
      {/* Header — always the listing, never just a user */}
      <div className="floating-chat-drawer__header">
        <div className="floating-chat-drawer__recipient" onClick={toggleMinimize}>
          <div className="floating-chat-drawer__avatar-wrapper">
            <img src={listingThumb} alt={listingTitle} className="floating-chat-drawer__avatar" />
            <span className="floating-chat-drawer__listing-type-badge">
              {listingType === 'part' ? <Package size={10} /> : <Car size={10} />}
            </span>
          </div>

          <div className="floating-chat-drawer__info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 className="floating-chat-drawer__name" title={listingTitle}>
                {listingTitle}
              </h3>
              {recipientUser?.is_kyc_verified && (
                <ShieldCheck size={15} style={{ color: '#10b981' }} title="KYC Verified" />
              )}
            </div>
            <div className="floating-chat-drawer__role-pill">
              {listingRole && (
                <span
                  className="floating-chat-drawer__agent-badge"
                  style={{ background: listingRole === 'selling' ? '#7c3aed' : '#0284c7' }}
                >
                  {listingRole === 'selling' ? 'Selling' : 'Buying'}
                </span>
              )}
              {listingCard?.price != null && <span>{formatPrice(listingCard.price)}</span>}
              {replyTargetName && (
                <span style={{ opacity: 0.85 }}>
                  {isViewerSeller ? 'Reply to' : 'Seller'} {replyTargetName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="floating-chat-drawer__actions">
          <Link
            to={inboxLink}
            className="floating-chat-drawer__action-btn"
            title="Open this listing in Inbox"
            onClick={closeDrawer}
          >
            <Maximize2 size={15} />
          </Link>

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
          {/* Sale-order pipeline for this listing (seller advances, buyer tracks) */}
          {activeListing && listingRole && (
            <SaleOrderStatusControl
              listingType={activeListing.type}
              listingId={activeListing.id}
              role={listingRole}
              compact
            />
          )}

          {/* Buyer/seller switcher for listings with several inquiries */}
          {listingConversations.length > 1 && (
            <div className="messages-hub-counterparty-strip" style={{ padding: '8px 12px 0' }}>
              {listingConversations.map((conv) => {
                const name = conv.other_user?.username
                  ? `@${conv.other_user.username}`
                  : conv.other_user?.role || 'Member'
                const active = activeConversation?.id === conv.id
                return (
                  <button
                    key={conv.id}
                    type="button"
                    className={`messages-hub-counterparty-chip ${active ? 'is-active' : ''}`}
                    onClick={() => selectListingConversation(conv)}
                  >
                    {conv.other_user?.avatar_url ? (
                      <img src={conv.other_user.avatar_url} alt={name} />
                    ) : (
                      <User size={12} />
                    )}
                    <span>{name}</span>
                    {conv.unread_count > 0 && <em>{conv.unread_count}</em>}
                  </button>
                )
              })}
            </div>
          )}

          {/* PII Safety Shield Banner */}
          <div className="floating-chat-drawer__safety-banner">
            <Shield size={14} className="floating-chat-drawer__safety-icon" />
            <span>Buyer Protection Active: Phone, email, & off-platform links are protected.</span>
          </div>

          {/* Messages Stream — every message on this listing */}
          <div className="floating-chat-drawer__messages">
            {isLoadingMessages ? (
              <div className="floating-chat-drawer__loader">
                <div className="floating-chat-drawer__spinner" />
                <span>Loading listing conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="floating-chat-drawer__empty">
                <p className="floating-chat-drawer__empty-title">
                  {isViewerSeller ? 'No inquiries yet on this listing' : 'Start the conversation'}
                </p>
                <p className="floating-chat-drawer__empty-sub">
                  {isViewerSeller
                    ? 'When a buyer messages or makes an offer on this listing, the thread will appear here.'
                    : `Send a message or make an offer on ${listingTitle}.`}
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
                    hideListingCard
                    onRetry={() => retryMessage(msg)}
                  />
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Make-an-offer on this listing */}
          {activeConversation?.id && (
            <div style={{ padding: '0 12px' }}>
              <button
                type="button"
                onClick={() => {
                  setOfferBoxOpen((v) => !v)
                  setOfferError('')
                }}
                className={`messages-hub-deal-btn ${offerBoxOpen ? 'is-active' : ''}`}
                style={{ margin: '4px 0 8px' }}
              >
                <Tag size={13} /> Make Offer on this listing
              </button>
              {offerError && (
                <div className="messages-hub-deal-error" style={{ marginBottom: 8 }}>
                  {offerError}
                </div>
              )}
              {offerBoxOpen && (
                <form onSubmit={handleSendOffer} className="messages-hub-deal-form" style={{ marginBottom: 8 }}>
                  <span className="messages-hub-deal-currency">₱</span>
                  <input
                    type="number"
                    min="1"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder={`Offer on ${listingTitle.slice(0, 24)}…`}
                    className="messages-hub-deal-input"
                  />
                  <button type="submit" disabled={offerSending} className="messages-hub-deal-submit">
                    {offerSending ? 'Sending…' : 'Send'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Input Footer */}
          <form className="floating-chat-drawer__footer" onSubmit={handleSend}>
            <textarea
              className="floating-chat-drawer__input"
              placeholder={
                activeConversation
                  ? `Message ${replyTargetName || 'the other party'} about ${listingTitle}...`
                  : isViewerSeller
                    ? 'Waiting for a buyer to inquire on this listing…'
                    : 'Type your message...'
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={!activeConversation?.id}
            />
            <button
              type="submit"
              className="floating-chat-drawer__send-btn"
              disabled={!inputVal.trim() || !activeConversation?.id}
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

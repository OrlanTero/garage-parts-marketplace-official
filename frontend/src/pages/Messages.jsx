import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Car,
  ExternalLink,
  HandCoins,
  MessageSquare,
  Package,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Tag,
  User,
} from 'lucide-react'
import chatApi from '../api/chat.js'
import SaleOrderStatusControl from '../components/SaleOrderStatusControl.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useChat } from '../context/ChatContext.jsx'
import { getEcho } from '../realtime/echo.js'
import {
  appendRealtimeMessage,
  getMessagePositionInfo,
  isOwnMessage as isOwnMessageOf,
  sortMessagesByTime,
} from '../utils/chatUtils.js'
import {
  getCachedInbox,
  setCachedInbox,
  getCachedListingMessages,
  setCachedListingMessages,
} from '../utils/chatCache.js'
import ChatMessageItem from '../components/chat/ChatMessageItem.jsx'
import { timeAgo } from '../utils/timeAgo.jsx'
import './Messages.css'

function listingKeyOf(type, id) {
  return `${type}:${id}`
}

function formatPrice(price) {
  return Number(price || 0).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  })
}

function listingFallbackImg(type) {
  return type === 'part'
    ? 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=200&q=80'
    : 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=200&q=80'
}

function ThreadSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="messages-hub-thread-item messages-hub-thread-item--skeleton">
          <div className="sk sk-listing-thumb" />
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
  const targetListingKey = searchParams.get('listing')
  const targetConvId = searchParams.get('conversation')

  const [listings, setListings] = useState([])
  const [selectedListing, setSelectedListing] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [searchFilter, setSearchFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isLoadingInbox, setIsLoadingInbox] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [mobileView, setMobileView] = useState('list')

  const [dealActing, setDealActing] = useState(false)
  const [dealError, setDealError] = useState('')
  const [dealNotice, setDealNotice] = useState('')
  const [offerBoxOpen, setOfferBoxOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [reserveBoxOpen, setReserveBoxOpen] = useState(false)
  const [reserveAmount, setReserveAmount] = useState('')
  const [reserveDate, setReserveDate] = useState('')

  const chatStreamRef = useRef(null)
  const messagesEndRef = useRef(null)
  const selectedListingKeyRef = useRef(null)
  const selectedConvIdRef = useRef(null)
  selectedListingKeyRef.current = selectedListing?.key || null
  selectedConvIdRef.current = selectedConv?.id ?? null
  const targetListingKeyRef = useRef(targetListingKey)
  targetListingKeyRef.current = targetListingKey
  const targetConvIdRef = useRef(targetConvId)
  targetConvIdRef.current = targetConvId
  const inboxReqRef = useRef(0)
  const threadReqRef = useRef(0)

  const scrollToBottom = (smooth = true) => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTo({
        top: chatStreamRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  const pickConversation = (convs, preferredId = null) => {
    if (!convs?.length) return null
    if (preferredId) {
      const found = convs.find((c) => String(c.id) === String(preferredId))
      if (found) return found
    }
    return convs[0]
  }

  const applyInboxList = (list) => {
    setListings(list)
    if (list.length === 0) return
    const currentKey = selectedListingKeyRef.current
    if (currentKey && list.some((item) => item.key === currentKey)) return
    const target = targetListingKeyRef.current
    const found = target ? list.find((item) => item.key === target) : null
    selectListing(found || list[0])
  }

  const loadInbox = async () => {
    if (!isAuthenticated || !user?.id) return
    const myReq = ++inboxReqRef.current
    const uid = user.id

    const cached = getCachedInbox(uid)
    if (cached.length > 0) {
      applyInboxList(cached)
    } else {
      setIsLoadingInbox(true)
    }

    try {
      const res = await chatApi.getInbox()
      if (myReq !== inboxReqRef.current) return
      const list = res.data || []
      setCachedInbox(uid, list)
      applyInboxList(list)
    } catch (err) {
      console.error('Failed to load listing inbox:', err)
    } finally {
      if (myReq === inboxReqRef.current) setIsLoadingInbox(false)
    }
  }

  useEffect(() => {
    loadInbox()
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (!targetListingKey || listings.length === 0) return
    if (selectedListingKeyRef.current === targetListingKey) return
    const found = listings.find((item) => item.key === targetListingKey)
    if (found) selectListing(found, { syncParam: false })
  }, [targetListingKey, listings])

  useEffect(() => {
    if (user?.id && listings.length > 0) setCachedInbox(user.id, listings)
  }, [listings, user?.id])



  useEffect(() => {
    if (user?.id && selectedListing?.key) {
      setCachedListingMessages(user.id, selectedListing.key, messages)
    }
  }, [messages, selectedListing?.key, user?.id])

  const fetchListingThread = async (item, myReq, uid) => {
    try {
      const res = await chatApi.getListingThread(item.listing_type, item.listing_id)
      if (myReq !== threadReqRef.current) return
      const convs = res.conversations || []
      const list = res.data || []
      setConversations(convs)
      setMessages(list)
      setCachedListingMessages(uid, item.key, list)
      const conv = pickConversation(convs, targetConvIdRef.current)
      setSelectedConv(conv)

      chatApi.markListingRead(item.listing_type, item.listing_id)
        .then(() => refreshUnreadCount())
        .catch(() => {})

      setListings((prev) =>
        prev.map((row) => (row.key === item.key ? { ...row, unread_count: 0, inquiry_count: convs.length } : row)),
      )
    } catch (err) {
      if (myReq === threadReqRef.current) console.error('Failed to load listing thread:', err)
    } finally {
      if (myReq === threadReqRef.current) {
        setIsLoadingMessages(false)
        requestAnimationFrame(() => scrollToBottom(false))
      }
    }
  }

  const selectListing = async (item, opts = {}) => {
    if (!item) return
    const { syncParam = true } = opts
    const myReq = ++threadReqRef.current
    const uid = user?.id

    setSelectedListing(item)
    setMobileView('chat')
    setDealError('')
    setDealNotice('')
    setOfferBoxOpen(false)
    setReserveBoxOpen(false)

    if (syncParam && targetListingKeyRef.current !== item.key) {
      const next = { listing: item.key }
      if (targetConvIdRef.current) next.conversation = targetConvIdRef.current
      setSearchParams(next)
    }

    const cached = getCachedListingMessages(uid, item.key)
    if (cached !== null) {
      setMessages(cached)
      setConversations(item.conversations || [])
      setSelectedConv(pickConversation(item.conversations || [], targetConvIdRef.current))
      setIsLoadingMessages(false)
      requestAnimationFrame(() => scrollToBottom(false))
      fetchListingThread(item, myReq, uid)
      return
    }

    setMessages([])
    setConversations(item.conversations || [])
    setSelectedConv(pickConversation(item.conversations || [], targetConvIdRef.current))
    setIsLoadingMessages(true)
    await fetchListingThread(item, myReq, uid)
  }

  const selectCounterparty = (conv) => {
    if (!conv || !selectedListing) return
    setSelectedConv(conv)
    setSearchParams({ listing: selectedListing.key, conversation: String(conv.id) })
  }

  useLayoutEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true)
    }
  }, [messages])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    let userChannel = null
    try {
      const echo = getEcho()
      if (!echo) return undefined
      userChannel = echo.private(`user.${user.id}`)

      userChannel.listen('.message.sent', (event) => {
        const incomingMsg = event.message
        const listingKey = event.listing_key || listingKeyOf(event.listing_type, event.listing_id)

        if (listingKey && selectedListingKeyRef.current === listingKey) {
          // Sorted + deduped insert so grouping/positions (and therefore
          // bubble border-radius) recompute correctly on live arrivals.
          setMessages((prev) => appendRealtimeMessage(prev, incomingMsg))
          if (event.listing_type && event.listing_id) {
            chatApi.markListingRead(event.listing_type, event.listing_id).catch(() => {})
          }
        }

        setListings((prev) => {
          const index = prev.findIndex((row) => row.key === listingKey)
          if (index > -1) {
            const updated = [...prev]
            const target = {
              ...updated[index],
              last_message: incomingMsg,
              last_message_at: incomingMsg.created_at,
            }
            if (selectedListingKeyRef.current !== listingKey) {
              target.unread_count = (target.unread_count || 0) + 1
            }
            updated.splice(index, 1)
            return [target, ...updated]
          }
          loadInbox()
          return prev
        })
      })

      userChannel.listen('.message.read', (event) => {
        const { conversation_id, reader_id } = event
        setMessages((prev) =>
          prev.map((m) =>
            m.conversation_id === conversation_id && m.sender_id !== reader_id
              ? { ...m, is_read: true, status: 'seen', read_at: event.read_at }
              : m,
          ),
        )
      })

      userChannel.listen('.car.created', () => loadInbox())
      userChannel.listen('.part.created', () => loadInbox())
    } catch (err) {
      console.warn('Realtime echo error in Messages:', err)
    }

    return () => {
      try {
        if (userChannel) {
          userChannel.stopListening('.message.sent')
          userChannel.stopListening('.message.read')
          userChannel.stopListening('.car.created')
          userChannel.stopListening('.part.created')
        }
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, user?.id])

  const handleSend = (e) => {
    e?.preventDefault()
    const text = inputVal.trim()
    if (!text || !selectedConv?.id || !selectedListing) return

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
      listing_type: selectedListing.listing_type,
      listing_id: selectedListing.listing_id,
      listing: selectedListing.listing,
      read_at: null,
      is_read: false,
      status: 'sending',
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setListings((prev) =>
      prev.map((row) =>
        row.key === selectedListing.key
          ? { ...row, last_message: optimisticMsg, last_message_at: optimisticMsg.created_at }
          : row,
      ),
    )
    requestAnimationFrame(() => scrollToBottom(true))

    chatApi
      .sendMessage(selectedConv.id, {
        body: text,
        listing_type: selectedListing.listing_type,
        listing_id: selectedListing.listing_id,
      })
      .then((res) => {
        const newMsg = {
          ...res.data,
          status: res.data.is_read || res.data.read_at ? 'seen' : 'sent',
        }
        setMessages((prev) =>
          sortMessagesByTime(
            prev.map((m) => (m.id === tempId || m.temp_id === tempId ? newMsg : m)),
          ),
        )
        setListings((prev) =>
          prev.map((row) =>
            row.key === selectedListing.key
              ? { ...row, last_message: newMsg, last_message_at: newMsg.created_at }
              : row,
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

  const retryMessage = (failedMsg) => {
    if (!failedMsg || !selectedConv?.id || !selectedListing) return
    const targetId = failedMsg.temp_id || failedMsg.id

    setMessages((prev) =>
      prev.map((m) =>
        m.id === targetId || m.temp_id === targetId ? { ...m, status: 'sending' } : m,
      ),
    )

    chatApi
      .sendMessage(failedMsg.conversation_id || selectedConv.id, {
        body: failedMsg.body,
        listing_type: selectedListing.listing_type,
        listing_id: selectedListing.listing_id,
      })
      .then((res) => {
        const newMsg = {
          ...res.data,
          status: res.data.is_read || res.data.read_at ? 'seen' : 'sent',
        }
        setMessages((prev) =>
          sortMessagesByTime(
            prev.map((m) => (m.id === targetId || m.temp_id === targetId ? newMsg : m)),
          ),
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

  const threadListing = selectedListing?.listing || null
  const isViewerSeller = selectedListing?.role === 'selling'

  const dealListingParams = () => {
    if (!threadListing || !selectedListing) return null
    const itemType = selectedListing.listing_type === 'car' ? 'car' : 'part'
    return {
      item_type: itemType,
      ...(itemType === 'car' ? { car_id: threadListing.id } : { part_id: threadListing.id }),
    }
  }

  const refreshThreadMessages = async () => {
    if (!selectedListing) return
    try {
      const res = await chatApi.getListingThread(selectedListing.listing_type, selectedListing.listing_id)
      setConversations(res.conversations || [])
      setMessages(res.data || [])
      if (res.listing) {
        setSelectedListing((prev) => (prev ? { ...prev, listing: res.listing } : prev))
      }
      requestAnimationFrame(() => scrollToBottom(false))
    } catch {
      // keep existing log on refresh failure
    }
  }

  const handleDealAction = async (action, payload = {}) => {
    const convId = payload.offer?.conversation_id || selectedConvIdRef.current
    if (!convId) return
    setDealActing(true)
    setDealError('')
    setDealNotice('')
    try {
      if (action === 'accept') await chatApi.acceptDealOffer(payload.offer.id)
      else if (action === 'reject') await chatApi.rejectDealOffer(payload.offer.id)
      else if (action === 'withdraw') await chatApi.withdrawDealOffer(payload.offer.id)
      else if (action === 'confirm') {
        await chatApi.confirmDealOffer(payload.offer.id)
        setDealNotice('Deal locked — seller can now issue the checkout link.')
      } else if (action === 'checkout-link') {
        await chatApi.issueCheckoutLink(payload.offer.id)
        setDealNotice('Checkout link issued in the thread.')
      } else if (action === 'counter') {
        const params = dealListingParams()
        if (!params) throw new Error('No listing on this thread.')
        await chatApi.createDealOffer(convId, { ...params, amount: payload.amount, parent_id: payload.offer.id })
      } else if (action === 'pay-reservation') {
        await chatApi.payReservation(payload.reservation.id, { payment_reference: payload.payment_reference })
        setDealNotice('Reservation payment submitted.')
      } else if (action === 'accept-reservation') {
        await chatApi.acceptReservation(payload.reservation.id)
        setDealNotice('Reservation accepted & confirmed.')
      } else if (action === 'cancel-reservation') {
        await chatApi.cancelReservation(payload.reservation.id)
      }
      await refreshThreadMessages()
    } catch (err) {
      setDealError(err?.response?.data?.message || 'Deal action failed.')
    } finally {
      setDealActing(false)
    }
  }

  const handleSendOffer = async (e) => {
    e?.preventDefault()
    const amount = Number(offerAmount)
    if (!amount || amount < 1) {
      setDealError('Enter a valid offer amount.')
      return
    }
    const params = dealListingParams()
    if (!params || !selectedConv?.id) {
      setDealError('Select a buyer or seller on this listing to send an offer.')
      return
    }
    setDealActing(true)
    setDealError('')
    try {
      await chatApi.createDealOffer(selectedConv.id, {
        ...params,
        amount,
        message: offerNote.trim() || undefined,
      })
      setOfferAmount('')
      setOfferNote('')
      setOfferBoxOpen(false)
      await refreshThreadMessages()
    } catch (err) {
      setDealError(err?.response?.data?.message || 'Failed to send offer.')
    } finally {
      setDealActing(false)
    }
  }

  const handleSendReservation = async (e) => {
    e?.preventDefault()
    if (!selectedConv?.id) {
      setDealError('Select a buyer on this listing to send a reservation.')
      return
    }
    setDealActing(true)
    setDealError('')
    try {
      const params = dealListingParams() || {}
      await chatApi.createReservation(selectedConv.id, {
        ...params,
        amount: reserveAmount ? Number(reserveAmount) : undefined,
        scheduled_for: reserveDate || undefined,
      })
      setReserveAmount('')
      setReserveDate('')
      setReserveBoxOpen(false)
      setDealNotice('Reservation request sent to the buyer.')
      await refreshThreadMessages()
    } catch (err) {
      setDealError(err?.response?.data?.message || 'Failed to send reservation request.')
    } finally {
      setDealActing(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="messages-hub-page messages-hub-page--guest">
        <div className="messages-hub-guest-card">
          <div className="messages-hub-guest-icon">
            <MessageSquare size={36} />
          </div>
          <h2>Listing Inbox</h2>
          <p>
            Log in to see every listing you are buying or selling, make offers, and talk with the
            other party on that listing.
          </p>
          <button type="button" className="btn btn-primary" onClick={openLoginModal}>
            Log In to Access Inbox
          </button>
        </div>
      </div>
    )
  }

  const filteredListings = listings.filter((item) => {
    if (roleFilter !== 'all' && item.role !== roleFilter) return false
    const title = item.listing?.title?.toLowerCase() || ''
    const filter = searchFilter.toLowerCase()
    return title.includes(filter)
  })

  const listingTitle = threadListing?.title || 'Listing'
  const replyTargetName = selectedConv?.other_user?.username
    ? `@${selectedConv.other_user.username}`
    : selectedConv?.other_user?.role || 'the other party'

  return (
    <div className="messages-hub-page">
      <div className={`messages-hub-container messages-hub-container--mobile-${mobileView}`}>
        <aside className="messages-hub-sidebar">
          <div className="messages-hub-sidebar-header">
            <div className="messages-hub-title-row">
              <h1 className="messages-hub-title">Inbox</h1>
              {unreadCount > 0 && (
                <span className="action-badge-inline">{unreadCount} unread</span>
              )}
            </div>

            <div className="messages-hub-role-filters">
              {[
                { id: 'all', label: 'All' },
                { id: 'selling', label: 'Selling' },
                { id: 'buying', label: 'Buying' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`messages-hub-role-filter ${roleFilter === tab.id ? 'is-active' : ''}`}
                  onClick={() => setRoleFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="messages-hub-search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search listings by name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="messages-hub-threads-list">
            {isLoadingInbox && listings.length === 0 ? (
              <ThreadSkeleton />
            ) : filteredListings.length === 0 ? (
              <div className="messages-hub-threads-empty">
                <p>No listings in your inbox</p>
                <span className="muted">
                  Listings you sell appear here automatically. Listings you buy appear after you
                  message the seller.
                </span>
              </div>
            ) : (
              filteredListings.map((item) => {
                const isSelected = selectedListing?.key === item.key
                const listing = item.listing
                const lastMsg = item.last_message
                const lastTime = item.last_message_at
                  ? timeAgo(item.last_message_at)
                  : ''
                const thumb = listing?.primary_image_url || listingFallbackImg(item.listing_type)

                return (
                  <div
                    key={item.key}
                    className={`messages-hub-thread-item ${isSelected ? 'messages-hub-thread-item--active' : ''}`}
                    onClick={() => selectListing(item)}
                  >
                    <div className="messages-hub-listing-thumb">
                      <img src={thumb} alt={listing?.title || 'Listing'} />
                      <span className="messages-hub-listing-type-icon">
                        {item.listing_type === 'part' ? <Package size={11} /> : <Car size={11} />}
                      </span>
                    </div>

                    <div className="messages-hub-thread-content">
                      <div className="messages-hub-thread-top">
                        <span className="messages-hub-thread-name" title={listing?.title}>
                          {listing?.title || 'Listing'}
                        </span>
                        <span className="messages-hub-thread-time">{lastTime}</span>
                      </div>

                      <div className="messages-hub-thread-bottom">
                        <p className="messages-hub-thread-preview">
                          {lastMsg?.body
                            ? lastMsg.body
                            : item.role === 'selling'
                              ? 'No inquiries yet'
                              : 'No messages yet'}
                        </p>
                        {item.unread_count > 0 && (
                          <span className="messages-hub-thread-badge">{item.unread_count}</span>
                        )}
                      </div>

                      <div className="messages-hub-thread-meta">
                        <span className={`messages-hub-role-pill messages-hub-role-pill--${item.role}`}>
                          {item.role === 'selling' ? 'Selling' : 'Buying'}
                        </span>
                        {item.inquiry_count > 0 && (
                          <span className="messages-hub-inquiry-count">
                            {item.inquiry_count} {item.inquiry_count === 1 ? 'conversation' : 'conversations'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        <section className="messages-hub-chat-area">
          {selectedListing ? (
            <>
              <div className="messages-hub-chat-header messages-hub-chat-header--listing">
                <div className="messages-hub-chat-user">
                  <button
                    type="button"
                    className="messages-hub-mobile-back-btn"
                    onClick={() => setMobileView('list')}
                    title="Back to inbox"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="messages-hub-listing-thumb messages-hub-listing-thumb--header">
                    <img
                      src={threadListing?.primary_image_url || listingFallbackImg(selectedListing.listing_type)}
                      alt={listingTitle}
                    />
                  </div>

                  <div className="messages-hub-listing-header-copy">
                    <div className="messages-hub-listing-title-row">
                      <h2 className="messages-hub-chat-username">{listingTitle}</h2>
                      {threadListing?.url && (
                        <Link to={threadListing.url} className="messages-hub-listing-link" title="Open listing">
                          <ExternalLink size={14} />
                        </Link>
                      )}
                    </div>
                    <div className="messages-hub-listing-sub">
                      <span className={`messages-hub-role-pill messages-hub-role-pill--${selectedListing.role}`}>
                        {selectedListing.role === 'selling' ? 'Selling' : 'Buying'}
                      </span>
                      {threadListing?.price != null && (
                        <span className="messages-hub-listing-price">{formatPrice(threadListing.price)}</span>
                      )}
                      {selectedConv && (
                        <span className="messages-hub-listing-with">
                          {isViewerSeller ? 'Reply to' : 'Seller'} {replyTargetName}
                          {selectedConv.other_user?.is_kyc_verified && (
                            <ShieldCheck size={13} style={{ color: '#10b981' }} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {conversations.length > 1 && (
                <div className="messages-hub-counterparty-strip">
                  {conversations.map((conv) => {
                    const name = conv.other_user?.username
                      ? `@${conv.other_user.username}`
                      : conv.other_user?.role || 'Member'
                    const active = selectedConv?.id === conv.id
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        className={`messages-hub-counterparty-chip ${active ? 'is-active' : ''}`}
                        onClick={() => selectCounterparty(conv)}
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

              {selectedListing && (
                <SaleOrderStatusControl
                  listingType={selectedListing.listing_type}
                  listingId={selectedListing.listing_id}
                  role={selectedListing.role}
                />
              )}

              <div className="floating-chat-drawer__safety-banner">
                <Shield size={15} className="floating-chat-drawer__safety-icon" />
                <span>
                  <strong>Garage Safety Shield:</strong> Personal phone numbers, email addresses, and
                  external links are automatically redacted for platform buyer protection.
                </span>
              </div>

              <div className="messages-hub-chat-stream" ref={chatStreamRef}>
                {isLoadingMessages && messages.length === 0 ? (
                  <MessageSkeleton />
                ) : messages.length === 0 ? (
                  <div className="floating-chat-drawer__empty">
                    <p className="floating-chat-drawer__empty-title">
                      {isViewerSeller ? 'No inquiries yet' : 'Start the conversation'}
                    </p>
                    <p className="floating-chat-drawer__empty-sub">
                      {isViewerSeller
                        ? 'When a buyer messages or makes an offer on this listing, the thread will appear here.'
                        : 'Send a message or make an offer on this listing.'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const { position, showSenderHeader } = getMessagePositionInfo(messages, idx)
                    return (
                      <ChatMessageItem
                        key={msg.id || msg.temp_id || idx}
                        message={msg}
                        isOwnMessage={isOwnMessageOf(msg, user?.id)}
                        position={position}
                        showSenderHeader={showSenderHeader}
                        hideListingCard
                        onRetry={() => retryMessage(msg)}
                        viewerId={user?.id}
                        onDealAction={handleDealAction}
                        dealActing={dealActing}
                      />
                    )
                  })
                )}
                <div ref={messagesEndRef} style={{ height: 1, minHeight: 1 }} />
              </div>

              {threadListing && (
                <div className="messages-hub-deal-bar">
                  <button
                    type="button"
                    onClick={() => { setOfferBoxOpen((v) => !v); setReserveBoxOpen(false); setDealError('') }}
                    className={`messages-hub-deal-btn ${offerBoxOpen ? 'is-active' : ''}`}
                  >
                    <Tag size={13} /> Make Offer
                  </button>
                  {isViewerSeller && (
                    <button
                      type="button"
                      onClick={() => { setReserveBoxOpen((v) => !v); setOfferBoxOpen(false); setDealError('') }}
                      className={`messages-hub-deal-btn messages-hub-deal-btn--reserve ${reserveBoxOpen ? 'is-active' : ''}`}
                    >
                      <HandCoins size={13} /> Reservation
                    </button>
                  )}
                  {dealError && <span className="messages-hub-deal-error">{dealError}</span>}
                  {dealNotice && <span className="messages-hub-deal-notice">{dealNotice}</span>}
                </div>
              )}

              {offerBoxOpen && threadListing && (
                <form onSubmit={handleSendOffer} className="messages-hub-deal-form">
                  <span className="messages-hub-deal-currency">₱</span>
                  <input
                    type="number"
                    min="1"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder={`Offer on ${listingTitle.slice(0, 28)}…`}
                    className="messages-hub-deal-input"
                  />
                  <input
                    type="text"
                    value={offerNote}
                    onChange={(e) => setOfferNote(e.target.value)}
                    placeholder="Note (optional)"
                    maxLength={500}
                    className="messages-hub-deal-input messages-hub-deal-input--wide"
                  />
                  <button type="submit" disabled={dealActing || !selectedConv} className="messages-hub-deal-submit">
                    {dealActing ? 'Sending…' : 'Send Offer'}
                  </button>
                </form>
              )}

              {reserveBoxOpen && threadListing && isViewerSeller && (
                <form onSubmit={handleSendReservation} className="messages-hub-deal-form">
                  <span className="messages-hub-deal-currency messages-hub-deal-currency--reserve">Reserve ₱</span>
                  <input
                    type="number"
                    min="1"
                    value={reserveAmount}
                    onChange={(e) => setReserveAmount(e.target.value)}
                    placeholder="Auto: 5% fee"
                    className="messages-hub-deal-input"
                  />
                  <input
                    type="datetime-local"
                    value={reserveDate}
                    onChange={(e) => setReserveDate(e.target.value)}
                    title="Schedule for later (seller acceptance required) — leave blank for due-now"
                    className="messages-hub-deal-input"
                  />
                  <button type="submit" disabled={dealActing || !selectedConv} className="messages-hub-deal-submit messages-hub-deal-submit--reserve">
                    {dealActing ? 'Sending…' : 'Request Reservation'}
                  </button>
                </form>
              )}

              <form className="messages-hub-chat-footer" onSubmit={handleSend}>
                <textarea
                  className="messages-hub-chat-input"
                  placeholder={
                    selectedConv
                      ? `Message ${replyTargetName} about ${listingTitle}…`
                      : isViewerSeller
                        ? 'Waiting for a buyer to inquire on this listing…'
                        : 'Type a message...'
                  }
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  disabled={!selectedConv}
                />

                <button
                  type="submit"
                  className="floating-chat-drawer__send-btn"
                  disabled={!inputVal.trim() || !selectedConv}
                  title="Send Message"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="messages-hub-no-selection">
              <MessageSquare size={48} className="messages-hub-no-selection-icon" />
              <h3>Select a listing</h3>
              <p>Choose a listing from the left to see every conversation and offer on that item.</p>
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

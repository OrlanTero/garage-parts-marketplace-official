import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import chatApi from '../api/chat.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { getConnectionState, getEcho } from '../realtime/echo.js'
import { appendRealtimeMessage, sortMessagesByTime } from '../utils/chatUtils.js'

const ChatContext = createContext(null)

function listingKeyOf(type, id) {
  if (!type || !id) return null
  return `${type}:${id}`
}

export function ChatProvider({ children }) {
  const { user, isAuthenticated, openLoginModal } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [conversations, setConversations] = useState([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  // Listing-focused floating drawer state.
  // The drawer is always scoped to ONE listing: header shows the listing,
  // body shows every buyer/seller message on that listing, offers included.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false)
  const [activeListing, setActiveListing] = useState(null) // { type, id, card }
  const [listingRole, setListingRole] = useState(null) // 'selling' | 'buying'
  const [listingConversations, setListingConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [recipientUser, setRecipientUser] = useState(null)
  const [attachedListing, setAttachedListing] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const activeListingKeyRef = useRef(null)
  activeListingKeyRef.current = activeListing ? listingKeyOf(activeListing.type, activeListing.id) : null
  const activeConvIdRef = useRef(null)
  activeConvIdRef.current = activeConversation?.id ?? null

  // Refresh total unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setUnreadCount(0)
      return
    }
    try {
      const res = await chatApi.getUnreadCount()
      setUnreadCount(res.unread_count ?? 0)
    } catch {
      // ignore
    }
  }, [isAuthenticated, user?.id])

  // Fetch conversation previews (listing-scoped on the backend — no user-only threads)
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return []
    setIsLoadingConversations(true)
    try {
      const res = await chatApi.getConversations()
      const convList = res.data || []
      setConversations(convList)
      return convList
    } catch {
      return []
    } finally {
      setIsLoadingConversations(false)
    }
  }, [isAuthenticated])

  const applyListingThread = useCallback((thread, preferredConvId = null) => {
    const convs = thread?.conversations || []
    const list = thread?.data || []
    setActiveListing(
      thread?.listing
        ? {
            type: thread.listing.type,
            id: thread.listing.id,
            card: thread.listing,
          }
        : null,
    )
    setAttachedListing(
      thread?.listing
        ? {
            type: thread.listing.type,
            id: thread.listing.id,
            uuid: thread.listing.uuid || null,
            title: thread.listing.title,
            price: thread.listing.price,
            primary_image_url: thread.listing.primary_image_url,
            condition: thread.listing.condition,
            inspection_score: thread.listing.inspection_score,
            url: thread.listing.url,
          }
        : null,
    )
    setListingRole(thread?.role || null)
    setListingConversations(convs)
    setMessages(list)
    let picked = null
    if (preferredConvId) {
      picked = convs.find((c) => String(c.id) === String(preferredConvId)) || null
    }
    picked = picked || convs[0] || null
    setActiveConversation(picked)
    setRecipientUser(picked?.other_user || null)
    return picked
  }, [])

  // Load the full listing thread (all conversations + merged messages on that listing)
  const loadListingThread = useCallback(
    async (listingType, listingId, preferredConvId = null) => {
      if (!listingType || !listingId) return null
      setIsLoadingMessages(true)
      try {
        const thread = await chatApi.getListingThread(listingType, listingId)
        const picked = applyListingThread(thread, preferredConvId)
        try {
          await chatApi.markListingRead(listingType, listingId)
        } catch {
          // ignore
        }
        refreshUnreadCount()
        return picked
      } catch (err) {
        console.error('Failed to load listing thread:', err)
        return null
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [applyListingThread, refreshUnreadCount],
  )

  // Legacy name kept for compat: loads messages for one conversation,
  // then expands to its full listing thread when the conversation is listing-scoped.
  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) return
      setIsLoadingMessages(true)
      try {
        const res = await chatApi.getConversation(conversationId)
        const conv = res.data || res
        if (conv?.listing_type && conv?.listing_id) {
          await loadListingThread(conv.listing_type, conv.listing_id, conv.id)
        } else {
          const msgRes = await chatApi.getMessages(conversationId)
          setMessages(msgRes.data || [])
          await chatApi.markAsRead(conversationId)
          refreshUnreadCount()
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [loadListingThread, refreshUnreadCount],
  )

  // Request flag: when a listing page's "Make an Offer" button opens the
  // drawer, the offer box auto-opens once the listing thread is ready.
  const [offerAutoOpenKey, setOfferAutoOpenKey] = useState(null)

  // Open drawer scoped to a listing (from car or part detail page).
  // Creates/finds the buyer↔seller thread on that listing, then loads
  // every conversation + message visible on the listing.
  // Pass { openOffer: true } to auto-open the Make Offer box (used by
  // the listing "Make an Offer" button).
  const openDrawerWithListing = useCallback(
    async ({ seller, listing, listingType, openOffer = false }) => {
      if (!isAuthenticated) {
        openLoginModal()
        return
      }

      if (user?.id === seller?.id) {
        alert('This is your own listing.')
        return
      }

      setIsDrawerOpen(true)
      setIsDrawerMinimized(false)
      setRecipientUser(seller)
      if (openOffer && listing?.id && listingType) {
        setOfferAutoOpenKey(`${listingType}:${listing.id}`)
      }
      const listingIdentifier = listing.uuid || listing.id
      const card = {
        type: listingType,
        id: listing.id,
        uuid: listing.uuid || null,
        title: listing.title || listing.name,
        price: listing.price,
        primary_image_url: listing.primary_image_url || listing.img || listing.media?.[0]?.url,
        inspection_score: listing.inspection_score || listing.score,
        condition: listing.condition,
        url: listingType === 'car' ? `/marketplace/${listingIdentifier}` : `/parts/${listingIdentifier}`,
      }
      setAttachedListing(card)
      setActiveListing({ type: listingType, id: listing.id, card })
      setIsLoadingMessages(true)

      try {
        const res = await chatApi.startConversation({
          recipient_id: seller.id,
          listing_type: listingType,
          listing_id: listing.id,
        })
        const conv = res.data || res
        await loadListingThread(listingType, listing.id, conv?.id)
        fetchConversations()
      } catch (err) {
        console.error('Failed to initiate listing conversation:', err)
        setIsLoadingMessages(false)
      }
    },
    [isAuthenticated, openLoginModal, user, loadListingThread, fetchConversations],
  )

  // User-only threads are retired: every conversation belongs to a listing.
  // Kept as a deprecated no-op so old call sites fail loudly instead of
  // silently creating orphan threads. Use openDrawerWithListing instead.
  const openDrawerWithUser = useCallback(async () => {
    console.warn(
      '[chat] openDrawerWithUser is retired — messages are listing-focused. Use openDrawerWithListing({ seller, listing, listingType }).',
    )
  }, [])

  // Open drawer with an existing conversation — expands to its listing thread.
  const openDrawerWithConversation = useCallback(
    async (conv) => {
      if (!isAuthenticated) {
        openLoginModal()
        return
      }

      setIsDrawerOpen(true)
      setIsDrawerMinimized(false)

      if (conv?.listing_type && conv?.listing_id) {
        setActiveConversation(conv)
        setRecipientUser(conv.other_user || null)
        await loadListingThread(conv.listing_type, conv.listing_id, conv.id)
        return
      }

      // Legacy user-only thread: surface it read-only instead of hiding it.
      setActiveConversation(conv)
      setRecipientUser(conv.other_user || null)
      setActiveListing(null)
      setAttachedListing(null)
      setListingConversations([])
      await loadMessages(conv.id)
    },
    [isAuthenticated, openLoginModal, loadListingThread, loadMessages],
  )

  // Switch the reply target (which buyer/seller thread) inside the open listing.
  const selectListingConversation = useCallback((conv) => {
    if (!conv) return
    setActiveConversation(conv)
    setRecipientUser(conv.other_user || null)
  }, [])

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setIsDrawerMinimized(false)
    setActiveListing(null)
    setListingRole(null)
    setListingConversations([])
    setActiveConversation(null)
    setRecipientUser(null)
    setAttachedListing(null)
    setMessages([])
    setOfferAutoOpenKey(null)
  }, [])

  // Drawer clears the flag once it has auto-opened the offer box.
  const clearOfferAutoOpen = useCallback(() => setOfferAutoOpenKey(null), [])

  const toggleMinimize = useCallback(() => {
    setIsDrawerMinimized((prev) => !prev)
  }, [])

  // Send message in the active listing thread (optimistic instant dispatch).
  // Replies go to the selected buyer/seller conversation on this listing.
  const sendMessage = useCallback(
    async (bodyText, customListing = undefined, customConvId = undefined) => {
      const convId = customConvId || activeConversation?.id
      if (!bodyText?.trim() || !convId) return null

      const text = bodyText.trim()
      const listingToAttach = customListing !== undefined ? customListing : attachedListing
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      const optimisticMsg = {
        id: tempId,
        temp_id: tempId,
        conversation_id: convId,
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
        listing_type: listingToAttach?.type || activeListing?.type || null,
        listing_id: listingToAttach?.id || activeListing?.id || null,
        listing: listingToAttach || activeListing?.card || null,
        read_at: null,
        is_read: false,
        status: 'sending',
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, optimisticMsg])
      setIsSending(true)

      try {
        const payload = { body: text }
        const lt = listingToAttach?.type || activeListing?.type
        const lid = listingToAttach?.id || activeListing?.id
        if (lt && lid) {
          payload.listing_type = lt
          payload.listing_id = lid
        }

        const res = await chatApi.sendMessage(convId, payload)
        const confirmedMsg = {
          ...res.data,
          status: res.data.is_read || res.data.read_at ? 'seen' : 'sent',
        }

        setMessages((prev) =>
          sortMessagesByTime(
            prev.map((m) => (m.id === tempId || m.temp_id === tempId ? confirmedMsg : m)),
          ),
        )

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, last_message: confirmedMsg, last_message_at: confirmedMsg.created_at }
              : c,
          ),
        )

        return confirmedMsg
      } catch (err) {
        console.error('Failed to send message:', err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId || m.temp_id === tempId ? { ...m, status: 'failed' } : m,
          ),
        )
        throw err
      } finally {
        setIsSending(false)
      }
    },
    [activeConversation, attachedListing, activeListing, user],
  )

  // Retry sending a failed message
  const retryMessage = useCallback(async (failedMsg) => {
    if (!failedMsg || !failedMsg.conversation_id) return
    const targetId = failedMsg.temp_id || failedMsg.id

    setMessages((prev) =>
      prev.map((m) =>
        m.id === targetId || m.temp_id === targetId ? { ...m, status: 'sending' } : m,
      ),
    )

    try {
      const payload = { body: failedMsg.body }
      if (failedMsg.listing_type && failedMsg.listing_id) {
        payload.listing_type = failedMsg.listing_type
        payload.listing_id = failedMsg.listing_id
      }

      const res = await chatApi.sendMessage(failedMsg.conversation_id, payload)
      const confirmedMsg = {
        ...res.data,
        status: res.data.is_read || res.data.read_at ? 'seen' : 'sent',
      }

      setMessages((prev) =>
        sortMessagesByTime(
          prev.map((m) =>
            m.id === targetId || m.temp_id === targetId ? confirmedMsg : m,
          ),
        ),
      )

      setConversations((prev) =>
        prev.map((c) =>
          c.id === failedMsg.conversation_id
            ? { ...c, last_message: confirmedMsg, last_message_at: confirmedMsg.created_at }
            : c,
        ),
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId || m.temp_id === targetId ? { ...m, status: 'failed' } : m,
        ),
      )
    }
  }, [])

  // Silent refresh of the open listing thread (no loading spinners).
  // Used by the polling fallback and window-focus refresh so the open
  // chat updates even when the WebSocket is disconnected.
  const silentRefreshOpenThread = useCallback(async () => {
    const key = activeListingKeyRef.current
    if (!key) return false
    const sep = key.lastIndexOf(':')
    const lt = sep > -1 ? key.slice(0, sep) : null
    const lid = sep > -1 ? key.slice(sep + 1) : null
    if (!lt || !lid) return false
    try {
      const thread = await chatApi.getListingThread(lt, lid)
      applyListingThread(thread, activeConvIdRef.current)
      try {
        await chatApi.markListingRead(lt, lid)
      } catch {
        // ignore
      }
      return true
    } catch {
      return false
    }
  }, [applyListingThread])

  // Realtime Echo listener: listing-key aware so the open listing thread
  // updates live while other listings only bump the unread badge.
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    refreshUnreadCount()
    fetchConversations()

    let userChannel = null
    try {
      const echo = getEcho()
      if (echo) {
        userChannel = echo.private(`user.${user.id}`)

        userChannel.listen('.message.sent', (event) => {
          const incomingMsg = event.message
          const convId = event.conversation_id
          const listingKey =
            event.listing_key ||
            (event.listing_type && event.listing_id
              ? `${event.listing_type}:${event.listing_id}`
              : incomingMsg?.listing_type && incomingMsg?.listing_id
                ? `${incomingMsg.listing_type}:${incomingMsg.listing_id}`
                : null)

          const isOpenListing =
            listingKey && activeListingKeyRef.current && listingKey === activeListingKeyRef.current

          if (isOpenListing) {
            // Sorted + deduped insert so bubble grouping/border-radius
            // auto-fixes when a live message arrives.
            setMessages((prev) => appendRealtimeMessage(prev, incomingMsg))
            if (event.listing_type && event.listing_id) {
              chatApi.markListingRead(event.listing_type, event.listing_id).catch(() => {})
            } else if (convId) {
              chatApi.markAsRead(convId).catch(() => {})
            }
          } else if (activeConvIdRef.current === convId) {
            setMessages((prev) => appendRealtimeMessage(prev, incomingMsg))
            chatApi.markAsRead(convId).catch(() => {})
          } else {
            setUnreadCount((prev) => prev + 1)
          }

          setConversations((prev) => {
            const index = prev.findIndex((c) => c.id === convId)
            if (index > -1) {
              const updated = [...prev]
              const target = { ...updated[index], last_message: incomingMsg, last_message_at: incomingMsg.created_at }
              if (!isOpenListing && activeConvIdRef.current !== convId) {
                target.unread_count = (target.unread_count || 0) + 1
              }
              updated.splice(index, 1)
              return [target, ...updated]
            }
            fetchConversations()
            return prev
          })
        })

        userChannel.listen('.message.read', (event) => {
          const { conversation_id, reader_id } = event
          if (activeConvIdRef.current === conversation_id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.sender_id !== reader_id ? { ...m, is_read: true, read_at: event.read_at } : m,
              ),
            )
          }
        })
      }
    } catch (err) {
      console.warn('Realtime chat echo connection error:', err)
    }

    const onFocus = () => {
      refreshUnreadCount()
      fetchConversations()
      silentRefreshOpenThread()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
      try {
        if (userChannel) {
          userChannel.stopListening('.message.sent')
          userChannel.stopListening('.message.read')
        }
        const echo = getEcho()
        echo?.leave(`user.${user.id}`)
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, user?.id, refreshUnreadCount, fetchConversations, silentRefreshOpenThread])

  // Polling fallback: when the WebSocket isn't connected (Reverb down,
  // auth failed, realtime disabled), refresh via the API so messages still
  // arrive within seconds instead of never. Skipped while the socket is
  // live so realtime stays the single update path.
  useEffect(() => {
    if (!isAuthenticated) return undefined
    const id = setInterval(() => {
      try {
        if (getConnectionState() === 'connected') return
      } catch {
        // fall through to API refresh
      }
      refreshUnreadCount()
      if (activeListingKeyRef.current) {
        silentRefreshOpenThread()
      } else {
        fetchConversations()
      }
    }, 7000)
    return () => clearInterval(id)
  }, [isAuthenticated, refreshUnreadCount, fetchConversations, silentRefreshOpenThread])

  const value = useMemo(
    () => ({
      unreadCount,
      conversations,
      isLoadingConversations,
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
      isSending,
      offerAutoOpenKey,
      clearOfferAutoOpen,
      openDrawerWithListing,
      openDrawerWithUser,
      openDrawerWithConversation,
      selectListingConversation,
      closeDrawer,
      toggleMinimize,
      setAttachedListing,
      sendMessage,
      retryMessage,
      refreshUnreadCount,
      fetchConversations,
      loadMessages,
      loadListingThread,
    }),
    [
      unreadCount,
      conversations,
      isLoadingConversations,
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
      isSending,
      offerAutoOpenKey,
      clearOfferAutoOpen,
      openDrawerWithListing,
      openDrawerWithUser,
      openDrawerWithConversation,
      selectListingConversation,
      closeDrawer,
      toggleMinimize,
      sendMessage,
      retryMessage,
      refreshUnreadCount,
      fetchConversations,
      loadMessages,
      loadListingThread,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat() must be used within a <ChatProvider>')
  return ctx
}

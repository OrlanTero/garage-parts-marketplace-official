import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import chatApi from '../api/chat.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { getEcho } from '../realtime/echo.js'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { user, isAuthenticated, openLoginModal } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [conversations, setConversations] = useState([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  // Floating Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false)
  const [activeConversation, setActiveConversation] = useState(null)
  const [recipientUser, setRecipientUser] = useState(null)
  const [attachedListing, setAttachedListing] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const activeConvIdRef = useRef(null)
  activeConvIdRef.current = activeConversation?.id

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

  // Fetch conversations list
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

  // Load messages for a given conversation
  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return
    setIsLoadingMessages(true)
    try {
      const res = await chatApi.getMessages(conversationId)
      setMessages(res.data || [])
      // Mark as read
      await chatApi.markAsRead(conversationId)
      refreshUnreadCount()
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [refreshUnreadCount])

  // Open drawer with a listing context (from car or part detail page)
  const openDrawerWithListing = useCallback(
    async ({ seller, listing, listingType }) => {
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
      const listingIdentifier = listing.uuid || listing.id
      setAttachedListing({
        type: listingType,
        id: listing.id,
        uuid: listing.uuid || null,
        title: listing.title || listing.name,
        price: listing.price,
        primary_image_url: listing.primary_image_url || listing.img || listing.media?.[0]?.url,
        inspection_score: listing.inspection_score || listing.score,
        condition: listing.condition,
        url: listingType === 'car' ? `/marketplace/${listingIdentifier}` : `/parts/${listingIdentifier}`,
      })

      try {
        // Start or get conversation
        const res = await chatApi.startConversation({
          recipient_id: seller.id,
        })
        const conv = res.data
        setActiveConversation(conv)
        await loadMessages(conv.id)
      } catch (err) {
        console.error('Failed to initiate conversation:', err)
      }
    },
    [isAuthenticated, openLoginModal, user, loadMessages],
  )

  // Open drawer with an existing conversation
  const openDrawerWithConversation = useCallback(
    async (conv) => {
      if (!isAuthenticated) {
        openLoginModal()
        return
      }

      setIsDrawerOpen(true)
      setIsDrawerMinimized(false)
      setActiveConversation(conv)
      setRecipientUser(conv.other_user)
      setAttachedListing(null)
      await loadMessages(conv.id)
    },
    [isAuthenticated, openLoginModal, loadMessages],
  )

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setIsDrawerMinimized(false)
    setActiveConversation(null)
    setRecipientUser(null)
    setAttachedListing(null)
    setMessages([])
  }, [])

  const toggleMinimize = useCallback(() => {
    setIsDrawerMinimized((prev) => !prev)
  }, [])

  // Send message in active conversation (optimistic instant dispatch)
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
        listing_type: listingToAttach?.type || null,
        listing_id: listingToAttach?.id || null,
        listing: listingToAttach || null,
        read_at: null,
        is_read: false,
        status: 'sending',
        created_at: new Date().toISOString(),
      }

      // 1. Immediately append optimistic message to active message stream
      setMessages((prev) => [...prev, optimisticMsg])

      // 2. Immediately clear attached listing
      if (customListing === undefined) {
        setAttachedListing(null)
      }

      // 3. Immediately update conversations list preview
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === convId)
        if (index > -1) {
          const updated = [...prev]
          const target = { ...updated[index], last_message: optimisticMsg, last_message_at: optimisticMsg.created_at }
          updated.splice(index, 1)
          return [target, ...updated]
        }
        return prev
      })

      // 4. Background queue send via API
      try {
        const payload = {
          body: text,
        }
        if (listingToAttach) {
          payload.listing_type = listingToAttach.type
          payload.listing_id = listingToAttach.id
        }

        const res = await chatApi.sendMessage(convId, payload)
        const confirmedMsg = {
          ...res.data,
          status: res.data.is_read || res.data.read_at ? 'seen' : 'sent',
        }

        // Replace optimistic message with confirmed server message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId || m.temp_id === tempId ? confirmedMsg : m)),
        )

        // Update conversation list preview with confirmed message
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
        // Mark optimistic message as failed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId || m.temp_id === tempId ? { ...m, status: 'failed' } : m,
          ),
        )
        throw err
      }
    },
    [activeConversation, attachedListing, user],
  )

  // Retry sending a failed message
  const retryMessage = useCallback(
    async (failedMsg) => {
      if (!failedMsg || !failedMsg.conversation_id) return
      const targetId = failedMsg.temp_id || failedMsg.id

      // Set back to sending status
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId || m.temp_id === targetId ? { ...m, status: 'sending' } : m,
        ),
      )

      try {
        const payload = {
          body: failedMsg.body,
        }
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
          prev.map((m) =>
            m.id === targetId || m.temp_id === targetId ? confirmedMsg : m,
          ),
        )

        setConversations((prev) =>
          prev.map((c) =>
            c.id === failedMsg.conversation_id
              ? { ...c, last_message: confirmedMsg, last_message_at: confirmedMsg.created_at }
              : c,
          ),
        )
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId || m.temp_id === targetId ? { ...m, status: 'failed' } : m,
          ),
        )
      }
    },
    [],
  )

  // Realtime Echo Listener for user-level notifications & active conversation messages
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

        // If active conversation is currently open, append and mark read
        if (activeConvIdRef.current === convId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incomingMsg.id)) return prev
            return [...prev, incomingMsg]
          })
          chatApi.markAsRead(convId).catch(() => {})
        } else {
          // Increment unread count
          setUnreadCount((prev) => prev + 1)
        }

        // Update conversations preview list
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === convId)
          if (index > -1) {
            const updated = [...prev]
            const target = { ...updated[index], last_message: incomingMsg, last_message_at: incomingMsg.created_at }
            if (activeConvIdRef.current !== convId) {
              target.unread_count = (target.unread_count || 0) + 1
            }
            updated.splice(index, 1)
            return [target, ...updated]
          } else {
            // New conversation arrived, refresh conversations
            fetchConversations()
            return prev
          }
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
      } // end if (echo) — skipped when realtime is disabled via VITE_REALTIME_ENABLED=false
    } catch (err) {
      console.warn('Realtime chat echo connection error:', err)
    }

    // Window focus refresh fallback
    const onFocus = () => {
      refreshUnreadCount()
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
        echo?.leave(`private-user.${user.id}`)
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, user?.id, refreshUnreadCount, fetchConversations])

  const value = useMemo(
    () => ({
      unreadCount,
      conversations,
      isLoadingConversations,
      isDrawerOpen,
      isDrawerMinimized,
      activeConversation,
      recipientUser,
      attachedListing,
      messages,
      isLoadingMessages,
      isSending,
      openDrawerWithListing,
      openDrawerWithConversation,
      closeDrawer,
      toggleMinimize,
      setAttachedListing,
      sendMessage,
      retryMessage,
      refreshUnreadCount,
      fetchConversations,
      loadMessages,
    }),
    [
      unreadCount,
      conversations,
      isLoadingConversations,
      isDrawerOpen,
      isDrawerMinimized,
      activeConversation,
      recipientUser,
      attachedListing,
      messages,
      isLoadingMessages,
      isSending,
      openDrawerWithListing,
      openDrawerWithConversation,
      closeDrawer,
      toggleMinimize,
      sendMessage,
      retryMessage,
      refreshUnreadCount,
      fetchConversations,
      loadMessages,
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

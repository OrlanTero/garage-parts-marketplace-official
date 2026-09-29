import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { getConnectionState, getEcho } from '../realtime/echo.js'
import notificationsApi from '../api/notifications.js'

const NotificationContext = createContext(null)

function toItem(event) {
  if (!event) return null
  return {
    id: event.notification_id ?? event.id ?? `live-${Date.now()}`,
    type: event.type || 'info',
    title: event.title || 'Notification',
    body: event.message || event.body || '',
    link: event.link || event.data?.link || null,
    data: event.data || {},
    read_at: null,
    created_at: event.timestamp || new Date().toISOString(),
  }
}

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  const pushToast = useCallback((item) => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev.slice(-2), { ...item, toastId: id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== id))
    }, 6000)
  }, [])

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId))
  }, [])

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setUnreadCount(0)
      return
    }
    try {
      setUnreadCount(await notificationsApi.unreadCount())
    } catch {
      // ignore — badge keeps last known value
    }
  }, [isAuthenticated, user?.id])

  const fetchNotifications = useCallback(async (params = {}) => {
    if (!isAuthenticated) return []
    setIsLoading(true)
    try {
      const res = await notificationsApi.list({ per_page: 20, ...params })
      const rows = res?.data || []
      setItems(rows)
      if (typeof res?.unread_count === 'number') setUnreadCount(res.unread_count)
      return rows
    } catch {
      return []
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (String(n.id) === String(id) ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)))
    try {
      await notificationsApi.markRead(id)
      refreshUnreadCount()
    } catch {
      // optimistic state stands
    }
  }, [refreshUnreadCount])

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    setUnreadCount(0)
    try {
      await notificationsApi.markAllRead()
    } catch {
      refreshUnreadCount()
    }
  }, [refreshUnreadCount])

  // Realtime listener on the signed-in user's private channel.
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUnreadCount(0)
      setItems([])
      return undefined
    }

    refreshUnreadCount()
    fetchNotifications()

    let channel = null
    try {
      const echo = getEcho()
      if (echo) {
        channel = echo.private(`user.${user.id}`)
        channel.listen('.notification.sent', (event) => {
          const item = toItem(event)
          if (!item) return
          setItems((prev) => {
            if (prev.some((n) => String(n.id) === String(item.id))) return prev
            return [item, ...prev].slice(0, 50)
          })
          setUnreadCount((c) => c + 1)
          pushToast(item)
        })
      }
    } catch (err) {
      console.warn('Realtime notification listener error:', err)
    }

    return () => {
      try {
        channel?.stopListening('.notification.sent')
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, user?.id, refreshUnreadCount, fetchNotifications, pushToast])

  // Polling fallback when the socket is down — mirrors the chat pattern.
  useEffect(() => {
    if (!isAuthenticated) return undefined
    const id = setInterval(() => {
      try {
        if (getConnectionState() === 'connected') return
      } catch {
        // fall through to API refresh
      }
      refreshUnreadCount()
    }, 15000)
    return () => clearInterval(id)
  }, [isAuthenticated, refreshUnreadCount])

  const value = useMemo(
    () => ({
      unreadCount,
      items,
      isLoading,
      toasts,
      dismissToast,
      refreshUnreadCount,
      fetchNotifications,
      markRead,
      markAllRead,
    }),
    [unreadCount, items, isLoading, toasts, dismissToast, refreshUnreadCount, fetchNotifications, markRead, markAllRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications() must be used within a <NotificationProvider>')
  return ctx
}

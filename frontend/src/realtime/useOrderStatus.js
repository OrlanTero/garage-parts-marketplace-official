import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { getEcho } from './echo.js'

/**
 * Listen for live sale-order lifecycle moves (`order.status`) on the
 * signed-in user's private channel. The callback always sees fresh
 * state via ref — subscribers never resubscribe on re-render.
 */
export function useOrderStatusListener(onEvent) {
  const { user, isAuthenticated } = useAuth()
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined
    let channel = null
    try {
      const echo = getEcho()
      if (!echo) return undefined
      channel = echo.private(`user.${user.id}`)
      channel.listen('.order.status', (event) => {
        try {
          handlerRef.current?.(event)
        } catch (err) {
          console.warn('order.status handler error:', err)
        }
      })
    } catch (err) {
      console.warn('Realtime order listener error:', err)
    }

    return () => {
      try {
        channel?.stopListening('.order.status')
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, user?.id])
}

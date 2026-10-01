import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { getEcho } from './echo.js'

/**
 * Live sale-order lifecycle moves (`order.status`) for back-office staff.
 * Listens on the staff channel — every order, not just the admin's own.
 * The callback always sees fresh state via ref.
 */
export function useStaffOrderStatusListener(onEvent) {
  const { user, status } = useAuth()
  const isAuthenticated = status === 'authenticated'
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined
    let channel = null
    try {
      const echo = getEcho()
      if (!echo) return undefined
      channel = echo.private('staff.orders')
      channel.listen('.order.status', (event) => {
        try {
          handlerRef.current?.(event)
        } catch (err) {
          console.warn('staff order.status handler error:', err)
        }
      })
    } catch (err) {
      console.warn('Realtime staff order listener error:', err)
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

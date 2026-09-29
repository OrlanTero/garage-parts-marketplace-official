import { useEffect, useRef } from 'react'
import { getEcho } from './echo.js'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Hook to subscribe to an authenticated private channel.
 *
 * @param {string|null} channelName - Private channel name (e.g. 'user.1' or 'seller.1')
 * @param {Object.<string, Function>} eventHandlers - Map of event names to callback functions
 * @param {boolean} enabled - Whether subscription is active
 */
export function usePrivateChannel(channelName, eventHandlers = {}, enabled = true) {
  const { isAuthenticated } = useAuth()
  const handlersRef = useRef(eventHandlers)
  handlersRef.current = eventHandlers

  useEffect(() => {
    if (!channelName || !enabled || !isAuthenticated) return

    const echo = getEcho()
    if (!echo) return undefined
    const channel = echo.private(channelName)

    const registeredEvents = Object.keys(handlersRef.current)
    registeredEvents.forEach((eventName) => {
      const handler = (data) => {
        if (handlersRef.current[eventName]) {
          handlersRef.current[eventName](data)
        }
      }

      channel.listen(eventName, handler)
      if (!eventName.startsWith('.')) {
        channel.listen(`.${eventName}`, handler)
      }
    })

    return () => {
      registeredEvents.forEach((eventName) => {
        channel.stopListening(eventName)
        if (!eventName.startsWith('.')) {
          channel.stopListening(`.${eventName}`)
        }
      })
      echo.leaveChannel(`private-${channelName}`)
    }
  }, [channelName, enabled, isAuthenticated])
}

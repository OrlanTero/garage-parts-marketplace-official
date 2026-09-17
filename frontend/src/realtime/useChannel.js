import { useEffect, useRef } from 'react'
import { getEcho } from './echo.js'

/**
 * Hook to subscribe to a public broadcast channel and bind event handlers.
 * Automatically handles unsubscribing and cleaning up on unmount.
 *
 * @param {string|null} channelName - Name of public channel (e.g. 'marketplace.parts')
 * @param {Object.<string, Function>} eventHandlers - Map of event names (e.g. '.part.created' or 'part.created') to callback functions
 */
export function useChannel(channelName, eventHandlers = {}) {
  const handlersRef = useRef(eventHandlers)
  handlersRef.current = eventHandlers

  useEffect(() => {
    if (!channelName) return

    const echo = getEcho()
    const channel = echo.channel(channelName)

    const registeredEvents = Object.keys(handlersRef.current)
    registeredEvents.forEach((eventName) => {
      // Laravel Reverb / Pusher custom event names prefixed with '.' or direct
      const handler = (data) => {
        if (handlersRef.current[eventName]) {
          handlersRef.current[eventName](data)
        }
      }

      channel.listen(eventName, handler)

      // Also listen with dot prefix if not provided, or vice versa, for robustness
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
      echo.leaveChannel(channelName)
    }
  }, [channelName])
}

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getEcho, subscribeConnectionState, disconnectEcho, reconnectEcho, isRealtimeEnabled } from './echo.js'
import { useAuth } from '../auth/AuthContext.jsx'

const RealtimeContext = createContext(null)

export function RealtimeProvider({ children }) {
  const { token } = useAuth()
  const [connectionState, setConnectionState] = useState('disconnected')
  const prevTokenRef = useRef(token)

  useEffect(() => {
    if (!isRealtimeEnabled()) {
      setConnectionState('disabled')
      return undefined
    }

    // Subscribe to connection state changes
    const unsubscribe = subscribeConnectionState((state) => {
      setConnectionState(state)
    })

    // Initialize echo instance
    getEcho()

    return () => {
      unsubscribe()
    }
  }, [])

  // When the auth token changes (login / logout / refresh), reconnect echo
  // so private channels re-authorize with the fresh token. getEcho() alone
  // would return the stale singleton and keep failing auth.
  useEffect(() => {
    if (!isRealtimeEnabled()) return
    const prev = prevTokenRef.current
    prevTokenRef.current = token
    if (prev === token) return
    if (prev || token) {
      reconnectEcho()
    }
  }, [token])

  const value = useMemo(
    () => ({
      echo: getEcho(),
      connectionState,
      isConnected: connectionState === 'connected',
      reconnect: reconnectEcho,
      disconnect: disconnectEcho,
    }),
    [connectionState],
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) {
    // Fallback if rendered outside provider: return standalone echo
    return {
      echo: getEcho(),
      connectionState: 'unknown',
      isConnected: false,
      reconnect: reconnectEcho,
      disconnect: disconnectEcho,
    }
  }
  return ctx
}

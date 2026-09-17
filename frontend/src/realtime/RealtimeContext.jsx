import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getEcho, subscribeConnectionState, disconnectEcho, reconnectEcho } from './echo.js'
import { useAuth } from '../auth/AuthContext.jsx'

const RealtimeContext = createContext(null)

export function RealtimeProvider({ children }) {
  const { user, token } = useAuth()
  const [connectionState, setConnectionState] = useState('disconnected')

  useEffect(() => {
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

  // When auth token changes (login / logout), reconnect echo if needed so private channels re-authorize smoothly
  useEffect(() => {
    if (token) {
      // Refresh or reconnect to ensure authorizer has fresh token
      getEcho()
    }
  }, [token, user])

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

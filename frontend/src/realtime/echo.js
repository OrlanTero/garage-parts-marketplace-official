import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import axios from 'axios'
import { tokenStorage } from '../auth/tokenStorage.js'

// Laravel Reverb speaks the Pusher protocol — Echo + pusher-js is the official client.
window.Pusher = Pusher

let echoInstance = null
let connectionListeners = new Set()
let currentConnectionState = 'disconnected' // 'connecting' | 'connected' | 'disconnected' | 'unavailable' | 'error'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function notifyConnectionState(state) {
  currentConnectionState = state
  connectionListeners.forEach((listener) => {
    try {
      listener(state)
    } catch (err) {
      console.error('Error in connection listener:', err)
    }
  })
}

export function getEcho() {
  if (echoInstance) return echoInstance

  const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY
  const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1'

  const key = pusherKey || import.meta.env.VITE_REVERB_APP_KEY || 'local-key'
  const wsHost = import.meta.env.VITE_REVERB_HOST || (pusherKey ? undefined : '127.0.0.1')
  const scheme = (import.meta.env.VITE_REVERB_SCHEME || (pusherKey ? 'https' : 'http')).toLowerCase()
  const isHttps = scheme === 'https' || scheme === 'wss'
  const defaultPort = isHttps ? 443 : 8080
  const wsPort = Number(import.meta.env.VITE_REVERB_PORT || defaultPort)

  notifyConnectionState('connecting')

  const authorizer = (channel) => ({
    authorize: (socketId, callback) => {
      const token = tokenStorage.get()
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      axios
        .post(
          `${API_URL}/api/v1/broadcasting/auth`,
          {
            socket_id: socketId,
            channel_name: channel.name,
          },
          { headers },
        )
        .then((response) => {
          callback(null, response.data)
        })
        .catch((error) => {
          callback(error)
        })
    },
  })

  if (pusherKey && !import.meta.env.VITE_REVERB_HOST) {
    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: pusherKey,
      cluster: pusherCluster,
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
      authorizer,
    })
  } else {
    echoInstance = new Echo({
      broadcaster: 'reverb',
      key,
      wsHost,
      wsPort: isHttps ? 80 : wsPort,
      wssPort: isHttps ? wsPort : 443,
      forceTLS: isHttps,
      enabledTransports: ['ws', 'wss'],
      authorizer,
    })
  }

  const connector = echoInstance.connector?.pusher?.connection
  if (connector) {
    connector.bind('connected', () => notifyConnectionState('connected'))
    connector.bind('connecting', () => notifyConnectionState('connecting'))
    connector.bind('disconnected', () => notifyConnectionState('disconnected'))
    connector.bind('unavailable', () => notifyConnectionState('unavailable'))
    connector.bind('error', () => notifyConnectionState('error'))
  }

  return echoInstance
}

export function subscribeConnectionState(callback) {
  connectionListeners.add(callback)
  callback(currentConnectionState)
  return () => connectionListeners.delete(callback)
}

export function getConnectionState() {
  return currentConnectionState
}

export function disconnectEcho() {
  if (echoInstance) {
    try {
      echoInstance.disconnect()
    } catch {
      // ignore
    }
    echoInstance = null
    notifyConnectionState('disconnected')
  }
}

export function reconnectEcho() {
  disconnectEcho()
  return getEcho()
}

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Laravel Reverb speaks the Pusher protocol — Echo + pusher-js is the official client.
window.Pusher = Pusher

let echo = null

export function getEcho() {
  if (echo) return echo

  const key = import.meta.env.VITE_REVERB_APP_KEY || 'local-key'

  echo = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: import.meta.env.VITE_REVERB_HOST || '127.0.0.1',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
  })

  return echo
}

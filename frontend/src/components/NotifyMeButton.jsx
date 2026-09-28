import { useEffect, useState } from 'react'
import { Bell, BellRing, Check } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { restocksApi } from '../api/restocks.js'

/**
 * Restock alert toggle for sold-out listings. Subscribes the signed-in
 * buyer; the backend notifies once when the listing is restocked and
 * consumes the subscription.
 */
export default function NotifyMeButton({ listingType, listingId }) {
  const { isAuthenticated } = useAuth()
  const [subId, setSubId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !listingType || !listingId) return undefined
    let alive = true
    restocksApi
      .mine()
      .then((rows) => {
        if (!alive) return
        const found = (rows || []).find(
          (r) => r.listing_type === listingType && Number(r.listing_id) === Number(listingId),
        )
        if (found) setSubId(found.id)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [isAuthenticated, listingType, listingId])

  if (!isAuthenticated) return null

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (subId) {
        await restocksApi.unsubscribe(subId)
        setSubId(null)
        setDone(false)
      } else {
        const sub = await restocksApi.subscribe(listingType, listingId)
        setSubId(sub?.id ?? null)
        setDone(true)
        setTimeout(() => setDone(false), 3000)
      }
    } catch {
      // keep current state on failure
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`btn ${subId ? 'btn-primary' : 'btn-secondary'}`}
      title={subId ? 'You will be notified when this listing is restocked — click to unsubscribe' : 'Notify me when this listing is restocked'}
    >
      {subId ? <BellRing size={16} /> : <Bell size={16} />}
      <span>
        {done ? 'Subscribed!' : subId ? (<><Check size={14} style={{ display: 'inline', marginRight: 4 }} />Alert On</>) : 'Notify Me on Restock'}
      </span>
    </button>
  )
}

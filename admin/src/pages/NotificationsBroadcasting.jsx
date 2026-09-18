import { useState } from 'react'
import {
  Radio,
  Send,
  Bell,
  Activity,
  CheckCircle2,
  AlertCircle,
  Users,
  Zap,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const BROADCAST_HISTORY = [
  {
    id: 'BC-1092',
    channel: 'marketplace',
    event: 'App\\Events\\CarCreated',
    title: 'New Featured Build Listed: 1999 Nissan Skyline R34 GT-R V-Spec',
    dispatchedAt: '2026-09-17 12:15 PM',
    target: 'All Active Storefront Sockets (Public Presence)',
    recipientsCount: 420,
    status: 'dispatched',
    payload: JSON.stringify({ carId: 'CAR-0992', title: 'Skyline R34 GT-R', price: 185000, brand: 'Nissan' }, null, 2),
  },
  {
    id: 'BC-1091',
    channel: 'private-seller.3',
    event: 'App\\Events\\PaymentSettled',
    title: 'Payout Dispatched: Settlement of $4,370.00 Authorized for Brembo Racing NA',
    dispatchedAt: '2026-09-16 04:46 PM',
    target: 'Authorized Merchant Socket (Authenticated Sanctum)',
    recipientsCount: 1,
    status: 'dispatched',
    payload: JSON.stringify({ orderId: 'ORD-8940', sellerId: 3, amount: 4370.00, status: 'Dispatched' }, null, 2),
  },
  {
    id: 'BC-1090',
    channel: 'presence-marketplace',
    event: 'App\\Events\\SystemMaintenanceAlert',
    title: 'Scheduled Nginx Cache Engine Warmup at 02:00 AM UTC',
    dispatchedAt: '2026-09-15 08:00 AM',
    target: 'All Connected Presence Nodes',
    recipientsCount: 312,
    status: 'dispatched',
    payload: JSON.stringify({ type: 'maintenance', notice: 'Zero-downtime cache refresh', window: '5m' }, null, 2),
  },
]

export default function NotificationsBroadcasting() {
  const [history, setHistory] = useState(BROADCAST_HISTORY)
  const [channel, setChannel] = useState('marketplace')
  const [eventName, setEventName] = useState('App\\Events\\NotificationSent')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [dispatchStatus, setDispatchStatus] = useState(null)

  const handleBroadcast = (e) => {
    e.preventDefault()
    if (!title || !message) return

    const newBroadcast = {
      id: `BC-${Date.now().toString().slice(-4)}`,
      channel,
      event: eventName,
      title,
      dispatchedAt: 'Just now (Realtime)',
      target: channel === 'marketplace' ? 'Public Presence Channel' : `Authenticated ${channel}`,
      recipientsCount: Math.floor(Math.random() * 300) + 50,
      status: 'dispatched',
      payload: JSON.stringify({ title, message, timestamp: new Date().toISOString() }, null, 2),
    }

    setHistory([newBroadcast, ...history])
    setDispatchStatus(`Broadcast successfully pushed to WebSocket cluster via Reverb port 8080!`)
    setTitle('')
    setMessage('')
    setTimeout(() => setDispatchStatus(null), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Realtime WebSocket Broadcast & Push Dispatcher
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Dispatch live events directly over Laravel Reverb WebSocket clusters to buyer storefronts, seller dashboards, and presence channels.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
            <Radio size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Reverb Socket Cluster</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#047857' }}>Healthy · 8080</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Connected Clients</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>420 Sockets</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(216, 98, 44, 0.1)', color: 'var(--color-rust)' }}>
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Message Latency</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>&lt; 3.2 ms</div>
          </div>
        </div>
      </div>

      {dispatchStatus && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
          ⚡ {dispatchStatus}
        </div>
      )}

      {/* Broadcast Form Card */}
      <div className="admin-card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send size={18} style={{ color: 'var(--color-rust)' }} />
          <span>Dispatch Instant WebSocket Event</span>
        </h2>

        <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Target WebSocket Channel</label>
              <select
                className="admin-input"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="marketplace">Public Channel: marketplace (All Storefronts)</option>
                <option value="presence-marketplace">Presence Channel: presence-marketplace (Online Users)</option>
                <option value="private-seller.1">Private Channel: private-seller.1 (Admin/Seller)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Laravel Event Class</label>
              <input
                type="text"
                className="admin-input"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                style={{ fontFamily: 'monospace' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Notification Headline</label>
            <input
              type="text"
              className="admin-input"
              placeholder="e.g. Flash Price Drop on Garrett G30-770 Turbo Kits!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Payload Message Text</label>
            <textarea
              className="admin-input"
              rows={3}
              placeholder="Enter JSON message payload or alert description broadcast to connected frontend clients..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Radio size={16} />
              <span>Emit WebSocket Event</span>
            </button>
          </div>
        </form>
      </div>

      {/* Broadcast Ledger Accordion */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '10px 0 14px 0' }}>
          Broadcast Event Dispatch Ledger
        </h2>

        <Accordion defaultOpen={['BC-1092']}>
          {history.map((bc) => (
            <AccordionItem key={bc.id} id={bc.id}>
              <AccordionHeader
                id={bc.id}
                title={`${bc.id} · ${bc.title}`}
                subtitle={`Channel: ${bc.channel} · Event: ${bc.event}`}
                badge={{ label: `${bc.recipientsCount} Sockets`, variant: 'success' }}
                icon={Radio}
                actions={
                  <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                    {bc.dispatchedAt}
                  </span>
                }
              />
              <AccordionBody id={bc.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                    Serialized WebSocket JSON Payload:
                  </div>
                  <pre
                    style={{
                      background: 'var(--admin-bg-sidebar)',
                      color: '#a7f3d0',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      overflowX: 'auto',
                      margin: 0,
                    }}
                  >
                    {bc.payload}
                  </pre>
                </div>
              </AccordionBody>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}

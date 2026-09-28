import { useEffect, useState } from 'react'
import {
  Radio,
  Send,
  Bell,
  CheckCircle2,
  Users,
  Zap,
  Search,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'
import { adminApi } from '../api/admin.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

const AUDIENCES = [
  { id: 'all', label: 'Everyone (all users)' },
  { id: 'role', label: 'One role' },
  { id: 'user', label: 'Single user' },
]

const ROLES = ['buyer', 'seller', 'dealer', 'parts_seller', 'admin', 'super_admin']

const TYPES = ['broadcast', 'system', 'order', 'payment', 'payout', 'kyc', 'listing', 'dispute', 'chat', 'info']

export default function NotificationsBroadcasting() {
  const [stats, setStats] = useState(null)
  const [ledger, setLedger] = useState([])
  const [ledgerMeta, setLedgerMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const [audience, setAudience] = useState('all')
  const [role, setRole] = useState('buyer')
  const [userId, setUserId] = useState('')
  const [msgType, setMsgType] = useState('broadcast')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)
  const [dispatchStatus, setDispatchStatus] = useState(null)
  const [dispatchError, setDispatchError] = useState('')

  const loadAll = async () => {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([
        adminApi.getNotificationStats(),
        adminApi.getNotifications({ per_page: 15, search: search || undefined, type: typeFilter !== 'all' ? typeFilter : undefined }),
      ])
      setStats(s)
      setLedger(l?.data || [])
      setLedgerMeta(l?.meta || null)
    } catch (err) {
      console.error('Failed to load notifications ledger:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(loadAll, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter])

  const handleBroadcast = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setDispatchStatus(null)
    setDispatchError('')
    try {
      const res = await adminApi.broadcastNotification({
        title: title.trim(),
        body: message.trim(),
        type: msgType,
        audience,
        role: audience === 'role' ? role : undefined,
        user_id: audience === 'user' ? Number(userId) || undefined : undefined,
        link: link.trim() || undefined,
      })
      const count = res?.data?.sent_count ?? res?.sent_count ?? 0
      setDispatchStatus(`Dispatched to ${count} recipient${count === 1 ? '' : 's'} — rows persisted + realtime pushed.`)
      setTitle('')
      setMessage('')
      setLink('')
      setUserId('')
      await loadAll()
    } catch (err) {
      setDispatchError(err?.response?.data?.message || 'Broadcast failed.')
    } finally {
      setSending(false)
      setTimeout(() => { setDispatchStatus(null); setDispatchError('') }, 6000)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this notification row?')) return
    try {
      await adminApi.deleteNotification(id)
      setLedger((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Notifications & Broadcast Dispatcher
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Persistent in-app notifications with realtime push — order updates, payouts, KYC, and admin announcements across buyer storefronts and seller dashboards.
          </p>
        </div>
        <button type="button" onClick={loadAll} className="admin-btn admin-btn-secondary" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
            <Bell size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Notifications Sent Today</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {loading ? '…' : (stats?.sent_today ?? 0)}
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Unread Inboxes</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {loading ? '…' : (stats?.unread ?? 0)}
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(216, 98, 44, 0.1)', color: 'var(--color-rust)' }}>
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>All-Time Dispatches</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {loading ? '…' : (stats?.total ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {dispatchStatus && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> {dispatchStatus}
        </div>
      )}
      {dispatchError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
          {dispatchError}
        </div>
      )}

      {/* Broadcast Form Card */}
      <div className="admin-card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send size={18} style={{ color: 'var(--color-rust)' }} />
          <span>Dispatch Notification Broadcast</span>
        </h2>

        <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label className="admin-label">Audience</label>
              <select className="admin-input" value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>

            {audience === 'role' && (
              <div>
                <label className="admin-label">Role</label>
                <select className="admin-input" value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            {audience === 'user' && (
              <div>
                <label className="admin-label">User ID</label>
                <input
                  type="number"
                  min="1"
                  className="admin-input"
                  placeholder="e.g. 42"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="admin-label">Type</label>
              <select className="admin-input" value={msgType} onChange={(e) => setMsgType(e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="admin-label">Deep Link (optional)</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. /parts or /sales-order/SO-2026-ABC"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          <div>
            <label className="admin-label">Notification Headline</label>
            <input
              type="text"
              className="admin-input"
              placeholder="e.g. Flash Price Drop on Garrett G30-770 Turbo Kits!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="admin-label">Message Text</label>
            <textarea
              className="admin-input"
              rows={3}
              placeholder="Shown in the notification center, dropdown, and realtime toast…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="submit" disabled={sending} className="admin-btn admin-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Radio size={16} />
              <span>{sending ? 'Dispatching…' : 'Dispatch Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Live Ledger */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '10px 0 14px 0' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: 0 }}>
            Live Notification Ledger
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                className="admin-input"
                placeholder="Search title, user, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 32, width: 240 }}
              />
            </div>
            <select className="admin-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {loading && ledger.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <RefreshCw size={22} className="spin" style={{ marginBottom: 8 }} />
            <div>Loading live notification rows…</div>
          </div>
        ) : ledger.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
            <Bell size={28} style={{ color: 'var(--admin-text-muted)', marginBottom: 8 }} />
            <div style={{ fontWeight: 700 }}>No notifications match</div>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, margin: '4px 0 0 0' }}>
              Order events, chat messages, payouts, and broadcasts will stream in here.
            </p>
          </div>
        ) : (
          <Accordion defaultOpen={[String(ledger[0]?.id)]}>
            {ledger.map((n) => {
              const id = String(n.id)
              const who = n.user?.username ? `@${n.user.username}` : (n.user?.email || `User #${n.user_id}`)
              return (
                <AccordionItem key={id} id={id}>
                  <AccordionHeader
                    id={id}
                    title={`${n.title}`}
                    subtitle={`To ${who} · Type: ${n.type}${n.read_at ? ' · Read' : ' · Unread'}`}
                    badge={{ label: n.read_at ? 'Read' : 'Unread', variant: n.read_at ? 'neutral' : 'rust' }}
                    icon={Bell}
                    actions={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                          <TimeAgo value={n.created_at} />
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(n.id)}
                          title="Remove row"
                          style={{ border: 'none', background: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'inline-flex', padding: 4 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    }
                  />
                  <AccordionBody id={id}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                      {n.body && <div style={{ color: 'var(--admin-text-primary)', lineHeight: 1.5 }}>{n.body}</div>}
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        Recipient: <strong>{who}</strong>
                        {n.sender?.username && <> · Sent by <strong>@{n.sender.username}</strong></>}
                        {n.link && <> · Link: <strong style={{ fontFamily: 'monospace' }}>{n.link}</strong></>}
                      </div>
                      {n.data && Object.keys(n.data).length > 0 && (
                        <pre style={{ background: '#f8fafc', border: '1px solid var(--admin-border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: 11, overflowX: 'auto', margin: 0 }}>
                          {JSON.stringify(n.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </AccordionBody>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
        {ledgerMeta && ledgerMeta.total > ledger.length && (
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 10 }}>
            Showing {ledger.length} of {ledgerMeta.total} rows
          </div>
        )}
      </div>
    </div>
  )
}

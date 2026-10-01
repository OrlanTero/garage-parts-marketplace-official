import { useEffect, useState } from 'react'
import {
  Car,
  Search,
  Truck,
  DollarSign,
  ShieldCheck,
  PackageCheck,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'
import CarTransactionDetail from '../components/CarTransactionDetail.jsx'
import { adminApi } from '../api/admin.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

const peso = (val) =>
  `₱ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function CarTransactions() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ held_funds: 0, pending_proofs: 0, released_total: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [proofFilter, setProofFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getCarTransactions({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        proof_status: proofFilter !== 'all' ? proofFilter : undefined,
        per_page: 20,
      })
      setRows(res?.data || [])
      setSummary(res?.summary || { held_funds: 0, pending_proofs: 0, released_total: 0 })
    } catch (err) {
      console.error('Failed to load car transactions:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, proofFilter])

  const moveStatus = (ord, status) => {
    if (!window.confirm(`Move order ${ord.order_number || `#${ord.id}`} to ${status}?`)) return
    setBusyId(ord.id)
    adminApi.updateOrderStatus(ord.id, { status })
      .then(load)
      .catch((err) => window.alert(err?.response?.data?.message || 'Action failed.'))
      .finally(() => setBusyId(null))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Car Build Transactions — Holds, Proofs & Releases
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Track every vehicle sale: escrow holds, seller handover proofs, and admin-approved fund releases to seller wallets.
          </p>
        </div>
        <button type="button" onClick={load} className="admin-btn admin-btn-secondary" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#b45309' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Funds Held in Escrow</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{peso(summary.held_funds)}</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Proofs Awaiting Review</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{summary.pending_proofs}</div>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Released to Seller Wallets</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{peso(summary.released_total)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search order, buyer, vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
        <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {['all', 'processing', 'negotiating', 'sold', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
          ))}
        </select>
        <select className="admin-select" value={proofFilter} onChange={(e) => setProofFilter(e.target.value)}>
          {['all', 'none', 'pending', 'approved', 'rejected'].map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All proofs' : `Proof: ${s}`}</option>
          ))}
        </select>
      </div>

      {/* Rows */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: 12 }} />
          <p>Loading car transactions…</p>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
          <Car size={32} style={{ color: 'var(--admin-text-muted)', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>No car transactions found</div>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, margin: '4px 0 0 0' }}>
            Vehicle sales orders will stream in here once buyers check out.
          </p>
        </div>
      ) : (
        <Accordion defaultOpen={[rows[0]?.order_number || String(rows[0]?.id)]}>
          {rows.map((ord) => {
            const key = ord.order_number || String(ord.id)
            const busy = busyId === ord.id
            const canAdvanceShipped = ord.status === 'processing' || ord.status === 'sold'

            return (
              <AccordionItem key={key} id={key}>
                <AccordionHeader
                  id={key}
                  title={`${key} · ${ord.item?.name || ord.item_name || 'Vehicle'}`}
                  subtitle={
                    <span>
                      <TimeAgo value={ord.created_at} /> · Buyer: {ord.buyer?.name || ord.buyer_name} · Seller: {ord.seller?.name || ord.seller?.username || ord.item?.seller_name || ord.seller_name}
                    </span>
                  }
                  badge={{ label: (ord.status_label || ord.status || '').toUpperCase(), variant: ord.status_variant || 'info' }}
                  icon={Car}
                  actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--color-rust)' }}>
                        {ord.financials?.formatted_total || peso(ord.total_amount)}
                      </span>
                    </div>
                  }
                />
                <AccordionBody id={key}>
                  <CarTransactionDetail
                    order={ord}
                    onChanged={load}
                    showDeskLink
                    extraActions={
                      <>
                        {canAdvanceShipped && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => moveStatus(ord, 'shipped')}
                            className="admin-btn admin-btn-primary"
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <Truck size={14} />
                            <span>{busy ? 'Updating…' : 'Mark Shipped'}</span>
                          </button>
                        )}
                        {ord.status === 'shipped' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => moveStatus(ord, 'delivered')}
                            className="admin-btn admin-btn-primary"
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <PackageCheck size={14} />
                            <span>{busy ? 'Updating…' : 'Mark Delivered'}</span>
                          </button>
                        )}
                      </>
                    }
                  />
                </AccordionBody>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Car,
  Search,
  CheckCircle2,
  Truck,
  DollarSign,
  ShieldCheck,
  PackageCheck,
  ExternalLink,
  RefreshCw,
  User,
  MapPin,
  XCircle,
  Clock,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'
import { adminApi } from '../api/admin.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

const peso = (val) =>
  `₱ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PROOF_STYLE = {
  none: { label: 'No Proof', bg: 'rgba(148, 163, 184, 0.15)', color: 'var(--admin-text-secondary)' },
  pending: { label: 'Proof Pending Review', bg: 'rgba(234, 179, 8, 0.15)', color: '#b45309' },
  approved: { label: 'Proof Approved', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' },
  rejected: { label: 'Proof Rejected', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
}

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

  const act = async (ord, fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusyId(ord.id)
    try {
      await fn()
      await load()
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  const approveProof = (ord) =>
    act(ord, () => adminApi.approveCarProof(ord.id),
      `Approve handover proof and RELEASE ${peso(ord.financials?.total_amount)} to the seller wallet?`)

  const rejectProof = (ord) => {
    const reason = window.prompt('Rejection reason shown to the seller:', '')
    if (reason === null) return
    if (!reason.trim()) {
      window.alert('A reason is required so the seller knows what to fix.')
      return
    }
    act(ord, () => adminApi.rejectCarProof(ord.id, reason.trim()))
  }

  const moveStatus = (ord, status) =>
    act(ord, () => adminApi.updateOrderStatus(ord.id, { status }),
      `Move order ${ord.order_number || `#${ord.id}`} to ${status}?`)

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
            const proof = ord.proof || { status: 'none', images: [] }
            const proofStyle = PROOF_STYLE[proof.status] || PROOF_STYLE.none
            const pay = ord.financials?.payment_status || ord.payment_status || 'pending'
            const payBadge = pay === 'released'
              ? { label: 'Released to Wallet', cls: 'badge-success' }
              : pay === 'confirmed'
                ? { label: 'Held — Confirmed', cls: 'badge-warning' }
                : pay === 'paid'
                  ? { label: 'Held in Escrow', cls: 'badge-warning' }
                  : pay === 'refunded'
                    ? { label: 'Refunded', cls: 'badge-danger' }
                    : { label: 'Payment Pending', cls: 'badge-neutral' }
            const canReview = proof.status === 'pending'
            const canAdvanceShipped = ord.status === 'processing' || ord.status === 'sold'
            const busy = busyId === ord.id

            return (
              <AccordionItem key={key} id={key}>
                <AccordionHeader
                  id={key}
                  title={`${key} · ${ord.item?.name || ord.item_name || 'Vehicle'}`}
                  subtitle={
                    <span>
                      <TimeAgo value={ord.created_at} /> · Buyer: {ord.buyer?.name || ord.buyer_name} · Seller: {ord.item?.seller_name || ord.seller_name}
                    </span>
                  }
                  badge={{ label: (ord.status_label || ord.status || '').toUpperCase(), variant: ord.status_variant || 'info' }}
                  icon={Car}
                  actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span className={`badge ${payBadge.cls}`} style={{ fontSize: 11 }}>{payBadge.label}</span>
                      {ord.payout_released && (
                        <span className="badge badge-success" style={{ fontSize: 11 }}>Wallet Paid</span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: proofStyle.bg, color: proofStyle.color }}>
                        {proofStyle.label}
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--color-rust)' }}>
                        {ord.financials?.formatted_total || peso(ord.total_amount)}
                      </span>
                    </div>
                  }
                />
                <AccordionBody id={key}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Parties + money */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                          <User size={14} /> Buyer
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{ord.buyer?.name || ord.buyer_name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{ord.buyer?.email || ord.buyer_email || ''}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 4 }}>
                          <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {ord.buyer?.full_address || ord.shipping_address || '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                          <DollarSign size={14} /> Escrow Hold
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{ord.financials?.formatted_total || peso(ord.total_amount)}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                          Method: {ord.financials?.payment_method || ord.payment_method || '—'}
                          {(ord.financials?.payment_reference || ord.payment_reference) && (
                            <> · Ref: <strong style={{ fontFamily: 'monospace' }}>{ord.financials?.payment_reference || ord.payment_reference}</strong></>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                          VIN: <strong style={{ fontFamily: 'monospace' }}>{ord.vehicle?.vin || ord.vin || 'N/A'}</strong>
                        </div>
                      </div>
                      <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                          <Truck size={14} /> Fulfillment
                        </div>
                        <div style={{ fontSize: 12 }}>Carrier: <strong>{ord.carrier || '—'}</strong></div>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-rust)', marginTop: 2 }}>
                          {ord.tracking_number || 'PENDING-DISPATCH'}
                        </div>
                      </div>
                    </div>

                    {/* Handover proof */}
                    <div style={{ border: '1px solid var(--admin-border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          Seller Handover Proof{' '}
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: proofStyle.bg, color: proofStyle.color, marginLeft: 6 }}>
                            {proofStyle.label}
                          </span>
                        </div>
                        {proof.submitted_at && (
                          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                            Submitted <TimeAgo value={proof.submitted_at} />
                          </span>
                        )}
                      </div>

                      {(!proof.images || proof.images.length === 0) && !proof.note ? (
                        <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
                          No proof submitted yet. The seller submits delivery photos + note once the vehicle is handed over.
                        </div>
                      ) : (
                        <>
                          {proof.images?.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                              {proof.images.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt={`Proof ${i + 1}`} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--admin-border)' }} />
                                </a>
                              ))}
                            </div>
                          )}
                          {proof.note && (
                            <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--admin-text-secondary)', marginBottom: 4 }}>
                              “{proof.note}”
                            </div>
                          )}
                          {proof.status === 'rejected' && proof.rejection_reason && (
                            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
                              Returned: {proof.rejection_reason}
                            </div>
                          )}
                        </>
                      )}

                      {canReview && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveProof(ord)}
                            className="admin-btn admin-btn-primary"
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <CheckCircle2 size={14} />
                            <span>{busy ? 'Releasing…' : 'Approve Proof — Release Funds to Wallet'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => rejectProof(ord)}
                            className="admin-btn admin-btn-secondary"
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <XCircle size={14} />
                            <span>{busy ? 'Working…' : 'Return Proof with Reason'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--admin-border)', paddingTop: 14, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        Order Number: <strong>{key}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Link
                          to={`/orders/${ord.order_number || ord.id}`}
                          className="admin-btn admin-btn-secondary"
                          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                        >
                          <ExternalLink size={14} />
                          <span>Open Full View</span>
                        </Link>
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
                      </div>
                    </div>
                  </div>
                </AccordionBody>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}

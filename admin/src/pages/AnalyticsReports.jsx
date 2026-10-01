import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Car,
  Layers,
  Users,
  Download,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Wallet,
  ShieldCheck,
  Package,
  ExternalLink,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'
import { adminApi } from '../api/admin.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

const peso = (val) =>
  `₱ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const RANGES = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last Quarter' },
  { id: 'ytd', label: 'Year to Date' },
  { id: 'all', label: 'All Time' },
]

function growthBadge(pct) {
  if (pct == null) return null
  const up = Number(pct) >= 0
  return (
    <span className={`kpi-card-delta ${up ? 'kpi-card-delta--up' : 'kpi-card-delta--down'}`}>
      {up ? '↑' : '↓'} {Math.abs(Number(pct))}%
    </span>
  )
}

/** Minimal SVG sparkline — no chart lib needed. */
function Sparkline({ points, tone = '#d8622c', width = 220, height = 44 }) {
  const vals = (points || []).map((v) => Number(v) || 0)
  if (vals.length < 2) return null
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals, 0)
  const span = max - min || 1
  const stepX = width / (vals.length - 1)
  const pts = vals.map((v, i) => {
    const x = Math.round(i * stepX)
    const y = Math.round(height - 4 - ((v - min) / span) * (height - 10))
    return `${x},${y}`
  }).join(' ')
  const last = vals[vals.length - 1]
  const lastX = width
  const lastY = Math.round(height - 4 - ((last - min) / span) * (height - 10))
  return (
    <svg className="kpi-card-spark" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={tone} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX - 2} cy={lastY} r="3.5" fill={tone} />
    </svg>
  )
}

function downloadCsv(filename, sections) {
  const lines = []
  sections.forEach(([title, headers, rows]) => {
    lines.push(title)
    lines.push(headers.join(','))
    rows.forEach((r) => lines.push(r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')))
    lines.push('')
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function AnalyticsReports() {
  const [dateRange, setDateRange] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (range = dateRange) => {
    setLoading(true)
    try {
      const res = await adminApi.getAnalyticsOverview({ range })
      setData(res)
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load analytics.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(dateRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  const kpis = data?.kpis || {}
  const growth = data?.growth || null
  const maxTrend = useMemo(
    () => Math.max(1, ...(data?.monthly_trend || []).map((t) => Number(t.total || 0))),
    [data],
  )

  const handleExport = () => {
    if (!data) return
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`marketplace-analytics-${dateRange}-${stamp}.csv`, [
      ['KPIs', ['Metric', 'Value'], [
        ['GMV', kpis.gmv], ['GMV cars', kpis.gmv_cars], ['GMV parts', kpis.gmv_parts],
        ['Platform fees', kpis.platform_fees], ['Take rate %', kpis.take_rate],
        ['Avg order value', kpis.avg_order_value], ['Completed orders', kpis.completed_orders],
        ['Total orders', kpis.total_orders], ['Completion rate %', kpis.completion_rate],
        ['Open pipeline', kpis.open_pipeline], ['Held escrow', kpis.held_escrow],
        ['Pending proofs', kpis.pending_proofs], ['Released payouts', kpis.released_payouts],
        ['Agent payouts', kpis.agent_payouts], ['New users', kpis.new_users],
      ]],
      ['Orders by status', ['Status', 'Count'], Object.entries(data.orders_by_status || {})],
      ['Categories', ['Category', 'Orders', 'Revenue'], (data.categories || []).map((c) => [c.category, c.orders, c.revenue])],
      ['Brands', ['Brand', 'Orders', 'Revenue', 'Share %', 'Top item'], (data.brands || []).map((b) => [b.brand, b.orders, b.revenue, b.share, b.top_item])],
      ['Monthly trend', ['Month', 'Cars', 'Parts', 'Total'], (data.monthly_trend || []).map((t) => [t.month, t.cars, t.parts, t.total])],
    ])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Marketplace Analytics & Financial Intelligence
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Live platform numbers — GMV, take-rate, categories, brands, pipeline, users and payouts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <select
            className="admin-input"
            style={{ width: 'auto', padding: '8px 14px' }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>

          <button
            type="button"
            onClick={handleExport}
            disabled={!data || loading}
            className="admin-btn admin-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: 12 }} />
          <p>Crunching live marketplace numbers…</p>
        </div>
      ) : error || !data ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: 'var(--admin-danger)', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>{error || 'No analytics available'}</div>
          <button type="button" onClick={() => load()} className="admin-btn admin-btn-secondary" style={{ marginTop: 16, fontSize: 12 }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="kpi-grid">
            <div className="kpi-card kpi-card--green">
              <div className="kpi-card-head">
                <span className="kpi-card-icon"><DollarSign size={22} /></span>
                <span className="kpi-card-eyebrow">GMV (Completed)</span>
                {growthBadge(growth?.gmv_pct)}
              </div>
              <div className="kpi-card-value">{peso(kpis.gmv)}</div>
              <Sparkline points={(data.monthly_trend || []).map((t) => t.total)} tone="#10b981" />
              <div className="kpi-card-foot">
                <span>Cars <strong>{peso(kpis.gmv_cars)}</strong> · Parts <strong>{peso(kpis.gmv_parts)}</strong></span>
              </div>
            </div>

            <div className="kpi-card kpi-card--rust">
              <div className="kpi-card-head">
                <span className="kpi-card-icon"><TrendingUp size={20} /></span>
                <span className="kpi-card-eyebrow">Platform Take</span>
                <span className="kpi-card-delta kpi-card-delta--flat">{kpis.take_rate}% rate</span>
              </div>
              <div className="kpi-card-value">{peso(kpis.platform_fees)}</div>
              <div className="kpi-card-foot">
                <span>Agents paid <strong>{peso(kpis.agent_payouts)}</strong></span>
              </div>
            </div>

            <div className="kpi-card kpi-card--blue">
              <div className="kpi-card-head">
                <span className="kpi-card-icon"><ShoppingBag size={20} /></span>
                <span className="kpi-card-eyebrow">Orders · AOV {peso(kpis.avg_order_value)}</span>
                {growthBadge(growth?.orders_pct)}
              </div>
              <div className="kpi-card-value">{kpis.completed_orders}<small> / {kpis.total_orders} ({kpis.completion_rate}%)</small></div>
              <div className="kpi-card-meter"><span style={{ width: `${Math.min(100, Number(kpis.completion_rate) || 0)}%` }} /></div>
              <div className="kpi-card-foot">
                <span>Completion rate <strong>{kpis.completion_rate}%</strong></span>
              </div>
            </div>

            <div className="kpi-card kpi-card--amber">
              <div className="kpi-card-head">
                <span className="kpi-card-icon"><Wallet size={20} /></span>
                <span className="kpi-card-eyebrow">Pipeline · Escrow</span>
                <span className="kpi-card-delta kpi-card-delta--flat">{kpis.pending_proofs} proofs</span>
              </div>
              <div className="kpi-card-value">{peso(kpis.open_pipeline)}</div>
              <div className="kpi-card-foot">
                <span>Held <strong>{peso(kpis.held_escrow)}</strong> · Released <strong>{peso(kpis.released_payouts)}</strong></span>
              </div>
            </div>

            <div className="kpi-card kpi-card--violet">
              <div className="kpi-card-head">
                <span className="kpi-card-icon"><Users size={20} /></span>
                <span className="kpi-card-eyebrow">Users</span>
                <span className="kpi-card-delta kpi-card-delta--flat">+{kpis.new_users} in range</span>
              </div>
              <div className="kpi-card-value">{Object.values(data.users_by_role || {}).reduce((a, b) => a + Number(b), 0)}<small> total</small></div>
              <div className="kpi-card-foot">
                <span>
                  {Object.entries(data.users_by_role || {}).map(([role, count]) => (
                    <span key={role} style={{ display: 'inline-block', marginRight: 10 }}>
                      <span style={{ textTransform: 'capitalize' }}>{String(role).replace('_', ' ')}:</span> <strong>{count}</strong>
                    </span>
                  ))}
                </span>
              </div>
            </div>

            <div className="kpi-card kpi-card--teal">
              <div className="kpi-card-head">
                <span className="kpi-card-icon"><Car size={20} /></span>
                <span className="kpi-card-eyebrow">Live Inventory</span>
              </div>
              <div className="kpi-card-value">{(data.inventory?.cars_total ?? 0) + (data.inventory?.parts_total ?? 0)}<small> units</small></div>
              <div className="kpi-card-foot">
                <span>Cars ({data.inventory?.cars_total ?? 0}): <strong>{Object.entries(data.inventory?.cars_by_status || {}).map(([s, c]) => `${s} ${c}`).join(' · ') || '—'}</strong></span>
                <span>Parts ({data.inventory?.parts_total ?? 0}): <strong>{Object.entries(data.inventory?.parts_by_status || {}).map(([s, c]) => `${s} ${c}`).join(' · ') || '—'}</strong></span>
              </div>
            </div>
          </div>

          {/* Orders by status + monthly trend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <div className="admin-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={15} style={{ color: 'var(--color-rust)' }} /> Orders by Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(data.orders_by_status || {}).sort((a, b) => b[1] - a[1]).map(([s, c]) => {
                  const max = Math.max(1, ...Object.values(data.orders_by_status || {}))
                  return (
                    <div key={s} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 44px', gap: 8, alignItems: 'center', fontSize: 12 }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{s}</span>
                      <span style={{ height: 8, borderRadius: 4, background: 'var(--admin-bg-subtle)', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${Math.round((c / max) * 100)}%`, background: 'var(--color-rust)' }} />
                      </span>
                      <strong style={{ textAlign: 'right' }}>{c}</strong>
                    </div>
                  )
                })}
                {(data.orders_by_type || []).map((t) => (
                  <div key={t.item_type} style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                    {t.item_type === 'car' ? 'Car builds' : t.item_type === 'part' ? 'Parts' : t.item_type}: <strong>{t.total}</strong> orders · {peso(t.revenue)} GMV
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={15} style={{ color: 'var(--color-rust)' }} /> GMV — Trailing 6 Months
              </div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 12 }}>
                <span style={{ color: '#d8622c' }}>■</span> Cars <span style={{ color: '#1d4ed8', marginLeft: 8 }}>■</span> Parts
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
                {(data.monthly_trend || []).map((t) => {
                  const carsH = Math.max(2, Math.round((Number(t.cars) / maxTrend) * 130))
                  const partsH = Math.max(t.parts > 0 ? 2 : 0, Math.round((Number(t.parts) / maxTrend) * 130))
                  return (
                    <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} title={`${t.month}: ${peso(t.total)}`}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 132 }}>
                        <span style={{ width: 14, height: carsH, borderRadius: '3px 3px 0 0', background: '#d8622c' }} />
                        <span style={{ width: 14, height: partsH, borderRadius: '3px 3px 0 0', background: '#1d4ed8' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--admin-text-muted)' }}>{t.month.split(' ')[0]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Category performance */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} style={{ color: 'var(--color-rust)' }} />
              <span>Category Performance & GMV Breakdown</span>
            </h2>

            <Accordion defaultOpen={['cat-perf']}>
              <AccordionItem id="cat-perf">
                <AccordionHeader
                  id="cat-perf"
                  title="Completed Revenue by Category"
                  subtitle={`Parts categories plus vehicle builds · ${RANGES.find((r) => r.id === dateRange)?.label}`}
                  badge={{ label: `${(data.categories || []).length} Categories`, variant: 'rust' }}
                  icon={BarChart3}
                />
                <AccordionBody id="cat-perf">
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Completed Revenue</th>
                          <th>Share of GMV</th>
                          <th>Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.categories || []).map((cat, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{String(cat.category || '').replace(/_/g, ' ')}</td>
                            <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-rust)' }}>{peso(cat.revenue)}</td>
                            <td>{kpis.gmv > 0 ? `${Math.round((Number(cat.revenue) / Number(kpis.gmv)) * 100)}%` : '—'}</td>
                            <td>{cat.orders}</td>
                          </tr>
                        ))}
                        {(!data.categories || data.categories.length === 0) && (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--admin-text-muted)' }}>No completed sales in this range yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </AccordionBody>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Brand share */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '14px 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={18} style={{ color: 'var(--color-orange)' }} />
              <span>Vehicle Make Share (Completed Car Builds)</span>
            </h2>

            <Accordion defaultOpen={['brand-perf']}>
              <AccordionItem id="brand-perf">
                <AccordionHeader
                  id="brand-perf"
                  title="Brand Revenue & Top Builds"
                  subtitle="Completed car sales grouped by listing brand"
                  badge={{ label: `${(data.brands || []).length} Brands`, variant: 'success' }}
                  icon={Car}
                />
                <AccordionBody id="brand-perf">
                  {(data.brands || []).length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13, padding: 16 }}>
                      No completed car sales in this range yet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
                      {data.brands.map((b, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--admin-bg-subtle)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 15 }}>{b.brand}</span>
                            <span className="badge badge-rust" style={{ fontSize: 12 }}>{b.share}%</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: 'var(--admin-border)', overflow: 'hidden', marginBottom: 8 }}>
                            <span style={{ display: 'block', height: '100%', width: `${Math.min(100, b.share)}%`, background: 'var(--color-rust)' }} />
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{b.orders} builds · Revenue:</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-rust)', marginTop: 2 }}>{peso(b.revenue)}</div>
                          {b.top_item && (
                            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 8 }}>
                              Top build: <strong>{b.top_item}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionBody>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Recent payouts */}
          <div className="admin-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={15} style={{ color: 'var(--color-rust)' }} /> Recent Seller Payouts
            </div>
            {(data.recent_payouts || []).length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>No payouts recorded yet.</div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Item</th>
                      <th>Gross</th>
                      <th>Net Paid</th>
                      <th>Settled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_payouts.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace' }}>
                          <Link to={`/orders/${p.order?.order_number || p.order_id}`} style={{ color: 'var(--color-rust)', fontWeight: 700 }}>
                            {p.order?.order_number || `#${p.order_id}`}
                          </Link>
                        </td>
                        <td>{p.order?.item_name || '—'}</td>
                        <td>{peso(p.gross_amount)}</td>
                        <td style={{ fontWeight: 800, color: '#047857' }}>{peso(p.net_amount)}</td>
                        <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                          {p.created_at ? <TimeAgo value={p.created_at} /> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
              <Link to="/car-transactions" style={{ fontWeight: 700, color: 'var(--color-rust)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Car Transactions Desk <ExternalLink size={12} />
              </Link>
              <Link to="/payouts" style={{ fontWeight: 700, color: 'var(--color-rust)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Payout Withdrawals <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

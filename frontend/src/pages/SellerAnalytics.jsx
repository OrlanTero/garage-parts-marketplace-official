import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  Package,
  Car,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet as WalletIcon,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { walletApi } from '../api/wallet.js'
import { TimeAgo } from '../utils/timeAgo.jsx'

const peso = (v) =>
  '₱ ' + Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const pesoShort = (v) => {
  const n = Number(v || 0)
  if (Math.abs(n) >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `₱${(n / 1_000).toFixed(1)}k`
  return `₱${n.toFixed(0)}`
}

const card = {
  background: '#161922',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: 20,
}

function Kpi({ icon: Icon, label, value, sub, accent }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: `${accent}1f`, color: accent }}>
          <Icon size={17} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function SellerAnalytics() {
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await walletApi.analytics())
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load your sales analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (isAuthenticated) load() }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = data?.kpis || {}
  const trend = data?.monthly_trend || []
  const byStatus = data?.orders_by_status || {}
  const tops = data?.top_listings || []
  const payouts = data?.recent_payouts || []
  const maxTrend = Math.max(1, ...trend.map((t) => Number(t.total || 0)))
  const maxStatus = Math.max(1, ...Object.values(byStatus).map(Number))

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={24} style={{ color: '#fb923c' }} /> Sales Analytics
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Revenue, orders, and top listings across your cars and parts.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/wallet" className="btn btn-secondary btn-sm"><WalletIcon size={14} /> Wallet</Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
        <Kpi icon={BadgeDollarSign} label="Gross Sales" value={peso(kpis.gross_sales)} sub={`${kpis.completed_orders ?? 0} completed orders`} accent="#10b981" />
        <Kpi icon={TrendingUp} label="Net Earnings" value={peso(kpis.net_earnings)} sub={`After ${peso(kpis.platform_fees)} platform fees`} accent="#60a5fa" />
        <Kpi icon={ShoppingBag} label="Avg Order Value" value={peso(kpis.avg_order_value)} sub={`${kpis.completion_rate ?? 0}% completion rate`} accent="#fb923c" />
        <Kpi icon={Package} label="Open Pipeline" value={peso(kpis.open_pipeline)} sub="Paid orders not yet completed" accent="#eab308" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 14 }}>
        {/* Monthly trend */}
        <div style={card}>
          <h3 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 4px 0' }}>Sales — Last 6 Months</h3>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px 0' }}>
            <span style={{ color: '#fb923c' }}>■</span> Cars <span style={{ color: '#60a5fa', marginLeft: 8 }}>■</span> Parts · net earnings
          </p>
          {loading ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>Loading trend…</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 170 }}>
              {trend.map((t) => {
                const carsH = Math.max(2, (Number(t.cars) / maxTrend) * 150)
                const partsH = Math.max(t.parts > 0 ? 2 : 0, (Number(t.parts) / maxTrend) * 150)
                return (
                  <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }} title={`${t.month}: ${peso(t.total)}`}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{pesoShort(t.total)}</span>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
                      <div style={{ width: 16, height: carsH, borderRadius: '4px 4px 2px 2px', background: 'linear-gradient(180deg, #fb923c, #924424)' }} title={`Cars ${peso(t.cars)}`} />
                      <div style={{ width: 16, height: partsH, borderRadius: '4px 4px 2px 2px', background: 'linear-gradient(180deg, #60a5fa, #1e40af)' }} title={`Parts ${peso(t.parts)}`} />
                    </div>
                    <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>{t.month}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Orders by status */}
        <div style={card}>
          <h3 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 4px 0' }}>Orders by Status</h3>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px 0' }}>{kpis.total_orders ?? 0} total requests on your listings</p>
          {Object.keys(byStatus).length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>No orders yet — share your listings to get your first sale.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#cbd5e1', textTransform: 'capitalize' }}>{String(status).replace('_', ' ')}</span>
                    <span style={{ color: '#94a3b8', fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: '#0f1117', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(Number(count) / maxStatus) * 100}%`, borderRadius: 999, background: status === 'completed' ? '#10b981' : status === 'disputed' || status === 'refunded' || status === 'cancelled' ? '#ef4444' : '#d8622c' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {/* Top listings */}
        <div style={card}>
          <h3 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 12px 0' }}>Top Listings by Revenue</h3>
          {tops.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>Completed sales will rank your best listings here.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tops.map((t, i) => (
                <div key={`${t.item_name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < tops.length - 1 ? '1px solid #1e293b' : 'none' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#0f1117', color: '#fb923c', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', flexShrink: 0 }}>
                    {t.item_type === 'car' ? <Car size={15} /> : <Package size={15} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.item_name}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>{t.orders} orders · {t.units} units · {t.item_type}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>{peso(t.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payouts */}
        <div style={card}>
          <h3 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} style={{ color: '#10b981' }} /> Recent Payouts
          </h3>
          {payouts.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>Settled payouts from completed orders will appear here.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {payouts.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.order?.item_name || p.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                      <span style={{ fontFamily: 'monospace' }}>{p.order?.order_number}</span> · <TimeAgo value={p.created_at} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>+{peso(p.net_amount)}</div>
                </div>
              ))}
            </div>
          )}
          <Link to="/wallet" style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}>
            Open wallet <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  )
}

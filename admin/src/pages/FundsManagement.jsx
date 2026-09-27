import { useEffect, useState, useCallback } from 'react'
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Percent,
  Download,
  FileText,
  Search,
  RefreshCw,
  Building2,
  Car,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Filter,
  Eye,
  X,
  CreditCard,
  ShieldCheck,
  Calendar,
  Layers,
  Award,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { adminFundsApi } from '../api/funds.js'

function formatPeso(num) {
  if (num === null || num === undefined) return '₱ 0'
  return '₱ ' + Number(num).toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

function formatPesoDetailed(num) {
  if (num === null || num === undefined) return '₱ 0.00'
  return '₱ ' + Number(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FundsManagement() {
  const [overview, setOverview] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [streamFilter, setStreamFilter] = useState('all') // all | car_sale_commission | parking_fee
  const [statusFilter, setStatusFilter] = useState('all') // all | completed | pending
  const [paymentFilter, setPaymentFilter] = useState('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Report Generator Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportPeriod, setReportPeriod] = useState('this_month')
  const [reportStream, setReportStream] = useState('all')
  const [reportData, setReportData] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(false)

  // Transaction Receipt Modal State
  const [selectedTxn, setSelectedTxn] = useState(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        per_page: 20,
      }
      if (search.trim()) params.search = search.trim()
      if (streamFilter !== 'all') params.stream_type = streamFilter
      if (statusFilter !== 'all') params.status = statusFilter
      if (paymentFilter !== 'all') params.payment_method = paymentFilter

      const [resOverview, resTxns] = await Promise.allSettled([
        adminFundsApi.getOverview(),
        adminFundsApi.listTransactions(params),
      ])

      if (resOverview.status === 'fulfilled' && resOverview.value) {
        setOverview(resOverview.value)
      }

      if (resTxns.status === 'fulfilled' && resTxns.value) {
        setTransactions(resTxns.value.data || [])
        if (resTxns.value.meta) {
          setTotalPages(resTxns.value.meta.last_page || 1)
          setTotalCount(resTxns.value.meta.total || 0)
        }
      }
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, streamFilter, statusFilter, paymentFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchData()
  }

  const handleOpenReportModal = async () => {
    setReportModalOpen(true)
    await runReportGeneration(reportPeriod, reportStream)
  }

  const runReportGeneration = async (period, stream) => {
    setGeneratingReport(true)
    try {
      const data = await adminFundsApi.generateReport({
        period,
        stream_type: stream,
      })
      setReportData(data)
    } catch {
      setReportData(null)
    } finally {
      setGeneratingReport(false)
    }
  }

  const handlePeriodChange = (newPeriod) => {
    setReportPeriod(newPeriod)
    runReportGeneration(newPeriod, reportStream)
  }

  const handleStreamChange = (newStream) => {
    setReportStream(newStream)
    runReportGeneration(reportPeriod, newStream)
  }

  const wallet = overview?.wallet || {
    total_revenue: 0,
    total_gross_volume: 0,
    car_commissions_total: 0,
    car_deals_count: 0,
    parking_fees_total: 0,
    parking_bays_count: 0,
    pending_funds: 0,
    commission_rate: 5.0,
  }

  const monthlyTrend = overview?.monthly_trend || []
  const topDeals = overview?.top_deals || []
  const maxTrend = Math.max(...monthlyTrend.map((m) => m.total || 1), 1)

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                padding: '6px 8px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(146, 68, 36, 0.1)',
                color: 'var(--color-rust)',
              }}
            >
              <Wallet size={20} />
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--admin-text-primary)',
                margin: 0,
              }}
            >
              Platform Treasury & Funds Management
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--admin-text-secondary)' }}>
            Real-time platform funds ledger: 5% vehicle sales commissions, showroom parking fees, and financial settlement audits.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchData}
            title="Refresh Ledger"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenReportModal}
          >
            <FileText size={14} />
            Generate Financial Report
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Total Platform Revenue */}
        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)' }}>
              Total Platform Net Revenue
            </span>
            <span
              style={{
                display: 'inline-flex',
                padding: 6,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(146, 68, 36, 0.12)',
                color: 'var(--color-rust)',
              }}
            >
              <Wallet size={18} />
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-rust)', lineHeight: 1.15, marginBottom: 8 }}>
            {formatPeso(wallet.total_revenue)}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-success" style={{ fontSize: 11 }}>
              Gross Volume: {formatPeso(wallet.total_gross_volume)}
            </span>
          </div>
        </div>

        {/* 5% Car Sales Commission */}
        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)' }}>
              Car Sales Commission (5%)
            </span>
            <span
              style={{
                display: 'inline-flex',
                padding: 6,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
              }}
            >
              <Car size={18} />
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, color: '#10b981', lineHeight: 1.15, marginBottom: 8 }}>
            {formatPeso(wallet.car_commissions_total)}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
            Collected from <strong>{wallet.car_deals_count}</strong> completed car deals
          </div>
        </div>

        {/* Showroom Parking Fees */}
        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)' }}>
              Showroom Parking Fees
            </span>
            <span
              style={{
                display: 'inline-flex',
                padding: 6,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#2563eb',
              }}
            >
              <Building2 size={18} />
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.15, marginBottom: 8 }}>
            {formatPeso(wallet.parking_fees_total)}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
            Active placements on <strong>{wallet.parking_bays_count}</strong> showroom floor bays
          </div>
        </div>

        {/* Pending Settlement Escrow */}
        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)' }}>
              Pending Clearing Funds
            </span>
            <span
              style={{
                display: 'inline-flex',
                padding: 6,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#d97706',
              }}
            >
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, color: '#d97706', lineHeight: 1.15, marginBottom: 8 }}>
            {formatPeso(wallet.pending_funds)}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--admin-text-secondary)' }}>
            In-progress deals & pending verification
          </div>
        </div>
      </div>

      {/* Revenue Breakdown & Leaderboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Stream Breakdown & Monthly Trend */}
        <div className="admin-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} className="text-rust" />
              Revenue Stream Breakdown
            </h3>
            <span className="badge badge-rust" style={{ fontSize: 11 }}>
              5% Platform Standard
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stream 1 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--admin-text-primary)' }}>
                  <Car size={15} color="#10b981" />
                  Vehicle Sales Deals Commission (5%)
                </span>
                <span style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                  {formatPeso(wallet.car_commissions_total)} ({wallet.total_revenue > 0 ? Math.round((wallet.car_commissions_total / wallet.total_revenue) * 100) : 0}%)
                </span>
              </div>
              <div style={{ width: '100%', height: 8, backgroundColor: 'var(--admin-bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#10b981',
                    width: `${wallet.total_revenue > 0 ? (wallet.car_commissions_total / wallet.total_revenue) * 100 : 0}%`,
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>

            {/* Stream 2 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--admin-text-primary)' }}>
                  <Building2 size={15} color="#2563eb" />
                  Showroom Parking Placement Fees
                </span>
                <span style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                  {formatPeso(wallet.parking_fees_total)} ({wallet.total_revenue > 0 ? Math.round((wallet.parking_fees_total / wallet.total_revenue) * 100) : 0}%)
                </span>
              </div>
              <div style={{ width: '100%', height: 8, backgroundColor: 'var(--admin-bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#3b82f6',
                    width: `${wallet.total_revenue > 0 ? (wallet.parking_fees_total / wallet.total_revenue) * 100 : 0}%`,
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>

            {/* 6-Month Trend Visual */}
            <div style={{ marginTop: 6, borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                6-Month Revenue History
              </span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60, marginTop: 10 }}>
                {monthlyTrend.map((m, idx) => {
                  const heightPct = Math.max(Math.round((m.total / maxTrend) * 100), 12)
                  const isCurrent = idx === monthlyTrend.length - 1
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <div
                        title={`${m.month}: ${formatPeso(m.total)}`}
                        style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          backgroundColor: isCurrent ? 'var(--color-rust)' : '#cbd5e1',
                          borderRadius: '4px 4px 0 0',
                          transition: 'all 0.2s ease',
                        }}
                      />
                      <span style={{ fontSize: 10, color: isCurrent ? 'var(--color-rust)' : 'var(--admin-text-muted)', fontWeight: isCurrent ? 700 : 500 }}>
                        {m.month.split(' ')[0]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Top Commission Deals Leaderboard */}
        <div className="admin-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} className="text-rust" />
              Top Revenue Vehicle Deals
            </h3>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
              Ranked by 5% platform earnings
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topDeals.length > 0 ? (
              topDeals.map((deal, idx) => (
                <div
                  key={deal.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--admin-bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: idx === 0 ? 'rgba(146, 68, 36, 0.15)' : '#e2e8f0',
                        color: idx === 0 ? 'var(--color-rust)' : 'var(--admin-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {deal.car?.title || deal.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--admin-text-secondary)' }}>
                        Builder: @{deal.seller?.username || 'builder'} · Deal: {formatPeso(deal.gross_amount)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#10b981' }}>
                      +{formatPeso(deal.net_amount)}
                    </div>
                    <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>
                      5% Commission
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                No completed car deals recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card" style={{ padding: 14, marginBottom: 16 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flex: 1, minWidth: 260, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              type="text"
              className="admin-input"
              placeholder="Search TXN #, reference code, vehicle build, or builder username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {/* Stream Filter */}
            <select
              className="admin-select"
              value={streamFilter}
              onChange={(e) => {
                setStreamFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">All Revenue Streams</option>
              <option value="car_sale_commission">5% Car Sales Commission</option>
              <option value="parking_fee">Showroom Parking Fees</option>
            </select>

            {/* Status Filter */}
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed / Settled</option>
              <option value="pending">Pending Clearing</option>
            </select>

            {/* Payment Method Filter */}
            <select
              className="admin-select"
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">All Payment Methods</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>

            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Live Transaction Ledger Table */}
      <div className="table-container" style={{ marginBottom: 20 }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafbfc' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
              Transaction & Commission Ledger
            </h3>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
              Showing {transactions.length} of {totalCount} records
            </span>
          </div>

          <a
            href={adminFundsApi.exportReportCsvUrl({
              stream_type: streamFilter !== 'all' ? streamFilter : undefined,
              status: statusFilter !== 'all' ? statusFilter : undefined,
              search: search.trim() || undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <Download size={13} />
            Export Ledger CSV
          </a>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>TXN # / Date</th>
              <th>Stream & Type</th>
              <th>Vehicle Build / Deal</th>
              <th>Builder / Seller</th>
              <th>Gross Deal</th>
              <th>Rate & Net Earned</th>
              <th>Payment</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--admin-text-muted)' }}>
                    <RefreshCw size={18} className="animate-spin text-rust" />
                    Loading treasury transactions...
                  </div>
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((txn) => {
                const isCarComm = txn.stream_type === 'car_sale_commission'
                const isParking = txn.stream_type === 'parking_fee'

                return (
                  <tr key={txn.id}>
                    {/* TXN & Date */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: 13 }}>
                        {txn.transaction_number}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--admin-text-muted)' }}>
                        {txn.created_at ? new Date(txn.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </div>
                    </td>

                    {/* Stream & Type */}
                    <td>
                      {isCarComm ? (
                        <span className="badge badge-success">
                          <Car size={12} />
                          5% Car Commission
                        </span>
                      ) : isParking ? (
                        <span className="badge badge-info">
                          <Building2 size={12} />
                          Parking Fee
                        </span>
                      ) : (
                        <span className="badge badge-neutral">
                          {txn.stream_type}
                        </span>
                      )}
                    </td>

                    {/* Vehicle Build */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', fontSize: 13.5 }}>
                        {txn.car?.title || txn.title || 'Marketplace Vehicle Deal'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--admin-text-muted)' }}>
                        Ref: {txn.reference_number || txn.payment_reference || 'DEAL-OFFICIAL'}
                      </div>
                    </td>

                    {/* Seller */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {txn.seller?.avatar_url && (
                          <img
                            src={txn.seller.avatar_url}
                            alt=""
                            style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                          @{txn.seller?.username || 'builder'}
                        </span>
                      </div>
                    </td>

                    {/* Gross Amount */}
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--admin-text-secondary)', fontSize: 13.5 }}>
                        {formatPeso(txn.gross_amount)}
                      </span>
                    </td>

                    {/* Net Platform Revenue */}
                    <td>
                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: 14 }}>
                        +{formatPeso(txn.net_amount)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        Rate: {Number(txn.fee_rate).toFixed(1)}%
                      </div>
                    </td>

                    {/* Payment */}
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-primary)' }}>
                        {txn.payment_method || 'BANK'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        {txn.payment_reference || 'VERIFIED'}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      {txn.status === 'completed' || txn.status === 'settled' ? (
                        <span className="badge badge-success">
                          Settled
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedTxn(txn)
                          setReceiptModalOpen(true)
                        }}
                      >
                        <Eye size={12} />
                        Receipt
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--admin-text-muted)' }}>
                  No financial ledger transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--admin-border)' }}>
            <span style={{ fontSize: 12.5, color: 'var(--admin-text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Receipt & Invoice Breakdown Modal */}
      {receiptModalOpen && selectedTxn && (
        <div className="modal-backdrop" onClick={() => setReceiptModalOpen(false)}>
          <div className="modal-dialog" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', padding: 6, borderRadius: 'var(--radius-md)', background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    Treasury Transaction Receipt
                  </h3>
                  <div style={{ fontSize: 11.5, color: 'var(--admin-text-muted)' }}>
                    Ref: {selectedTxn.transaction_number}
                  </div>
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setReceiptModalOpen(false)} style={{ padding: 4, borderRadius: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Stream Type</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {selectedTxn.stream_type === 'car_sale_commission' ? '5% Car Sale Commission' : 'Showroom Parking Placement Fee'}
                  </div>
                </div>
                <div>
                  <span className={`badge ${selectedTxn.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {selectedTxn.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Vehicle & Seller Details */}
              <div style={{ padding: '12px 14px', border: '1px solid var(--admin-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Vehicle & Partner Summary
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: 4 }}>
                  {selectedTxn.car?.title || selectedTxn.title}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--admin-text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div>Builder / Seller: <strong>@{selectedTxn.seller?.username || 'builder'}</strong> ({selectedTxn.seller?.name || 'Accredited Seller'})</div>
                  <div>Buyer / Payer: <strong>{selectedTxn.user?.name || selectedTxn.metadata?.buyer_name || 'Verified Buyer'}</strong></div>
                  <div>Payment Reference: <code>{selectedTxn.payment_reference || 'REF-OFFICIAL'}</code> via {selectedTxn.payment_method?.toUpperCase()}</div>
                </div>
              </div>

              {/* Calculation Ledger */}
              <div style={{ padding: '12px 14px', backgroundColor: '#fafbfc', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                  Commission & Fund Allocation
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--admin-text-secondary)' }}>
                    <span>Gross Vehicle Deal Price:</span>
                    <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{formatPesoDetailed(selectedTxn.gross_amount)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--admin-text-secondary)' }}>
                    <span>Platform Commission Rate:</span>
                    <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{Number(selectedTxn.fee_rate).toFixed(2)}%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', paddingTop: 8, borderTop: '1px dashed var(--admin-border)', fontSize: 14 }}>
                    <span style={{ fontWeight: 800 }}>Platform Revenue Earned:</span>
                    <span style={{ fontWeight: 800 }}>+{formatPesoDetailed(selectedTxn.net_amount)}</span>
                  </div>

                  {selectedTxn.stream_type === 'car_sale_commission' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--admin-text-muted)', fontSize: 12 }}>
                      <span>Seller Net Proceeds:</span>
                      <span>{formatPesoDetailed(Number(selectedTxn.gross_amount) - Number(selectedTxn.net_amount))}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div style={{ fontSize: 11.5, color: 'var(--admin-text-muted)', textAlign: 'center' }}>
                Settled: {selectedTxn.settled_at ? new Date(selectedTxn.settled_at).toLocaleString('en-PH') : 'Pending verification'} · Automated Our Garage Treasury Engine
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReceiptModalOpen(false)}>
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Report Generator Modal */}
      {reportModalOpen && (
        <div className="modal-backdrop" onClick={() => setReportModalOpen(false)}>
          <div className="modal-dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', padding: 6, borderRadius: 'var(--radius-md)', background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
                  <FileText size={20} />
                </span>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    Financial Revenue & Commission Report
                  </h3>
                  <div style={{ fontSize: 11.5, color: 'var(--admin-text-muted)' }}>
                    Generate on-demand audit summaries and export accounting CSV files.
                  </div>
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setReportModalOpen(false)} style={{ padding: 4, borderRadius: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Filter Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Report Period</label>
                  <select
                    className="admin-select"
                    value={reportPeriod}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="today">Today</option>
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_year">This Year</option>
                    <option value="all_time">All Time</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>Revenue Stream</label>
                  <select
                    className="admin-select"
                    value={reportStream}
                    onChange={(e) => handleStreamChange(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="all">All Revenue Streams</option>
                    <option value="car_sale_commission">5% Car Sales Commissions</option>
                    <option value="parking_fee">Showroom Parking Fees</option>
                  </select>
                </div>
              </div>

              {/* Summary Card */}
              {generatingReport ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--admin-text-muted)' }}>
                  <RefreshCw size={24} className="animate-spin text-rust" style={{ margin: '0 auto 8px' }} />
                  Compiling financial performance data...
                </div>
              ) : reportData?.summary ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: '12px 14px', backgroundColor: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Net Platform Revenue</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-rust)', marginTop: 2 }}>
                        {formatPeso(reportData.summary.total_net_revenue)}
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', backgroundColor: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Gross Trade Volume</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: 2 }}>
                        {formatPeso(reportData.summary.total_gross_volume)}
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', backgroundColor: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>5% Car Sales Commission</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                        {formatPeso(reportData.summary.car_commissions_total)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                        {reportData.summary.car_deals_count} vehicle deals
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', backgroundColor: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Showroom Parking Fees</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb', marginTop: 2 }}>
                        {formatPeso(reportData.summary.parking_fees_total)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                        Standard 5% slot placement fee
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', textAlign: 'center' }}>
                    Total <strong>{reportData.summary.total_transactions}</strong> ledger transactions compiled for selected period.
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReportModalOpen(false)}>
                Close
              </button>

              <a
                href={adminFundsApi.exportReportCsvUrl({
                  period: reportPeriod,
                  stream_type: reportStream !== 'all' ? reportStream : undefined,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                <Download size={14} />
                Download Report CSV
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

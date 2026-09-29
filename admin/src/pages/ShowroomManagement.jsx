import { useEffect, useState, useCallback } from 'react'
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Tag,
  Car,
  DollarSign,
  TrendingUp,
  Percent,
  Settings,
  ShieldCheck,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  X,
  CreditCard,
  User,
} from 'lucide-react'
import { adminShowroomApi } from '../api/showroom.js'

function formatPeso(num) {
  if (num === null || num === undefined) return '₱ 0'
  return '₱ ' + Number(num).toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

export default function ShowroomManagement() {
  const [slots, setSlots] = useState([])
  const [stats, setStats] = useState({
    total_applications: 0,
    pending_applications: 0,
    approved_slots: 0,
    total_fees_collected: 0,
    active_showrooms_count: 0,
    cars_on_floor: 0,
    parking_fee_percentage: 5.0,
  })
  const [settings, setSettings] = useState({
    parking_fee_percentage: 5.0,
    min_parking_fee: 5000,
    showroom_enabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | pending | approved | rejected | revoked

  // Settings Edit State
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(null)
  const [calcPreviewPrice, setCalcPreviewPrice] = useState(500000)

  // Modals & Action States
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchShowroomData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.q = search.trim()
      if (statusFilter !== 'all') params.status = statusFilter

      const [resSlots, resSettings] = await Promise.allSettled([
        adminShowroomApi.list(params),
        adminShowroomApi.getSettings(),
      ])

      if (resSlots.status === 'fulfilled' && resSlots.value) {
        setSlots(resSlots.value.data || [])
        if (resSlots.value.stats) {
          setStats(resSlots.value.stats)
        }
      }

      if (resSettings.status === 'fulfilled' && resSettings.value) {
        setSettings({
          parking_fee_percentage: parseFloat(resSettings.value.parking_fee_percentage) || 5.0,
          min_parking_fee: parseFloat(resSettings.value.min_parking_fee) || 5000,
          showroom_enabled: Boolean(resSettings.value.showroom_enabled),
        })
      }
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchShowroomData()
  }, [fetchShowroomData])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchShowroomData()
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsSuccess(null)
    setActionError(null)
    try {
      await adminShowroomApi.updateSettings({
        parking_fee_percentage: parseFloat(settings.parking_fee_percentage),
        min_parking_fee: parseFloat(settings.min_parking_fee),
        showroom_enabled: settings.showroom_enabled,
      })
      setSettingsSuccess('Showroom parking parameters updated successfully!')
      fetchShowroomData()
      setTimeout(() => setSettingsSuccess(null), 4000)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update parking parameters.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleApprove = async (slot) => {
    if (!window.confirm(`Approve Showroom Parking application #${slot.id} for "${slot.car?.title}"?\n\nThis will activate @${slot.seller?.username}'s Showroom access and place the car on the Showroom floor.`)) {
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await adminShowroomApi.approveSlot(slot.id, {
        admin_notes: 'Payment verified and approved for Showroom floor placement.',
      })
      setActionSuccess(res.message || 'Showroom slot approved successfully.')
      fetchShowroomData()
      if (viewModalOpen) setViewModalOpen(false)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to approve showroom slot.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenReject = (slot) => {
    setSelectedSlot(slot)
    setRejectReason('Payment proof unverified or invalid reference code.')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = async (e) => {
    e.preventDefault()
    if (!selectedSlot) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await adminShowroomApi.rejectSlot(selectedSlot.id, {
        admin_notes: rejectReason,
      })
      setActionSuccess(res.message || 'Application rejected.')
      setRejectModalOpen(false)
      fetchShowroomData()
      if (viewModalOpen) setViewModalOpen(false)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to reject slot.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevoke = async (slot) => {
    if (!window.confirm(`Revoke Showroom Parking slot #${slot.id} for "${slot.car?.title}"?\n\nThis will remove the car from the showroom floor.`)) {
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await adminShowroomApi.revokeSlot(slot.id, {
        admin_notes: 'Revoked by admin.',
      })
      setActionSuccess(res.message || 'Showroom slot revoked.')
      fetchShowroomData()
      if (viewModalOpen) setViewModalOpen(false)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to revoke slot.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleSellerShowroom = async (sellerId, currentState) => {
    try {
      await adminShowroomApi.toggleSeller(sellerId, { is_active: !currentState })
      fetchShowroomData()
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to toggle seller showroom.')
    }
  }

  // Calculated Preview
  const previewFee = Math.max(
    settings.min_parking_fee,
    roundTwo(calcPreviewPrice * (settings.parking_fee_percentage / 100)),
  )

  function roundTwo(val) {
    return Math.round((val + Number.EPSILON) * 100) / 100
  }

  return (
    <div>
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
              <Building2 size={20} />
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
              Showroom & Parking Fee Management
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Configure percentage-based parking fees, review seller showroom applications, and control showroom floor access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={fetchShowroomData} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div
          className="admin-card"
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderColor: 'var(--admin-success)',
            background: 'var(--admin-success-bg)',
            color: 'var(--admin-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}
          >
            ×
          </button>
        </div>
      )}

      {actionError && (
        <div
          className="admin-card"
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderColor: 'var(--admin-danger)',
            background: 'var(--admin-danger-bg)',
            color: 'var(--admin-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-rust)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Parking Applications</span>
            <Building2 size={18} style={{ color: 'var(--color-rust)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats.total_applications}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Total requested slots
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Pending Review</span>
            <AlertCircle size={18} style={{ color: 'var(--admin-warning)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats.pending_applications}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Awaiting fee verification
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Active Showrooms</span>
            <ShieldCheck size={18} style={{ color: 'var(--admin-success)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats.active_showrooms_count}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Activated builder garages
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Cars on Floor</span>
            <Car size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats.cars_on_floor}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Approved showroom builds
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Parking Fees Collected</span>
            <DollarSign size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {formatPeso(stats.total_fees_collected)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            {stats.parking_fee_percentage}% fee on approved builds
          </div>
        </div>
      </div>

      {/* Fee Parameter Configuration Card */}
      <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} style={{ color: 'var(--color-rust)' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
              Parking Fee Parameters & Live Rate Control
            </h3>
          </div>
          {settingsSuccess && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={14} />
              <span>{settingsSuccess}</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--admin-text-primary)' }}>
                Parking Fee Percentage (n%):
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  className="admin-input"
                  value={settings.parking_fee_percentage}
                  onChange={(e) => setSettings({ ...settings, parking_fee_percentage: e.target.value })}
                  style={{ paddingRight: 32, fontWeight: 700, fontSize: 15 }}
                />
                <Percent size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--admin-text-primary)' }}>
                Minimum Baseline Fee (₱):
              </label>
              <input
                type="number"
                step="500"
                min="0"
                className="admin-input"
                value={settings.min_parking_fee}
                onChange={(e) => setSettings({ ...settings, min_parking_fee: e.target.value })}
                style={{ fontWeight: 700, fontSize: 15 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--admin-text-primary)' }}>
                Showroom System Status:
              </label>
              <select
                className="admin-input"
                value={settings.showroom_enabled ? 'true' : 'false'}
                onChange={(e) => setSettings({ ...settings, showroom_enabled: e.target.value === 'true' })}
              >
                <option value="true">Enabled (Accepting Slot Applications)</option>
                <option value="false">Paused / Maintenance</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={savingSettings}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, var(--color-rust) 0%, #7b371b 100%)',
                  fontWeight: 700,
                  padding: '10px 18px',
                }}
              >
                {savingSettings ? 'Saving...' : 'Update Fee Parameters'}
              </button>
            </div>
          </div>

          {/* Live Parameter Calculator Preview */}
          <div
            style={{
              marginTop: 18,
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--admin-bg-subtle)',
              border: '1px solid var(--admin-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={16} style={{ color: 'var(--color-rust)' }} />
              <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>
                <strong>Fee Calculation Formula:</strong> If car is listed at <strong>{formatPeso(calcPreviewPrice)}</strong>, parking fee is <strong>{settings.parking_fee_percentage}%</strong> ={' '}
                <strong style={{ color: 'var(--color-rust)', fontSize: 15 }}>{formatPeso(previewFee)}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--admin-text-muted)' }}>
              <span>Test Price:</span>
              <input
                type="number"
                step="50000"
                min="0"
                value={calcPreviewPrice}
                onChange={(e) => setCalcPreviewPrice(parseFloat(e.target.value) || 0)}
                style={{ width: 110, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--admin-border)', fontSize: 12 }}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-card" style={{ padding: 16, marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--admin-text-muted)',
              }}
            />
            <input
              type="text"
              className="admin-input"
              placeholder="Search builder username, vehicle title, or reference code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>

          <div style={{ minWidth: 160 }}>
            <select
              className="admin-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Applications</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved (On Floor)</option>
              <option value="rejected">Rejected</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            <span>Filter</span>
          </button>
        </form>
      </div>

      {/* Applications Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--admin-bg-subtle)', borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>ID / DATE</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>BUILDER / SELLER</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>VEHICLE BUILD</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>CAR PRICE</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>PARKING FEE ({stats.parking_fee_percentage}%)</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>PAYMENT</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>STATUS</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: 32, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                    Loading showroom parking applications...
                  </td>
                </tr>
              ) : slots.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                    No showroom parking slot applications found.
                  </td>
                </tr>
              ) : (
                slots.map((slot) => {
                  const statusBadgeClass =
                    slot.status === 'approved'
                      ? 'badge-success'
                      : slot.status === 'pending'
                      ? 'badge-warning'
                      : 'badge-danger'

                  return (
                    <tr key={slot.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>#{slot.id}</div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          {slot.created_at ? new Date(slot.created_at).toLocaleDateString() : '—'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {slot.seller?.avatar_url ? (
                            <img
                              src={slot.seller.avatar_url}
                              alt={slot.seller.username}
                              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-rust)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                              {slot.seller?.username ? slot.seller.username.charAt(0).toUpperCase() : 'B'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: 13.5 }}>
                              @{slot.seller?.username || 'seller_' + slot.seller_id}
                            </div>
                            <div style={{ fontSize: 11, color: slot.seller?.is_showroom_active ? 'var(--admin-success)' : 'var(--admin-text-muted)' }}>
                              {slot.seller?.is_showroom_active ? '● Showroom Active' : '○ Not Activated'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: 13.5 }}>
                          {slot.car?.title || `Car #${slot.car_id}`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          {slot.car?.year} {slot.car?.brand} {slot.car?.model}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                        {formatPeso(slot.car_price || slot.car?.price)}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--color-rust)', fontSize: 14 }}>
                          {formatPeso(slot.calculated_fee)}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          {slot.fee_percentage}% fee rate
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 12.5 }}>
                        <div style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                          {slot.payment_method}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          {slot.payment_reference ? `Ref: ${slot.payment_reference}` : 'No Ref Code'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${statusBadgeClass}`}>
                          {slot.status.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {slot.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleApprove(slot)}
                                title="Approve & Activate Showroom"
                                style={{ background: 'var(--admin-success)', borderColor: 'var(--admin-success)', padding: '5px 10px', fontSize: 12 }}
                              >
                                <CheckCircle size={14} />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenReject(slot)}
                                title="Reject Application"
                                style={{ color: 'var(--admin-danger)', padding: '5px 8px', fontSize: 12 }}
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}

                          {slot.status === 'approved' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRevoke(slot)}
                              title="Revoke Showroom Slot"
                              style={{ color: 'var(--admin-warning)', padding: '5px 10px', fontSize: 12 }}
                            >
                              <span>Revoke</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedSlot(slot)
                              setViewModalOpen(true)
                            }}
                            title="View Details"
                            style={{ padding: '5px 8px' }}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectModalOpen && selectedSlot && (
        <div className="admin-modal-overlay" onClick={() => setRejectModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Reject Showroom Application #{selectedSlot.id}</h3>
              <button type="button" onClick={() => setRejectModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Rejection Reason / Admin Note:</label>
                <textarea
                  className="admin-input"
                  rows="4"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this parking fee application is rejected..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRejectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ background: 'var(--admin-danger)' }}>
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Slot Details Modal */}
      {viewModalOpen && selectedSlot && (
        <div className="admin-modal-overlay" onClick={() => setViewModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} style={{ color: 'var(--color-rust)' }} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Showroom Slot #{selectedSlot.id} Application Details</h3>
              </div>
              <button type="button" onClick={() => setViewModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ padding: 14, background: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Builder Info</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>@{selectedSlot.seller?.username}</div>
                <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>{selectedSlot.seller?.email}</div>
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleSellerShowroom(selectedSlot.seller_id, selectedSlot.seller?.is_showroom_active)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 12 }}
                  >
                    Toggle Showroom Status ({selectedSlot.seller?.is_showroom_active ? 'Deactivate' : 'Activate'})
                  </button>
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Vehicle Info</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedSlot.car?.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-rust)', fontWeight: 700 }}>{formatPeso(selectedSlot.car_price || selectedSlot.car?.price)}</div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                  Floor Status: {selectedSlot.car?.is_in_showroom ? 'On Showroom Floor' : 'Not on floor'}
                </div>
              </div>
            </div>

            <div style={{ padding: 14, border: '1px solid var(--admin-border)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>Fee & Payment Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center', marginBottom: 10 }}>
                <div style={{ padding: 8, background: 'var(--admin-bg-subtle)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Car Price</div>
                  <div style={{ fontWeight: 700 }}>{formatPeso(selectedSlot.car_price)}</div>
                </div>
                <div style={{ padding: 8, background: 'var(--admin-bg-subtle)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Fee Rate</div>
                  <div style={{ fontWeight: 700 }}>{selectedSlot.fee_percentage}%</div>
                </div>
                <div style={{ padding: 8, background: 'var(--admin-bg-subtle)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Calculated Fee</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-rust)' }}>{formatPeso(selectedSlot.calculated_fee)}</div>
                </div>
              </div>
              <div style={{ fontSize: 13 }}>
                <strong>Payment Method:</strong> {selectedSlot.payment_method?.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <strong>Reference Code:</strong> {selectedSlot.payment_reference || 'None provided'}
              </div>
              {selectedSlot.seller_notes && (
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  <strong>Seller Note:</strong> {selectedSlot.seller_notes}
                </div>
              )}
              {selectedSlot.admin_notes && (
                <div style={{ fontSize: 13, marginTop: 4, color: 'var(--admin-danger)' }}>
                  <strong>Admin Note:</strong> {selectedSlot.admin_notes}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {selectedSlot.status === 'pending' && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => handleOpenReject(selectedSlot)}>
                    Reject
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => handleApprove(selectedSlot)} style={{ background: 'var(--admin-success)' }}>
                    Approve & Activate
                  </button>
                </>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

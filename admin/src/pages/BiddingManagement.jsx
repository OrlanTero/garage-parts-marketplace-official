import { useEffect, useState, useCallback } from 'react'
import {
  Gavel,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Tag,
  AlertCircle,
  Clock,
  Trophy,
  TrendingUp,
  X,
  Calendar,
  Sparkles,
  Award,
  Zap,
  DollarSign,
  Car,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { adminAuctionsApi } from '../api/auctions.js'
import { carsApi } from '../api/cars.js'
import MediaUploadField from '../components/MediaUploadField.jsx'

function formatPeso(num) {
  if (num === null || num === undefined) return '₱ 0'
  return '₱ ' + Number(num).toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

export default function BiddingManagement() {
  const [auctions, setAuctions] = useState([])
  const [stats, setStats] = useState({
    total_auctions: 0,
    active_auctions: 0,
    ended_auctions: 0,
    total_bids_placed: 0,
    total_volume_won: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | upcoming | ended | awarded | cancelled

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedAuction, setSelectedAuction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Form State
  const initialForm = {
    title: '',
    brand: 'Nissan',
    model: 'Skyline GT-R',
    year: new Date().getFullYear(),
    mileage_km: 45000,
    body_style: 'coupe',
    fuel_type: 'petrol',
    transmission: 'manual',
    condition: 'used',
    vin: '',
    color: 'Bayside Blue',
    city: 'Makati',
    location: 'Makati Central Showroom · Bay #1',
    description: '',
    images: [],
    starting_price: 3000000,
    bid_increment: 25000,
    reserve_price: 3500000,
    buy_now_price: 4500000,
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    status: 'active',
    featured: true,
  }

  const [formData, setFormData] = useState(initialForm)

  const fetchAuctions = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.q = search.trim()
      if (statusFilter !== 'all') params.status = statusFilter

      const res = await adminAuctionsApi.list(params)
      setAuctions(res.data || [])
      if (res.stats) {
        setStats(res.stats)
      }
    } catch {
      setAuctions([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchAuctions()
  }

  const handleOpenCreate = () => {
    setFormData(initialForm)
    setActionError(null)
    setCreateModalOpen(true)
  }

  const handleOpenEdit = (auction) => {
    setSelectedAuction(auction)
    setFormData({
      title: auction.title || '',
      brand: auction.brand || '',
      model: auction.model || '',
      year: auction.year || 2022,
      mileage_km: auction.mileage_km || 0,
      body_style: auction.body_style || 'coupe',
      fuel_type: auction.fuel_type || 'petrol',
      transmission: auction.transmission || 'manual',
      condition: auction.condition || 'used',
      vin: auction.vin || '',
      color: auction.color || '',
      city: auction.city || 'Makati',
      location: auction.location || 'Showroom Bay #1',
      description: auction.description || '',
      images: Array.isArray(auction.images) ? auction.images : [],
      starting_price: auction.starting_price || 0,
      bid_increment: auction.bid_increment || 5000,
      reserve_price: auction.reserve_price || '',
      buy_now_price: auction.buy_now_price || '',
      start_time: auction.start_time ? new Date(auction.start_time).toISOString().slice(0, 16) : '',
      end_time: auction.end_time ? new Date(auction.end_time).toISOString().slice(0, 16) : '',
      status: auction.status || 'active',
      featured: Boolean(auction.featured),
      winner_name: auction.winner_name || '',
      winner_email: auction.winner_email || '',
      winner_phone: auction.winner_phone || '',
      winning_bid: auction.winning_bid || '',
    })
    setActionError(null)
    setEditModalOpen(true)
  }

  const handleOpenView = async (auction) => {
    setSelectedAuction(auction)
    setViewModalOpen(true)
    try {
      const res = await adminAuctionsApi.get(auction.id)
      setSelectedAuction(res.data)
    } catch {
      // keep fallback
    }
  }

  const uploadCarFiles = async (files) => {
    if (files.length === 1) {
      const res = await carsApi.uploadMedia(files[0])
      const url = res?.data?.url || res?.url
      return url ? [url] : []
    }
    const res = await carsApi.uploadMultiple(files)
    return (res?.data ?? []).map((m) => m.url).filter(Boolean)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setActionError(null)
    try {
      const payload = {
        title: formData.title || `${formData.year} ${formData.brand} ${formData.model}`,
        brand: formData.brand,
        model: formData.model,
        year: parseInt(formData.year, 10),
        mileage_km: parseInt(formData.mileage_km, 10) || 0,
        body_style: formData.body_style,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        condition: formData.condition,
        vin: formData.vin || undefined,
        color: formData.color,
        city: formData.city,
        location: formData.location,
        description: formData.description,
        images: formData.images,
        starting_price: parseFloat(formData.starting_price) || 0,
        bid_increment: parseFloat(formData.bid_increment) || 5000,
        reserve_price: formData.reserve_price ? parseFloat(formData.reserve_price) : undefined,
        buy_now_price: formData.buy_now_price ? parseFloat(formData.buy_now_price) : undefined,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        status: formData.status,
        featured: formData.featured,
      }

      await adminAuctionsApi.create(payload)
      setActionSuccess(`Auction vehicle "${payload.title}" created and scheduled!`)
      setCreateModalOpen(false)
      fetchAuctions()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to create auction listing.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedAuction) return
    setActionLoading(true)
    setActionError(null)
    try {
      const payload = {
        title: formData.title,
        brand: formData.brand,
        model: formData.model,
        year: parseInt(formData.year, 10),
        mileage_km: parseInt(formData.mileage_km, 10) || 0,
        body_style: formData.body_style,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        condition: formData.condition,
        vin: formData.vin,
        color: formData.color,
        city: formData.city,
        location: formData.location,
        description: formData.description,
        images: formData.images,
        starting_price: parseFloat(formData.starting_price) || 0,
        bid_increment: parseFloat(formData.bid_increment) || 5000,
        reserve_price: formData.reserve_price ? parseFloat(formData.reserve_price) : null,
        buy_now_price: formData.buy_now_price ? parseFloat(formData.buy_now_price) : null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        status: formData.status,
        featured: formData.featured,
        winner_name: formData.winner_name || null,
        winner_email: formData.winner_email || null,
        winner_phone: formData.winner_phone || null,
        winning_bid: formData.winning_bid ? parseFloat(formData.winning_bid) : null,
      }

      await adminAuctionsApi.update(selectedAuction.id, payload)
      setActionSuccess(`Auction #${selectedAuction.id} parameters updated.`)
      setEditModalOpen(false)
      fetchAuctions()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update auction listing.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (auctionId) => {
    if (!window.confirm('Are you sure you want to delete this car auction listing?')) return
    try {
      await adminAuctionsApi.delete(auctionId)
      setActionSuccess('Auction listing deleted.')
      fetchAuctions()
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete auction.')
    }
  }

  const handleEndAuction = async (auction) => {
    if (!window.confirm(`Are you sure you want to manually end and finalize auction "${auction.title}"?`)) return
    try {
      await adminAuctionsApi.end(auction.id)
      setActionSuccess(`Auction "${auction.title}" successfully finalized!`)
      fetchAuctions()
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to finalize auction.')
    }
  }

  const handleExtend = async (auction, minutes) => {
    try {
      await adminAuctionsApi.extend(auction.id, minutes)
      setActionSuccess(`Extended auction timer by ${minutes} minutes.`)
      fetchAuctions()
      if (viewModalOpen) {
        handleOpenView(auction)
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to extend time.')
    }
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
              <Gavel size={20} />
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
              Car Bidding & Auction Control
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Configure live car auctions, starting bids, timer extensions, and winner showcases.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={fetchAuctions} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, var(--color-rust) 0%, #7b371b 100%)',
              color: '#ffffff',
              fontWeight: 700,
              padding: '8px 16px',
              boxShadow: '0 2px 8px rgba(146, 68, 36, 0.25)',
            }}
          >
            <Plus size={16} />
            <span>Schedule New Car Auction</span>
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

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-rust)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Auctions</span>
            <Gavel size={18} style={{ color: 'var(--color-rust)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats.total_auctions || auctions.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            All active & ended listings
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Active Live Auctions</span>
            <Zap size={18} style={{ color: 'var(--admin-success)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats.active_auctions || auctions.filter((a) => a.status === 'active').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Accepting live bids on Home Page
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Winner's Showcase</span>
            <Trophy size={18} style={{ color: 'var(--admin-warning)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats.ended_auctions || auctions.filter((a) => a.status === 'ended' || a.status === 'awarded').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Concluded winning builds
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Volume Won</span>
            <TrendingUp size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {formatPeso(stats.total_volume_won)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Total value of awarded car bids
          </div>
        </div>
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
              placeholder="Search car make, model, VIN, or winner name..."
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
              <option value="all">All Statuses</option>
              <option value="active">Active (Live)</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
              <option value="awarded">Awarded (Winner)</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            <span>Filter</span>
          </button>
        </form>
      </div>

      {/* Auctions Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-rust)' }} />
            <p style={{ margin: 0 }}>Loading auctions and bid logs...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <Gavel size={40} style={{ opacity: 0.3, marginBottom: 12, color: 'var(--color-rust)' }} />
            <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--admin-text-primary)' }}>No car auctions found.</p>
            <p style={{ fontSize: 13, margin: '4px 0 16px' }}>Click below to launch the first car bidding showcase.</p>
            <button type="button" onClick={handleOpenCreate} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add First Car Auction
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vehicle / Build</th>
                  <th>Pricing & Current Bid</th>
                  <th>Bids</th>
                  <th>Timeline / Remaining</th>
                  <th>Leading / Winner</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {auctions.map((auction) => {
                  const img =
                    (Array.isArray(auction.images) && auction.images[0]) ||
                    auction.primary_image ||
                    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=300&q=80'

                  return (
                    <tr key={auction.id}>
                      {/* Vehicle Column */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={img}
                            alt={auction.title}
                            style={{
                              width: 56,
                              height: 42,
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                              border: '1px solid var(--admin-border)',
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: 14 }}>
                              {auction.title}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', gap: 6 }}>
                              <span>{auction.year}</span>
                              <span>•</span>
                              <span>{auction.brand}</span>
                              <span>•</span>
                              <span>{auction.body_style || 'Coupe'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Pricing Column */}
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--color-rust)', fontSize: 14 }}>
                          {formatPeso(auction.current_bid || auction.starting_price)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          Start: {formatPeso(auction.starting_price)} | +{formatPeso(auction.bid_increment)}
                        </div>
                      </td>

                      {/* Total Bids */}
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--admin-bg-subtle)',
                            color: 'var(--admin-text-secondary)',
                            fontSize: 12,
                          }}
                        >
                          {auction.total_bids || 0} bids
                        </span>
                      </td>

                      {/* Timeline */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                          <Clock size={13} style={{ color: 'var(--admin-text-muted)' }} />
                          <span>
                            {auction.is_ended
                              ? 'Ended'
                              : auction.end_time
                              ? new Date(auction.end_time).toLocaleDateString() + ' ' + new Date(auction.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Continuous'}
                          </span>
                        </div>
                      </td>

                      {/* Winner / Leading */}
                      <td>
                        {auction.winner_name ? (
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Trophy size={13} style={{ color: '#d49e1e' }} />
                              {auction.winner_name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                              {formatPeso(auction.winning_bid || auction.current_bid)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No bids yet</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge ${
                            auction.status === 'active'
                              ? 'badge-success'
                              : auction.status === 'ended' || auction.status === 'awarded'
                              ? 'badge-warning'
                              : 'badge-secondary'
                          }`}
                        >
                          {auction.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {/* Timer Extension Shortcut */}
                          {auction.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleExtend(auction, 60)}
                              className="btn btn-secondary btn-sm"
                              title="Extend 1 Hour"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              +1h
                            </button>
                          )}

                          {/* End Auction shortcut */}
                          {auction.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleEndAuction(auction)}
                              className="btn btn-secondary btn-sm"
                              title="End Auction & Finalize Winner"
                              style={{ padding: '4px 8px', fontSize: 11, color: 'var(--admin-warning)' }}
                            >
                              End
                            </button>
                          )}

                          {/* View Bids */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(auction)}
                            className="btn btn-secondary btn-sm"
                            title="View Bid Log"
                            style={{ padding: '6px 8px' }}
                          >
                            <Eye size={14} />
                          </button>

                          {/* Edit Parameters */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(auction)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Parameters"
                            style={{ padding: '6px 8px' }}
                          >
                            <Edit size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(auction.id)}
                            className="btn btn-secondary btn-sm"
                            title="Delete Auction"
                            style={{ padding: '6px 8px', color: 'var(--admin-danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================
          CREATE CAR AUCTION MODAL
          =================================================================== */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 740 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gavel size={20} style={{ color: 'var(--color-rust)' }} />
                <h3 className="modal-title">Schedule New Car Auction</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="modal-body">
              {actionError && (
                <div
                  className="admin-card"
                  style={{
                    padding: '10px 14px',
                    marginBottom: 16,
                    borderColor: 'var(--admin-danger)',
                    background: 'var(--admin-danger-bg)',
                    color: 'var(--admin-danger)',
                    fontSize: 13,
                  }}
                >
                  {actionError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div className="admin-form-group">
                  <label className="admin-label">Auction Title / Build Name *</label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    placeholder="e.g. 1999 Nissan Skyline GT-R V-Spec (R34)"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Year *</label>
                  <input
                    type="number"
                    required
                    className="admin-input"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="admin-form-group">
                  <label className="admin-label">Brand / Make *</label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Model *</label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Mileage (km)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={formData.mileage_km}
                    onChange={(e) => setFormData({ ...formData, mileage_km: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Bidding Core Parameters */}
              <div
                style={{
                  background: 'var(--admin-bg-subtle)',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--admin-border)',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Zap size={16} style={{ color: 'var(--color-rust)' }} />
                  <span style={{ fontWeight: 800, color: 'var(--admin-text-primary)', fontSize: 13, textTransform: 'uppercase' }}>
                    Bidding Rules & Pricing
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label className="admin-label">Starting Price (PHP ₱) *</label>
                    <input
                      type="number"
                      required
                      className="admin-input"
                      value={formData.starting_price}
                      onChange={(e) => setFormData({ ...formData, starting_price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label className="admin-label">Bid Increment (PHP ₱) *</label>
                    <input
                      type="number"
                      required
                      className="admin-input"
                      value={formData.bid_increment}
                      onChange={(e) => setFormData({ ...formData, bid_increment: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label className="admin-label">Reserve Price (Optional)</label>
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="Minimum target price"
                      value={formData.reserve_price}
                      onChange={(e) => setFormData({ ...formData, reserve_price: e.target.value })}
                    />
                  </div>
                  <div className="admin-form-group" style={{ margin: 0 }}>
                    <label className="admin-label">Buy Now Price (Optional)</label>
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="Instant buyout"
                      value={formData.buy_now_price}
                      onChange={(e) => setFormData({ ...formData, buy_now_price: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="admin-form-group">
                  <label className="admin-label">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    className="admin-input"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">End Date & Time</label>
                  <input
                    type="datetime-local"
                    className="admin-input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Vehicle Specifications */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="admin-form-group">
                  <label className="admin-label">Body Style</label>
                  <select
                    className="admin-input"
                    value={formData.body_style}
                    onChange={(e) => setFormData({ ...formData, body_style: e.target.value })}
                  >
                    <option value="coupe">Coupe</option>
                    <option value="sedan">Sedan</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="suv">SUV</option>
                    <option value="convertible">Convertible</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Transmission</label>
                  <select
                    className="admin-input"
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                  >
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                    <option value="dual_clutch">Dual Clutch (DCT)</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Fuel Type</label>
                  <select
                    className="admin-input"
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="electric">Electric</option>
                  </select>
                </div>
              </div>

              {/* Images */}
              <div className="admin-form-group">
                <label className="admin-label">Car Photos & Build Gallery</label>
                <MediaUploadField
                  urls={formData.images}
                  onChange={(images) => setFormData({ ...formData, images })}
                  onUploadFiles={uploadCarFiles}
                  folder="auctions"
                  maxFiles={8}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Description & Build Narrative</label>
                <textarea
                  className="admin-input"
                  rows="3"
                  placeholder="Provide provenance, modifications, dyno numbers, and condition..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  style={{
                    background: 'linear-gradient(135deg, var(--color-rust) 0%, #7b371b 100%)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  <span>{actionLoading ? 'Creating...' : 'Schedule & Publish Auction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          EDIT CAR AUCTION MODAL
          =================================================================== */}
      {editModalOpen && selectedAuction && (
        <div className="modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 740 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit size={20} style={{ color: 'var(--color-rust)' }} />
                <h3 className="modal-title">Edit Auction #{selectedAuction.id} Parameters</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="modal-body">
              {actionError && (
                <div
                  className="admin-card"
                  style={{
                    padding: '10px 14px',
                    marginBottom: 16,
                    borderColor: 'var(--admin-danger)',
                    background: 'var(--admin-danger-bg)',
                    color: 'var(--admin-danger)',
                    fontSize: 13,
                  }}
                >
                  {actionError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div className="admin-form-group">
                  <label className="admin-label">Title</label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Year</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="admin-form-group">
                  <label className="admin-label">Bid Increment (PHP ₱)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={formData.bid_increment}
                    onChange={(e) => setFormData({ ...formData, bid_increment: Number(e.target.value) })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Status</label>
                  <select
                    className="admin-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active (Live)</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ended">Ended</option>
                    <option value="awarded">Awarded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="admin-form-group">
                  <label className="admin-label">Auction End Time</label>
                  <input
                    type="datetime-local"
                    className="admin-input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Winner Name / Alias</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Leave blank or manually specify winner"
                    value={formData.winner_name}
                    onChange={(e) => setFormData({ ...formData, winner_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Description</label>
                <textarea
                  className="admin-input"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Quick Extend Bar */}
              <div
                style={{
                  background: 'var(--admin-bg-subtle)',
                  border: '1px solid var(--admin-border)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: '14px 0',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
                  Quick Extend Timer:
                </span>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleExtend(selectedAuction, 15)}>
                  +15 Mins
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleExtend(selectedAuction, 60)}>
                  +1 Hour
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleExtend(selectedAuction, 1440)}>
                  +24 Hours
                </button>
              </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  style={{
                    background: 'linear-gradient(135deg, var(--color-rust) 0%, #7b371b 100%)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  <span>{actionLoading ? 'Saving...' : 'Save Parameter Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          VIEW BIDS HISTORY MODAL
          =================================================================== */}
      {viewModalOpen && selectedAuction && (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Trophy size={20} style={{ color: '#d49e1e', flexShrink: 0 }} />
                <h3 className="modal-title" style={{ fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Auction Bids Log: {selectedAuction.title}
                </h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setViewModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Summary strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                  background: 'var(--admin-bg-subtle)',
                  border: '1px solid var(--admin-border)',
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Highest Bid
                  </span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-rust)' }}>
                    {formatPeso(selectedAuction.current_bid || selectedAuction.starting_price)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Leading / Winner
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {selectedAuction.winner_name || 'None'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Status
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)', textTransform: 'capitalize' }}>
                    {selectedAuction.status}
                  </div>
                </div>
              </div>

              {/* Bids List */}
              <h4 style={{ color: 'var(--admin-text-primary)', fontSize: 14, margin: '0 0 10px 0', fontWeight: 700 }}>
                Bids History ({selectedAuction.bids?.length || 0})
              </h4>
              {!selectedAuction.bids || selectedAuction.bids.length === 0 ? (
                <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No bids placed on this car yet.</p>
              ) : (
                <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--admin-border)', borderRadius: 'var(--radius-md)' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Bidder</th>
                        <th>Bid Amount</th>
                        <th>Timestamp</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAuction.bids.map((bid, idx) => (
                        <tr key={bid.id || idx}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                              {bid.bidder_name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                              {bid.bidder_email || 'Verified User'}
                            </div>
                          </td>
                          <td style={{ fontWeight: 800, color: idx === 0 ? 'var(--color-rust)' : 'var(--admin-text-primary)' }}>
                            {formatPeso(bid.bid_amount)}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                            {new Date(bid.created_at).toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge ${idx === 0 ? 'badge-success' : 'badge-secondary'}`}>
                              {idx === 0 ? 'Leading' : bid.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
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

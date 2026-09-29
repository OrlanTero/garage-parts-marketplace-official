import { useEffect, useState } from 'react'
import {
  Car,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  Wrench,
  Eye,
  RefreshCw,
  AlertCircle,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  UserCheck,
  FileText,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function ListingModeration() {
  const { user } = useAuth()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending_inspection')
  const [assignmentFilter, setAssignmentFilter] = useState('all') // all | mine | unassigned
  const [staffList, setStaffList] = useState([])
  const [selectedCar, setSelectedCar] = useState(null)
  const [modalMode, setModalMode] = useState(null) // 'schedule' | 'record' | 'reject' | 'preview'
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Form states
  const [scheduleData, setScheduleData] = useState({
    inspection_type: 'garage_dropoff',
    inspection_date: '',
    inspection_location: 'Makati Certified Inspection Bay 1',
    inspector_id: '',
    notes: '',
  })

  const [inspectionData, setInspectionData] = useState({
    passed: true,
    inspection_score: '96/100',
    inspector_notes: 'Chassis, suspension, and engine compression tested and verified within specifications.',
    rejection_reason: '',
  })

  const [rejectReason, setRejectReason] = useState('')

  const fetchCars = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.q = search.trim()
      if (statusFilter !== 'all') params.status = statusFilter
      if (assignmentFilter === 'mine') params.mine = 1
      if (assignmentFilter === 'unassigned') params.unassigned = 1
      const res = await adminApi.getModerationCars(params)
      setCars(res.data || [])
    } catch {
      setCars([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const list = await adminApi.getStaff()
      setStaffList(Array.isArray(list) ? list : [])
    } catch {
      setStaffList([])
    }
  }

  useEffect(() => {
    fetchCars()
  }, [statusFilter, assignmentFilter])

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchCars()
  }

  const handleOpenSchedule = (car) => {
    setSelectedCar(car)
    setScheduleData({
      inspection_type: car.inspection_type || 'garage_dropoff',
      inspection_date: car.inspection_date ? car.inspection_date.substring(0, 16) : new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 16),
      inspection_location: car.inspection_location || 'Makati Certified Inspection Bay 1',
      inspector_id: car.inspector_id ? String(car.inspector_id) : '',
      notes: car.inspector_notes || '',
    })
    setActionError(null)
    setModalMode('schedule')
  }

  const handleOpenRecord = (car) => {
    setSelectedCar(car)
    setInspectionData({
      passed: true,
      inspection_score: car.score || '95/100',
      inspector_notes: car.inspector_notes || 'All safety and mechanical checkpoints validated.',
      rejection_reason: '',
    })
    setActionError(null)
    setModalMode('record')
  }

  const handleOpenReject = (car) => {
    setSelectedCar(car)
    setRejectReason('')
    setActionError(null)
    setModalMode('reject')
  }

  const submitSchedule = async (e) => {
    e.preventDefault()
    if (!selectedCar) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.scheduleInspection(selectedCar.id, {
        ...scheduleData,
        inspector_id: scheduleData.inspector_id ? Number(scheduleData.inspector_id) : undefined,
      })
      setActionSuccess('Inspection successfully scheduled.')
      setModalMode(null)
      fetchCars()
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.response?.data?.errors?.inspector_id?.[0] || 'Failed to schedule inspection.')
    } finally {
      setActionLoading(false)
    }
  }

  const submitRecord = async (e) => {
    e.preventDefault()
    if (!selectedCar) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.recordInspection(selectedCar.id, inspectionData)
      setActionSuccess('Inspection score and checklist recorded.')
      setModalMode(null)
      fetchCars()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to record inspection.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async (car) => {
    if (!window.confirm(`Approve listing "${car.title}" for public marketplace publication?`)) return
    setActionLoading(true)
    try {
      await adminApi.approveCar(car.id)
      setActionSuccess(`Listing "${car.title}" is now active and published.`)
      fetchCars()
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to approve listing.')
    } finally {
      setActionLoading(false)
    }
  }

  const submitReject = async (e) => {
    e.preventDefault()
    if (!selectedCar || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await adminApi.rejectCar(selectedCar.id, rejectReason.trim())
      setActionSuccess(`Listing rejected with feedback to seller.`)
      setModalMode(null)
      fetchCars()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to reject listing.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: '0 0 4px 0' }}>
            Listing Approval & Inspection Moderation
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Mandatory vehicle inspection gatekeeper: schedule garage or on-site inspections, record scores, and approve builds for marketplace publication.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchCars} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--color-emerald)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              type="text"
              placeholder="Search title, brand, VIN, or seller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'pending_inspection', label: 'Pending Inspection' },
            { id: 'inspected', label: 'Inspected (Ready to Approve)' },
            { id: 'active', label: 'Active / Published' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: 'All Listings' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13 }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment filter — inspectors find their own queue here */}
      <div className="admin-card" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <UserCheck size={15} /> Assignee:
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Inspectors' },
            { id: 'mine', label: user ? `Assigned to me (@${user.username || user.name})` : 'Assigned to me' },
            { id: 'unassigned', label: 'Unassigned' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAssignmentFilter(tab.id)}
              className={`btn btn-sm ${assignmentFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13 }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <div>Loading moderation queue...</div>
          </div>
        ) : cars.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <ShieldCheck size={36} style={{ color: 'var(--color-emerald)', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Vehicles in this Queue</h3>
            <p style={{ margin: 0, fontSize: 14 }}>All vehicle builds in this status have been inspected and processed.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vehicle Build</th>
                <th>Seller</th>
                <th>Inspection Mode & Status</th>
                <th>Score</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((car) => {
                const isPending = car.status === 'pending_inspection' || !car.is_approved
                const isInspected = car.status === 'inspected' || car.inspection_status === 'passed'
                const isApproved = car.status === 'active' && car.is_approved

                return (
                  <tr key={car.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {car.primary_image_url ? (
                          <img
                            src={car.primary_image_url}
                            alt={car.title}
                            style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--admin-border-subtle)' }}
                          />
                        ) : (
                          <div style={{ width: 56, height: 42, borderRadius: 6, background: 'var(--admin-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Car size={20} style={{ color: 'var(--admin-text-muted)' }} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{car.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                            {car.year} · {car.brand} {car.model} · VIN: {car.vin || 'N/A'}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>
                            ₱ {Number(car.price || 0).toLocaleString('en-PH')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{car.seller?.name || 'Seller'}</div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{car.seller?.email}</div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {car.inspection_type === 'garage_dropoff' ? (
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Building2 size={12} /> Garage Drop-off
                          </span>
                        ) : car.inspection_type === 'onsite_visit' ? (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} /> On-Site Visit
                          </span>
                        ) : (
                          <span className="badge badge-neutral">Unscheduled</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                        {car.inspection_date ? new Date(car.inspection_date).toLocaleDateString() : 'No date set'}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        {car.inspector ? (
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                            <UserCheck size={11} /> {car.inspector.name || car.inspector.username}
                            {car.inspector_id === user?.id ? ' (you)' : ''}
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-emerald)', fontSize: 14 }}>
                        {car.score || car.inspection_score || 'Pending'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        Status: <span style={{ textTransform: 'capitalize' }}>{car.inspection_status || 'pending'}</span>
                      </div>
                    </td>
                    <td>
                      {isApproved ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> Published
                        </span>
                      ) : isInspected ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={12} /> Inspected
                        </span>
                      ) : car.status === 'rejected' ? (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={12} /> Rejected
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> Under Inspection
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenSchedule(car)}
                          className="btn btn-secondary btn-sm"
                          title="Schedule inspection slot"
                        >
                          <Calendar size={13} />
                          <span>Schedule</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRecord(car)}
                          className="btn btn-secondary btn-sm"
                          title="Record inspector checklist & score"
                        >
                          <Wrench size={13} />
                          <span>Record Score</span>
                        </button>
                        {!isApproved && (
                          <button
                            type="button"
                            onClick={() => handleApprove(car)}
                            className="btn btn-primary btn-sm"
                            style={{ background: 'var(--color-emerald)', borderColor: 'var(--color-emerald)' }}
                            title="Approve and publish to marketplace"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}
                        {car.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleOpenReject(car)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            title="Reject listing"
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Inspection Modal */}
      {modalMode === 'schedule' && selectedCar && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0' }}>Schedule Vehicle Inspection</h2>
            <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 16 }}>
              Designate inspection method and slot for <strong>{selectedCar.title}</strong>.
            </p>
            {actionError && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{actionError}</div>}
            <form onSubmit={submitSchedule}>
              <div style={{ marginBottom: 14 }}>
                <label className="admin-label">Inspection Method</label>
                <select
                  className="admin-input"
                  value={scheduleData.inspection_type}
                  onChange={(e) => setScheduleData({ ...scheduleData, inspection_type: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="garage_dropoff">Garage Drop-off (Seller brings car to Partner Garage)</option>
                  <option value="onsite_visit">On-Site Visit (Mobile inspector visits seller's location)</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="admin-label">Inspection Date & Time</label>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={scheduleData.inspection_date}
                  onChange={(e) => setScheduleData({ ...scheduleData, inspection_date: e.target.value })}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="admin-label">Inspection Location / Garage Bay</label>
                <input
                  type="text"
                  className="admin-input"
                  value={scheduleData.inspection_location}
                  onChange={(e) => setScheduleData({ ...scheduleData, inspection_location: e.target.value })}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="admin-label" style={{ marginBottom: 0 }}>Assign Inspector *</label>
                  {user && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setScheduleData({ ...scheduleData, inspector_id: String(user.id) })}
                    >
                      Assign to me
                    </button>
                  )}
                </div>
                {staffList.length > 0 ? (
                  <select
                    className="admin-input"
                    value={scheduleData.inspector_id}
                    onChange={(e) => setScheduleData({ ...scheduleData, inspector_id: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="">Select inspector…</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (@{s.username}) · {s.role}
                        {typeof s.active_assignments === 'number' ? ` · ${s.active_assignments} active` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    Staff directory unavailable — the scheduling admin will be recorded as inspector.
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="admin-label">Inspector Instructions & Focus Notes</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                  placeholder="e.g. Check turbo manifold, verify chassis stamps, inspect rear sway bar link."
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setModalMode(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Saving...' : 'Confirm Inspection Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Inspection Score Modal */}
      {modalMode === 'record' && selectedCar && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0' }}>Record Inspection Results</h2>
            <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 16 }}>
              Document condition score and structural checklist for <strong>{selectedCar.title}</strong>.
            </p>
            {selectedCar.inspector_id && selectedCar.inspector_id !== user?.id ? (
              <div style={{ fontSize: 12, color: '#b45309', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                Assigned to <strong>{selectedCar.inspector?.name || `#${selectedCar.inspector_id}`}</strong> — recording as an admin override.
              </div>
            ) : selectedCar.inspector_id === user?.id ? (
              <div style={{ fontSize: 12, color: '#047857', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                This inspection is assigned to you.
              </div>
            ) : null}
            {actionError && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{actionError}</div>}
            <form onSubmit={submitRecord}>
              <div style={{ marginBottom: 14 }}>
                <label className="admin-label">Checklist Outcome</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="passed"
                      checked={inspectionData.passed === true}
                      onChange={() => setInspectionData({ ...inspectionData, passed: true, inspection_score: '96/100' })}
                    />
                    <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>Passed & Roadworthy</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="passed"
                      checked={inspectionData.passed === false}
                      onChange={() => setInspectionData({ ...inspectionData, passed: false, inspection_score: '52/100' })}
                    />
                    <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Failed Checkpoints</span>
                  </label>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="admin-label">Condition Score (e.g. 96/100)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={inspectionData.inspection_score}
                  onChange={(e) => setInspectionData({ ...inspectionData, inspection_score: e.target.value })}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="admin-label">Mechanical & Safety Evaluation Notes</label>
                <textarea
                  className="admin-input"
                  rows={4}
                  value={inspectionData.inspector_notes}
                  onChange={(e) => setInspectionData({ ...inspectionData, inspector_notes: e.target.value })}
                  placeholder="Document chassis alignment, rust check, ECU errors, brake disc wear, and paint depth."
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setModalMode(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Recording...' : 'Submit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {modalMode === 'reject' && selectedCar && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', color: 'var(--color-danger)' }}>
              Reject Vehicle Listing
            </h2>
            <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 16 }}>
              Provide clear feedback to the seller regarding why <strong>{selectedCar.title}</strong> cannot be approved.
            </p>
            {actionError && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{actionError}</div>}
            <form onSubmit={submitReject}>
              <div style={{ marginBottom: 18 }}>
                <label className="admin-label">Rejection Reason</label>
                <textarea
                  className="admin-input"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Incomplete documentation, failed roadworthiness brake test, or structural chassis damage."
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setModalMode(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-danger">
                  {actionLoading ? 'Rejecting...' : 'Reject Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

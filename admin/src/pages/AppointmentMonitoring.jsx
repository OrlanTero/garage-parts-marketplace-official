import { useEffect, useState } from 'react'
import {
  Calendar,
  Search,
  Filter,
  Building2,
  MapPin,
  Clock,
  User,
  Car,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  X,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function AppointmentMonitoring() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'garage_dropoff' | 'onsite_visit'
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'scheduled' | 'passed' | 'failed'
  const [assignmentFilter, setAssignmentFilter] = useState('all') // 'all' | 'mine' | 'unassigned'
  const [staffList, setStaffList] = useState([])
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignId, setAssignId] = useState('')
  const [recordTarget, setRecordTarget] = useState(null)
  const [recordForm, setRecordForm] = useState({ passed: true, inspection_score: '96/100', inspector_notes: '' })
  const [acting, setActing] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAppointments({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        mine: assignmentFilter === 'mine' ? 1 : undefined,
        unassigned: assignmentFilter === 'unassigned' ? 1 : undefined,
      })
      setAppointments(res.data || [])
    } catch {
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      setStaffList((await adminApi.getStaff()) || [])
    } catch {
      setStaffList([])
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [typeFilter, statusFilter, assignmentFilter])

  useEffect(() => {
    fetchStaff()
  }, [])

  const openAssign = (item) => {
    setAssignTarget(item)
    setAssignId(item.inspector_id ? String(item.inspector_id) : '')
    setActionError(null)
  }

  const submitAssign = async (e) => {
    e.preventDefault()
    if (!assignTarget || !assignId) return
    setActing(`assign-${assignTarget.car_id}`)
    setActionError(null)
    try {
      await adminApi.scheduleInspection(assignTarget.car_id, {
        inspection_type: assignTarget.inspection_type || 'garage_dropoff',
        inspection_date: assignTarget.inspection_date || undefined,
        inspection_location: assignTarget.inspection_location || undefined,
        inspector_id: Number(assignId),
      })
      setActionSuccess(`Inspector assigned to "${assignTarget.car_title}".`)
      setAssignTarget(null)
      fetchAppointments()
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.response?.data?.errors?.inspector_id?.[0] || 'Failed to assign inspector.')
    } finally {
      setActing(null)
    }
  }

  const openRecord = (item) => {
    setRecordTarget(item)
    setRecordForm({ passed: true, inspection_score: item.inspection_score || '96/100', inspector_notes: item.inspector_notes || '' })
    setActionError(null)
  }

  const submitRecord = async (e) => {
    e.preventDefault()
    if (!recordTarget) return
    setActing(`record-${recordTarget.car_id}`)
    setActionError(null)
    try {
      await adminApi.recordInspection(recordTarget.car_id, recordForm)
      setActionSuccess(`Inspection recorded for "${recordTarget.car_title}".`)
      setRecordTarget(null)
      fetchAppointments()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to record inspection. Only the assigned inspector (or an admin) can record it.')
    } finally {
      setActing(null)
    }
  }

  const handleApprove = async (item) => {
    if (!window.confirm(`Approve "${item.car_title}" for marketplace publication?`)) return
    setActing(`approve-${item.car_id}`)
    setActionError(null)
    try {
      await adminApi.approveCar(item.car_id)
      setActionSuccess(`"${item.car_title}" approved and published.`)
      fetchAppointments()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to approve listing.')
    } finally {
      setActing(null)
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: '0 0 4px 0' }}>
            Inspection Appointment Monitoring
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Track scheduled vehicle inspections across Partner Garages (Drop-offs) and Mobile On-Site Inspector visits.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchAppointments} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted)', marginRight: 4 }}>Inspection Method:</span>
          {[
            { id: 'all', label: 'All Modes' },
            { id: 'garage_dropoff', label: 'Garage Drop-offs', icon: Building2 },
            { id: 'onsite_visit', label: 'Mobile On-site Visits', icon: MapPin },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`btn btn-sm ${typeFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13 }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted)', marginRight: 4 }}>Status:</span>
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'scheduled', label: 'Upcoming / Scheduled' },
            { id: 'passed', label: 'Passed' },
            { id: 'failed', label: 'Failed' },
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

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted)', marginRight: 4 }}>Assignee:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'mine', label: 'My Assignments' },
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

      {actionSuccess && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--color-emerald)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {actionError && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Appointments Grid / List */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <div>Loading appointments...</div>
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <Calendar size={36} style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Appointments Found</h3>
            <p style={{ margin: 0, fontSize: 14 }}>There are no vehicle inspections matching the selected filters.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
                <tr>
                  <th>Appointment Date & Time</th>
                  <th>Inspection Method & Location</th>
                  <th>Vehicle Build</th>
                  <th>Seller</th>
                  <th>Assigned Inspector</th>
                  <th>Status & Score</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
            </thead>
            <tbody>
              {appointments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                      {item.inspection_date ? new Date(item.inspection_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Date'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {item.inspection_date ? new Date(item.inspection_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unscheduled'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {item.inspection_type === 'garage_dropoff' ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={12} /> Garage Drop-off
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> On-Site Visit
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', fontWeight: 500 }}>
                      {item.inspection_location || 'Designated Inspection Station'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.primary_image_url ? (
                        <img
                          src={item.primary_image_url}
                          alt={item.car_title}
                          style={{ width: 44, height: 34, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--admin-border-subtle)' }}
                        />
                      ) : (
                        <div style={{ width: 44, height: 34, borderRadius: 4, background: 'var(--admin-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Car size={16} style={{ color: 'var(--admin-text-muted)' }} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--admin-text-primary)' }}>{item.car_title}</div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>VIN: {item.vin || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{item.seller_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{item.seller_email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{item.inspector_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Inspector ID: #{item.inspector_id || 'Auto'}</div>
                  </td>
                  <td>
                    <div>
                      {item.inspection_status === 'passed' ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> Passed ({item.inspection_score || '95/100'})
                        </span>
                      ) : item.inspection_status === 'failed' ? (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={12} /> Failed ({item.inspection_score || '50/100'})
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> Scheduled
                        </span>
                      )}
                    </div>
                    {item.inspector_notes && (
                      <div style={{ fontSize: 11, color: 'var(--admin-text-secondary)', marginTop: 4, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.inspector_notes}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => openAssign(item)}
                        className="btn btn-secondary btn-sm"
                        title={item.inspector_id ? 'Reassign inspector' : 'Assign inspector'}
                      >
                        <User size={13} />
                        <span>{item.inspector_id ? 'Reassign' : 'Assign'}</span>
                      </button>
                      {item.inspection_status !== 'passed' && item.inspection_status !== 'failed' && (
                        <button
                          type="button"
                          onClick={() => openRecord(item)}
                          className="btn btn-secondary btn-sm"
                          title="Record score & pass/fail"
                        >
                          <ShieldCheck size={13} />
                          <span>Record</span>
                        </button>
                      )}
                      {item.inspection_status === 'passed' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          disabled={acting === `approve-${item.car_id}`}
                          className="btn btn-primary btn-sm"
                          title="Approve and publish listing"
                        >
                          <CheckCircle2 size={13} />
                          <span>Approve</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assign Inspector Modal */}
      {assignTarget && (
        <div className="modal-backdrop" onClick={() => setAssignTarget(null)}>
          <div className="modal-container" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Inspector</h3>
              <button type="button" className="modal-close" onClick={() => setAssignTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitAssign}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '0 0 16px 0' }}>
                  {assignTarget.car_title} · {assignTarget.inspection_type === 'onsite_visit' ? 'On-Site Visit' : 'Garage Drop-off'}
                </p>
                {actionError && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{actionError}</div>}
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Inspector *</label>
                  {staffList.length > 0 ? (
                    <select
                      className="admin-input"
                      value={assignId}
                      onChange={(e) => setAssignId(e.target.value)}
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
                      Staff directory unavailable to your role — assignment is restricted to dispatchers.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                {user && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAssignId(String(user.id))}
                  >
                    Assign to me
                  </button>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setAssignTarget(null)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" disabled={acting === `assign-${assignTarget.car_id}`} className="btn btn-primary">
                    {acting === `assign-${assignTarget.car_id}` ? 'Saving...' : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Inspection Modal */}
      {recordTarget && (
        <div className="modal-backdrop" onClick={() => setRecordTarget(null)}>
          <div className="modal-container" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Inspection Results</h3>
              <button type="button" className="modal-close" onClick={() => setRecordTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitRecord}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '0 0 16px 0' }}>
                  {recordTarget.car_title} · VIN: {recordTarget.vin || 'N/A'}
                </p>
                {actionError && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{actionError}</div>}
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Checklist Outcome</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input
                        type="radio"
                        checked={recordForm.passed === true}
                        onChange={() => setRecordForm({ ...recordForm, passed: true })}
                      />
                      Passed
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                      <input
                        type="radio"
                        checked={recordForm.passed === false}
                        onChange={() => setRecordForm({ ...recordForm, passed: false })}
                      />
                      Failed
                    </label>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Inspection Score</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={recordForm.inspection_score}
                    onChange={(e) => setRecordForm({ ...recordForm, inspection_score: e.target.value })}
                    style={{ width: '100%' }}
                    placeholder="e.g. 96/100"
                  />
                </div>
                <div>
                  <label className="admin-label">Inspector Notes</label>
                  <textarea
                    className="admin-input"
                    rows={3}
                    value={recordForm.inspector_notes}
                    onChange={(e) => setRecordForm({ ...recordForm, inspector_notes: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setRecordTarget(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={acting === `record-${recordTarget.car_id}`} className="btn btn-primary">
                  {acting === `record-${recordTarget.car_id}` ? 'Saving...' : 'Save Results'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

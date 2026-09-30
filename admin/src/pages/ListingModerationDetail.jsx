import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Wrench,
  XCircle,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'
import { useAuth } from '../auth/AuthContext.jsx'

function statusBadge(car) {
  const isApproved = car.status === 'active' && car.is_approved
  const isInspected = car.status === 'inspected' || car.inspection_status === 'passed'
  if (isApproved) return { label: 'Published', cls: 'badge-success', Icon: CheckCircle2 }
  if (isInspected) return { label: 'Inspected', cls: 'badge-info', Icon: ShieldCheck }
  if (car.status === 'rejected') return { label: 'Rejected', cls: 'badge-danger', Icon: XCircle }
  return { label: 'Under Inspection', cls: 'badge-warning', Icon: Clock }
}

function Spec({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--admin-text-muted)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

/**
 * Dedicated review page for one moderation listing — gallery, full specs,
 * seller, and inspection state on one screen, with the same working
 * approve / schedule / record / reject actions as the queue.
 */
export default function ListingModerationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [panel, setPanel] = useState(null) // 'schedule' | 'record' | 'reject' | null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [staffList, setStaffList] = useState([])
  const [activeImg, setActiveImg] = useState(0)

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
    inspector_notes: '',
    rejection_reason: '',
  })
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const data = await adminApi.getModerationCar(id)
      setCar(data)
      setActiveImg(0)
      setScheduleData({
        inspection_type: data.inspection_type || 'garage_dropoff',
        inspection_date: data.inspection_date
          ? String(data.inspection_date).substring(0, 16)
          : new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 16),
        inspection_location: data.inspection_location || 'Makati Certified Inspection Bay 1',
        inspector_id: data.inspector_id ? String(data.inspector_id) : '',
        notes: data.inspector_notes || '',
      })
      setInspectionData((prev) => ({
        ...prev,
        inspection_score: data.score || data.inspection_score || '96/100',
        inspector_notes: data.inspector_notes || prev.inspector_notes,
      }))
    } catch (err) {
      setFetchError(err?.response?.data?.message || 'Could not load this listing.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    adminApi.getStaff().then((list) => setStaffList(Array.isArray(list) ? list : [])).catch(() => setStaffList([]))
  }, [])

  const runAction = async (fn, okMsg) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      setNotice(okMsg)
      setPanel(null)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ marginBottom: 12 }} />
        <div>Loading listing review…</div>
      </div>
    )
  }

  if (fetchError || !car) {
    return (
      <div>
        <button type="button" onClick={() => navigate('/moderation')} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to queue
        </button>
        <div className="admin-card" style={{ padding: 32, textAlign: 'center', color: 'var(--admin-danger)' }}>
          {fetchError || 'Listing not found.'}
        </div>
      </div>
    )
  }

  const badge = statusBadge(car)
  const BadgeIcon = badge.Icon
  const images = Array.isArray(car.media) && car.media.length > 0
    ? car.media.filter((m) => (m.type || 'image') === 'image')
    : []
  if (car.primary_image_url && !images.some((m) => m.url === car.primary_image_url)) {
    images.unshift({ id: 'primary', url: car.primary_image_url })
  }
  const isApproved = car.status === 'active' && car.is_approved

  return (
    <div className="mod-detail">
      <button type="button" onClick={() => navigate('/moderation')} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to moderation queue
      </button>

      {notice && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-success)', background: 'var(--admin-success-bg)', color: 'var(--admin-success)', fontWeight: 600, fontSize: 14 }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-danger)', background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', fontWeight: 600, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Title + status + actions */}
      <div className="admin-card mod-detail-head">
        <div className="mod-detail-title">
          <h1>{car.title}</h1>
          <p>{[car.year, car.brand, car.model].filter(Boolean).join(' · ')}{car.vin ? ` · VIN ${car.vin}` : ''}</p>
          <div className="mod-detail-price">₱ {Number(car.price || 0).toLocaleString('en-PH')}</div>
        </div>
        <div className="mod-detail-side">
          <span className={`badge ${badge.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <BadgeIcon size={12} /> {badge.label}
          </span>
          <div className="mod-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPanel(panel === 'schedule' ? null : 'schedule')}>
              <Calendar size={13} /> <span>Schedule</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPanel(panel === 'record' ? null : 'record')}>
              <Wrench size={13} /> <span>Record score</span>
            </button>
            {!isApproved && (
              <button
                type="button"
                className="btn btn-success btn-sm"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Approve "${car.title}" for public marketplace publication?`)) return
                  runAction(() => adminApi.approveCar(car.id), `"${car.title}" is now active and published.`)
                }}
              >
                <CheckCircle2 size={13} /> <span>Approve</span>
              </button>
            )}
            {car.status !== 'rejected' && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setPanel(panel === 'reject' ? null : 'reject')}>
                <XCircle size={13} /> <span>Reject</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline action panels */}
      {panel === 'schedule' && (
        <form
          className="admin-card mod-panel"
          onSubmit={(e) => {
            e.preventDefault()
            runAction(
              () => adminApi.scheduleInspection(car.id, {
                ...scheduleData,
                inspector_id: scheduleData.inspector_id ? Number(scheduleData.inspector_id) : undefined,
              }),
              'Inspection successfully scheduled.',
            )
          }}
        >
          <h3>Schedule vehicle inspection</h3>
          <div className="mod-grid">
            <div>
              <label className="admin-label">Inspection method</label>
              <select className="admin-input" value={scheduleData.inspection_type} onChange={(e) => setScheduleData({ ...scheduleData, inspection_type: e.target.value })}>
                <option value="garage_dropoff">Garage drop-off</option>
                <option value="onsite_visit">On-site visit</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Date & time</label>
              <input type="datetime-local" className="admin-input" value={scheduleData.inspection_date} onChange={(e) => setScheduleData({ ...scheduleData, inspection_date: e.target.value })} required />
            </div>
            <div>
              <label className="admin-label">Location / bay</label>
              <input type="text" className="admin-input" value={scheduleData.inspection_location} onChange={(e) => setScheduleData({ ...scheduleData, inspection_location: e.target.value })} required />
            </div>
            <div>
              <label className="admin-label">Inspector</label>
              <select className="admin-input" value={scheduleData.inspector_id} onChange={(e) => setScheduleData({ ...scheduleData, inspector_id: e.target.value })} required>
                <option value="">Select inspector…</option>
                {user && <option value={user.id}>Me ({user.name})</option>}
                {staffList.filter((s) => String(s.id) !== String(user?.id)).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (@{s.username}) · {s.role}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="admin-label">Focus notes</label>
          <textarea className="admin-input" rows={3} value={scheduleData.notes} onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })} placeholder="e.g. Check turbo manifold, verify chassis stamps." />
          <div className="mod-panel-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setPanel(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Confirm slot'}</button>
          </div>
        </form>
      )}

      {panel === 'record' && (
        <form
          className="admin-card mod-panel"
          onSubmit={(e) => {
            e.preventDefault()
            runAction(() => adminApi.recordInspection(car.id, inspectionData), 'Inspection score and checklist recorded.')
          }}
        >
          <h3>Record inspection results</h3>
          <div className="mod-radio-row">
            <label>
              <input type="radio" name="passed" checked={inspectionData.passed === true} onChange={() => setInspectionData({ ...inspectionData, passed: true, inspection_score: '96/100' })} />
              <span className="mod-pass">Passed & roadworthy</span>
            </label>
            <label>
              <input type="radio" name="passed" checked={inspectionData.passed === false} onChange={() => setInspectionData({ ...inspectionData, passed: false, inspection_score: '52/100' })} />
              <span className="mod-fail">Failed checkpoints</span>
            </label>
          </div>
          <div className="mod-grid">
            <div>
              <label className="admin-label">Condition score (e.g. 96/100)</label>
              <input type="text" className="admin-input" value={inspectionData.inspection_score} onChange={(e) => setInspectionData({ ...inspectionData, inspection_score: e.target.value })} required />
            </div>
          </div>
          <label className="admin-label">Mechanical & safety notes</label>
          <textarea className="admin-input" rows={4} value={inspectionData.inspector_notes} onChange={(e) => setInspectionData({ ...inspectionData, inspector_notes: e.target.value })} required />
          <div className="mod-panel-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setPanel(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Recording…' : 'Submit evaluation'}</button>
          </div>
        </form>
      )}

      {panel === 'reject' && (
        <form
          className="admin-card mod-panel"
          onSubmit={(e) => {
            e.preventDefault()
            if (!rejectReason.trim()) return
            runAction(() => adminApi.rejectCar(car.id, rejectReason.trim()), 'Listing rejected with feedback to seller.')
          }}
        >
          <h3 className="mod-danger-title">Reject vehicle listing</h3>
          <p className="mod-muted">Clear feedback helps the seller fix and resubmit.</p>
          <label className="admin-label">Rejection reason</label>
          <textarea className="admin-input" rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Incomplete documentation, failed brake test, structural damage." required />
          <div className="mod-panel-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setPanel(null)}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={busy}>{busy ? 'Rejecting…' : 'Reject listing'}</button>
          </div>
        </form>
      )}

      {/* Gallery + facts */}
      <div className="mod-cols">
        <div className="admin-card mod-gallery-card">
          {images.length > 0 ? (
            <>
              <img src={images[Math.min(activeImg, images.length - 1)].url} alt={car.title} className="mod-main-img" />
              {images.length > 1 && (
                <div className="mod-thumbs">
                  {images.slice(0, 8).map((m, i) => (
                    <button key={m.id ?? i} type="button" className={`mod-thumb ${i === activeImg ? 'is-active' : ''}`} onClick={() => setActiveImg(i)}>
                      <img src={m.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mod-noimg"><Car size={40} /></div>
          )}
        </div>

        <div className="admin-card">
          <h3 className="mod-card-title">Build sheet</h3>
          <div className="mod-grid">
            <Spec label="Year" value={car.year} />
            <Spec label="Brand" value={car.brand} />
            <Spec label="Model" value={car.model} />
            <Spec label="VIN" value={car.vin || 'N/A'} />
            <Spec label="Mileage" value={car.mileage_km != null ? `${Number(car.mileage_km).toLocaleString()} km` : '—'} />
            <Spec label="Transmission" value={car.transmission} />
            <Spec label="Fuel" value={car.fuel_type} />
            <Spec label="Body style" value={car.body_style} />
            <Spec label="City" value={car.city} />
            <Spec label="Price" value={car.price != null ? `₱ ${Number(car.price).toLocaleString('en-PH')}` : '—'} />
          </div>
          {car.description && <p className="mod-desc">{car.description}</p>}
        </div>
      </div>

      {/* Seller + inspection */}
      <div className="mod-cols">
        <div className="admin-card">
          <h3 className="mod-card-title">Seller</h3>
          <div className="mod-seller">
            <div className="mod-seller-avatar">{(car.seller?.name || 'S').charAt(0).toUpperCase()}</div>
            <div>
              <div className="mod-seller-name">{car.seller?.name || 'Seller'}</div>
              <div className="mod-muted">{car.seller?.email}</div>
              {car.seller?.phone && <div className="mod-muted">{car.seller.phone}</div>}
              {car.seller?.role && <span className="badge badge-neutral" style={{ marginTop: 6 }}>{car.seller.role}</span>}
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h3 className="mod-card-title">Inspection state</h3>
          <div className="mod-grid">
            <Spec label="Mode" value={car.inspection_type === 'garage_dropoff' ? 'Garage drop-off' : car.inspection_type === 'onsite_visit' ? 'On-site visit' : 'Unscheduled'} />
            <Spec label="Date" value={car.inspection_date ? new Date(car.inspection_date).toLocaleString() : 'No date set'} />
            <Spec label="Location" value={car.inspection_location || '—'} />
            <Spec
              label="Inspector"
              value={car.inspector ? `${car.inspector.name || car.inspector.username}${String(car.inspector_id) === String(user?.id) ? ' (you)' : ''}` : 'Unassigned'}
            />
            <Spec label="Score" value={car.score || car.inspection_score || 'Pending'} />
            <Spec label="Result" value={car.inspection_status ? String(car.inspection_status).replace('_', ' ') : 'pending'} />
          </div>
          {(car.inspector_notes || car.rejection_reason) && (
            <div className="mod-notes">
              {car.inspector_notes && (<><strong>Inspector notes:</strong><p>{car.inspector_notes}</p></>)}
              {car.rejection_reason && (<><strong>Rejection reason:</strong><p>{car.rejection_reason}</p></>)}
            </div>
          )}
          {car.approver && (
            <p className="mod-muted" style={{ marginTop: 10 }}>Approved by {car.approver.name || car.approver.username}</p>
          )}
        </div>
      </div>

      <div className="mod-footnote">
        <MapPin size={13} />Reviewed in the moderation workspace — actions notify the seller automatically.
      </div>
    </div>
  )
}

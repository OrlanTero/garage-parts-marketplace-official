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
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

export default function AppointmentMonitoring() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'garage_dropoff' | 'onsite_visit'
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'scheduled' | 'passed' | 'failed'

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAppointments({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setAppointments(res.data || [])
    } catch {
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [typeFilter, statusFilter])

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
      </div>

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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

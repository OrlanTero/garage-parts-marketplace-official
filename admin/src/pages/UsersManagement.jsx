import { useEffect, useState } from 'react'
import {
  Users,
  Search,
  Shield,
  UserCheck,
  Mail,
  ShieldAlert,
  RefreshCw,
  Edit,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Key,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

export default function UsersManagement({ initialRole = 'staff_admin', title = 'Admin Users & Permissions' }) {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState(initialRole)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newRole, setNewRole] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        q: search.trim() || undefined,
      })
      setUsers(res.data || [])
      setStats(res.stats || null)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleOpenEdit = (user) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setActionError(null)
    setModalOpen(true)
  }

  const handleUpdateRole = async (e) => {
    e.preventDefault()
    if (!selectedUser || !newRole) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.updateUserRole(selectedUser.id, newRole)
      setActionSuccess(`Role clearance updated to ${newRole} for ${selectedUser.name}.`)
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update user role.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--admin-danger)' }}>
              <Shield size={20} />
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              {title}
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Configure Super Admin, Marketplace Admin, and Inspector role clearances across the Three-Tier RBAC platform.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchUsers} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh Staff</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--color-emerald)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Super Admins</span>
            <ShieldAlert size={18} style={{ color: 'var(--admin-danger)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.super_admins ?? users.filter(u => u.role === 'super_admin').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Full system & financial authority
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Marketplace Admins</span>
            <Shield size={18} style={{ color: 'var(--admin-warning)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.admins ?? users.filter(u => u.role === 'admin').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Moderation & daily operations
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Master Inspectors</span>
            <UserCheck size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.inspectors ?? users.filter(u => u.role === 'inspector').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Field inspection & verification
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-rust)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total RBAC Personnel</span>
            <Key size={18} style={{ color: 'var(--color-rust)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.total_count ?? users.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Active privileged staff members
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              type="text"
              placeholder="Search staff name or email..."
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
            { id: 'staff_admin', label: 'All Staff & Admins' },
            { id: 'super_admin', label: 'Super Admins' },
            { id: 'admin', label: 'Admins' },
            { id: 'inspector', label: 'Inspectors' },
            { id: 'all', label: 'All Platform Accounts' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`btn btn-sm ${roleFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13 }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <div>Loading accounts...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <Users size={36} style={{ color: 'var(--admin-text-muted)', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Users Found</h3>
            <p style={{ margin: 0, fontSize: 14 }}>No accounts matched your search or role filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Role & Clearance Level</th>
                <th>Privileges & Responsibilities</th>
                <th>Verification</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSuperAdmin = u.role === 'super_admin'
                const isAdmin = u.role === 'admin'
                const isInspector = u.role === 'inspector'
                const isDealer = u.role === 'dealer'
                const isSeller = u.role === 'seller'
                const isParts = u.role === 'parts_seller'

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.name}
                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--admin-border)' }}
                          />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--admin-bg-subtle)', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            {u.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{u.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 400 }}>
                              (@{u.username || 'user'})
                            </span>
                            {u.is_kyc_verified && (
                              <ShieldCheck size={14} style={{ color: '#10b981' }} title="KYC Verified User" />
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={11} /> {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isSuperAdmin ? (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ShieldAlert size={12} /> Super Admin
                        </span>
                      ) : isAdmin ? (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Shield size={12} /> Marketplace Admin
                        </span>
                      ) : isInspector ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={12} /> Master Inspector
                        </span>
                      ) : isDealer ? (
                        <span className="badge badge-info">Dealer</span>
                      ) : isParts ? (
                        <span className="badge badge-neutral">Parts Seller / Garage</span>
                      ) : isSeller ? (
                        <span className="badge badge-neutral">Car Builder</span>
                      ) : (
                        <span className="badge badge-neutral">Buyer</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                        {isSuperAdmin ? (
                          <span>Global clearance: Database, RBAC, Platform Finance, Settings</span>
                        ) : isAdmin ? (
                          <span>Operations clearance: Moderation, Orders, Appointments, Chat PII</span>
                        ) : isInspector ? (
                          <span>Technical clearance: Vehicle inspection checklists, Score logging</span>
                        ) : (
                          <span>Standard marketplace permissions</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {u.verified ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                          <CheckCircle2 size={11} /> Verified
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                          <Clock size={11} /> Unverified
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(u)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Edit size={12} />
                        <span>Edit Role</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {modalOpen && selectedUser && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Role & Clearance</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateRole}>
              <div className="modal-body" style={{ padding: 24 }}>
                <p style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--admin-text-secondary)' }}>
                  Update permissions for <strong>{selectedUser.name}</strong> ({selectedUser.email}).
                </p>
                {actionError && (
                  <div style={{ color: 'var(--admin-danger)', background: 'var(--admin-danger-bg)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 16 }}>
                    {actionError}
                  </div>
                )}
                <div style={{ marginBottom: 18 }}>
                  <label className="admin-label">Role Clearance Level</label>
                  <select
                    className="admin-input"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <optgroup label="Staff & Administrative Clearance (Three-Tier RBAC)">
                      <option value="super_admin">Super Admin (Full System & Financial Authority)</option>
                      <option value="admin">Admin (Marketplace, Orders & Chat Moderation)</option>
                      <option value="inspector">Inspector / Staff (Inspection Logging & Appointments)</option>
                    </optgroup>
                    <optgroup label="Marketplace Accounts">
                      <option value="dealer">Dealer (Cars & Parts Inventory Pre-Approved)</option>
                      <option value="parts_seller">Parts Seller / Garage (Car Parts & Accessories)</option>
                      <option value="seller">Seller (Car Builds & Vehicles Only)</option>
                      <option value="buyer">Buyer (Browsing, Ordering & Messaging)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Updating...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

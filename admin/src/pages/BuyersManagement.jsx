import { useEffect, useState } from 'react'
import {
  Users,
  Search,
  ShoppingBag,
  CreditCard,
  Package,
  MapPin,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  Edit,
  ExternalLink,
  ChevronRight,
  X,
  Phone,
  Tag,
  Calendar,
} from 'lucide-react'
import { adminApi } from '../api/admin.js'

export default function BuyersManagement() {
  const [buyers, setBuyers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // all | verified | active | agent
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchBuyers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUsers({
        role: 'buyer',
        q: search.trim() || undefined,
      })
      setBuyers(res.data || [])
      setStats(res.stats || null)
    } catch (err) {
      setBuyers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBuyers()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchBuyers()
  }

  const handleOpenView = (buyer) => {
    setSelectedBuyer(buyer)
    setViewModalOpen(true)
  }

  const handleOpenEditRole = (buyer) => {
    setSelectedBuyer(buyer)
    setNewRole(buyer.role)
    setActionError(null)
    setEditRoleModalOpen(true)
  }

  const handleUpdateRole = async (e) => {
    e.preventDefault()
    if (!selectedBuyer || !newRole) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApi.updateUserRole(selectedBuyer.id, newRole)
      setActionSuccess(`Role updated to ${newRole} for buyer ${selectedBuyer.name}.`)
      setEditRoleModalOpen(false)
      fetchBuyers()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to update user role.')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredBuyers = buyers.filter((buyer) => {
    if (activeFilter === 'verified') return buyer.verified
    if (activeFilter === 'active') return buyer.orders_count > 0
    if (activeFilter === 'agent') return buyer.is_agent || buyer.agent_code
    return true
  })

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--admin-info)' }}>
              <Users size={20} />
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Buyer Management
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Oversee registered marketplace buyers, purchasing history, shipping destinations, active inquiries, and buyer loyalty.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={fetchBuyers} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh Buyers</span>
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
        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Buyers</span>
            <Users size={18} style={{ color: 'var(--admin-info)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.total_count ?? buyers.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Registered enthusiast accounts
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--admin-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Active Purchasers</span>
            <ShoppingBag size={18} style={{ color: 'var(--admin-success)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.active_shoppers ?? buyers.filter(b => b.orders_count > 0).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Placed at least 1 order
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-orange)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Orders Placed</span>
            <Package size={18} style={{ color: 'var(--color-orange)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {stats?.total_orders ?? buyers.reduce((acc, b) => acc + (b.orders_count || 0), 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Parts & builds transactions
          </div>
        </div>

        <div className="admin-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--color-rust)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>Total Buyer Spend</span>
            <CreditCard size={18} style={{ color: 'var(--color-rust)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-rust)' }}>
            ₱{(stats?.total_spend ?? buyers.reduce((acc, b) => acc + (b.total_spend || 0), 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
            Cumulative marketplace GMV
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 400 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              type="text"
              placeholder="Search buyer name, email, or agent code..."
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
            { id: 'all', label: `All Buyers (${buyers.length})` },
            { id: 'verified', label: 'Verified Email' },
            { id: 'active', label: 'With Orders' },
            { id: 'agent', label: 'Sales Specialists' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`btn btn-sm ${activeFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 13 }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buyers Data Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <div>Loading buyer records...</div>
          </div>
        ) : filteredBuyers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
            <Users size={36} style={{ color: 'var(--admin-text-muted)', marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--admin-text-primary)' }}>No Buyers Found</h3>
            <p style={{ margin: 0, fontSize: 14 }}>No buyer accounts matched your current filter or search criteria.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Buyer Profile</th>
                <th>Account Status</th>
                <th>Purchases & Spend</th>
                <th>Primary Shipping Destination</th>
                <th>Wishlist & Inquiries</th>
                <th>Member Since</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBuyers.map((buyer) => (
                <tr key={buyer.id}>
                  {/* Buyer Profile */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {buyer.avatar_url ? (
                        <img
                          src={buyer.avatar_url}
                          alt={buyer.name}
                          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--admin-border)' }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--admin-bg-subtle)', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {buyer.name?.charAt(0) || 'B'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{buyer.name}</span>
                          {buyer.agent_code && (
                            <span className="badge badge-warning" style={{ fontSize: 10, padding: '2px 6px' }}>
                              {buyer.agent_code}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={11} /> {buyer.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Account Status */}
                  <td>
                    {buyer.verified ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <ShieldCheck size={12} /> Verified Buyer
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Clock size={12} /> Pending Verification
                      </span>
                    )}
                  </td>

                  {/* Purchases & Spend */}
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, color: buyer.total_spend > 0 ? 'var(--color-rust)' : 'var(--admin-text-secondary)', fontSize: 14 }}>
                        ₱{buyer.total_spend.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        {buyer.orders_count} {buyer.orders_count === 1 ? 'Order' : 'Orders'} placed
                      </div>
                    </div>
                  </td>

                  {/* Primary Shipping Destination */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--admin-text-primary)' }}>
                      <MapPin size={13} style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }} />
                      <span>{buyer.primary_city || 'Metro Manila'}</span>
                    </div>
                  </td>

                  {/* Wishlist & Inquiries */}
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: 12 }}>
                      {buyer.wishlist_count || 0} Saved Items
                    </span>
                  </td>

                  {/* Member Since */}
                  <td style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>
                    {buyer.created_at ? new Date(buyer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenView(buyer)}
                        className="btn btn-secondary btn-sm"
                        title="View Buyer Details & Order History"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(buyer)}
                        className="btn btn-secondary btn-sm"
                        title="Change Clearance / Role"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Buyer Quick View Modal */}
      {viewModalOpen && selectedBuyer && (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--admin-info)' }}>
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>Buyer Profile & Purchases</h3>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>ID: #{selectedBuyer.id} · {selectedBuyer.email}</div>
                </div>
              </div>
              <button type="button" onClick={() => setViewModalOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              {/* Summary Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Total Orders</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: 2 }}>
                    {selectedBuyer.orders_count}
                  </div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Total Spend</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-rust)', marginTop: 2 }}>
                    ₱{selectedBuyer.total_spend.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Wishlist Items</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: 2 }}>
                    {selectedBuyer.wishlist_count || 0}
                  </div>
                </div>
              </div>

              {/* Agent Tag if any */}
              {selectedBuyer.agent_code && (
                <div style={{ padding: 12, background: 'rgba(216, 98, 44, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(216, 98, 44, 0.2)', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--color-rust)' }}>
                    <Tag size={14} /> Sales Specialist Code: {selectedBuyer.agent_code}
                  </div>
                  {selectedBuyer.agent_tagline && (
                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 4 }}>
                      "{selectedBuyer.agent_tagline}"
                    </div>
                  )}
                </div>
              )}

              {/* Recent Orders List */}
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                  Recent Orders & Transactions
                </h4>
                {selectedBuyer.latest_orders && selectedBuyer.latest_orders.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedBuyer.latest_orders.map((o) => (
                      <div
                        key={o.id}
                        style={{
                          padding: 12,
                          background: '#ffffff',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--admin-text-primary)' }}>
                            {o.order_number} · {o.item_name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                            {o.shipping_city} · {new Date(o.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-rust)', fontSize: 13 }}>
                            ₱{o.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </div>
                          <span className={`badge ${o.status === 'delivered' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10, marginTop: 2 }}>
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 16, background: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--admin-text-muted)', textAlign: 'center' }}>
                    No purchases placed yet by this buyer account.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setViewModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewModalOpen(false)
                  handleOpenEditRole(selectedBuyer)
                }}
                className="btn btn-primary"
              >
                Edit Clearance / Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleModalOpen && selectedBuyer && (
        <div className="modal-backdrop" onClick={() => setEditRoleModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Adjust Account Clearance</h3>
              <button type="button" onClick={() => setEditRoleModalOpen(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateRole}>
              <div className="modal-body" style={{ padding: 24 }}>
                <p style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--admin-text-secondary)' }}>
                  Promote or transition <strong>{selectedBuyer.name}</strong> to a different marketplace role.
                </p>

                {actionError && (
                  <div style={{ padding: 12, background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', borderRadius: 'var(--radius-md)', fontSize: 13, marginBottom: 16 }}>
                    {actionError}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label className="admin-label">Account Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="admin-input"
                  >
                    <option value="buyer">Buyer (Community Enthusiast)</option>
                    <option value="seller">Seller (Car Builder)</option>
                    <option value="dealer">Dealer (Commercial Dealership)</option>
                    <option value="parts_seller">Parts Seller / Garage</option>
                    <option value="inspector">Inspector / Verification Staff</option>
                    <option value="admin">Marketplace Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditRoleModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Saving...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

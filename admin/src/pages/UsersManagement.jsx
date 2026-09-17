import { useState } from 'react'
import {
  Users,
  Search,
  Shield,
  Store,
  UserCheck,
  Mail,
  CheckCircle2,
  Calendar,
} from 'lucide-react'

const SEEDED_USERS = [
  {
    id: 1,
    name: 'Garage Admin',
    email: 'admin@garagemarket.ph',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    verified: true,
    joined: '2026-01-15',
    notes: 'Superuser / Platform Operator',
  },
  {
    id: 2,
    name: 'Makati Showroom & HQ',
    email: 'seller@garagemarket.ph',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    verified: true,
    joined: '2026-02-01',
    notes: 'Official Flagship Showroom',
  },
  {
    id: 3,
    name: 'Cebu JDM Performance Hub',
    email: 'cebu.performance@garagemarket.ph',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
    verified: true,
    joined: '2026-02-10',
    notes: 'Visayas Performance & Tuning Partner',
  },
  {
    id: 4,
    name: 'Manila Classic Restorations',
    email: 'manila.classic@garagemarket.ph',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop',
    verified: true,
    joined: '2026-03-01',
    notes: 'Vintage & Classic Build Specialist',
  },
  {
    id: 5,
    name: 'Davao 4x4 & Overland Depot',
    email: 'davao.overland@garagemarket.ph',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop',
    verified: true,
    joined: '2026-03-15',
    notes: 'Mindanao Offroad & Expeditions',
  },
  {
    id: 6,
    name: 'Anton Valenzuela',
    email: 'buyer@garagemarket.ph',
    role: 'buyer',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300&auto=format&fit=crop',
    verified: true,
    joined: '2026-04-01',
    notes: 'Enthusiast Member',
  },
  {
    id: 7,
    name: 'Mark Ranillo',
    email: 'mark.ranillo@garagemarket.ph',
    role: 'buyer',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=300&auto=format&fit=crop',
    verified: true,
    joined: '2026-04-10',
    notes: 'Enthusiast Member',
  },
  {
    id: 8,
    name: 'Carlo Mendoza',
    email: 'carlo.mendoza@garagemarket.ph',
    role: 'buyer',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=300&auto=format&fit=crop',
    verified: true,
    joined: '2026-04-12',
    notes: 'Trackday Community',
  },
]

export default function UsersManagement() {
  const [users] = useState(SEEDED_USERS)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const matchesSearch =
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.notes.toLowerCase().includes(search.toLowerCase())
    return matchesRole && matchesSearch
  })

  return (
    <div>
      {/* Header */}
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
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--admin-text-primary)',
              margin: '0 0 4px 0',
            }}
          >
            User Accounts & Role Permissions
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit platform users, verified showrooms, individual sellers, and administrator roles.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="admin-card"
        style={{
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 400 }}>
          <div style={{ position: 'relative', width: '100%' }}>
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
              style={{ paddingLeft: 36, height: 38 }}
              placeholder="Search user name, email, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-secondary)' }}>
            Filter Role:
          </span>
          <select
            className="admin-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ height: 38, padding: '6px 12px' }}
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="admin">Administrators</option>
            <option value="seller">Verified Sellers / Showrooms</option>
            <option value="buyer">Buyers / Enthusiasts</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User / Entity</th>
              <th>Email Address</th>
              <th>Platform Role</th>
              <th>Verification</th>
              <th>Joined Date</th>
              <th>Account Profile Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={u.avatar}
                      alt={u.name}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid var(--admin-border)',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        ID: USR-{u.id.toString().padStart(4, '0')}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <Mail size={14} style={{ color: 'var(--admin-text-muted)' }} />
                    <span>{u.email}</span>
                  </div>
                </td>
                <td>
                  <span
                    className={`badge ${
                      u.role === 'admin'
                        ? 'badge-admin'
                        : u.role === 'seller'
                        ? 'badge-seller'
                        : 'badge-buyer'
                    }`}
                  >
                    {u.role === 'admin' ? (
                      <Shield size={12} />
                    ) : u.role === 'seller' ? (
                      <Store size={12} />
                    ) : (
                      <UserCheck size={12} />
                    )}
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className="badge badge-success" style={{ padding: '2px 8px', fontSize: 11 }}>
                    <CheckCircle2 size={12} /> Verified
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                    <Calendar size={13} style={{ color: 'var(--admin-text-muted)' }} />
                    <span>{u.joined}</span>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                    {u.notes}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

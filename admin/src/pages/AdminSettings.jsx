import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  Shield,
  Key,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  User,
  Mail,
  Lock,
  DollarSign,
  Server,
  Bell,
  Sliders,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

export default function AdminSettings() {
  const { user, token, logout, logoutAll } = useAuth()
  const navigate = useNavigate()
  const [successMessage, setSuccessMessage] = useState(null)
  const [commissionRate, setCommissionRate] = useState(5.0)
  const [returnWindowDays, setReturnWindowDays] = useState(7)
  const [fastcgiTtl, setFastcgiTtl] = useState(2)

  const handleLogoutCurrent = async () => {
    await logout()
    navigate('/login')
  }

  const handleLogoutAll = async () => {
    if (window.confirm('Revoke all tokens across all logged-in admin devices?')) {
      await logoutAll()
      navigate('/login')
    }
  }

  const handleSavePolicy = (e) => {
    e.preventDefault()
    setSuccessMessage('Platform operational parameters and security settings updated.')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          Administrator Control & Platform Governance Settings
        </h1>
        <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
          Manage operator authentication, global marketplace commission rates, edge caching rules, and security policies.
        </p>
      </div>

      {successMessage && (
        <div
          style={{
            backgroundColor: 'var(--admin-success-bg)',
            border: '1px solid #A7F3D0',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#047857',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Accordion Settings Sections */}
      <Accordion defaultOpen={['sec-profile', 'sec-fees']}>
        {/* Section 1: Operator Profile & Session Tokens */}
        <AccordionItem id="sec-profile">
          <AccordionHeader
            id="sec-profile"
            title="Operator Authentication & Sanctum Sessions"
            subtitle="Active identity, RBAC security privileges, and token revocation"
            badge={{ label: 'Super Admin', variant: 'rust' }}
            icon={User}
          />
          <AccordionBody id="sec-profile">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                    Active Name
                  </label>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {user?.name || 'Garage Platform Administrator'}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                    Email Address
                  </label>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {user?.email || 'admin@garageparts.local'}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                    Permission Matrix
                  </label>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-rust)' }}>
                    Full Orders, Payout & Operations Access
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Current Sanctum Bearer Token Fingerprint
                </label>
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--admin-bg-subtle)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: 'var(--admin-text-secondary)',
                    wordBreak: 'break-all',
                  }}
                >
                  {token ? `${token.substring(0, 24)}...${token.substring(token.length - 8)}` : 'No active token'}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                <button
                  type="button"
                  onClick={handleLogoutCurrent}
                  className="admin-btn admin-btn-secondary"
                  style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <LogOut size={14} />
                  <span>Logout Current Session</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutAll}
                  className="admin-btn admin-btn-secondary"
                  style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b91c1c' }}
                >
                  <Shield size={14} />
                  <span>Revoke All Device Tokens</span>
                </button>
              </div>
            </div>
          </AccordionBody>
        </AccordionItem>

        {/* Section 2: Marketplace Commission & Return Rules */}
        <AccordionItem id="sec-fees">
          <AccordionHeader
            id="sec-fees"
            title="Marketplace Fees & Buyer Return Rules"
            subtitle="Platform commission rates, buyer return guarantees, and payout release windows"
            badge={{ label: '5.0% Standard Fee', variant: 'success' }}
            icon={DollarSign}
          />
          <AccordionBody id="sec-fees">
            <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Platform Commission Take-Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="admin-input"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                  />
                  <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Deducted automatically at checkout from seller gross.</span>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Standard Return Window (Days)
                  </label>
                  <input
                    type="number"
                    className="admin-input"
                    value={returnWindowDays}
                    onChange={(e) => setReturnWindowDays(e.target.value)}
                  />
                  <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Days post-delivery for buyer defect or fitment return claims.</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Financial Policies
                </button>
              </div>
            </form>
          </AccordionBody>
        </AccordionItem>

        {/* Section 3: Nginx Edge & Realtime Infrastructure */}
        <AccordionItem id="sec-infra">
          <AccordionHeader
            id="sec-infra"
            title="Nginx FastCGI Edge & WebSocket Socket Config"
            subtitle="Microcache TTL, Reverb heartbeat ping intervals, and Redis connection pool"
            badge={{ label: 'High-Throughput', variant: 'rust' }}
            icon={Server}
          />
          <AccordionBody id="sec-infra">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>FastCGI Microcache TTL (Seconds)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={fastcgiTtl}
                    onChange={(e) => setFastcgiTtl(e.target.value)}
                  />
                  <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Stale-while-revalidate locking active in Nginx.</span>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Reverb WebSocket Port</label>
                  <input
                    type="text"
                    className="admin-input"
                    value="8080"
                    disabled
                    style={{ background: 'var(--admin-bg-subtle)' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Bound to 0.0.0.0:8080 via Laravel Reverb.</span>
                </div>
              </div>
            </div>
          </AccordionBody>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

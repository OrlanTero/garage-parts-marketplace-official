import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  User as UserIcon,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  Pencil,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { accountApi, ADDRESS_LABELS } from '../api/account.js'
import { kycApi } from '../api/kyc.js'
import { mediaApi } from '../api/media.js'
import { isRealtimeEnabled, setRealtimeEnabled } from '../realtime/echo.js'
import DeliveryMapPicker from '../components/DeliveryMapPicker.jsx'
import KycVerificationModal from '../components/KycVerificationModal.jsx'

const inputStyle = {
  width: '100%',
  background: '#0f1117',
  border: '1px solid #2d3748',
  borderRadius: 8,
  padding: '12px 14px',
  color: '#f8fafc',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }

const cardStyle = {
  background: '#161922',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
}

function Alert({ kind, children, onClose }) {
  const colors = kind === 'error'
    ? { border: '#ef4444', bg: 'rgba(239,68,68,0.08)', color: '#f87171' }
    : { border: '#10b981', bg: 'rgba(16,185,129,0.08)', color: '#10b981' }
  return (
    <div style={{ border: `1px solid ${colors.border}`, background: colors.bg, color: colors.color, borderRadius: 8, padding: '12px 16px', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
      <span>{children}</span>
      {onClose && <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>}
    </div>
  )
}

/* ---------------- Profile ---------------- */
const AVATAR_MAX_BYTES = 5 * 1024 * 1024

function ProfileTab({ user, refresh }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || '',
    agent_tagline: user?.agent_tagline || '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setForm({
      name: user?.name || '',
      username: user?.username || '',
      phone: user?.phone || '',
      avatar_url: user?.avatar_url || '',
      agent_tagline: user?.agent_tagline || '',
    })
    setAvatarFile(null)
    setAvatarPreview('')
    setAvatarRemoved(false)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPEG, PNG, or WebP).')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError('Avatar must be 5 MB or smaller.')
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarRemoved(false)
  }

  const handleAvatarRemove = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(null)
    setAvatarPreview('')
    setForm((p) => ({ ...p, avatar_url: '' }))
    setAvatarRemoved(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    try {
      let avatarUrl = avatarRemoved ? null : form.avatar_url.trim() || null
      if (avatarFile) {
        const uploaded = await mediaApi.upload(avatarFile, { type: 'image', folder: 'avatars' })
        avatarUrl = uploaded?.data?.url || uploaded?.url || null
        if (!avatarUrl) throw new Error('Upload succeeded but returned no image URL.')
      }
      await accountApi.updateProfile({
        name: form.name.trim(),
        username: form.username.trim(),
        phone: form.phone.trim() || null,
        avatar_url: avatarUrl,
        agent_tagline: form.agent_tagline.trim() || null,
      })
      setAvatarFile(null)
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
        setAvatarPreview('')
      }
      setAvatarRemoved(false)
      await refresh()
      setNotice('Profile updated.')
    } catch (err) {
      const errors = err?.response?.data?.errors
      setError(errors ? Object.values(errors).flat()[0] : err?.message || err?.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const shownAvatar = avatarPreview || (!avatarRemoved ? form.avatar_url : '')

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>Update Profile</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px 0' }}>
        Your username and avatar are what buyers and sellers see on reviews, offers, and chat — your real name stays private there.
      </p>
      {error && <Alert kind="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {shownAvatar ? (
          <img src={shownAvatar} alt="Avatar preview" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2d3748' }} />
        ) : (
          <span style={{ width: 72, height: 72, borderRadius: '50%', background: '#1e293b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <UserIcon size={30} />
          </span>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Upload Photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarFile} style={{ display: 'none' }} />
          </label>
          {shownAvatar && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAvatarRemove}>
              Remove
            </button>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#64748b' }}>JPEG, PNG or WebP · max 5 MB</span>
      </div>
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Display Name</label>
            <input value={form.name} onChange={set('name')} required maxLength={255} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Username (public)</label>
            <input value={form.username} onChange={set('username')} required maxLength={50} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Mobile Number</label>
            <input value={form.phone} onChange={set('phone')} maxLength={50} placeholder="+63 9…" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email (login only)</label>
            <input value={user?.email || ''} disabled style={{ ...inputStyle, opacity: 0.55 }} />
          </div>
        </div>
        {user?.is_agent && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Agent Tagline</label>
            <input value={form.agent_tagline} onChange={set('agent_tagline')} maxLength={255} placeholder="e.g. JDM parts hunter — Cebu" style={inputStyle} />
          </div>
        )}
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}

/* ---------------- Address Book ---------------- */
const emptyAddress = {
  label: 'Home',
  recipient_name: '',
  phone: '',
  address_line: '',
  city: '',
  postal_code: '',
  latitude: '',
  longitude: '',
  landmark: '',
  is_default: false,
}

function AddressTab({ user }) {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyAddress)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const list = await accountApi.listAddresses()
      setAddresses(Array.isArray(list) ? list : [])
    } catch {
      setAddresses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyAddress, recipient_name: user?.name || '', phone: user?.phone || '' })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (addr) => {
    setEditing(addr)
    setForm({
      label: addr.label || 'Home',
      recipient_name: addr.recipient_name || '',
      phone: addr.phone || '',
      address_line: addr.address_line || '',
      city: addr.city || '',
      postal_code: addr.postal_code || '',
      latitude: addr.latitude ?? '',
      longitude: addr.longitude ?? '',
      landmark: addr.landmark || '',
      is_default: !!addr.is_default,
    })
    setError('')
    setModalOpen(true)
  }

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handlePin = (pin) => {
    setForm((p) => ({
      ...p,
      latitude: pin.latitude,
      longitude: pin.longitude,
      landmark: pin.label || p.landmark,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
      }
      if (editing) {
        await accountApi.updateAddress(editing.id, payload)
        setNotice('Address updated.')
      } else {
        await accountApi.createAddress(payload)
        setNotice('Address added to your book.')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      const errors = err?.response?.data?.errors
      setError(errors ? Object.values(errors).flat()[0] : err?.response?.data?.message || 'Failed to save address.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (addr) => {
    if (!window.confirm(`Delete "${addr.label}" address?`)) return
    try {
      await accountApi.deleteAddress(addr.id)
      setNotice('Address deleted.')
      await load()
    } catch {
      setError('Failed to delete address.')
    }
  }

  const handleDefault = async (addr) => {
    try {
      await accountApi.setDefaultAddress(addr.id)
      setNotice(`"${addr.label}" is now your default address.`)
      await load()
    } catch {
      setError('Failed to set default address.')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>Address Book</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Pinpoint each address on the map for precise courier drop-offs.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={14} /> Add Address
        </button>
      </div>

      {error && <Alert kind="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>}

      {loading ? (
        <div style={{ color: '#94a3b8', fontSize: 13, padding: 24, textAlign: 'center' }}>Loading addresses…</div>
      ) : addresses.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#94a3b8' }}>
          <MapPin size={32} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>No saved addresses yet</div>
          <div style={{ fontSize: 13, marginBottom: 14 }}>Add Home, Office, or Garage pins to check out faster.</div>
          <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
            <Plus size={14} /> Add Your First Address
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 8 }}>
          {addresses.map((addr) => (
            <div key={addr.id} style={{ ...cardStyle, marginBottom: 0, borderColor: addr.is_default ? '#d8622c' : '#1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: addr.is_default ? 'rgba(216,98,44,0.15)' : '#1e293b', color: addr.is_default ? '#fb923c' : '#94a3b8', padding: '4px 10px', borderRadius: 12 }}>
                  {addr.label}
                </span>
                {addr.is_default && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#eab308' }}>
                    <Star size={12} /> Default
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{addr.recipient_name}</div>
              <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: '4px 0' }}>
                {addr.address_line}
                {[addr.city, addr.postal_code].filter(Boolean).length > 0 && (
                  <>, {[addr.city, addr.postal_code].filter(Boolean).join(' ')}</>
                )}
              </div>
              {addr.phone && <div style={{ fontSize: 12, color: '#94a3b8' }}>{addr.phone}</div>}
              {addr.has_pin ? (
                <div style={{ fontSize: 11, color: '#10b981', fontFamily: 'monospace', marginTop: 6 }}>
                  📍 {Number(addr.latitude).toFixed(5)}, {Number(addr.longitude).toFixed(5)}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>No map pin yet</div>
              )}
              {addr.landmark && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>“{addr.landmark}”</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(addr)}>
                  <Pencil size={13} /> Edit
                </button>
                {!addr.is_default && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDefault(addr)}>
                    <Star size={13} /> Default
                  </button>
                )}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDelete(addr)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="gpm-modal__overlay" onClick={() => setModalOpen(false)}>
          <div className="gpm-modal__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="gpm-modal__header">
              <h3 className="gpm-modal__title">{editing ? 'Edit Address' : 'Add Address'}</h3>
              <button type="button" className="gpm-modal__close" onClick={() => setModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="gpm-modal__body">
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Label *</label>
                    <select value={form.label} onChange={set('label')} style={inputStyle}>
                      {ADDRESS_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Recipient *</label>
                    <input value={form.recipient_name} onChange={set('recipient_name')} required maxLength={120} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input value={form.phone} onChange={set('phone')} maxLength={50} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input value={form.city} onChange={set('city')} maxLength={120} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Postal Code</label>
                    <input value={form.postal_code} onChange={set('postal_code')} maxLength={30} style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Street Address *</label>
                  <input value={form.address_line} onChange={set('address_line')} required maxLength={500} placeholder="Unit / House No., Street, Barangay" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} /> Map Pin {form.latitude !== '' && <span style={{ color: '#10b981', fontWeight: 700 }}>(pinned ✓)</span>}
                  </label>
                  <DeliveryMapPicker
                    height={280}
                    value={form.latitude !== '' && form.longitude !== '' ? { latitude: Number(form.latitude), longitude: Number(form.longitude), label: form.landmark } : null}
                    confirmLabel="Use This Pin"
                    onConfirm={handlePin}
                  />
                </div>
                {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</div>}
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Address'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- KYC & Security ---------------- */
function KycTab({ user, refresh }) {
  const [kycOpen, setKycOpen] = useState(false)
  const [kycStatus, setKycStatus] = useState(null)
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { logoutAll } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    kycApi.getStatus().then(setKycStatus).catch(() => setKycStatus(null))
  }, [])

  const status = kycStatus?.status || user?.kyc_status || 'not_submitted'
  const verified = user?.is_kyc_verified || status === 'approved'

  const handlePassword = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (pw.password !== pw.password_confirmation) {
      setError('New passwords do not match.')
      return
    }
    setPwSaving(true)
    try {
      await accountApi.changePassword(pw)
      setNotice('Password updated. Use it on your next login.')
      setPw({ current_password: '', password: '', password_confirmation: '' })
    } catch (err) {
      const errors = err?.response?.data?.errors
      setError(errors ? Object.values(errors).flat()[0] : err?.response?.data?.message || 'Failed to update password.')
    } finally {
      setPwSaving(false)
    }
  }

  const handleLogoutAll = async () => {
    if (!window.confirm('Log out of all devices and sessions?')) return
    await logoutAll()
    navigate('/')
  }

  return (
    <div>
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} /> KYC Verification
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px 0' }}>
          Verified sellers unlock listing, badges, and faster payouts.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px' }}>
          <span style={{
            fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
            color: verified ? '#10b981' : status === 'pending' ? '#eab308' : status === 'rejected' ? '#ef4444' : '#94a3b8',
          }}>
            {verified ? '✓ Verified' : status.replace(/_/g, ' ')}
          </span>
          {(kycStatus?.rejection_reason || user?.kyc_rejection_reason) && (
            <span style={{ fontSize: 12, color: '#f87171' }}>
              Reason: {kycStatus?.rejection_reason || user?.kyc_rejection_reason}
            </span>
          )}
          {!verified && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setKycOpen(true)}>
              {status === 'not_submitted' ? 'Verify My ID' : 'Resubmit Documents'}
            </button>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>Change Password</h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px 0' }}>Requires your current password.</p>
        {error && <Alert kind="error" onClose={() => setError('')}>{error}</Alert>}
        {notice && <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>}
        <form onSubmit={handlePassword}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <input type="password" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>New Password (min 8)</label>
              <input type="password" value={pw.password} onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))} required minLength={8} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" value={pw.password_confirmation} onChange={(e) => setPw((p) => ({ ...p, password_confirmation: e.target.value }))} required style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={pwSaving} className="btn btn-secondary">
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>Sessions</h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px 0' }}>Signed in on a shared device? Kill every session at once.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogoutAll}>
          <LogOut size={14} /> Log Out All Devices
        </button>
      </div>

      <KycVerificationModal
        isOpen={kycOpen}
        onClose={() => {
          setKycOpen(false)
          refresh()
          kycApi.getStatus().then(setKycStatus).catch(() => {})
        }}
      />
    </div>
  )
}

/* ---------------- Preferences ---------------- */
function PrefsTab() {
  const [realtime, setRealtime] = useState(isRealtimeEnabled())
  const [notice, setNotice] = useState('')

  const toggleRealtime = () => {
    const next = !realtime
    setRealtimeEnabled(next)
    setRealtime(next)
    setNotice(next ? 'Live updates enabled — reloading to connect…' : 'Live updates disabled — reloading…')
    setTimeout(() => window.location.reload(), 600)
  }

  const clearCaches = () => {
    try {
      const doomed = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('gpm_taxonomy_') || key.startsWith('gpm_chat_'))) doomed.push(key)
      }
      doomed.forEach((k) => localStorage.removeItem(k))
      setNotice(`Cleared ${doomed.length} cached ${doomed.length === 1 ? 'entry' : 'entries'}. Fresh data loads on next visit.`)
    } catch {
      setNotice('Could not access local storage.')
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>Preferences</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px 0' }}>Device-level settings stored in this browser.</p>
      {notice && <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#0f1117', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px', marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Live chat & marketplace updates</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>WebSocket connection for instant messages. Turn off on slow networks.</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={realtime}
          onClick={toggleRealtime}
          style={{
            width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: realtime ? '#10b981' : '#334155', position: 'relative', transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: realtime ? 25 : 3, width: 20, height: 20,
            borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
          }} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#0f1117', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Cached catalog & chat data</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Taxonomy and inbox snapshots stored for instant loads.</div>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={clearCaches}>
          <RefreshCw size={14} /> Clear Caches
        </button>
      </div>
    </div>
  )
}

/* ---------------- Page ---------------- */
const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'addresses', label: 'Address Book', icon: MapPin },
  { id: 'security', label: 'KYC & Security', icon: ShieldCheck },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
]

export default function Settings() {
  const { user, isAuthenticated, refresh } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'profile'

  const setTab = (id) => setSearchParams(id === 'profile' ? {} : { tab: id })

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <SlidersHorizontal size={36} style={{ color: '#64748b', marginBottom: 12 }} />
        <h2>Account Settings</h2>
        <p style={{ color: '#94a3b8' }}>
          Please <Link to="/login" style={{ color: '#fb923c', fontWeight: 700 }}>log in</Link> to
          manage your profile, addresses, and security.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <SlidersHorizontal size={24} /> Account Settings
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px 0' }}>
        Signed in as <strong style={{ color: '#e2e8f0' }}>@{user?.username || 'member'}</strong> · {user?.email}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'profile' && <ProfileTab user={user} refresh={refresh} />}
      {tab === 'addresses' && <AddressTab user={user} />}
      {tab === 'security' && <KycTab user={user} refresh={refresh} />}
      {tab === 'preferences' && <PrefsTab />}
    </div>
  )
}

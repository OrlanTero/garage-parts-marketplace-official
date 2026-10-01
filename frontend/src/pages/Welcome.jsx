import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Car,
  Check,
  HandCoins,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import client from '../api/client.js'
import { accountApi } from '../api/account.js'
import { useProgram } from '../utils/program.js'
import KycVerificationModal from '../components/KycVerificationModal.jsx'
import { CAR_PRESETS, PART_PRESETS } from '../utils/catalogFilters.js'
import './Welcome.css'

const STEPS = ['Welcome', 'Your Details', 'Interests', 'Verify ID', 'Earn more']

const INTEREST_OPTIONS = [
  ...CAR_PRESETS.filter((p) => p.id !== 'all').map((p) => ({ id: `car:${p.id}`, label: p.label, icon: Car })),
  ...PART_PRESETS.filter((p) => p.id !== 'all').map((p) => ({ id: `part:${p.id}`, label: p.label, icon: Wrench })),
  { id: 'x:oem', label: 'OEM Genuine', icon: BadgeCheck },
  { id: 'x:surplus', label: 'Surplus Finds', icon: Sparkles },
]

function StepDots({ step }) {
  return (
    <div className="welcome-dots" aria-hidden="true">
      {STEPS.map((label, i) => (
        <span key={label} className={`welcome-dot ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`} />
      ))}
    </div>
  )
}

/**
 * Post-signup setup wizard. The profile step (name/phone/address) is
 * REQUIRED — Google signups bypass registration, so no account leaves
 * setup without contact + delivery details. Everything after it
 * (interests, KYC, agent) stays optional and skippable.
 * Guards: guests bounce to /login, finished accounts bounce home.
 */
export default function Welcome() {
  const navigate = useNavigate()
  const { user, status, isAuthenticated, refresh } = useAuth()
  const program = useProgram()
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState(() => new Set(user?.interests || []))
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')
  const [kycOpen, setKycOpen] = useState(false)

  // Required profile details (Google OAuth captures none of these).
  const [profile, setProfile] = useState({ name: '', phone: '', address_line: '', city: '', postal_code: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileErrors, setProfileErrors] = useState({})
  const [profileLoaded, setProfileLoaded] = useState(false)

  const profileComplete = Boolean(user?.phone) && Boolean(user?.has_address)

  // Prefill profile from account + default address book entry.
  useEffect(() => {
    if (!isAuthenticated || profileLoaded) return
    let alive = true
    setProfile((prev) => ({
      ...prev,
      name: prev.name || user?.name || '',
      phone: prev.phone || user?.phone || '',
    }))
    accountApi.listAddresses()
      .then((list) => {
        if (!alive) return
        const rows = Array.isArray(list) ? list : []
        const def = rows.find((a) => a.is_default) || rows[0]
        if (def) {
          setProfile((prev) => ({
            ...prev,
            phone: prev.phone || def.phone || user?.phone || '',
            address_line: prev.address_line || def.address_line || '',
            city: prev.city || def.city || '',
            postal_code: prev.postal_code || def.postal_code || '',
          }))
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setProfileLoaded(true) })
    return () => { alive = false }
  }, [isAuthenticated, profileLoaded, user?.name, user?.phone])

  // Redirects once auth state resolves.
  useEffect(() => {
    if (status === 'loading') return
    if (!isAuthenticated) navigate('/login', { replace: true })
    else if (user && !user.needs_onboarding) navigate('/', { replace: true })
  }, [status, isAuthenticated, user, navigate])

  // Seed picks from already-saved interests.
  useEffect(() => {
    if (Array.isArray(user?.interests) && user.interests.length > 0) {
      setPicked(new Set(user.interests))
    }
  }, [user?.interests])

  const togglePick = (id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveInterests = async () => {
    setSaving(true)
    setError('')
    try {
      await client.post('/auth/onboarding', { interests: [...picked] })
      await refresh()
    } catch {
      setError('Could not save interests — you can skip and set them later in Settings.')
    } finally {
      setSaving(false)
    }
  }

  const saveProfile = async () => {
    const errs = {}
    if (!profile.name.trim()) errs.name = 'Full name is required.'
    if (!profile.phone.trim()) errs.phone = 'Mobile number is required.'
    else if (profile.phone.trim().length < 7) errs.phone = 'Enter a valid mobile number.'
    if (!profile.address_line.trim()) errs.address_line = 'Delivery address is required.'
    if (!profile.city.trim()) errs.city = 'City is required.'
    setProfileErrors(errs)
    if (Object.keys(errs).length > 0) return false
    setProfileSaving(true)
    setError('')
    try {
      await client.post('/auth/onboarding', {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        address: {
          address_line: profile.address_line.trim(),
          city: profile.city.trim(),
          postal_code: profile.postal_code.trim() || undefined,
          phone: profile.phone.trim(),
        },
      })
      await refresh()
      return true
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save your details — please try again.')
      return false
    } finally {
      setProfileSaving(false)
    }
  }

  const requireProfile = () => {
    if (!profileComplete) {
      setError('Please complete your details first — name, mobile number and delivery address are required.')
      setStep(1)
      return false
    }
    return true
  }

  const finish = async () => {
    if (!requireProfile()) return
    finishAndGo('/')
  }

  const finishAndGo = async (to) => {
    if (!requireProfile()) return
    setFinishing(true)
    setError('')
    try {
      await client.post('/auth/onboarding', { interests: [...picked], complete: true })
      await refresh()
      navigate(to, { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message
      setError(msg || 'Could not finish setup — please try again.')
      if (err?.response?.status === 422) setStep(1)
      setFinishing(false)
    }
  }

  const kycStatus = user?.kyc_status || 'not_submitted'
  const kycDone = user?.is_kyc_verified || kycStatus === 'approved'
  const kycPending = ['pending', 'under_review', 'submitted'].includes(kycStatus)

  const interestCount = useMemo(() => picked.size, [picked])

  if (status === 'loading' || !isAuthenticated) {
    return (
      <div className="auth-shell">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <Loader2 size={28} className="spinner" style={{ margin: '0 auto 12px', color: 'var(--color-rust)' }} />
          <p className="auth-subtitle">Loading your setup…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--wide welcome-card">
        <div className="welcome-topbar">
          <span className="welcome-step-label">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
          {profileComplete ? (
            <button type="button" className="welcome-skip-all" onClick={finish} disabled={finishing}>
              {finishing ? 'Finishing…' : 'Skip setup'}
            </button>
          ) : (
            <span className="welcome-required-note">Details required to continue</span>
          )}
        </div>
        <StepDots step={step} />
        {error && <p className="field-error welcome-error" role="alert">{error}</p>}

        {/* ---- Step 0: Welcome ---- */}
        {step === 0 && (
          <div className="welcome-pane">
            <div className="welcome-avatar">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user?.name || 'You'} />
              ) : (
                <span>{(user?.name || 'G').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <h2 className="auth-title" style={{ textAlign: 'center' }}>
              Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 🎉
            </h2>
            <p className="auth-subtitle" style={{ textAlign: 'center', maxWidth: 460, marginInline: 'auto' }}>
              Your {user?.provider === 'google' ? 'Google' : ''} account is ready
              {user?.role && user.role !== 'buyer' ? ` as a ${user.role.replace('_', ' ')}` : ''}.
              First your required contact & delivery details, then three quick skippable steps.
            </p>
            <div className="welcome-perks">
              <div className="welcome-perk"><Heart size={16} /><span>Interests tune your home feed</span></div>
              <div className="welcome-perk"><ShieldCheck size={16} /><span>ID verification unlocks selling & payouts</span></div>
              <div className="welcome-perk"><HandCoins size={16} /><span>Agents earn {program.agent.commission_car_pct}% cars · {program.agent.commission_part_pct}% parts</span></div>
            </div>
            <div className="welcome-nav">
              <span />
              <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
                <span>Get started</span><ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 1: Required details (NOT skippable) ---- */}
        {step === 1 && (
          <div className="welcome-pane">
            <h2 className="auth-title">Your details <span className="welcome-required">(required)</span></h2>
            <p className="auth-subtitle">
              Google sign-in skips registration, so we collect the essentials here.
              Sellers contact you on this number and deliver to this address.
            </p>
            <div className="welcome-form">
              <label>
                <span>Full name *</span>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Juan Dela Cruz"
                />
                {profileErrors.name && <em className="field-error">{profileErrors.name}</em>}
              </label>
              <label>
                <span>Mobile number *</span>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="0917 123 4567"
                />
                {profileErrors.phone && <em className="field-error">{profileErrors.phone}</em>}
              </label>
              <label>
                <span>Delivery address (street, barangay) *</span>
                <input
                  type="text"
                  value={profile.address_line}
                  onChange={(e) => setProfile((p) => ({ ...p, address_line: e.target.value }))}
                  placeholder="123 Sampaguita St., Brgy. Poblacion"
                />
                {profileErrors.address_line && <em className="field-error">{profileErrors.address_line}</em>}
              </label>
              <div className="welcome-form-row">
                <label>
                  <span>City *</span>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Makati"
                  />
                  {profileErrors.city && <em className="field-error">{profileErrors.city}</em>}
                </label>
                <label>
                  <span>Postal code</span>
                  <input
                    type="text"
                    value={profile.postal_code}
                    onChange={(e) => setProfile((p) => ({ ...p, postal_code: e.target.value }))}
                    placeholder="1200"
                  />
                </label>
              </div>
            </div>
            <div className="welcome-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>
                <ArrowLeft size={15} /><span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={profileSaving}
                onClick={async () => { if (await saveProfile()) setStep(2) }}
              >
                {profileSaving ? 'Saving…' : <><span>Save & continue</span><ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 2: Interests ---- */}
        {step === 2 && (
          <div className="welcome-pane">
            <h2 className="auth-title">What are you into?</h2>
            <p className="auth-subtitle">Pick as many as you like — we will highlight matching cars & parts. Skippable.</p>
            <div className="welcome-chips" role="group" aria-label="Interests">
              {INTEREST_OPTIONS.map((opt) => {
                const active = picked.has(opt.id)
                const Icon = opt.icon
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`welcome-chip ${active ? 'is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => togglePick(opt.id)}
                  >
                    <Icon size={14} />
                    <span>{opt.label}</span>
                    {active && <Check size={13} />}
                  </button>
                )
              })}
            </div>
            <p className="field-hint">{interestCount === 0 ? 'No picks yet — fine, continue or skip.' : `${interestCount} picked`}</p>
            <div className="welcome-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                <ArrowLeft size={15} /><span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={async () => { await saveInterests(); setStep(3) }}
              >
                {saving ? 'Saving…' : <><span>Continue</span><ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 3: KYC ---- */}
        {step === 3 && (
          <div className="welcome-pane">
            <h2 className="auth-title">Verify your ID <span className="welcome-optional">(optional)</span></h2>
            <p className="auth-subtitle">
              Verified members sell builds, request cash-outs, and earn buyer trust.
              Takes ~2 minutes — skip now and do it later from Settings.
            </p>
            <div className={`welcome-status ${kycDone ? 'is-ok' : kycPending ? 'is-pending' : ''}`}>
              {kycDone ? (
                <><BadgeCheck size={16} /><span>ID verified — you are all set!</span></>
              ) : kycPending ? (
                <><Loader2 size={16} className="spinner" /><span>Verification under review — we will notify you.</span></>
              ) : (
                <><ShieldCheck size={16} /><span>Not verified yet</span></>
              )}
            </div>
            {!kycDone && !kycPending && (
              <button type="button" className="btn btn-secondary" onClick={() => setKycOpen(true)}>
                <ShieldCheck size={15} /><span>Start verification</span>
              </button>
            )}
            <div className="welcome-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                <ArrowLeft size={15} /><span>Back</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
                <span>{kycDone || kycPending ? 'Continue' : 'Skip for now'}</span><ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 4: Agent ---- */}
        {step === 4 && (
          <div className="welcome-pane">
            <h2 className="auth-title">Earn as an agent <span className="welcome-optional">(optional)</span></h2>
            <p className="auth-subtitle">
              Share any car or part listing to Facebook — earn <strong>{program.agent.commission_car_pct}% on cars · {program.agent.commission_part_pct}% on parts</strong> on
              resulting sales. Free to join, skip anytime.
            </p>
            <div className="welcome-agent-grid">
              <button
                type="button"
                className="welcome-agent-card"
                disabled={finishing}
                onClick={() => finishAndGo('/agent')}
              >
                <HandCoins size={20} />
                <strong>Open agent dashboard</strong>
                <span>Finish setup & track links, referrals & earnings</span>
              </button>
              <button
                type="button"
                className="welcome-agent-card"
                disabled={finishing}
                onClick={() => finishAndGo('/become-seller')}
              >
                <Car size={20} />
                <strong>Sell your build</strong>
                <span>Finish setup & list cars or parts in minutes</span>
              </button>
            </div>
            <div className="welcome-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                <ArrowLeft size={15} /><span>Back</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={finish} disabled={finishing}>
                {finishing ? 'Finishing…' : <><span>Finish setup</span><Check size={15} /></>}
              </button>
            </div>
          </div>
        )}
      </div>

      <KycVerificationModal
        isOpen={kycOpen}
        onClose={() => { setKycOpen(false); refresh() }}
      />
    </div>
  )
}

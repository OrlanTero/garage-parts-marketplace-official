import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgePercent,
  Car,
  Check,
  HandCoins,
  Loader2,
  Lock,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { perksApi } from '../api/perks.js'
import { useProgram } from '../utils/program.js'
import './Perks.css'

const CATEGORY_META = {
  tires: { label: 'Tires & Gulong', icon: Sparkles },
  wheels: { label: 'Mags & Wheels', icon: Sparkles },
  parts: { label: 'Parts & Accessories', icon: Wrench },
  mechanics: { label: 'Mechanics & Labor', icon: Wrench },
  carwash: { label: 'Carwash & Detailing', icon: Sparkles },
  other: { label: 'Other Perks', icon: BadgePercent },
}

/**
 * Member perks (discount club): ₱100/yr unlocks up to 30% off flagged
 * parts plus the merchant catalog (tires, mags, mechanics, carwash…).
 */
export default function Perks() {
  const navigate = useNavigate()
  const { user, isAuthenticated, refresh } = useAuth()
  const program = useProgram()
  const [status, setStatus] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      isAuthenticated ? perksApi.status().catch(() => null) : Promise.resolve(null),
      perksApi.catalog().catch(() => []),
    ])
      .then(([st, cat]) => {
        if (!alive) return
        setStatus(st)
        setCatalog(Array.isArray(cat) ? cat : [])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [isAuthenticated])

  const isMember = status?.is_member ?? user?.is_perks_member ?? false
  const fee = program.perks.subscription_fee
  const maxPct = program.perks.max_part_discount_pct

  const subscribe = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setSubscribing(true)
    setError('')
    try {
      await perksApi.subscribe({})
      const st = await perksApi.status().catch(() => null)
      if (st) setStatus(st)
      await refresh()
    } catch {
      setError('Membership activation failed — please try again.')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="page-container perks-page">
      <div className="perks-hero">
        <div>
          <span className="perks-eyebrow"><BadgePercent size={14} /> Member perks club</span>
          <h1 className="perks-title">Discounts that pay for themselves.</h1>
          <p className="perks-lead">
            <strong>₱{fee}/year</strong> unlocks up to <strong>{maxPct}% off</strong> flagged
            genuine & surplus parts, plus member pricing from partner merchants —
            tires, mags, mechanics, carwash and more.
          </p>
        </div>
        {isMember ? (
          <div className="perks-member-chip">
            <Check size={15} /> <span>Member{status?.perks_expires_at ? ` · until ${new Date(status.perks_expires_at).toLocaleDateString()}` : ''}</span>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" onClick={subscribe} disabled={subscribing}>
            {subscribing ? <Loader2 size={15} className="spinner" /> : <Sparkles size={15} />}
            <span>{subscribing ? 'Activating…' : `Join for ₱${fee}/yr`}</span>
          </button>
        )}
      </div>

      {error && <div className="card" style={{ padding: '12px 16px', borderColor: 'var(--color-error)', color: 'var(--color-error)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

      <div className="perks-benefits">
        <div className="perks-benefit">
          <Wrench size={18} />
          <div><strong>Up to {maxPct}% off parts</strong><span>Member pricing auto-applies at checkout on flagged listings.</span></div>
        </div>
        <div className="perks-benefit">
          <Car size={18} />
          <div><strong>Merchant network</strong><span>Tires, mags, mechanics, carwash partners below.</span></div>
        </div>
        <div className="perks-benefit">
          <HandCoins size={18} />
          <div><strong>Stack with agent earnings</strong><span>Members can still earn {program.agent.commission_car_pct}% cars · {program.agent.commission_part_pct}% parts as agents.</span></div>
        </div>
      </div>

      <h2 className="perks-section-title">Partner offers {isMember ? '' : <span className="perks-lock-note"><Lock size={12} /> join to claim</span>}</h2>

      {loading ? (
        <div className="perks-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-skel" aria-hidden="true">
              <div className="card-skel-body">
                <div className="card-skel-line card-skel-line--full" />
                <div className="card-skel-line card-skel-line--mid" />
              </div>
            </div>
          ))}
        </div>
      ) : catalog.length === 0 ? (
        <div className="home-empty-state">
          <p className="home-empty-title">Partner offers dropping soon</p>
          <p className="home-empty-sub">Tires, mags, mechanics and carwash deals land here first for members.</p>
        </div>
      ) : (
        <div className="perks-grid">
          {catalog.map((perk) => {
            const meta = CATEGORY_META[perk.category] || CATEGORY_META.other
            const Icon = meta.icon
            return (
              <div key={perk.id} className="perk-card">
                <div className="perk-card-top">
                  <span className="perk-cat"><Icon size={12} /> {meta.label}</span>
                  <span className="perk-discount">{perk.discount_label}</span>
                </div>
                <h3 className="perk-title">{perk.title}</h3>
                {perk.partner && <p className="perk-partner">by {perk.partner}</p>}
                {perk.description && <p className="perk-desc">{perk.description}</p>}
                {isMember ? (
                  perk.terms && <p className="perk-terms">{perk.terms}</p>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={subscribe} disabled={subscribing}>
                    <Lock size={13} /> <span>Join to claim</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

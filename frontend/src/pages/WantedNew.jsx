import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Megaphone } from 'lucide-react'
import { wantedApi } from '../api/wanted.js'
import { useAuth } from '../auth/AuthContext.jsx'
import './Wanted.css'

const CATEGORIES = ['engine', 'wheels', 'brakes', 'interior', 'exterior', 'electrical', 'suspension', 'transmission', 'other']
const CONDITIONS = ['any', 'new', 'used', 'refurbished']

/**
 * Post a wanted ad: rare part title, engine/part codes, specs, budget.
 * Login wall lives on the board; this route assumes an authenticated user.
 */
export default function WantedNew() {
  const navigate = useNavigate()
  const { isAuthenticated, status } = useAuth()
  const [form, setForm] = useState({
    title: '',
    category: 'engine',
    engine_code: '',
    part_number: '',
    specs: '',
    budget_min: '',
    budget_max: '',
    condition: 'any',
    city: '',
    contact_phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (status !== 'loading' && !isAuthenticated) {
    navigate('/login', { replace: true })
    return null
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('Give your request a clear title.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        engine_code: form.engine_code.trim() || undefined,
        part_number: form.part_number.trim() || undefined,
        specs: form.specs.trim() || undefined,
        budget_min: form.budget_min !== '' ? Number(form.budget_min) : undefined,
        budget_max: form.budget_max !== '' ? Number(form.budget_max) : undefined,
        condition: form.condition,
        city: form.city.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
      }
      const created = await wantedApi.create(payload)
      navigate(`/wanted/${created.id}`, { replace: true })
    } catch (err) {
      const data = err?.response?.data
      setError(data?.message || (data?.errors && Object.values(data.errors).flat().join(' ')) || 'Could not post your request.')
      setSaving(false)
    }
  }

  return (
    <div className="page-container wanted-page" style={{ paddingBottom: 80, maxWidth: 760 }}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/wanted')} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={14} /> Back to board
      </button>

      <div>
        <span className="wanted-eyebrow"><Megaphone size={14} /> New wanted request</span>
        <h1 className="wanted-title">What are you hunting for?</h1>
        <p className="wanted-lead">Free to post. Verified sellers and surplus shops reply with quotes — you accept the best one.</p>
      </div>

      {error && <div className="card" style={{ padding: '12px 16px', borderColor: 'var(--color-error)', color: 'var(--color-error)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

      <form onSubmit={submit} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="field-label" htmlFor="wanted-title">Title <span className="req">*</span></label>
          <input
            id="wanted-title"
            type="text"
            className="field-input"
            placeholder="e.g. RB26 N1 turbine pair, good shaft play-free"
            value={form.title}
            onChange={set('title')}
            maxLength={160}
            required
          />
        </div>

        <div className="wanted-form-grid">
          <div>
            <label className="field-label" htmlFor="wanted-category">Category</label>
            <select id="wanted-category" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="wanted-condition">Condition</label>
            <select id="wanted-condition" value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="wanted-engine">Engine / chassis code</label>
            <input
              id="wanted-engine"
              type="text"
              className="field-input"
              placeholder="e.g. 2JZ-GTE, RB26, K20A"
              value={form.engine_code}
              onChange={set('engine_code')}
              maxLength={80}
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="wanted-pn">Part number (if known)</label>
            <input
              id="wanted-pn"
              type="text"
              className="field-input"
              placeholder="e.g. 14411-AA430"
              value={form.part_number}
              onChange={set('part_number')}
              maxLength={80}
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="wanted-min">Budget min (₱)</label>
            <input id="wanted-min" type="number" min="0" className="field-input" value={form.budget_min} onChange={set('budget_min')} placeholder="0" />
          </div>
          <div>
            <label className="field-label" htmlFor="wanted-max">Budget max (₱)</label>
            <input id="wanted-max" type="number" min="0" className="field-input" value={form.budget_max} onChange={set('budget_max')} placeholder="No limit" />
          </div>
          <div>
            <label className="field-label" htmlFor="wanted-city">City</label>
            <input id="wanted-city" type="text" className="field-input" value={form.city} onChange={set('city')} placeholder="e.g. Makati" maxLength={120} />
          </div>
          <div>
            <label className="field-label" htmlFor="wanted-phone">Contact phone (private)</label>
            <input id="wanted-phone" type="tel" className="field-input" value={form.contact_phone} onChange={set('contact_phone')} placeholder="09xx xxx xxxx" maxLength={50} />
          </div>
          <div className="span-2">
            <label className="field-label" htmlFor="wanted-specs">Specs & details</label>
            <textarea
              id="wanted-specs"
              rows={4}
              className="field-input"
              placeholder="Fitment, year range, must-haves, deal-breakers…"
              value={form.specs}
              onChange={set('specs')}
              maxLength={2000}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Posting…' : <><span>Post wanted request</span><ArrowRight size={15} /></>}
        </button>
      </form>
    </div>
  )
}

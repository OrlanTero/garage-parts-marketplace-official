import { useState } from 'react'
import {
  Tag,
  Plus,
  Percent,
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Copy,
  Flame,
  Award,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const PROMOTIONS = [
  {
    id: 'promo-1',
    code: 'GARAGE15',
    title: 'Spring Turbo & Forced Induction Sale',
    type: 'percentage',
    discount: '15%',
    minOrder: '$300.00',
    status: 'active',
    uses: 142,
    maxUses: 500,
    expiresAt: '2026-10-31',
    applicableCategory: 'Forced Induction & Turbochargers',
    description: '15% discount on all Garrett and BorgWarner turbo kits over $300.',
  },
  {
    id: 'promo-2',
    code: 'TRACKDAY2026',
    title: 'Motorsport Season Kickoff',
    type: 'fixed',
    discount: '$50.00',
    minOrder: '$400.00',
    status: 'active',
    uses: 89,
    maxUses: 200,
    expiresAt: '2026-11-15',
    applicableCategory: 'Suspension, Coilovers & Chassis',
    description: 'Flat $50 rebate for complete coilover sets and high-performance sway bar kits.',
  },
  {
    id: 'promo-3',
    code: 'FREESHIPBUILD',
    title: 'Complete Car Build Free Freight',
    type: 'shipping',
    discount: 'Free Freight',
    minOrder: '$5,000.00',
    status: 'scheduled',
    uses: 0,
    maxUses: 50,
    expiresAt: '2026-12-31',
    applicableCategory: 'Vehicle Showroom Builds',
    description: 'Enclosed carrier transport voucher subsidized by the marketplace platform.',
  },
]

const BOOST_TIERS = [
  {
    id: 'tier-gold',
    name: 'Gold Apex Showcase',
    badge: '3x Impressions',
    price: '$49 / 14 days',
    features: ['Top of Search Rankings', 'Featured in Homepage Hero Carousel', 'Badge on Listing Cards', 'Instant Realtime WebSocket Push to Watchlist Buyers'],
    activeListings: 24,
  },
  {
    id: 'tier-silver',
    name: 'Silver Track Spotlight',
    badge: '2x Impressions',
    price: '$25 / 7 days',
    features: ['Priority in Category Filtering', 'Highlighted Border in Search Results', 'Weekly Newsletter Feature'],
    activeListings: 58,
  },
  {
    id: 'tier-standard',
    name: 'Standard Marketplace Placement',
    badge: 'Standard',
    price: 'Free / Included',
    features: ['Standard Indexing', 'Algorithmic Relevance Match', 'Realtime Inventory Sync'],
    activeListings: 320,
  },
]

export default function PromotionsManagement() {
  const [promotions, setPromotions] = useState(PROMOTIONS)
  const [copiedCode, setCopiedCode] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPromo, setNewPromo] = useState({
    code: '',
    title: '',
    discount: '',
    minOrder: '',
    expiresAt: '',
    applicableCategory: 'All Marketplace Categories',
    maxUses: 100,
  })

  const copyToClipboard = (code) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleCreatePromo = (e) => {
    e.preventDefault()
    if (!newPromo.code || !newPromo.title) return

    setPromotions([
      {
        id: `promo-${Date.now()}`,
        code: newPromo.code.toUpperCase(),
        title: newPromo.title,
        type: 'percentage',
        discount: newPromo.discount || '10%',
        minOrder: newPromo.minOrder || '$100.00',
        status: 'active',
        uses: 0,
        maxUses: Number(newPromo.maxUses) || 100,
        expiresAt: newPromo.expiresAt || '2026-12-31',
        applicableCategory: newPromo.applicableCategory,
        description: `Admin created promotional campaign for ${newPromo.title}.`,
      },
      ...promotions,
    ])
    setShowAddModal(false)
    setNewPromo({ code: '', title: '', discount: '', minOrder: '', expiresAt: '', applicableCategory: 'All Marketplace Categories', maxUses: 100 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Promotions & Listing Boost Engine
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Configure coupon vouchers, automated discount campaigns, and premium seller listing showcase tiers.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="admin-btn admin-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} />
          <span>Create Promotion Campaign</span>
        </button>
      </div>

      {/* KPI Overview */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <Percent size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Campaigns</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {promotions.filter((p) => p.status === 'active').length}
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(216, 98, 44, 0.1)', color: 'var(--color-rust)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Vouchers Redeemed</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {promotions.reduce((acc, p) => acc + p.uses, 0)}
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Paid Boosts</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {BOOST_TIERS.reduce((acc, t) => acc + t.activeListings, 0)} listings
            </div>
          </div>
        </div>
      </div>

      {/* Accordion 1: Active Coupons & Discount Campaigns */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag size={18} style={{ color: 'var(--color-rust)' }} />
          <span>Marketplace Vouchers & Discount Rules</span>
        </h2>

        <Accordion defaultOpen={['promo-1']}>
          {promotions.map((p) => (
            <AccordionItem key={p.id} id={p.id}>
              <AccordionHeader
                id={p.id}
                title={p.title}
                subtitle={`Code: ${p.code} · Expires: ${p.expiresAt}`}
                badge={{
                  label: p.status === 'active' ? 'Active Campaign' : 'Scheduled',
                  variant: p.status === 'active' ? 'success' : 'warning',
                }}
                icon={Percent}
                actions={
                  <button
                    type="button"
                    onClick={() => copyToClipboard(p.code)}
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Copy size={13} />
                    <span>{copiedCode === p.code ? 'Copied!' : p.code}</span>
                  </button>
                }
              />
              <AccordionBody id={p.id}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Discount Value</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-rust)', marginTop: 4 }}>{p.discount}</div>
                  </div>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Minimum Spend</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: 4 }}>{p.minOrder}</div>
                  </div>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Redemption Cap</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: 4 }}>{p.uses} / {p.maxUses} used</div>
                  </div>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Applicable Target</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 4 }}>{p.applicableCategory}</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}>
                  <strong>Campaign Details:</strong> {p.description}
                </div>
              </AccordionBody>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Accordion 2: Listing Boost Showcase Tiers */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '16px 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={18} style={{ color: 'var(--color-orange)' }} />
          <span>Listing Boost & Monetization Tiers</span>
        </h2>

        <Accordion defaultOpen={['tier-gold']}>
          {BOOST_TIERS.map((tier) => (
            <AccordionItem key={tier.id} id={tier.id}>
              <AccordionHeader
                id={tier.id}
                title={tier.name}
                subtitle={`Price: ${tier.price} · ${tier.activeListings} Active Showcases`}
                badge={{ label: tier.badge, variant: 'rust' }}
                icon={Sparkles}
              />
              <AccordionBody id={tier.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                    Tier Features & Platform Benefits:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    {tier.features.map((feat, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          background: 'var(--admin-bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--admin-border)',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={16} style={{ color: '#047857' }} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionBody>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Create Promotion Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div className="admin-card" style={{ width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-dropdown)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, margin: '0 0 16px 0' }}>
              Create Discount Voucher Campaign
            </h2>
            <form onSubmit={handleCreatePromo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Voucher Promo Code</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. DRIFT2026"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Campaign Title</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Summer Track Day Flash Discount"
                  value={newPromo.title}
                  onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Discount (% or $)</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. 15% or $50"
                    value={newPromo.discount}
                    onChange={(e) => setNewPromo({ ...newPromo, discount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Min Spend ($)</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. $250.00"
                    value={newPromo.minOrder}
                    onChange={(e) => setNewPromo({ ...newPromo, minOrder: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Expiry Date</label>
                  <input
                    type="date"
                    className="admin-input"
                    value={newPromo.expiresAt}
                    onChange={(e) => setNewPromo({ ...newPromo, expiresAt: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Max Redemptions</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={newPromo.maxUses}
                    onChange={(e) => setNewPromo({ ...newPromo, maxUses: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Publish Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

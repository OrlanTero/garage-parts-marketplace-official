import { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Car,
  Layers,
  Users,
  Download,
  Calendar,
  ArrowUpRight,
  PieChart,
  BarChart3,
  CheckCircle2,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const CATEGORY_BREAKDOWN = [
  { name: 'Forced Induction & Turbochargers', revenue: '$342,800.00', percentage: '38%', orders: 124, growth: '+28.4%' },
  { name: 'Suspension & Coilovers (KW, Ohlins)', revenue: '$225,400.00', percentage: '25%', orders: 98, growth: '+19.2%' },
  { name: 'Big Brake Kits (Brembo GT, AP Racing)', revenue: '$180,200.00', percentage: '20%', orders: 64, growth: '+14.6%' },
  { name: 'Project Vehicle & Turnkey Builds', revenue: '$980,000.00', percentage: 'Direct Sales', orders: 6, growth: '+50.0%' },
  { name: 'Forged Internals & Cams (2JZ, RB26, S58)', revenue: '$153,600.00', percentage: '17%', orders: 82, growth: '+22.1%' },
]

const TOP_MAKES = [
  { brand: 'Nissan (R34, R35, S15)', share: '32%', gmv: '$380,000.00', topPart: 'Garrett Twin Turbo Kits' },
  { brand: 'Toyota (Supra MK4 / MK5, GR Yaris)', share: '28%', gmv: '$330,000.00', topPart: '2JZ Billet Intake Manifolds' },
  { brand: 'BMW M (G80 M3, F82 M4, E46)', share: '22%', gmv: '$260,000.00', topPart: 'KW 3-Way Clubsport Suspension' },
  { brand: 'Porsche (992 GT3 RS, 718 GT4)', share: '18%', gmv: '$210,000.00', topPart: 'Manthey Racing Aero Splitters' },
]

export default function AnalyticsReports() {
  const [dateRange, setDateRange] = useState('30d')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Marketplace Analytics & Financial Intelligence
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Gross Merchandise Value (GMV), net take-rates, category growth telemetry, and brand fitment volume.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <select
            className="admin-input"
            style={{ width: 'auto', padding: '8px 14px' }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter</option>
            <option value="ytd">Year to Date (2026)</option>
          </select>

          <button className="admin-btn admin-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Download size={15} />
            <span>Export Executive PDF</span>
          </button>
        </div>
      </div>

      {/* Top Level Financial Metrics */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total GMV Volume</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$1,882,000.00</div>
            <div style={{ fontSize: 11, color: '#047857', fontWeight: 700, marginTop: 2 }}>↑ 34.2% vs last month</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(216, 98, 44, 0.1)', color: 'var(--color-rust)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Net Marketplace Take-Rate</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$94,100.00</div>
            <div style={{ fontSize: 11, color: 'var(--color-rust)', fontWeight: 700, marginTop: 2 }}>5.0% Standard Fee</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Average Order Value (AOV)</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$2,450.00</div>
            <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700, marginTop: 2 }}>Motorsport Tier Spec</div>
          </div>
        </div>
      </div>

      {/* Accordion 1: Performance By Category */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={18} style={{ color: 'var(--color-rust)' }} />
          <span>Category Performance & GMV Breakdown</span>
        </h2>

        <Accordion defaultOpen={['cat-perf']}>
          <AccordionItem id="cat-perf">
            <AccordionHeader
              id="cat-perf"
              title="Motorsport Parts & Component Taxonomy Performance"
              subtitle="Audited aggregate sales across all verified seller storefronts"
              badge={{ label: '5 Key Categories', variant: 'rust' }}
              icon={BarChart3}
            />
            <AccordionBody id="cat-perf">
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product Taxonomy Category</th>
                      <th>Total Gross Revenue</th>
                      <th>Category Share</th>
                      <th>Orders Fulfilled</th>
                      <th style={{ textAlign: 'right' }}>Month-over-Month Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORY_BREAKDOWN.map((cat, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{cat.name}</td>
                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-rust)' }}>{cat.revenue}</td>
                        <td>{cat.percentage}</td>
                        <td>{cat.orders} Units</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#047857' }}>{cat.growth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionBody>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Accordion 2: Make & Brand Market Share */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '14px 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Car size={18} style={{ color: 'var(--color-orange)' }} />
          <span>Vehicle Make & Chassis Platform Share</span>
        </h2>

        <Accordion defaultOpen={['brand-perf']}>
          <AccordionItem id="brand-perf">
            <AccordionHeader
              id="brand-perf"
              title="Automotive Platform Dominance"
              subtitle="Fitment query volume, completed transactions, and leading component demand"
              badge={{ label: 'JDM & Euro Leading', variant: 'success' }}
              icon={PieChart}
            />
            <AccordionBody id="brand-perf">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {TOP_MAKES.map((make, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--admin-bg-subtle)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{make.brand}</span>
                      <span className="badge badge-rust" style={{ fontSize: 12 }}>{make.share}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Platform Gross Volume:</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-rust)', marginTop: 2 }}>{make.gmv}</div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 8 }}>
                      Top Selling SKU: <strong>{make.topPart}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionBody>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}

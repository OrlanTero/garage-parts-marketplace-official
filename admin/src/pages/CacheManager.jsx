import { useState } from 'react'
import {
  Server,
  Zap,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Layers,
  Database,
  Cpu,
  Flame,
  ShieldCheck,
  Activity,
  Sliders,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const CACHE_ZONES = [
  {
    id: 'zone-nginx',
    name: 'Nginx FastCGI Edge Microcache (API_MICROCACHE)',
    type: 'Edge FastCGI',
    ttl: '2 seconds (stale-while-revalidate)',
    status: 'ACTIVE',
    hitRate: '98.6%',
    keysCount: '1,420 Cached URLs',
    memoryUsage: '42 MB / 100 MB Zone',
    description: 'Intercepts public read requests (/api/v1/cars, /api/v1/parts) at the Nginx layer, eliminating PHP/MySQL overhead.',
  },
  {
    id: 'zone-redis',
    name: 'Redis 7 In-Memory Cache (redis_database_0)',
    type: 'In-Memory RAM',
    ttl: 'Dynamic / Tagged',
    status: 'ACTIVE',
    hitRate: '99.8%',
    keysCount: '890 Active Keys',
    memoryUsage: '14.8 MB / 256 MB Allocated',
    description: 'Stores parsed vehicle fitment trees, serialized Eloquent resources, and Sanctum session authorization maps.',
  },
  {
    id: 'zone-assets',
    name: 'Static Media & Build Asset Edge Cache',
    type: 'HTTP 304 Immutable',
    ttl: '1 Year (max-age=31536000)',
    status: 'OPTIMAL',
    hitRate: '100.0%',
    keysCount: '340 Static Files',
    memoryUsage: 'Disk Bound',
    description: 'Serves logo assets, vehicle photos, and hashed React/Vite JS bundles with immutable cache headers.',
  },
]

export default function CacheManager() {
  const [zones, setZones] = useState(CACHE_ZONES)
  const [feedback, setFeedback] = useState(null)
  const [purging, setPurging] = useState(false)

  const handlePurge = (target) => {
    setPurging(true)
    setFeedback(`Purging ${target}...`)
    setTimeout(() => {
      setPurging(false)
      setFeedback(`Success: ${target} cache cleared. Next request will trigger fresh edge warm-up.`)
      setTimeout(() => setFeedback(null), 4000)
    }, 800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Nginx Edge Microcache & Redis Engine
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Inspect cache hit-rates, flush FastCGI edge memory buffers, and monitor Redis high-speed key residency.
          </p>
        </div>

        <button
          onClick={() => handlePurge('All System Caches')}
          disabled={purging}
          className="admin-btn admin-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={15} className={purging ? 'animate-spin' : ''} />
          <span>Purge All Edge & Redis Caches</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Edge Cache Hit Ratio</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#047857' }}>98.6% HIT</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
            <Server size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>FastCGI Response Time</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>&lt; 1.8 ms</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(216, 98, 44, 0.1)', color: 'var(--color-rust)' }}>
            <Database size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Redis Memory Footprint</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>14.8 MB</div>
          </div>
        </div>
      </div>

      {feedback && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
          ⚡ {feedback}
        </div>
      )}

      {/* Cache Zones Accordion */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 14px 0' }}>
          Configured Caching Layers & Invalidation Controls
        </h2>

        <Accordion defaultOpen={['zone-nginx', 'zone-redis']}>
          {zones.map((zone) => (
            <AccordionItem key={zone.id} id={zone.id}>
              <AccordionHeader
                id={zone.id}
                title={zone.name}
                subtitle={`Type: ${zone.type} · TTL Policy: ${zone.ttl}`}
                badge={{ label: `Hit Rate: ${zone.hitRate}`, variant: 'success' }}
                icon={Server}
                actions={
                  <span className="badge badge-neutral" style={{ fontSize: 11, fontWeight: 700 }}>
                    {zone.memoryUsage}
                  </span>
                }
              />
              <AccordionBody id={zone.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}>
                    <strong>Architecture Description:</strong> {zone.description}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Resident Keys</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{zone.keysCount}</div>
                    </div>
                    <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Cache Bypass Header</div>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-rust)', marginTop: 4 }}>X-Cache-Status: BYPASS on Auth</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--admin-border)', paddingTop: 12 }}>
                    <button
                      onClick={() => handlePurge(zone.name)}
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Trash2 size={13} /> Purge Zone Buffer
                    </button>
                  </div>
                </div>
              </AccordionBody>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}

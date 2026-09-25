import { useState } from 'react'
import {
  Wrench,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Star,
  Users,
  Building,
  Plus,
  Shield,
  Phone,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const CERTIFIED_GARAGES = [
  {
    id: 'GRG-00',
    name: 'GAP Valenzuela Main',
    owner: 'Garage Marketplace (House Garage)',
    location: 'Valenzuela City, Metro Manila',
    bays: 10,
    certifiedSince: '2024',
    rating: 5.0,
    reviewsCount: 412,
    status: 'operational',
    statusLabel: 'Headquarters · Flagship Hub',
    statusVariant: 'rust',
    equipment: ['Main Parts Depot & Warehousing', '100-Point Inspection Lift Bays', 'Nationwide Freight Dispatch'],
    hourlyLabor: '₱2,800.00 / hr',
    phone: '+63 (2) 8888-0000',
    activeInstallations: [],
  },
  {
    id: 'GRG-01',
    name: 'Top Secret Performance Lab',
    owner: 'Kazuhiko Nagata (Smokey)',
    location: 'Chiba Prefecture, Japan',
    bays: 6,
    certifiedSince: '2024',
    rating: 4.98,
    reviewsCount: 184,
    status: 'operational',
    statusLabel: 'Operational · Platinum Certified',
    statusVariant: 'rust',
    equipment: ['4WD Dynapack Chassis Dyno (2,000 HP Capable)', 'Hunter 3D Laser Alignment Rack', 'MoTeC M1 Certified Calibration Suite', 'TIG Inconel Welding Station'],
    hourlyLabor: '$140.00 / hr',
    phone: '+81 43-286-0033',
    activeInstallations: [
      { car: 'Nissan GT-R R35 Nismo', task: 'Twin Turbo G30 Upgrade & ECU Remap', eta: 'Today, 5:00 PM' },
      { car: 'Toyota Supra MK4 JZA80', task: 'Getrag 6-Speed Rebuild & OS Giken Clutch', eta: 'Tomorrow, 2:00 PM' },
    ],
  },
  {
    id: 'GRG-02',
    name: 'Apex Ring Performance Center',
    owner: 'Robert Kubica',
    location: 'Nürburg, Rhineland-Palatinate, Germany',
    bays: 8,
    certifiedSince: '2025',
    rating: 4.95,
    reviewsCount: 142,
    status: 'operational',
    statusLabel: 'Operational · Certified Installation Hub',
    statusVariant: 'success',
    equipment: ['7-Post Suspension Rig', 'KW Suspension Master Setup Station', 'Corner Balancing Scales', 'Dry Ice Blasting Restoration Bay'],
    hourlyLabor: '€160.00 / hr',
    phone: '+49 2691 99182',
    activeInstallations: [
      { car: 'Porsche 992 GT3 RS', task: 'Manthey Racing Suspension & Aero Optimization', eta: 'In Progress (Sep 18)' },
    ],
  },
  {
    id: 'GRG-03',
    name: 'NorCal Speed & Fabrication',
    owner: 'Dave Rossi',
    location: 'San Jose, CA, USA',
    bays: 4,
    certifiedSince: '2026',
    rating: 4.88,
    reviewsCount: 65,
    status: 'custom_fabrication',
    statusLabel: 'Custom Fabrication & Fitting',
    statusVariant: 'info',
    equipment: ['DynoJet 224xLC AWD Dyno', 'TIG / MIG Welding Bay', 'Engine Leak-Down Tester'],
    hourlyLabor: '$125.00 / hr',
    phone: '+1 (408) 555-0199',
    activeInstallations: [
      { car: 'BMW M3 G80 Competition', task: 'Custom Titanium Exhaust & Downpipe Fitting', eta: 'Today, 3:30 PM' },
    ],
  },
]

export default function GaragesManagement() {
  const [garages, setGarages] = useState(CERTIFIED_GARAGES)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredGarages = garages.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.owner.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Certified Partner Garages & Workshop Network
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Manage verified installation centers, track active dyno/chassis service bays, and audit labor rate limits.
          </p>
        </div>

        <button className="admin-btn admin-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} />
          <span>Accredit New Workshop</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
            <Building size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Partner Hubs</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{garages.length} Garages</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <Wrench size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total Service Bays</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {garages.reduce((acc, g) => acc + g.bays, 0)} Active Bays
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Live In-Bay Builds</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {garages.reduce((acc, g) => acc + g.activeInstallations.length, 0)} Ongoing
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--admin-text-muted)' }} />
        <input
          type="text"
          className="admin-input"
          placeholder="Search partner garage, location, owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </div>

      {/* Garages Accordion */}
      <Accordion defaultOpen={['GRG-01']}>
        {filteredGarages.map((garage) => (
          <AccordionItem key={garage.id} id={garage.id}>
            <AccordionHeader
              id={garage.id}
              title={garage.name}
              subtitle={`Chief Tuner: ${garage.owner} · ${garage.location}`}
              badge={{ label: garage.statusLabel, variant: garage.statusVariant }}
              icon={Wrench}
              actions={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <span>{garage.rating}</span>
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>({garage.reviewsCount})</span>
                </div>
              }
            />
            <AccordionBody id={garage.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Meta Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Service Bays</div>
                    <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{garage.bays} Hydraulic Lifts</div>
                  </div>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Capped Labor Rate</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-rust)', marginTop: 4 }}>{garage.hourlyLabor}</div>
                  </div>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Direct Dispatch Line</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>{garage.phone}</div>
                  </div>
                </div>

                {/* Equipment & Certifications */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
                    Workshop Diagnostic & Calibration Equipment:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {garage.equipment.map((eq, eIdx) => (
                      <span
                        key={eIdx}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          background: '#FFFFFF',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 600,
                          color: 'var(--admin-text-primary)',
                        }}
                      >
                        ⚡ {eq}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Live In-Bay Tasks */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
                    Current In-Bay Installations ({garage.activeInstallations.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {garage.activeInstallations.map((inst, iIdx) => (
                      <div
                        key={iIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--admin-bg-subtle)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--admin-border)',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{inst.car}</span>
                          <span style={{ margin: '0 8px', color: 'var(--admin-text-muted)' }}>·</span>
                          <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>{inst.task}</span>
                        </div>
                        <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                          ETA: {inst.eta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionBody>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

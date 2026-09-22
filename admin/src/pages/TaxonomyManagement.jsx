import { useState } from 'react'
import {
  Tag,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Layers,
  Car,
  Settings2,
  Trash2,
  Edit,
  Sliders,
  ChevronRight,
  Sparkles,
  Globe,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'
import { BRAND_REGIONS, ALL_CAR_BRANDS } from '../constants/brands.js'

const INITIAL_TAXONOMY = [
  {
    id: 'brand-toyota',
    brand: 'Toyota',
    country: 'Japan',
    categoryCount: 142,
    activeModels: [
      {
        name: 'Supra (A90 / A91)',
        years: '2019 - Present',
        chassisCode: 'DB42 / DB02',
        engines: ['B58 3.0L Turbo', 'B48 2.0L Turbo'],
        partsCount: 184,
      },
      {
        name: 'Supra (JZA80 / MK4)',
        years: '1993 - 2002',
        chassisCode: 'JZA80',
        engines: ['2JZ-GTE Twin Turbo', '2JZ-GE NA'],
        partsCount: 312,
      },
      {
        name: 'GR Yaris / GR Corolla',
        years: '2020 - Present',
        chassisCode: 'GXPA16 / GZEA14',
        engines: ['G16E-GTS 1.6L 3-Cyl Turbo'],
        partsCount: 96,
      },
      {
        name: 'GR86 / GT86',
        years: '2012 - Present',
        chassisCode: 'ZN8 / ZN6',
        engines: ['FA24D 2.4L Boxer', 'FA20D 2.0L Boxer'],
        partsCount: 220,
      },
    ],
  },
  {
    id: 'brand-nissan',
    brand: 'Nissan',
    country: 'Japan',
    categoryCount: 198,
    activeModels: [
      {
        name: 'Skyline GT-R (R34)',
        years: '1999 - 2002',
        chassisCode: 'BNR34',
        engines: ['RB26DETT Twin Turbo AWD'],
        partsCount: 420,
      },
      {
        name: 'Silvia / 200SX (S15)',
        years: '1999 - 2002',
        chassisCode: 'S15',
        engines: ['SR20DET Turbo', 'SR20DE NA'],
        partsCount: 340,
      },
      {
        name: 'GT-R (R35)',
        years: '2008 - 2024',
        chassisCode: 'CBA/DBA/4BA-R35',
        engines: ['VR38DETT 3.8L V6 Twin Turbo'],
        partsCount: 290,
      },
      {
        name: 'Fairlady Z (RZ34 / 370Z / 350Z)',
        years: '2003 - Present',
        chassisCode: 'RZ34 / Z34 / Z33',
        engines: ['VR30DDTT 3.0L TT', 'VQ37VHR', 'VQ35DE'],
        partsCount: 265,
      },
    ],
  },
  {
    id: 'brand-ford',
    brand: 'Ford Performance',
    country: 'United States',
    categoryCount: 180,
    activeModels: [
      {
        name: 'Mustang GT / Dark Horse (S650 / S550)',
        years: '2015 - Present',
        chassisCode: 'S650 / S550',
        engines: ['5.0L Coyote V8', '5.2L Predator Supercharged V8'],
        partsCount: 295,
      },
      {
        name: 'Ranger Raptor / F-150',
        years: '2019 - Present',
        chassisCode: 'P703 / P552',
        engines: ['3.0L EcoBoost V6 Twin Turbo', '2.0L Bi-Turbo Diesel'],
        partsCount: 210,
      },
    ],
  },
  {
    id: 'brand-chevrolet',
    brand: 'Chevrolet / GM',
    country: 'United States',
    categoryCount: 155,
    activeModels: [
      {
        name: 'Corvette (C8 Stingray / Z06)',
        years: '2020 - Present',
        chassisCode: 'C8',
        engines: ['6.2L LT2 V8', '5.5L LT6 Flat-Plane V8'],
        partsCount: 185,
      },
      {
        name: 'Camaro SS / ZL1 (6th Gen)',
        years: '2016 - 2024',
        chassisCode: 'Alpha 6th Gen',
        engines: ['6.2L LT1 V8', '6.2L LT4 Supercharged V8'],
        partsCount: 190,
      },
    ],
  },
  {
    id: 'brand-bmw',
    brand: 'BMW M-Performance',
    country: 'Germany',
    categoryCount: 215,
    activeModels: [
      {
        name: 'M3 / M4 (G80 / G82)',
        years: '2021 - Present',
        chassisCode: 'G80 / G82',
        engines: ['S58 3.0L Twin Turbo I6'],
        partsCount: 210,
      },
      {
        name: 'M3 / M4 (F80 / F82)',
        years: '2014 - 2020',
        chassisCode: 'F80 / F82',
        engines: ['S55 3.0L Twin Turbo I6'],
        partsCount: 345,
      },
      {
        name: 'M3 (E46)',
        years: '2000 - 2006',
        chassisCode: 'E46',
        engines: ['S54B32 3.2L High-Rev NA'],
        partsCount: 280,
      },
    ],
  },
  {
    id: 'brand-porsche',
    brand: 'Porsche Motorsport',
    country: 'Germany',
    categoryCount: 165,
    activeModels: [
      {
        name: '911 GT3 / RS (992 / 991.2)',
        years: '2018 - Present',
        chassisCode: '992 / 991',
        engines: ['4.0L Naturally Aspirated Flat-6 (9,000 RPM)'],
        partsCount: 175,
      },
      {
        name: '718 Cayman GT4 / RS',
        years: '2019 - Present',
        chassisCode: '982',
        engines: ['4.0L Mid-Engine Flat-6'],
        partsCount: 130,
      },
    ],
  },
]

const PART_CATEGORIES = [
  { id: 'cat-turbo', name: 'Forced Induction & Turbochargers', code: 'FI-TURBO', parts: 412, subcategories: ['Garrett Turbos', 'BorgWarner EFR', 'Intercoolers', 'Wastegates', 'Blow-Off Valves'] },
  { id: 'cat-suspension', name: 'Suspension, Coilovers & Chassis', code: 'SUSP-CHAS', parts: 530, subcategories: ['KW 3-Way Coilovers', 'Ohlins Road & Track', 'Sway Bars', 'Camber Plates', 'Strut Braces'] },
  { id: 'cat-brakes', name: 'Big Brake Kits & Racing Rotors', code: 'BRK-PERF', parts: 285, subcategories: ['Brembo GT Monoblock', 'AP Racing Radi-CAL', 'Endless MX72 Pads', 'Steel Braided Lines'] },
  { id: 'cat-exhaust', name: 'Titanium Exhausts & Downpipes', code: 'EXH-RACE', parts: 390, subcategories: ['Valvetronic Titanium', 'Catless Downpipes', 'Equal Length Headers', 'Inconel Tips'] },
  { id: 'cat-engine', name: 'Forged Engine Internals & Camshafts', code: 'ENG-FORGE', parts: 620, subcategories: ['Forged Pistons (CP-Carrillo)', 'H-Beam Rods', 'Tomei Cams', 'Dry Sump Systems'] },
  { id: 'cat-aero', name: 'Carbon Fiber Aero & Body Styling', code: 'AERO-CARB', parts: 340, subcategories: ['Swan Neck GT Wings', 'Dry Carbon Hoods', 'Front Splitters', 'Widebody Fenders'] },
]

export default function TaxonomyManagement() {
  const [activeTab, setActiveTab] = useState('brands')
  const [searchQuery, setSearchQuery] = useState('')
  const [brands, setBrands] = useState(INITIAL_TAXONOMY)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMake, setNewMake] = useState({ brand: '', country: 'Japan', modelName: '', chassisCode: '', engine: '' })

  const filteredBrands = brands.filter((b) =>
    b.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.activeModels.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.chassisCode.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleAddVehicle = (e) => {
    e.preventDefault()
    if (!newMake.brand || !newMake.modelName) return

    const existingIndex = brands.findIndex((b) => b.brand.toLowerCase() === newMake.brand.toLowerCase())
    if (existingIndex >= 0) {
      const updated = [...brands]
      updated[existingIndex].activeModels.push({
        name: newMake.modelName,
        years: '2024 - Present',
        chassisCode: newMake.chassisCode || 'GEN-NEW',
        engines: [newMake.engine || 'Standard Spec'],
        partsCount: 0,
      })
      setBrands(updated)
    } else {
      setBrands([
        ...brands,
        {
          id: `brand-${Date.now()}`,
          brand: newMake.brand,
          country: newMake.country,
          categoryCount: 1,
          activeModels: [
            {
              name: newMake.modelName,
              years: '2024 - Present',
              chassisCode: newMake.chassisCode || 'GEN-NEW',
              engines: [newMake.engine || 'Standard Spec'],
              partsCount: 0,
            },
          ],
        },
      ])
    }
    setNewMake({ brand: '', country: 'Japan', modelName: '', chassisCode: '', engine: '' })
    setShowAddModal(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Vehicle Fitment & Parts Taxonomy
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Manage universal compatibility trees, OEM chassis codes, engine variants, and structured marketplace categories.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="admin-btn admin-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} />
          <span>Add Vehicle Platform</span>
        </button>
      </div>

      {/* Navigation Tabs & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)' }}>
          <button
            onClick={() => setActiveTab('brands')}
            className={`tab-btn ${activeTab === 'brands' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Car size={15} />
            <span>Vehicle Platforms ({brands.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Layers size={15} />
            <span>Parts Taxonomy ({PART_CATEGORIES.length})</span>
          </button>
        </div>

        <div style={{ position: 'relative', width: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search make, model, chassis, engine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* Tab 1: Vehicle Platforms & Chassis Codes */}
      {activeTab === 'brands' && (
        <Accordion defaultOpen={['brand-toyota', 'brand-nissan']}>
          {filteredBrands.map((b) => (
            <AccordionItem key={b.id} id={b.id}>
              <AccordionHeader
                id={b.id}
                title={b.brand}
                subtitle={`${b.country} · ${b.activeModels.length} Tracked Models`}
                badge={{ label: `${b.activeModels.reduce((acc, m) => acc + m.partsCount, 0)} Active Parts`, variant: 'rust' }}
                icon={Car}
                actions={
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', marginRight: 8 }}>
                    Chassis Tree
                  </span>
                }
              />
              <AccordionBody id={b.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                    {b.activeModels.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--admin-bg-subtle)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--admin-text-primary)' }}>
                            {m.name}
                          </div>
                          <span className="badge badge-neutral" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                            {m.chassisCode}
                          </span>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                          Production: <strong>{m.years}</strong>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {m.engines.map((eng, eIdx) => (
                            <span
                              key={eIdx}
                              style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                background: '#FFFFFF',
                                border: '1px solid var(--admin-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-rust)',
                                fontWeight: 600,
                              }}
                            >
                              ⚡ {eng}
                            </span>
                          ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                            {m.partsCount} matched components
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-rust)', cursor: 'pointer' }}>
                            View Fitments →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionBody>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Tab 2: Parts Taxonomy & Categories */}
      {activeTab === 'categories' && (
        <Accordion defaultOpen={['cat-turbo', 'cat-suspension']}>
          {PART_CATEGORIES.map((cat) => (
            <AccordionItem key={cat.id} id={cat.id}>
              <AccordionHeader
                id={cat.id}
                title={cat.name}
                subtitle={`Taxonomy Code: ${cat.code} · ${cat.subcategories.length} Subcategories`}
                badge={{ label: `${cat.parts} Parts Listed`, variant: 'success' }}
                icon={Layers}
              />
              <AccordionBody id={cat.id}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 12 }}>
                    Assigned Sub-Categories & Technical Specs:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {cat.subcategories.map((sub, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 14px',
                          background: 'var(--admin-bg-subtle)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--admin-text-primary)',
                        }}
                      >
                        <CheckCircle2 size={14} style={{ color: '#047857' }} />
                        <span>{sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionBody>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Add Modal */}
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
          <div
            className="admin-card"
            style={{ width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-dropdown)', animation: 'fadeIn 0.2s ease-out' }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, margin: '0 0 16px 0' }}>
              Add Vehicle Compatibility Spec
            </h2>
            <form onSubmit={handleAddVehicle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Manufacturer Brand</label>
                <input
                  type="text"
                  list="admin-brands-datalist"
                  className="admin-input"
                  placeholder="e.g. Ford, Porsche, Toyota, Nissan"
                  value={newMake.brand}
                  onChange={(e) => setNewMake({ ...newMake, brand: e.target.value })}
                  required
                />
                <datalist id="admin-brands-datalist">
                  {BRAND_REGIONS.map((group) =>
                    group.brands.map((b) => (
                      <option key={b} value={b}>
                        {b} ({group.region})
                      </option>
                    ))
                  )}
                </datalist>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Model Name</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. RX-7 (FD3S)"
                    value={newMake.modelName}
                    onChange={(e) => setNewMake({ ...newMake, modelName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Chassis Code</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. FD3S / FC3S"
                    value={newMake.chassisCode}
                    onChange={(e) => setNewMake({ ...newMake, chassisCode: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Primary Engine</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. 13B-REW Twin-Rotor Turbo"
                  value={newMake.engine}
                  onChange={(e) => setNewMake({ ...newMake, engine: e.target.value })}
                />
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
                  Save Vehicle Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

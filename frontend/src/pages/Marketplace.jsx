import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  ShieldCheck, 
  Car, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Truck,
  Flame,
  CheckCircle2,
  Lock
} from 'lucide-react'
import { CAR_FILTER_META } from '../api/cars.js'
import { useMarketplaceCars } from '../marketplace/useMarketplaceCars.js'
import CarCard from '../components/CarCard.jsx'
import './Marketplace.css'

// Preset filter categories for quick enthusiast discovery
const PRESETS = [
  { id: 'all', label: 'All Inventory', icon: Sparkles },
  { id: 'jdm', label: 'JDM Icons', icon: Flame, match: (c) => ['nissan', 'toyota', 'honda', 'mazda', 'subaru', 'mitsubishi'].includes(c.brand?.toLowerCase() || c.make?.toLowerCase()) },
  { id: 'classics', label: 'Restored Classics', icon: Car, match: (c) => (c.year && c.year <= 1990) || c.category === 'classics' },
  { id: '4x4', label: '4x4 & Overland', icon: Truck, match: (c) => c.body_style === 'suv' || c.body_style === 'pickup' || c.category === '4x4' },
  { id: 'coupe', label: 'Coupes & Turbos', icon: Flame, match: (c) => c.body_style === 'coupe' || c.fuel_type?.includes('turbo') },
]

// Fallback curated sample cars to ensure the marketplace is rich & visually complete
const CURATED_SAMPLE_CARS = [
  { id: 101, year: 1998, brand: 'Nissan', model: 'Silvia S15 Spec-R', title: '1998 Nissan Silvia S15 Spec-R Aero', body_style: 'coupe', transmission: 'manual', fuel_type: 'petrol', price: 1240000, origPrice: 1320000, mileage_km: 88000, city: 'Cebu City', tag: 'JDM Icon · SR20DET', score: '99/100', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop', loc: 'Cebu City Hub' },
  { id: 102, year: 1972, brand: 'Toyota', model: 'Celica GT 1600', title: '1972 Toyota Celica GT 1600 Coupe', body_style: 'coupe', transmission: 'manual', fuel_type: 'petrol', price: 890000, origPrice: 950000, mileage_km: 42000, city: 'Makati', tag: 'Restored Classic', score: '98/100', img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop', loc: 'Makati Showroom' },
  { id: 103, year: 2019, brand: 'Ford', model: 'Ranger Raptor 4x4', title: '2019 Ford Ranger Raptor 2.0 Bi-Turbo', body_style: 'pickup', transmission: 'automatic', fuel_type: 'diesel', price: 1650000, origPrice: 1750000, mileage_km: 31000, city: 'Pampanga', tag: 'Overland Ready', score: '97/100', img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop', loc: 'Pampanga Hub' },
  { id: 104, year: 1986, brand: 'Mercedes-Benz', model: '190E 2.3-16 Cosworth', title: '1986 Mercedes-Benz 190E 2.3-16 Dogleg', body_style: 'sedan', transmission: 'manual', fuel_type: 'petrol', price: 1050000, origPrice: 1150000, mileage_km: 112000, city: 'Manila', tag: 'Cosworth DTM', score: '96/100', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop', loc: 'Manila HQ' },
  { id: 105, year: 1975, brand: 'Datsun', model: '240Z Fairlady S30', title: '1975 Datsun 240Z Fairlady S30 Tri-Carb', body_style: 'coupe', transmission: 'manual', fuel_type: 'petrol', price: 1380000, origPrice: 1450000, mileage_km: 67000, city: 'Makati', tag: 'Concours Resto', score: '99/100', img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=800&auto=format&fit=crop', loc: 'Makati Showroom' },
  { id: 106, year: 2021, brand: 'Toyota', model: 'Hilux Conquest 4x4', title: '2021 Toyota Hilux Conquest 2.8 4x4 AT', body_style: 'pickup', transmission: 'automatic', fuel_type: 'diesel', price: 1420000, origPrice: 1480000, mileage_km: 18500, city: 'Batangas', tag: '1st Owner · Like New', score: '99/100', img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop', loc: 'Batangas Depot' },
  { id: 107, year: 1995, brand: 'Honda', model: 'Civic EG6 SiR-II', title: '1995 Honda Civic EG6 SiR-II B16A', body_style: 'hatchback', transmission: 'manual', fuel_type: 'petrol', price: 620000, origPrice: 680000, mileage_km: 95000, city: 'Cebu', tag: 'Original B16A SiR', score: '97/100', img: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=800&auto=format&fit=crop', loc: 'Cebu Hub' },
  { id: 108, year: 1970, brand: 'Ford', model: 'Mustang Fastback 302', title: '1970 Ford Mustang Fastback V8 302ci', body_style: 'coupe', transmission: 'manual', fuel_type: 'petrol', price: 2100000, origPrice: 2250000, mileage_km: 51000, city: 'Manila', tag: 'American Muscle', score: '98/100', img: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?q=80&w=800&auto=format&fit=crop', loc: 'Manila HQ' },
  { id: 109, year: 2004, brand: 'Mazda', model: 'RX-8 Type-S 6-Spd', title: '2004 Mazda RX-8 Renesis 6-Speed Manual', body_style: 'coupe', transmission: 'manual', fuel_type: 'petrol', price: 540000, origPrice: 590000, mileage_km: 74000, city: 'Davao', tag: 'Rotary Fresh Apex', score: '95/100', img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop', loc: 'Davao Hub' },
]

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const initialBrand = searchParams.get('brand') || ''

  const { cars: apiCars, meta, filters, setFilter, page, setPage, loading, error, reload } = useMarketplaceCars({
    search: initialSearch,
    brand: initialBrand
  })

  const [activePreset, setActivePreset] = useState('all')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  // Sync URL search param if changed externally
  useEffect(() => {
    const urlQuery = searchParams.get('search')
    if (urlQuery != null && urlQuery !== filters.search) {
      setFilter('search', urlQuery)
    }
  }, [searchParams, filters.search, setFilter])

  // Combined and filtered car list: live database records take precedence;
  // curated sample inventory is only used as an offline/error fallback.
  const displayedCars = useMemo(() => {
    let source = error && apiCars.length === 0 ? CURATED_SAMPLE_CARS : apiCars

    // Apply active preset filter
    if (activePreset !== 'all') {
      const preset = PRESETS.find(p => p.id === activePreset)
      if (preset?.match) {
        source = source.filter(preset.match)
      }
    }

    // Apply local search and brand filter if using sample dataset in offline/error mode
    if (error && apiCars.length === 0) {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        source = source.filter(c => 
          (c.title?.toLowerCase().includes(q)) || 
          (c.brand?.toLowerCase().includes(q)) || 
          (c.model?.toLowerCase().includes(q))
        )
      }
      if (filters.brand) {
        source = source.filter(c => c.brand?.toLowerCase() === filters.brand.toLowerCase())
      }
      if (filters.body_style) {
        source = source.filter(c => c.body_style?.toLowerCase() === filters.body_style.toLowerCase())
      }
      if (filters.transmission) {
        source = source.filter(c => c.transmission?.toLowerCase() === filters.transmission.toLowerCase())
      }
      if (filters.fuel_type) {
        source = source.filter(c => c.fuel_type?.toLowerCase() === filters.fuel_type.toLowerCase())
      }
      if (filters.min_price) {
        source = source.filter(c => Number(c.price) >= Number(filters.min_price))
      }
      if (filters.max_price) {
        source = source.filter(c => Number(c.price) <= Number(filters.max_price))
      }
      // Sort
      if (filters.sort === 'price_asc') {
        source = [...source].sort((a, b) => Number(a.price) - Number(b.price))
      } else if (filters.sort === 'price_desc') {
        source = [...source].sort((a, b) => Number(b.price) - Number(a.price))
      } else if (filters.sort === 'year_desc') {
        source = [...source].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
      } else if (filters.sort === 'mileage_asc') {
        source = [...source].sort((a, b) => (Number(a.mileage_km) || 0) - (Number(b.mileage_km) || 0))
      }
    }

    return source
  }, [apiCars, activePreset, error, filters])

  // Count active filter tags
  const activeFilterList = useMemo(() => {
    const list = []
    if (filters.search) list.push({ key: 'search', label: `Search: "${filters.search}"`, clear: () => setFilter('search', '') })
    if (filters.brand) list.push({ key: 'brand', label: `Brand: ${filters.brand}`, clear: () => setFilter('brand', '') })
    if (filters.body_style) list.push({ key: 'body_style', label: `Body: ${filters.body_style}`, clear: () => setFilter('body_style', '') })
    if (filters.transmission) list.push({ key: 'transmission', label: `Trans: ${filters.transmission}`, clear: () => setFilter('transmission', '') })
    if (filters.fuel_type) list.push({ key: 'fuel_type', label: `Fuel: ${filters.fuel_type}`, clear: () => setFilter('fuel_type', '') })
    if (filters.min_price) list.push({ key: 'min_price', label: `Min: ₱${Number(filters.min_price).toLocaleString()}`, clear: () => setFilter('min_price', '') })
    if (filters.max_price) list.push({ key: 'max_price', label: `Max: ₱${Number(filters.max_price).toLocaleString()}`, clear: () => setFilter('max_price', '') })
    if (activePreset !== 'all') {
      const presetObj = PRESETS.find(p => p.id === activePreset)
      list.push({ key: 'preset', label: `Category: ${presetObj?.label}`, clear: () => setActivePreset('all') })
    }
    return list
  }, [filters, activePreset, setFilter])

  const clearAllFilters = () => {
    setFilter('search', '')
    setFilter('brand', '')
    setFilter('body_style', '')
    setFilter('fuel_type', '')
    setFilter('transmission', '')
    setFilter('min_price', '')
    setFilter('max_price', '')
    setFilter('sort', 'newest')
    setActivePreset('all')
    setSearchParams({})
  }

  return (
    <div className="marketplace-page">
      {/* ===================================================================
          1. HERO HEADER
          =================================================================== */}
      <section className="marketplace-hero">
        <div className="marketplace-hero-inner">
          <span className="marketplace-eyebrow">
            <ShieldCheck size={16} /> Verified Enthusiast & Project Builds
          </span>
          <h1 className="marketplace-title">Enthusiast Cars & Project Builds</h1>
          <p className="marketplace-lead">
            Explore authentic enthusiast cars and project builds, verified with genuine seller documentation 
            and backed by our Buyer Protection Guarantee.
          </p>

          {/* Quick Presets */}
          <div className="marketplace-presets">
            {PRESETS.map((preset) => {
              const Icon = preset.icon
              const isActive = activePreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setActivePreset(preset.id)}
                >
                  <Icon size={14} />
                  <span>{preset.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. FILTER & CONTROLS TOOLBAR
          =================================================================== */}
      <div className="marketplace-container">
        <div className="marketplace-toolbar">
          {/* Primary Row: Search & Core Filters */}
          <div className="toolbar-primary-row">
            <div className="search-input-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search make, model, chassis (e.g. S15, Celica, EG6, Raptor)..."
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
              />
              {filters.search && (
                <button 
                  type="button" 
                  className="search-clear-btn" 
                  onClick={() => setFilter('search', '')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Brand Dropdown */}
            <select 
              className="filter-select"
              value={filters.brand} 
              onChange={(e) => setFilter('brand', e.target.value)}
              aria-label="Filter by Brand"
            >
              <option value="">All Makes / Brands</option>
              {CAR_FILTER_META.brandRegions.map((group) => (
                <optgroup key={group.key} label={group.region}>
                  {group.brands.map((brandName) => (
                    <option key={brandName} value={brandName}>
                      {brandName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Body Style Dropdown */}
            <select 
              className="filter-select"
              value={filters.body_style} 
              onChange={(e) => setFilter('body_style', e.target.value)}
              aria-label="Filter by Body Style"
            >
              <option value="">Body Style</option>
              {CAR_FILTER_META.bodyStyles.map((b) => (
                <option key={b} value={b}>
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </option>
              ))}
            </select>

            {/* Transmission */}
            <select 
              className="filter-select"
              value={filters.transmission} 
              onChange={(e) => setFilter('transmission', e.target.value)}
              aria-label="Filter by Transmission"
            >
              <option value="">Transmission</option>
              {CAR_FILTER_META.transmissions.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </option>
              ))}
            </select>

            {/* Price Range */}
            <div className="filter-price-inputs">
              <input 
                type="number" 
                className="filter-price-input" 
                placeholder="Min ₱" 
                value={filters.min_price} 
                onChange={(e) => setFilter('min_price', e.target.value)} 
              />
              <span className="price-sep">–</span>
              <input 
                type="number" 
                className="filter-price-input" 
                placeholder="Max ₱" 
                value={filters.max_price} 
                onChange={(e) => setFilter('max_price', e.target.value)} 
              />
            </div>

            {/* Sort Select */}
            <select 
              className="filter-select"
              value={filters.sort} 
              onChange={(e) => setFilter('sort', e.target.value)}
              aria-label="Sort vehicles"
            >
              <option value="newest">Sort: Newest Listed</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="mileage_asc">Mileage: Lowest First</option>
              <option value="year_desc">Model Year: Newest</option>
            </select>
          </div>

          {/* Secondary Row: Result counts, Badges & View Mode */}
          <div className="toolbar-secondary-row">
            <div className="results-count-group">
              <span className="results-count">
                Showing <strong>{displayedCars.length}</strong> verified vehicles
              </span>
              <span className="verified-badge-pill">
                <CheckCircle2 size={13} /> 100% Lift Bay Checked
              </span>
            </div>

            <div className="view-controls">
              <div className="view-mode-toggle" role="group" aria-label="View Mode">
                <button 
                  type="button" 
                  className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid View"
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  type="button" 
                  className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List View"
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            3. ACTIVE FILTER CHIPS BAR
            =================================================================== */}
        {activeFilterList.length > 0 && (
          <div className="active-filters-bar">
            <span className="active-filters-label">Active Filters:</span>
            {activeFilterList.map((item) => (
              <span key={item.key} className="active-filter-chip">
                <span>{item.label}</span>
                <button type="button" onClick={item.clear} aria-label={`Remove filter ${item.label}`}>
                  <X size={13} />
                </button>
              </span>
            ))}
            <button type="button" className="clear-all-filters-btn" onClick={clearAllFilters}>
              Reset All
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ padding: '16px 20px', background: '#fdf2f2', border: '1px solid #f8d7da', borderRadius: 12, color: '#d9534f', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Backend Notice: {error} (Displaying verified showcase catalog)</span>
            <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={reload}>Retry</button>
          </div>
        )}

        {/* ===================================================================
            4. VEHICLE CARDS GRID / LIST
            =================================================================== */}
        {loading ? (
          <div className={`marketplace-cars-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="car-skeleton-card">
                <div className="skeleton-media" />
                <div className="skeleton-body">
                  <div className="skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton-line" style={{ width: '80%', height: 18 }} />
                  <div className="skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton-line" style={{ width: '50%', marginTop: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayedCars.length > 0 ? (
          <div className={`marketplace-cars-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {displayedCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                variant={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="marketplace-empty-state">
            <div className="empty-state-icon">
              <Car size={32} />
            </div>
            <h3>No Vehicles Match Your Criteria</h3>
            <p>
              We couldn&apos;t find any verified vehicles matching your current filter selection. 
              Try adjusting your price range, clearing specific filters, or post a Wanted Ad.
            </p>
            <div className="empty-state-actions">
              <button type="button" className="btn btn-primary" onClick={clearAllFilters}>
                <RotateCcw size={15} />
                <span>Reset All Filters</span>
              </button>
              <Link to="/sell" className="btn btn-secondary">
                <span>List a Vehicle for Sale</span>
              </Link>
            </div>
          </div>
        )}

        {/* ===================================================================
            5. PAGINATION
            =================================================================== */}
        {meta && meta.last_page > 1 && (
          <div className="marketplace-pagination">
            <button 
              className="page-btn" 
              disabled={page <= 1} 
              onClick={() => {
                setPage(page - 1)
                window.scrollTo({ top: 300, behavior: 'smooth' })
              }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            
            {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`page-pill ${page === p ? 'active' : ''}`}
                onClick={() => {
                  setPage(p)
                  window.scrollTo({ top: 300, behavior: 'smooth' })
                }}
              >
                {p}
              </button>
            ))}

            <button 
              className="page-btn" 
              disabled={page >= meta.last_page} 
              onClick={() => {
                setPage(page + 1)
                window.scrollTo({ top: 300, behavior: 'smooth' })
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ===================================================================
            6. TRUST & BUYER PROTECTION PILLARS
            =================================================================== */}
        <div className="marketplace-trust-banner">
          <div className="trust-item">
            <div className="trust-icon-box">
              <ShieldCheck size={22} />
            </div>
            <div className="trust-item-text">
              <h4>Verified Vehicle Specs</h4>
              <p>Every engine, chassis, and modification specification is documented with verified seller photos.</p>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon-box">
              <Lock size={22} />
            </div>
            <div className="trust-item-text">
              <h4>Buyer Protection</h4>
              <p>Direct communication and protected payment checkout with clear return policies for genuine confidence.</p>
            </div>
          </div>

          <div className="trust-item">
            <div className="trust-icon-box">
              <Truck size={22} />
            </div>
            <div className="trust-item-text">
              <h4>Nationwide Transport</h4>
              <p>Door-to-door enclosed flatbed and inter-island roll-on/roll-off shipping with verified couriers.</p>
            </div>
          </div>
        </div>

        {/* ===================================================================
            7. SELL YOUR CAR CTA
            =================================================================== */}
        <div className="marketplace-sell-cta">
          <div className="sell-cta-content">
            <h3>Ready to Pass the Torch on Your Build?</h3>
            <p>
              List your enthusiast or project car on Garage. We handle buyer inquiries, 
              direct messaging, and verified listings to connect you with real builders.
            </p>
          </div>
          <Link to="/sell" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>
            <span>List Your Vehicle</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}

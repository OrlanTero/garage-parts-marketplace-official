import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Package,
  Wrench,
  Disc,
  Flame,
  Armchair,
  Compass,
  Sliders,
  CheckCircle2,
  Lock
} from 'lucide-react'
import { PART_FILTER_META } from '../api/parts.js'
import { useMarketplaceParts } from '../marketplace/useMarketplaceParts.js'
import PartCard from '../components/PartCard.jsx'
import './PartsMarketplace.css'

// Preset category buttons
const CATEGORY_CHIPS = [
  { id: 'all', label: 'All Catalog', icon: Sparkles },
  { id: 'engine', label: 'Engine & Turbo', icon: Wrench },
  { id: 'wheels', label: 'Wheels & Rims', icon: Disc },
  { id: 'brakes', label: 'Brakes & BBK', icon: Sliders },
  { id: 'exhaust', label: 'Exhaust & Headers', icon: Flame },
  { id: 'interior', label: 'Interior & Recaro', icon: Armchair },
  { id: 'suspension', label: 'Coilovers & Suspension', icon: Sliders },
  { id: 'accessories', label: 'Aero & Accessories', icon: Compass },
]

// Fallback curated performance parts catalog
const CURATED_SAMPLE_PARTS = [
  { id: 201, title: 'Brembo GT 6-Piston Monobloc Big Brake Kit', cat: 'brakes', category: 'brakes', brand: 'Brembo', part_number: '1M1.8024A', price: 42500, origPrice: 48000, cond: 'Brand New OEM', condition: 'new', quantity: 4, freeShip: true, img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=500&auto=format&fit=crop', reviews: 24, rating: 4.9, compatibility: 'Universal 5x114.3 (Custom Brackets)' },
  { id: 202, title: 'Recaro SR-7 KK100 Reclinable Bucket Seats (Pair)', cat: 'interior', category: 'interior', brand: 'Recaro', part_number: 'SR7-KK100', price: 58000, origPrice: 64000, cond: 'Surplus Mint 9.5/10', condition: 'used', quantity: 2, freeShip: true, img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=500&auto=format&fit=crop', reviews: 18, rating: 5.0, compatibility: 'Universal Bottom-Mount Rails' },
  { id: 203, title: 'HKS Hi-Power Spec-L II Titanium Catback Exhaust', cat: 'exhaust', category: 'exhaust', brand: 'HKS', part_number: '31019-AF030', price: 31000, origPrice: 35500, cond: 'Brand New in Box', condition: 'new', quantity: 3, freeShip: false, img: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=500&auto=format&fit=crop', reviews: 31, rating: 4.8, compatibility: 'Toyota GR86 / Subaru BRZ (ZN8/ZD8)' },
  { id: 204, title: 'Work Meister S1 3-Piece 18x9.5 +22 5x114.3', cat: 'wheels', category: 'tires_wheels', brand: 'Work Wheels', part_number: 'S1-3P-1895', price: 72000, origPrice: 80000, cond: 'Surplus 9/10 Polished', condition: 'used', quantity: 1, freeShip: true, img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=500&auto=format&fit=crop', reviews: 14, rating: 4.9, compatibility: '5x114.3 PCD (Nissan Silvia, Skyline, Supra)' },
  { id: 205, title: 'Nardi Classic 360mm Wood Steering Wheel + Polished Horn', cat: 'interior', category: 'interior', brand: 'Nardi', part_number: '6061.36.1001', price: 18500, origPrice: 21000, cond: 'Brand New Made in Italy', condition: 'new', quantity: 8, freeShip: true, img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=500&auto=format&fit=crop', reviews: 42, rating: 5.0, compatibility: '6-Bolt Universal Boss Kit' },
  { id: 206, title: 'Koyo N-Flow Dual-Pass Aluminum Racing Radiator', cat: 'engine', category: 'engine', brand: 'Koyo', part_number: 'KH081255', price: 24900, origPrice: 27500, cond: 'Brand New Made in Japan', condition: 'new', quantity: 5, freeShip: true, img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=500&auto=format&fit=crop', reviews: 19, rating: 4.9, compatibility: 'Nissan Silvia S14 / S15 SR20DET' },
  { id: 207, title: 'RAYS Volk Racing TE37 Saga S-Plus 18" Bronze Finish', cat: 'wheels', category: 'tires_wheels', brand: 'RAYS', part_number: 'TE37S-1895', price: 88000, origPrice: 96000, cond: 'Brand New in Box', condition: 'new', quantity: 2, freeShip: true, img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=500&auto=format&fit=crop', reviews: 29, rating: 5.0, compatibility: '5x114.3 / 5x100 Multi-Spec' },
  { id: 208, title: 'Garrett Motion G25-550 Dual Ball Bearing Turbocharger', cat: 'engine', category: 'engine', brand: 'Garrett', part_number: '871389-5004S', price: 95000, origPrice: 105000, cond: 'Brand New Genuine USA', condition: 'new', quantity: 3, freeShip: true, img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=500&auto=format&fit=crop', reviews: 16, rating: 4.9, compatibility: 'Universal T25 / V-Band Exhaust' },
  { id: 209, title: 'Cusco Type-RS 1.5-Way Limited Slip Differential', cat: 'engine', category: 'engine', brand: 'Cusco', part_number: 'LSD-270-L15', price: 38500, origPrice: 42000, cond: 'Surplus Mint 9/10', condition: 'used', quantity: 1, freeShip: false, img: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=500&auto=format&fit=crop', reviews: 11, rating: 4.8, compatibility: 'Nissan R200 Rear Differential' },
]

export default function PartsMarketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const initialCategory = searchParams.get('category') || ''

  const { parts: apiParts, meta, filters, setFilter, page, setPage, loading, error, reload } = useMarketplaceParts({
    search: initialSearch,
    category: initialCategory
  })

  const [activeCategoryTab, setActiveCategoryTab] = useState(initialCategory || 'all')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [savedPartIds, setSavedPartIds] = useState([201, 204])

  // Sync category tab with filter and URL
  useEffect(() => {
    const urlCat = searchParams.get('category')
    if (urlCat) {
      setActiveCategoryTab(urlCat)
      setFilter('category', urlCat)
    }
  }, [searchParams, setFilter])

  const handleCategorySelect = (catId) => {
    setActiveCategoryTab(catId)
    setFilter('category', catId === 'all' ? '' : catId)
    if (catId === 'all') {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('category')
      setSearchParams(newParams)
    } else {
      setSearchParams({ ...Object.fromEntries(searchParams.entries()), category: catId })
    }
  }

  // Toggle part save
  const toggleSavePart = (id, e) => {
    e.preventDefault()
    setSavedPartIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Merged and filtered parts
  const displayedParts = useMemo(() => {
    let source = apiParts.length > 0 ? apiParts : CURATED_SAMPLE_PARTS

    // Category filtering
    if (filters.category && filters.category !== 'all') {
      source = source.filter(p => {
        const pCat = (p.category || p.cat || '').toLowerCase()
        return pCat.includes(filters.category.toLowerCase()) || filters.category.toLowerCase().includes(pCat)
      })
    }

    // Local filters for sample inventory fallback
    if (apiParts.length === 0) {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        source = source.filter(p => 
          (p.title?.toLowerCase().includes(q)) || 
          (p.brand?.toLowerCase().includes(q)) || 
          (p.part_number?.toLowerCase().includes(q)) ||
          (p.compatibility?.toLowerCase().includes(q))
        )
      }
      if (filters.brand) {
        source = source.filter(p => p.brand?.toLowerCase().includes(filters.brand.toLowerCase()))
      }
      if (filters.condition) {
        source = source.filter(p => p.condition?.toLowerCase() === filters.condition.toLowerCase())
      }
      if (filters.in_stock === '1' || filters.in_stock === true) {
        source = source.filter(p => (p.quantity == null || p.quantity > 0))
      }
      if (filters.min_price) {
        source = source.filter(p => Number(p.price) >= Number(filters.min_price))
      }
      if (filters.max_price) {
        source = source.filter(p => Number(p.price) <= Number(filters.max_price))
      }
      // Sort
      if (filters.sort === 'price_asc') {
        source = [...source].sort((a, b) => Number(a.price) - Number(b.price))
      } else if (filters.sort === 'price_desc') {
        source = [...source].sort((a, b) => Number(b.price) - Number(a.price))
      }
    }

    return source
  }, [apiParts, filters])

  // Active filter chip representations
  const activeFilterList = useMemo(() => {
    const list = []
    if (filters.search) list.push({ key: 'search', label: `Search: "${filters.search}"`, clear: () => setFilter('search', '') })
    if (filters.category) list.push({ key: 'category', label: `Category: ${filters.category.replace('_', ' ')}`, clear: () => handleCategorySelect('all') })
    if (filters.brand) list.push({ key: 'brand', label: `Brand: ${filters.brand}`, clear: () => setFilter('brand', '') })
    if (filters.condition) list.push({ key: 'condition', label: `Condition: ${filters.condition}`, clear: () => setFilter('condition', '') })
    if (filters.in_stock === '1' || filters.in_stock === true) list.push({ key: 'in_stock', label: 'In Stock Only', clear: () => setFilter('in_stock', '') })
    if (filters.min_price) list.push({ key: 'min_price', label: `Min: ₱${Number(filters.min_price).toLocaleString()}`, clear: () => setFilter('min_price', '') })
    if (filters.max_price) list.push({ key: 'max_price', label: `Max: ₱${Number(filters.max_price).toLocaleString()}`, clear: () => setFilter('max_price', '') })
    return list
  }, [filters, setFilter])

  const clearAllFilters = () => {
    setFilter('search', '')
    setFilter('category', '')
    setFilter('brand', '')
    setFilter('condition', '')
    setFilter('in_stock', '')
    setFilter('min_price', '')
    setFilter('max_price', '')
    setFilter('sort', 'newest')
    setActiveCategoryTab('all')
    setSearchParams({})
  }

  return (
    <div className="parts-page">
      {/* ===================================================================
          1. HERO HEADER
          =================================================================== */}
      <section className="parts-hero">
        <div className="parts-hero-inner">
          <span className="parts-eyebrow">
            <Truck size={16} /> Free Freight on Orders Over ₱8,000 · Genuine & Japanese Surplus
          </span>
          <h1 className="parts-title">Performance Parts, Internals & Fab</h1>
          <p className="parts-lead">
            Find guaranteed genuine turbos, big brake kits, forged wheels, coilovers, and interior upgrades 
            sourced directly from certified Japanese dismantlers and authorized distributors.
          </p>

          {/* Category Chips Bar */}
          <div className="parts-category-chips">
            {CATEGORY_CHIPS.map((chip) => {
              const Icon = chip.icon
              const isActive = activeCategoryTab === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={`category-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(chip.id)}
                >
                  <Icon size={14} />
                  <span>{chip.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. FILTER & CONTROLS TOOLBAR
          =================================================================== */}
      <div className="parts-container">
        <div className="parts-toolbar">
          <div className="parts-toolbar-primary">
            {/* Search Input */}
            <div className="search-input-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search part name, part number, engine code (2JZ, RB26, K20, TE37)..."
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

            {/* Category Dropdown */}
            <select 
              className="filter-select"
              value={filters.category} 
              onChange={(e) => handleCategorySelect(e.target.value || 'all')}
              aria-label="Filter by Category"
            >
              <option value="">All Categories</option>
              {PART_FILTER_META.categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>

            {/* Brand Dropdown */}
            <select 
              className="filter-select"
              value={filters.brand} 
              onChange={(e) => setFilter('brand', e.target.value)}
              aria-label="Filter by Brand"
            >
              <option value="">All Brands</option>
              <option value="HKS">HKS</option>
              <option value="Brembo">Brembo</option>
              <option value="RAYS">RAYS Volk Racing</option>
              <option value="Work Wheels">Work Wheels</option>
              <option value="Recaro">Recaro</option>
              <option value="Nardi">Nardi</option>
              <option value="Koyo">Koyo Radiators</option>
              <option value="Garrett">Garrett Motion</option>
              <option value="Cusco">Cusco</option>
              <option value="Tein">Tein Suspension</option>
              <option value="Bride">Bride Racing</option>
            </select>

            {/* Condition Dropdown */}
            <select 
              className="filter-select"
              value={filters.condition} 
              onChange={(e) => setFilter('condition', e.target.value)}
              aria-label="Filter by Condition"
            >
              <option value="">Any Condition</option>
              <option value="new">Brand New OEM</option>
              <option value="used">Used Surplus</option>
              <option value="refurbished">Refurbished</option>
            </select>

            {/* In Stock Checkbox */}
            <label className="instock-toggle-label">
              <input
                type="checkbox"
                checked={filters.in_stock === '1' || filters.in_stock === true}
                onChange={(e) => setFilter('in_stock', e.target.checked ? '1' : '')}
              />
              <span>In Stock Only</span>
            </label>

            {/* Price Inputs */}
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
              aria-label="Sort parts"
            >
              <option value="newest">Sort: Newest Listed</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {/* Secondary Row */}
          <div className="parts-toolbar-secondary">
            <div className="results-count-group">
              <span className="results-count">
                Showing <strong>{displayedParts.length}</strong> performance components
              </span>
              <span className="verified-badge-pill">
                <Truck size={13} /> Insured Crate Freight Available
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
            4. PARTS GRID / LIST
            =================================================================== */}
        {loading ? (
          <div className={`marketplace-parts-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="part-skeleton-card">
                <div className="part-skeleton-media" />
                <div className="part-skeleton-body">
                  <div className="skeleton-line" style={{ width: '40%' }} />
                  <div className="skeleton-line" style={{ width: '85%', height: 16 }} />
                  <div className="skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton-line" style={{ width: '45%', marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayedParts.length > 0 ? (
          <div className={`marketplace-parts-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {displayedParts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                variant={viewMode}
                isSaved={savedPartIds.includes(part.id)}
                onToggleSave={toggleSavePart}
              />
            ))}
          </div>
        ) : (
          <div className="marketplace-empty-state">
            <div className="empty-state-icon">
              <Package size={32} />
            </div>
            <h3>No Parts Match Your Search</h3>
            <p>
              We couldn&apos;t find any components matching your criteria. 
              Our network of 280+ Japanese & local surplus shops can source rare parts for you.
            </p>
            <div className="empty-state-actions">
              <button type="button" className="btn btn-primary" onClick={clearAllFilters}>
                <RotateCcw size={15} />
                <span>Reset All Filters</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => alert('Wanted Request form opened!')}>
                <span>Post a Wanted Part Request</span>
              </button>
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
            6. POST WANTED REQUEST BANNER
            =================================================================== */}
        <div className="parts-wanted-banner">
          <div className="parts-wanted-content">
            <span className="parts-wanted-tag">Surplus Sourcing Concierge</span>
            <h3>Looking for Hard-to-Find Engine Internals, Aero or JDM Rims?</h3>
            <p>
              Post a <strong>Wanted Request</strong> with your chassis or engine code (e.g. 2JZ-GTE, RB26, K20A, 4G63, 13B) 
              and receive verified quotes with photos directly from our vetted surplus importers.
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ padding: '12px 24px', fontSize: 15 }}
            onClick={() => alert('Wanted Request feature is ready! Sellers & importers will be notified.')}
          >
            <span>Post Wanted Request</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Building2,
  Car,
  ShieldCheck,
  Search,
  Sparkles,
  MapPin,
  Star,
  MessageSquare,
  ExternalLink,
  Layers,
  ArrowRight,
  X,
  Award,
  ChevronRight,
  TrendingUp,
  Tag,
  Calendar,
  Zap,
  Flame,
  CheckCircle2,
} from 'lucide-react'
import { showroomApi } from '../api/showroom.js'
import { useChat } from '../context/ChatContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import './Showroom.css'

function formatPeso(num) {
  if (num === null || num === undefined) return '₱ 0'
  return '₱ ' + Number(num).toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

// Fallback curated builders in case the network is loading or empty
const FALLBACK_BUILDERS = [
  {
    id: 1,
    username: 'our_garage_official',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    role: 'seller',
    is_official_garage: true,
    is_kyc_verified: true,
    kyc_status: 'approved',
    location: 'Makati Central · Official Garage HQ',
    tagline: 'Our Garage Official Showroom & Certified Flagship Custom Performance Collection',
    specialties: ['Toyota', 'Nissan', 'Honda', 'Porsche'],
    rating: 5.0,
    reviews_count: 88,
    member_since: 'Official HQ',
    stats: {
      active_cars: 4,
      total_listings: 4,
    },
    preview_cars: [
      {
        id: 101,
        uuid: 'c101',
        title: '1972 Toyota Celica GT 1600 Coupe (TA22)',
        brand: 'Toyota',
        model: 'Celica GT 1600',
        year: 1972,
        price: 890000,
        image_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=600&auto=format&fit=crop',
        type: 'car',
      },
      {
        id: 102,
        uuid: 'c102',
        title: '1998 Nissan Silvia S15 Spec-R Aero SR20DET',
        brand: 'Nissan',
        model: 'Silvia S15 Spec-R',
        year: 1998,
        price: 1240000,
        image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop',
        type: 'car',
      },
      {
        id: 103,
        uuid: 'c103',
        title: '1999 Nissan Skyline GT-R BNR34 V-Spec',
        brand: 'Nissan',
        model: 'Skyline GT-R',
        year: 1999,
        price: 9200000,
        image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
        type: 'car',
      },
    ],
  },
  {
    id: 2,
    username: 'cebu_jdm_hub',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
    role: 'seller',
    is_official_garage: false,
    is_kyc_verified: true,
    kyc_status: 'approved',
    location: 'Cebu City · Mandaue Garage',
    tagline: 'Visayas Premier Rotary & Turbo Specialists · RX-7 FD3S & Evo Build Platforms',
    specialties: ['Mazda', 'Mitsubishi', 'GReddy', 'Defi'],
    rating: 4.8,
    reviews_count: 19,
    member_since: 'Nov 2024',
    stats: {
      active_cars: 3,
      total_listings: 3,
    },
    preview_cars: [
      {
        id: 104,
        uuid: 'c104',
        title: '1996 Mazda RX-7 FD3S Type R Twin Turbo',
        brand: 'Mazda',
        model: 'RX-7',
        year: 1996,
        price: 3400000,
        image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
        type: 'car',
      },
    ],
  },
  {
    id: 3,
    username: 'manila_restorations',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop',
    role: 'seller',
    is_official_garage: false,
    is_kyc_verified: true,
    kyc_status: 'approved',
    location: 'Quezon City · Restoration Bay',
    tagline: 'Vintage Japanese Steel, Concours KP61 Starlets, TA22 Celicas & Period OEM Trim',
    specialties: ['Toyota', 'Datsun', 'TRD', 'Mikuni'],
    rating: 4.9,
    reviews_count: 31,
    member_since: 'Sep 2024',
    stats: {
      active_cars: 3,
      total_listings: 3,
    },
    preview_cars: [
      {
        id: 105,
        uuid: 'c105',
        title: '1974 Toyota Celica 1600 GT TA22 Concours',
        brand: 'Toyota',
        model: 'Celica',
        year: 1974,
        price: 1650000,
        image_url: 'https://images.unsplash.com/photo-1541348263662-e0c86664d509?q=80&w=600&auto=format&fit=crop',
        type: 'car',
      },
    ],
  },
]

export default function Showroom() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { openDrawerWithListing } = useChat()
  const { user, isAuthenticated } = useAuth()

  const [sellers, setSellers] = useState([])
  const [garageHighlights, setGarageHighlights] = useState([])
  const [stats, setStats] = useState({
    total_builders: 12,
    verified_builders: 9,
    active_cars: 28,
    active_parts: 140,
    total_inventory: 168,
    parking_fee_percentage: 5,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all') // 'all' | 'builders' | 'dealers' | 'merchants' | 'verified'
  const [sort, setSort] = useState(searchParams.get('sort') || 'most_listings')

  // Selected Seller Showcase View Modal State
  const [selectedSellerData, setSelectedSellerData] = useState(null)
  const [showcaseLoading, setShowcaseLoading] = useState(false)
  const [showcaseTab, setShowcaseTab] = useState('cars') // 'cars' | 'parts' | 'reviews'

  const selectedSellerUsername = searchParams.get('seller')

  // Fetch Sellers List
  const fetchSellers = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (activeTab === 'verified') {
        params.verified_only = 1
      } else if (activeTab === 'builders') {
        params.role = 'seller'
      } else if (activeTab === 'dealers') {
        params.role = 'dealer'
      } else if (activeTab === 'merchants') {
        params.role = 'parts_seller'
      }
      params.sort = sort

      const [resSellers, resStats] = await Promise.allSettled([
        showroomApi.getSellers(params),
        showroomApi.getStats(),
      ])

      if (resSellers.status === 'fulfilled' && resSellers.value?.data?.length > 0) {
        setSellers(resSellers.value.data)
        setGarageHighlights(resSellers.value.garage_highlights || [])
      } else {
        // Filter fallback items by search & tab
        let fallback = [...FALLBACK_BUILDERS]
        if (search.trim()) {
          const q = search.toLowerCase()
          fallback = fallback.filter(
            (s) =>
              s.username.toLowerCase().includes(q) ||
              s.location.toLowerCase().includes(q) ||
              s.tagline.toLowerCase().includes(q) ||
              s.specialties.some((sp) => sp.toLowerCase().includes(q)),
          )
        }
        if (activeTab === 'verified') {
          fallback = fallback.filter((s) => s.is_kyc_verified)
        } else if (activeTab === 'builders') {
          fallback = fallback.filter((s) => s.role === 'seller')
        } else if (activeTab === 'dealers') {
          fallback = fallback.filter((s) => s.role === 'dealer')
        }
        setSellers(fallback)
        setGarageHighlights([])
      }

      if (resStats.status === 'fulfilled' && resStats.value) {
        setStats(resStats.value)
      }
    } catch {
      setSellers(FALLBACK_BUILDERS)
      setGarageHighlights(FALLBACK_BUILDERS[0].preview_cars)
    } finally {
      setLoading(false)
    }
  }, [search, activeTab, sort])

  useEffect(() => {
    fetchSellers()
  }, [fetchSellers])

  // Fetch single seller showcase if `?seller=username` parameter is present
  const fetchSingleSeller = useCallback(async (username) => {
    if (!username) {
      setSelectedSellerData(null)
      return
    }
    setShowcaseLoading(true)
    try {
      const data = await showroomApi.getSeller(username)
      setSelectedSellerData(data)
    } catch {
      // Fallback seller lookup
      const found = FALLBACK_BUILDERS.find((b) => b.username === username)
      if (found) {
        setSelectedSellerData({
          seller: found,
          cars: found.preview_cars,
          parts: found.preview_parts,
          reviews: [
            {
              id: 1,
              rating: 5,
              comment: 'Exceptional build quality. Clean documentation and fast transaction!',
              created_at: '2 days ago',
              buyer: { username: 'track_enthusiast_99' },
            },
          ],
        })
      }
    } finally {
      setShowcaseLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSellerUsername) {
      fetchSingleSeller(selectedSellerUsername)
    } else {
      setSelectedSellerData(null)
    }
  }, [selectedSellerUsername, fetchSingleSeller])

  const handleOpenShowcase = (username) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('seller', username)
    setSearchParams(nextParams)
  }

  const handleCloseShowcase = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('seller')
    setSearchParams(nextParams)
    setSelectedSellerData(null)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchSellers()
  }

  // Showroom parking promo: accredited sellers/dealers without a slot yet
  const canAvailShowroom =
    isAuthenticated &&
    ['seller', 'dealer'].includes(user?.role) &&
    !sellers.some((s) => s.username === user?.username)

  return (
    <div className="showroom-page">
      {/* 1. HERO HEADER */}
      <section className="showroom-hero">
        <div className="showroom-hero-glow" />
        <div className="showroom-hero-container">
          <div className="showroom-hero-header reveal">
            <div className="showroom-badge">
              <Building2 size={14} />
              <span>GARAGE SHOWROOM & CUSTOM CARS HUB</span>
            </div>
            <h1 className="showroom-hero-title">
              The Verified <span className="showroom-gradient-text">Vehicle Showroom</span> & Builders Network
            </h1>
            <p className="showroom-hero-subtitle">
              Browse every accredited tuner, track-spec fabricator, and premier dealership across the Philippine automotive ecosystem. Discover iconic vehicle builds, official garage highlights, and explore active floor inventory.
            </p>
          </div>

          {/* Quick Metrics Bar (Cars-only) */}
          <div className="showroom-stats-strip reveal reveal-delay-1">
            <div className="showroom-stat-card">
              <div className="showroom-stat-icon">
                <Flame size={22} color="var(--color-rust)" />
              </div>
              <div>
                <div className="showroom-stat-val">{garageHighlights.length}</div>
                <div className="showroom-stat-label">Official Garage Builds on Floor</div>
              </div>
            </div>

            <div className="showroom-stat-card">
              <div className="showroom-stat-icon">
                <Car size={22} />
              </div>
              <div>
                <div className="showroom-stat-val">{stats.active_cars || stats.total_inventory || 28}</div>
                <div className="showroom-stat-label">Vehicle Builds on Floor</div>
              </div>
            </div>

            <div className="showroom-stat-card">
              <div className="showroom-stat-icon">
                <Building2 size={22} />
              </div>
              <div>
                <div className="showroom-stat-val">{stats.total_builders || sellers.length}</div>
                <div className="showroom-stat-label">Accredited Showrooms</div>
              </div>
            </div>

            <div className="showroom-stat-card">
              <div className="showroom-stat-icon">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="showroom-stat-val">{stats.verified_builders || 10}</div>
                <div className="showroom-stat-label">100% KYC Verified Garages</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OFFICIAL GARAGE HIGHLIGHTS SPOTLIGHT SECTION (WE ARE THE HIGHLIGHTS) */}
      <section className="garage-highlights-section">
        <div className="garage-highlights-container">
          <div className="garage-highlights-header">
            <div>
              <div className="garage-highlights-badge">
                <Flame size={14} />
                <span>OFFICIAL GARAGE HIGHLIGHTS</span>
              </div>
              <h2 className="garage-highlights-title">
                Our Garage <span className="showroom-gradient-text">Flagship Builds & Fleet</span>
              </h2>
              <p className="garage-highlights-sub">
                Hand-picked, meticulously engineered vehicle builds direct from Our Garage collection. 100-point inspected, documented history, and ready for immediate platform handover.
              </p>
            </div>

            <Link to="/marketplace" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              <span>Explore Marketplace</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="garage-highlights-grid">
            {(garageHighlights.length > 0 ? garageHighlights : FALLBACK_BUILDERS[0].preview_cars).map((car) => {
              const primaryImg = car.primary_image_url || car.image_url || car.image_urls?.[0] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800'
              return (
                <div key={car.id || car.uuid} className="garage-highlight-card">
                  <div className="highlight-image-box">
                    <img src={primaryImg} alt={car.title} loading="lazy" />
                    <div className="highlight-tags-floating">
                      <span className="highlight-official-badge">
                        <Sparkles size={12} />
                        <span>OUR GARAGE BUILD</span>
                      </span>
                      {car.tag && <span className="highlight-feature-badge">{car.tag}</span>}
                    </div>
                    {car.inspection_score && (
                      <span className="highlight-inspection-badge">
                        <CheckCircle2 size={12} />
                        <span>Score: {car.inspection_score}</span>
                      </span>
                    )}
                  </div>

                  <div className="highlight-card-body">
                    <div className="highlight-specs-row">
                      <span>{car.year}</span>
                      <span>•</span>
                      <span>{car.brand} {car.model}</span>
                      {car.mileage_km && (
                        <>
                          <span>•</span>
                          <span>{Number(car.mileage_km).toLocaleString()} KM</span>
                        </>
                      )}
                    </div>

                    <h3 className="highlight-card-title">{car.title}</h3>

                    <div className="highlight-card-footer">
                      <div>
                        <div className="highlight-price-label">LISTING PRICE</div>
                        <div className="highlight-price-val">{formatPeso(car.price)}</div>
                      </div>

                      <Link
                        to={`/marketplace/${car.uuid || car.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ fontWeight: 700, padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <span>View Build</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3. CONTROLS BAR: TABS, SEARCH & SORT */}
      <div className="showroom-controls-wrapper">
        <div className="showroom-controls-container">
          <div className="showroom-search-row">
            <form onSubmit={handleSearchSubmit} className="showroom-search-box">
              <Search size={18} className="showroom-search-icon" />
              <input
                type="text"
                placeholder="Search builder by @username, city (Makati, Cebu), or car brand (Toyota, Nissan)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <div className="showroom-sort-box">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="most_cars">Most Vehicle Builds</option>
                <option value="highest_rated">Highest Rated Builders</option>
                <option value="newest">Newest Joined</option>
              </select>
            </div>
          </div>

          <div className="showroom-tabs">
            <button
              type="button"
              className={`showroom-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Layers size={14} />
              <span>All Showrooms</span>
            </button>

            <button
              type="button"
              className={`showroom-tab-btn ${activeTab === 'builders' ? 'active' : ''}`}
              onClick={() => setActiveTab('builders')}
            >
              <Car size={14} />
              <span>Custom Car Builders</span>
            </button>

            <button
              type="button"
              className={`showroom-tab-btn ${activeTab === 'dealers' ? 'active' : ''}`}
              onClick={() => setActiveTab('dealers')}
            >
              <Building2 size={14} />
              <span>Premier Dealerships</span>
            </button>

            <button
              type="button"
              className={`showroom-tab-btn ${activeTab === 'verified' ? 'active' : ''}`}
              onClick={() => setActiveTab('verified')}
            >
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              <span>KYC Verified Garages</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. SHOWROOM BUILDERS GRID */}
      <main className="showroom-main">
        {/* Seller Activation Banner (ONLY SHOWN FOR ACCREDITED SELLERS / DEALERS) */}
        {canAvailShowroom && (
          <div
            style={{
              marginBottom: 24,
              padding: '16px 22px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #faf7f2 0%, #ffffff 100%)',
              border: '1.5px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--color-orange-light)',
                  color: 'var(--color-rust)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={20} />
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--color-heading)' }}>
                  Want Your Custom Builds & Garage Showcased Here?
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Accredited sellers can avail Showroom Parking slots for their marketplace listings with our standard {stats.parking_fee_percentage || 5}% parking fee.
                </div>
              </div>
            </div>

            <Link
              to="/my-listings"
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Avail Showroom Slot</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <p>Loading verified builders and garage showrooms...</p>
          </div>
        ) : sellers.length === 0 ? (
          <div className="showroom-empty">
            <div className="showroom-empty-icon">
              <Building2 size={32} />
            </div>
            <h3>No Builders or Showrooms Found</h3>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: 460, margin: '8px auto 20px' }}>
              No garage matched your search criteria. Try clearing filters or searching for another tuner username or car brand.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch('')
                setActiveTab('all')
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="showroom-grid">
            {sellers.map((seller) => {
              const isOfficial = seller.is_official_garage || seller.username === 'our_garage_official' || seller.username === 'makati_speedworks'
              const roleDisplay = isOfficial
                ? 'Official Garage'
                : seller.role === 'dealer'
                ? 'Premier Dealer'
                : 'Custom Builder'
              const roleClass = isOfficial ? 'official' : (seller.role || 'builder')

              const previewCars = seller.preview_cars || []

              return (
                <div key={seller.id} className={`seller-showroom-card ${isOfficial ? 'seller-card-official' : ''}`}>
                  {/* Card Top / Header */}
                  <div className="seller-card-header">
                    <div className="seller-card-top">
                      <div className="seller-avatar-wrapper">
                        {seller.avatar_url ? (
                          <img
                            src={seller.avatar_url}
                            alt={seller.username}
                            className="seller-avatar"
                            loading="lazy"
                          />
                        ) : (
                          <div className="seller-avatar">
                            {seller.username ? seller.username.charAt(0).toUpperCase() : 'B'}
                          </div>
                        )}
                        {seller.is_kyc_verified && (
                          <div className="seller-kyc-indicator" title="KYC Verified Garage Builder">
                            <ShieldCheck size={14} />
                          </div>
                        )}
                      </div>

                      <div className="seller-header-info">
                        <div className="seller-username-row">
                          <span className="seller-username">@{seller.username}</span>
                          <span className={`seller-role-badge ${roleClass}`}>{roleDisplay}</span>
                        </div>

                        <div className="seller-meta-sub">
                          <span className="seller-location">
                            <MapPin size={13} color="var(--color-rust)" />
                            <span>{seller.location}</span>
                          </span>
                          <span>•</span>
                          <span>{seller.member_since}</span>
                        </div>
                      </div>
                    </div>

                    <p className="seller-tagline">{seller.tagline}</p>
                  </div>

                  {/* KPI Stats Strip (Cars-only) */}
                  <div className="seller-kpi-strip">
                    <div className="seller-kpi-item">
                      <div className="seller-kpi-val">
                        <Car size={15} color="var(--color-rust)" />
                        <span>{seller.stats?.active_cars ?? 0}</span>
                      </div>
                      <div className="seller-kpi-label">Vehicles Listed</div>
                    </div>

                    <div className="seller-kpi-item">
                      <div className="seller-kpi-val" style={{ color: '#f59e0b' }}>
                        <Star size={15} fill="#f59e0b" />
                        <span>{seller.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                      <div className="seller-kpi-label">{seller.reviews_count ?? 0} reviews</div>
                    </div>
                  </div>

                  {/* Specialties Tag Chips */}
                  {seller.specialties && seller.specialties.length > 0 && (
                    <div className="seller-specialties">
                      {seller.specialties.slice(0, 4).map((spec) => (
                        <span key={spec} className="specialty-chip">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Live Inventory Preview Showcase in Card (Cars-only) */}
                  <div className="seller-preview-section">
                    <div className="preview-header">
                      <span>Floor Showcase ({seller.stats?.active_cars ?? previewCars.length})</span>
                      <button
                        type="button"
                        onClick={() => handleOpenShowcase(seller.username)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-rust)', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}
                      >
                        <span>View All</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {previewCars.length > 0 ? (
                      <div className="preview-items-row">
                        {previewCars.map((item) => (
                          <Link
                            key={`car-${item.id || item.uuid}`}
                            to={`/marketplace/${item.uuid || item.id}`}
                            className="preview-item-pill"
                            title={item.title}
                          >
                            <img
                              src={item.image_url || 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?q=80&w=400&auto=format&fit=crop'}
                              alt={item.title}
                              className="preview-item-img"
                              loading="lazy"
                            />
                            <span className="preview-item-type-tag">Car</span>
                            <div className="preview-item-info">
                              <span className="preview-item-title">{item.title}</span>
                              <span className="preview-item-price">{formatPeso(item.price)}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0' }}>
                        No active vehicles currently displayed on floor.
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="seller-card-footer">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleOpenShowcase(seller.username)}
                    >
                      <span>Explore Showroom</span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenShowcase(seller.username)}
                      title={`Pick a listing to message @${seller.username} — chats are per listing`}
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 5. DEDICATED SELLER SHOWCASE MODAL / INVENTORY EXPLORER (CARS ONLY) */}
      {selectedSellerUsername && (
        <div className="showcase-modal-overlay" onClick={handleCloseShowcase}>
          <div className="showcase-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="showcase-close-btn"
              onClick={handleCloseShowcase}
              aria-label="Close Showroom View"
            >
              <X size={18} />
            </button>

            {showcaseLoading || !selectedSellerData ? (
              <div style={{ padding: '80px 24px', textAlign: 'center' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
                <p>Loading garage floor inventory...</p>
              </div>
            ) : (
              <>
                {/* Banner Profile Header */}
                <div className="showcase-modal-banner">
                  <div className="showcase-profile-row">
                    <img
                      src={selectedSellerData.seller.avatar_url}
                      alt={selectedSellerData.seller.username}
                      className="showcase-large-avatar"
                    />

                    <div className="showcase-profile-details">
                      <div className="showcase-title-row">
                        <span className="showcase-username">@{selectedSellerData.seller.username}</span>
                        {selectedSellerData.seller.is_official_garage ? (
                          <span
                            className="badge"
                            style={{
                              background: '#ffedd5',
                              color: '#c2410c',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              fontWeight: 700,
                            }}
                          >
                            <Flame size={14} />
                            <span>Official Garage Collection</span>
                          </span>
                        ) : selectedSellerData.seller.is_kyc_verified ? (
                          <span
                            className="badge"
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              fontWeight: 700,
                            }}
                          >
                            <ShieldCheck size={14} />
                            <span>KYC Verified Builder</span>
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#d1d5dc', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={14} color="#ff9b66" />
                          <span>{selectedSellerData.seller.location}</span>
                        </span>
                        <span>•</span>
                        <span>Member: {selectedSellerData.seller.member_since}</span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
                          <Star size={14} fill="#f59e0b" />
                          <span>{selectedSellerData.seller.rating?.toFixed(1) || '5.0'} Rating</span>
                        </span>
                      </div>

                      <p style={{ margin: '10px 0 0', fontSize: 14, color: '#f1f5f9', maxWidth: 700 }}>
                        {selectedSellerData.seller.tagline}
                      </p>

                      <div className="showcase-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setShowcaseTab('cars')
                            document
                              .querySelector('.showcase-modal-body')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          title="Chats are per listing — pick a build below to message the seller about that listing"
                        >
                          <MessageSquare size={15} />
                          <span>Message about a listing below</span>
                        </button>

                        <Link
                          to={`/marketplace?seller_username=${selectedSellerData.seller.username}`}
                          className="btn btn-secondary"
                          style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.25)' }}
                        >
                          <ExternalLink size={15} />
                          <span>View in Marketplace</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Showcase Body (Cars Only) */}
                <div className="showcase-modal-body">
                  <div className="showcase-nav-tabs">
                    <button
                      type="button"
                      className={`showcase-nav-tab ${showcaseTab === 'cars' ? 'active' : ''}`}
                      onClick={() => setShowcaseTab('cars')}
                    >
                      <Car size={16} />
                      <span>Vehicle Builds on Floor ({selectedSellerData.cars?.length || 0})</span>
                    </button>

                    <button
                      type="button"
                      className={`showcase-nav-tab ${showcaseTab === 'reviews' ? 'active' : ''}`}
                      onClick={() => setShowcaseTab('reviews')}
                    >
                      <Star size={16} />
                      <span>Buyer Reviews ({selectedSellerData.reviews?.length || 0})</span>
                    </button>
                  </div>

                  {/* Cars Tab */}
                  {showcaseTab === 'cars' && (
                    <div>
                      {selectedSellerData.cars && selectedSellerData.cars.length > 0 ? (
                        <div className="showcase-inventory-grid">
                          {selectedSellerData.cars.map((car) => (
                            <div
                              key={car.id}
                              className="seller-showroom-card"
                              style={{ margin: 0 }}
                            >
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={car.primary_image_url || car.image_urls?.[0] || 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?q=80&w=600'}
                                  alt={car.title}
                                  style={{ width: '100%', height: 180, objectFit: 'cover' }}
                                />
                                {car.inspection_score && (
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: 10,
                                      right: 10,
                                      background: 'rgba(16, 185, 129, 0.9)',
                                      color: '#ffffff',
                                      padding: '3px 8px',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    Score: {car.inspection_score}
                                  </span>
                                )}
                              </div>
                              <div style={{ padding: 16 }}>
                                <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: 'var(--color-heading)' }}>
                                  {car.title}
                                </h4>
                                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                                  {car.year} · {car.brand} {car.model} · {car.transmission || 'Manual'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-rust)' }}>
                                    {formatPeso(car.price)}
                                  </span>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ padding: '6px 14px', fontSize: 13 }}
                                      onClick={() =>
                                        openDrawerWithListing({
                                          seller: selectedSellerData.seller,
                                          listing: car,
                                          listingType: 'car',
                                        })
                                      }
                                      title={`Message seller about ${car.title}`}
                                    >
                                      <MessageSquare size={14} />
                                      <span>Message</span>
                                    </button>
                                    <Link
                                      to={`/marketplace/${car.uuid || car.id}`}
                                      className="btn btn-primary"
                                      style={{ padding: '6px 14px', fontSize: 13 }}
                                    >
                                      View Build
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          No vehicles currently listed on the showroom floor.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reviews Tab */}
                  {showcaseTab === 'reviews' && (
                    <div className="showcase-reviews-list">
                      {selectedSellerData.reviews && selectedSellerData.reviews.length > 0 ? (
                        selectedSellerData.reviews.map((rev) => (
                          <div key={rev.id} className="showcase-review-card">
                            <div className="showcase-review-top">
                              <div className="showcase-reviewer">
                                {rev.buyer?.avatar_url ? (
                                  <img
                                    src={rev.buyer.avatar_url}
                                    alt={rev.buyer.username}
                                    className="showcase-reviewer-avatar"
                                  />
                                ) : (
                                  <div className="showcase-reviewer-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                    {rev.buyer?.username ? rev.buyer.username.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                                    @{rev.buyer?.username || 'verified_buyer'}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                    Verified Platform Buyer • {rev.created_at}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f59e0b' }}>
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={14}
                                    fill={i < rev.rating ? '#f59e0b' : 'none'}
                                    stroke={i < rev.rating ? '#f59e0b' : '#94a3b8'}
                                  />
                                ))}
                              </div>
                            </div>

                            <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-heading)' }}>
                              "{rev.comment}"
                            </p>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                          No buyer reviews published for this showroom yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

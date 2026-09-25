import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Coffee,
  Sparkles,
  Wrench,
  Gauge,
  ArrowRight,
  Star,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Award,
  Check,
  ArrowUpRight,
} from 'lucide-react'
import { marketplaceCars } from '../api/cars.js'
import { marketplaceParts } from '../api/parts.js'
import { useTaxonomy, groupBrandsByRegion, categoryDisplay, formatCount } from '../api/taxonomy.js'
import CarCard from '../components/CarCard.jsx'
import PartCard from '../components/PartCard.jsx'
import CategoryCard from '../components/CategoryCard.jsx'
import './Home.css'

/* ——— FAQ Data ——— */
const FAQS = [
  {
    q: 'How does the 100-Point Garage Inspection Guarantee work?',
    a: 'Every car and verified high-value performance component undergoes a rigorous physical and diagnostic inspection at our accredited partner lift bays. We evaluate compression, chassis integrity, rust/flood history, OBD-II telemetry, and paperwork legitimacy. A complete photographic report is provided before any transaction takes place.'
  },
  {
    q: 'How are marketplace transactions protected on Garage?',
    a: 'When you purchase a vehicle or part, all orders are backed by our Buyer Protection Guarantee. Sellers are verified and required to supply accurate condition and fitment details with tracking confirmation.'
  },
  {
    q: 'Can I test drive or inspect items at the Makati Showroom?',
    a: 'Absolutely! Our Makati Showroom & Barako Café is open Tuesday through Sunday. You can inspect floor builds on the lift bay, consult with our master mechanics, and enjoy single-origin kapeng barako while discussing build specs.'
  },
  {
    q: 'How does nationwide shipping work for engines, wheels, and cars?',
    a: 'We partner with insured automotive freight carriers for Luzon, Visayas, and Mindanao. Engines and fragile aero parts are secured in custom wooden crates, tracked with real-time GPS, and insured for 100% of their invoiced value.'
  }
]

/* ——— Community Testimonials ——— */
const TESTIMONIALS = [
  {
    name: 'Anton Valenzuela',
    role: '1972 Celica GT Owner · Makati',
    avatar: 'A',
    text: 'Sold my restored Celica through the Makati showroom in under 48 hours. Zero time-wasters, transparent inspection paperwork, and prompt bank transfer upon handover.',
    stars: 5,
    tag: 'Verified Seller'
  },
  {
    name: 'Mark Ranillo',
    role: 'Silvia S15 Builder · Davao City',
    avatar: 'M',
    text: 'Ordered an HKS exhaust and Garrett turbo kit delivered to Mindanao. Perfectly crated, arrived in 3 days, and genuine Japanese serials verified on the platform.',
    stars: 5,
    tag: 'Verified Buyer'
  },
  {
    name: 'Carlo Mendoza',
    role: 'Civic EG Track Enthusiast · Cebu',
    avatar: 'C',
    text: 'The 100-point inspection report saved me from purchasing a disguised flood-damaged chassis from another seller. The peace of mind here is priceless.',
    stars: 5,
    tag: 'Verified Buyer'
  }
]

export default function Home() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('parts')
  const [carFilter, setCarFilter] = useState('all')
  const [partFilter, setPartFilter] = useState('all')
  const [openFaq, setOpenFaq] = useState(0)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)
  const [showRsvpModal, setShowRsvpModal] = useState(false)

  // Quick Finder State
  const [finderMake, setFinderMake] = useState('')
  const [finderModel, setFinderModel] = useState('')
  const [finderCat, setFinderCat] = useState('')

  // Live Database Records
  const [liveCars, setLiveCars] = useState([])
  const [liveParts, setLiveParts] = useState([])
  const [isLoadingCars, setIsLoadingCars] = useState(true)
  const [isLoadingParts, setIsLoadingParts] = useState(true)

  // Live taxonomy — brands, models & categories served by the backend.
  const { brands: liveBrands, categories: liveCategories, models: allModels } = useTaxonomy()
  const brandGroups = useMemo(() => groupBrandsByRegion(liveBrands), [liveBrands])
  const selectedBrand = useMemo(
    () => liveBrands.find((b) => b.name === finderMake),
    [liveBrands, finderMake]
  )
  // Model/Chassis dropdown always has contents: every cataloged model up
  // front, narrowed to the picked Make when one is selected.
  const finderModels = useMemo(
    () => (selectedBrand ? allModels.filter((m) => m.brand_id === selectedBrand.id) : allModels),
    [allModels, selectedBrand]
  )
  const finderModelGroups = useMemo(() => {
    if (selectedBrand) return null
    const byBrand = new Map()
    for (const m of allModels) {
      if (!byBrand.has(m.brand_name)) byBrand.set(m.brand_name, [])
      byBrand.get(m.brand_name).push(m)
    }
    return [...byBrand.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [allModels, selectedBrand])
  const displayCategories = useMemo(
    () =>
      liveCategories.slice(0, 6).map((cat) => {
        const display = categoryDisplay(cat.slug)
        return {
          id: cat.slug,
          name: cat.name,
          count: formatCount(cat.parts_count),
          icon: display.icon,
          img: cat.image_url || display.img,
        }
      }),
    [liveCategories]
  )

  useEffect(() => {
    setIsLoadingCars(true)
    marketplaceCars.list({ per_page: 8, sort: 'newest' })
      .then((res) => {
        setLiveCars(res?.data || [])
      })
      .catch(() => {
        setLiveCars([])
      })
      .finally(() => setIsLoadingCars(false))

    setIsLoadingParts(true)
    marketplaceParts.list({ per_page: 9, sort: 'newest' })
      .then((res) => {
        setLiveParts(res?.data || [])
      })
      .catch(() => {
        setLiveParts([])
      })
      .finally(() => setIsLoadingParts(false))
  }, [])

  // Scroll Reveal Observer
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleFinderSubmit = (e) => {
    e.preventDefault()
    if (activeTab === 'cars') {
      const query = [finderMake, finderModel].filter(Boolean).join(' ')
      navigate(`/marketplace?search=${encodeURIComponent(query)}`)
    } else {
      const query = [finderMake, finderModel, finderCat].filter(Boolean).join(' ')
      navigate(`/parts?search=${encodeURIComponent(query)}`)
    }
  }

  const handleNewsletter = (e) => {
    e.preventDefault()
    if (!newsletterEmail) return
    setNewsletterSubscribed(true)
    setTimeout(() => {
      setNewsletterEmail('')
    }, 3000)
  }

  const filteredCars = carFilter === 'all' 
    ? liveCars 
    : liveCars.filter(c => {
        if (c.category) return c.category === carFilter
        if (carFilter === 'jdm') return ['nissan', 'toyota', 'honda', 'mazda', 'subaru', 'mitsubishi'].includes((c.brand || c.make || '').toLowerCase())
        if (carFilter === 'classics') return (c.year && Number(c.year) <= 1990)
        if (carFilter === '4x4') return c.body_style === 'suv' || c.body_style === 'pickup'
        return true
      })

  const filteredParts = partFilter === 'all'
    ? liveParts
    : liveParts.filter(p => {
        const cat = (p.category || p.cat || '').toLowerCase()
        return cat.includes(partFilter) || (partFilter === 'wheels' && cat.includes('tire'))
      })

  return (
    <div className="home-modern">
      {/* ===================================================================
          1. HERO SECTION & QUICK VEHICLE / PART FINDER
          =================================================================== */}
      <section className="hero-modern">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />

        <div className="hero-container">
          <div className="hero-content reveal">
            <div className="hero-badge">
              <span className="hero-badge-pulse" />
              <span>Philippines&apos; Premier Automotive Hub · 15,000+ Enthusiasts</span>
            </div>

            <h1 className="hero-heading">
              Find Your Ride.<br />
              Build Your Dream.<br />
              <span className="hero-gradient-text">Drive Your Story.</span>
            </h1>

            <p className="hero-description">
              The trusted marketplace where Philippine drivers, restorers, and track builders trade 
              <strong> 100% verified cars</strong> and <strong>genuine parts</strong>. Authentic listings, 
              direct seller connections, and a passionate community.
            </p>

            {/* Quick Finder Interactive Widget (Unique high-utility tool) */}
            <div className="quick-finder-card">
              <div className="finder-tabs">
                <button 
                  type="button" 
                  className={`finder-tab ${activeTab === 'parts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('parts')}
                >
                  <Wrench size={15} />
                  <span>Find Parts & Upgrades</span>
                </button>
                <button 
                  type="button" 
                  className={`finder-tab ${activeTab === 'cars' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cars')}
                >
                  <Gauge size={15} />
                  <span>Find Verified Cars</span>
                </button>
              </div>

              <form className="finder-form" onSubmit={handleFinderSubmit}>
                <div className="finder-field">
                  <label htmlFor="finder-make">Make / Manufacturer</label>
                  <select 
                    id="finder-make"
                    value={finderMake} 
                    onChange={(e) => setFinderMake(e.target.value)}
                  >
                    <option value="">All Makes (Toyota, Nissan, Ford, BMW...)</option>
                    {brandGroups.map((group) => (
                      <optgroup key={group.key} label={group.region}>
                        {group.brands.map((brand) => (
                          <option key={brand.id} value={brand.name}>
                            {brand.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="finder-field">
                  <label htmlFor="finder-model">Model / Chassis Code</label>
                  <select 
                    id="finder-model"
                    value={finderModel} 
                    onChange={(e) => setFinderModel(e.target.value)}
                  >
                    <option value="">All Models (Civic, Silvia, Celica...)</option>
                    {selectedBrand ? (
                      finderModels.map((model) => (
                        <option key={model.id} value={model.name}>
                          {model.name}{model.chassis_code ? ` (${model.chassis_code})` : ''}
                        </option>
                      ))
                    ) : (
                      (finderModelGroups || []).map(([brandName, models]) => (
                        <optgroup key={brandName} label={brandName}>
                          {models.map((model) => (
                            <option key={model.id} value={model.name}>
                              {model.name}{model.chassis_code ? ` (${model.chassis_code})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                </div>

                {activeTab === 'parts' && (
                  <div className="finder-field">
                    <label htmlFor="finder-cat">Part Category</label>
                    <select 
                      id="finder-cat"
                      value={finderCat} 
                      onChange={(e) => setFinderCat(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {liveCategories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button type="submit" className="btn btn-primary finder-submit-btn">
                  <Search size={16} />
                  <span>Search Inventory</span>
                </button>
              </form>
            </div>

            {/* Quick Hero Trust Indicators */}
            <div className="hero-trust-row">
              <div className="trust-pill">
                <ShieldCheck size={16} className="trust-icon" />
                <span>Verified Listing Details</span>
              </div>
              <div className="trust-pill">
                <CheckCircle2 size={16} className="trust-icon" />
                <span>Buyer Protection Guarantee</span>
              </div>
              <div className="trust-pill">
                <Coffee size={16} className="trust-icon" />
                <span>Makati Showroom & Café</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Right Side Highlights */}
          <div className="hero-showcase reveal reveal-delay-2" aria-hidden="true">
            <div className="hero-card-featured">
              <img 
                src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=700&auto=format&fit=crop" 
                alt="Featured Nissan Silvia S15 Spec-R"
                className="hero-card-img" 
              />
              <div className="hero-card-overlay">
                <div className="hero-card-tag">Hot Spotlight · JDM Legend</div>
                <div className="hero-card-title">1998 Nissan Silvia S15 Spec-R</div>
                <div className="hero-card-price">₱ 1,240,000 · Verified 99/100</div>
              </div>
            </div>

            {/* Floating Micro-Cards */}
            <div className="floating-stat-badge float-1">
              <Sparkles size={16} color="var(--color-orange)" />
              <div>
                <strong>1,240+</strong>
                <span>Verified Builds</span>
              </div>
            </div>

            <div className="floating-stat-badge float-2">
              <Truck size={16} color="var(--color-rust)" />
              <div>
                <strong>Nationwide</strong>
                <span>Safe Freight</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. FOUR VALUE PILLARS (Wholesome Trust Strip)
          =================================================================== */}
      <section className="section-pillars">
        <div className="pillars-inner">
          <div className="pillar-item reveal">
            <div className="pillar-icon-box">
              <ShieldCheck size={24} />
            </div>
            <div className="pillar-text">
              <h4>100-Point Verified Inspection</h4>
              <p>Every vehicle and core part passes certified chassis, engine, and safety diagnostic checks.</p>
            </div>
          </div>

          <div className="pillar-item reveal reveal-delay-1">
            <div className="pillar-icon-box">
              <Award size={24} />
            </div>
            <div className="pillar-text">
              <h4>Buyer Protection Security</h4>
              <p>Your orders are backed by verified seller profiles, tracking confirmations, and clear return windows.</p>
            </div>
          </div>

          <div className="pillar-item reveal reveal-delay-2">
            <div className="pillar-icon-box">
              <Truck size={24} />
            </div>
            <div className="pillar-text">
              <h4>Insured Door-to-Door Freight</h4>
              <p>Specialized wooden crating and insured logistics across Luzon, Visayas, and Mindanao.</p>
            </div>
          </div>

          <div className="pillar-item reveal reveal-delay-3">
            <div className="pillar-icon-box">
              <Coffee size={24} />
            </div>
            <div className="pillar-text">
              <h4>Makati Showroom & Café</h4>
              <p>Experience builds in person, inspect on our lift bays, and chat specs over fresh Barako coffee.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. EXPLORE BY CATEGORIES (Visual Card Grid)
          =================================================================== */}
      <section className="section-modern section--categories">
        <div className="section-container">
          <div className="section-header reveal">
            <div>
              <span className="section-eyebrow">Curated Collections</span>
              <h2 className="section-title">Explore by Part & Build Category</h2>
              <p className="section-subtitle">Everything needed for restorations, track days, and daily maintenance.</p>
            </div>
            <Link to="/parts" className="btn btn-secondary">
              <span>View All Categories</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="categories-grid">
            {displayCategories.map((cat, i) => (
              <CategoryCard 
                key={cat.id} 
                category={cat} 
                className={`reveal reveal-delay-${(i % 3) + 1}`} 
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          4. FEATURED VERIFIED VEHICLES (Modern Card Deck)
          =================================================================== */}
      <section className="section-modern section--vehicles">
        <div className="section-container">
          <div className="section-header reveal">
            <div>
              <span className="section-eyebrow">Verified Showroom</span>
              <h2 className="section-title">Fresh Sheet Metal. Inspected & Ready.</h2>
              <p className="section-subtitle">Hand-picked enthusiast cars backed with full photographic inspection reports.</p>
            </div>

            {/* Filter Pills */}
            <div className="filter-pill-group">
              <button 
                type="button" 
                className={`filter-pill ${carFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCarFilter('all')}
              >
                All Featured
              </button>
              <button 
                type="button" 
                className={`filter-pill ${carFilter === 'classics' ? 'active' : ''}`}
                onClick={() => setCarFilter('classics')}
              >
                Restored Classics
              </button>
              <button 
                type="button" 
                className={`filter-pill ${carFilter === 'jdm' ? 'active' : ''}`}
                onClick={() => setCarFilter('jdm')}
              >
                JDM Legends
              </button>
              <button 
                type="button" 
                className={`filter-pill ${carFilter === '4x4' ? 'active' : ''}`}
                onClick={() => setCarFilter('4x4')}
              >
                4x4 & Overland
              </button>
            </div>
          </div>

          <div className="modern-car-grid">
            {filteredCars.map((car, i) => (
              <CarCard
                key={car.id}
                car={car}
                className={`reveal reveal-delay-${(i % 4) + 1}`}
              />
            ))}
          </div>

          {/* Marketplace Stats Bar */}
          <div className="marketplace-stats-bar reveal">
            <div className="stat-item">
              <span className="stat-number">1,240+</span>
              <span className="stat-label">Verified Listings</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">98.4%</span>
              <span className="stat-label">Inspection Pass Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">48 Hours</span>
              <span className="stat-label">Average Time to Deal</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">4.9 ★</span>
              <span className="stat-label">Community Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. TRENDING PARTS & PERFORMANCE COMPONENTS
          =================================================================== */}
      <section className="section-modern section--parts">
        <div className="section-container">
          <div className="section-header reveal">
            <div>
              <span className="section-eyebrow">Performance Catalog</span>
              <h2 className="section-title">Trending Parts, Upgrades & Fab</h2>
              <p className="section-subtitle">OEM genuine, Japanese surplus, and bespoke components searchable by fitment.</p>
            </div>

            <div className="filter-pill-group">
              <button 
                type="button" 
                className={`filter-pill ${partFilter === 'all' ? 'active' : ''}`}
                onClick={() => setPartFilter('all')}
              >
                All Trending
              </button>
              <button 
                type="button" 
                className={`filter-pill ${partFilter === 'engine' ? 'active' : ''}`}
                onClick={() => setPartFilter('engine')}
              >
                Engine & Turbo
              </button>
              <button 
                type="button" 
                className={`filter-pill ${partFilter === 'wheels' ? 'active' : ''}`}
                onClick={() => setPartFilter('wheels')}
              >
                Wheels & Rims
              </button>
              <button 
                type="button" 
                className={`filter-pill ${partFilter === 'brakes' ? 'active' : ''}`}
                onClick={() => setPartFilter('brakes')}
              >
                Brakes & BBK
              </button>
              <button 
                type="button" 
                className={`filter-pill ${partFilter === 'interior' ? 'active' : ''}`}
                onClick={() => setPartFilter('interior')}
              >
                Interior & Seats
              </button>
            </div>
          </div>

          <div className="modern-parts-grid">
            {filteredParts.map((part, i) => (
              <PartCard
                key={part.id}
                part={part}
                className={`reveal reveal-delay-${(i % 3) + 1}`}
              />
            ))}
          </div>

          {/* Wanted Request Banner */}
          <div className="wanted-ad-banner reveal">
            <div className="wanted-ad-text">
              <div className="wanted-badge">Need a Rare Part?</div>
              <h3>Can&apos;t find your specific engine code, aero part, or wheel specs?</h3>
              <p>Post a free <strong>Wanted Ad</strong> and our verified network of 280+ Japanese & local surplus shops will ping you with quotes.</p>
            </div>
            <Link to="/parts" className="btn btn-primary wanted-ad-btn">
              <span>Post Wanted Request</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================
          6. SHOWROOM & BARAKO CAFÉ (Wholesome Lifestyle Feature)
          =================================================================== */}
      <section className="section-modern section--showroom">
        <div className="section-container">
          <div className="showroom-grid">
            <div className="showroom-media-container reveal">
              <img 
                src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=900&auto=format&fit=crop" 
                alt="Makati Showroom & Barako Café" 
                className="showroom-main-img"
                loading="lazy"
              />
              <div className="showroom-floating-card">
                <div className="showroom-event-tag">
                  <Coffee size={14} /> Weekly Enthusiast Gathering
                </div>
                <h4>Saturday Coffee & Turbos</h4>
                <p>Every Saturday · 7:00 AM · Makati Showroom Floor</p>
                <div className="showroom-attendees">
                  <div className="attendee-avatars">
                    <span>A</span>
                    <span>M</span>
                    <span>C</span>
                    <span>+48</span>
                  </div>
                  <span className="attendee-text">Builders attending this week</span>
                </div>
              </div>
            </div>

            <div className="showroom-info-container reveal reveal-delay-2">
              <span className="section-eyebrow">Community & Physical Hub</span>
              <h2 className="section-title">See the Metal. Hear the Cam. Taste the Barako.</h2>
              <p className="showroom-lead">
                Our Makati showroom rotates 12 curated builder projects — from concours-restored Celicas to trail-proven Raptors. 
                Pull up a stool at our café, talk cam specs over artisanal Kapeng Barako, and book lift-bay inspections with zero sales pressure.
              </p>

              <div className="showroom-features-list">
                <div className="showroom-feature-row">
                  <div className="feature-check">✓</div>
                  <div>
                    <strong>12 Curated Floor Builds on Rotation</strong>
                    <p>Always something fresh to inspect, photograph, and admire.</p>
                  </div>
                </div>

                <div className="showroom-feature-row">
                  <div className="feature-check">✓</div>
                  <div>
                    <strong>On-Site Lift Inspection & Diagnostics Bay</strong>
                    <p>Get under the chassis with our master mechanics before making an offer.</p>
                  </div>
                </div>

                <div className="showroom-feature-row">
                  <div className="feature-check">✓</div>
                  <div>
                    <strong>Artisanal Barako & Single Origin Café</strong>
                    <p>Freshly roasted Batangas barako, espresso blends, and artisan sourdough bakes.</p>
                  </div>
                </div>
              </div>

              <div className="showroom-stats-pill">
                <div><strong>12</strong><span>Floor Builds</span></div>
                <div className="stat-sep" />
                <div><strong>5,000+</strong><span>Cups Poured</span></div>
                <div className="stat-sep" />
                <div><strong>320+</strong><span>Builds Showcased</span></div>
              </div>

              <div className="showroom-actions">
                <Link to="/showroom" className="btn btn-primary">
                  <span>Plan Your Visit</span>
                  <ArrowRight size={16} />
                </Link>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowRsvpModal(true)}
                >
                  <Calendar size={16} />
                  <span>RSVP for Saturday Meet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          7. HOW IT WORKS (Modern 4-Step Timeline)
          =================================================================== */}
      <section className="section-modern section--how-it-works">
        <div className="section-container">
          <div className="section-header center reveal">
            <span className="section-eyebrow" style={{ margin: '0 auto' }}>Transparent Process</span>
            <h2 className="section-title">From Shortlist to Driveway in 4 Steps</h2>
            <p className="section-subtitle">Engineered for absolute trust — no shady sellers, no guesswork, just verified deals.</p>
          </div>

          <div className="steps-container">
            <div className="step-card reveal reveal-delay-1">
              <div className="step-num">01</div>
              <div className="step-icon-box">
                <Search size={22} />
              </div>
              <h3>Browse & Filter</h3>
              <p>Filter by make, chassis code, budget, or modification build. Every listing features verified photos and full history.</p>
            </div>

            <div className="step-card reveal reveal-delay-2">
              <div className="step-num">02</div>
              <div className="step-icon-box">
                <ShieldCheck size={22} />
              </div>
              <h3>Inspect with Confidence</h3>
              <p>Review comprehensive 100-point inspection reports, diagnostic readouts, and lift bay photos with no surprises.</p>
            </div>

            <div className="step-card reveal reveal-delay-3">
              <div className="step-num">03</div>
              <div className="step-icon-box">
                <Award size={22} />
              </div>
              <h3>Order with Buyer Protection</h3>
              <p>Chat with sellers, confirm fitment, and pay securely with transparent buyer protection policies.</p>
            </div>

            <div className="step-card reveal reveal-delay-4">
              <div className="step-num">04</div>
              <div className="step-icon-box">
                <Truck size={22} />
              </div>
              <h3>Drive & Belong</h3>
              <p>Pick up at our Makati showroom or have it crated & delivered to your doorstep. Join our builder meets and track days.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          8. COMMUNITY REVIEWS & BUILDER TESTIMONIALS
          =================================================================== */}
      <section className="section-modern section--testimonials">
        <div className="section-container">
          <div className="section-header center reveal">
            <span className="section-eyebrow" style={{ margin: '0 auto' }}>Builder Stories</span>
            <h2 className="section-title">Loved by Philippine Drivers & Collectors</h2>
            <p className="section-subtitle">Real experiences from enthusiasts across Manila, Cebu, Davao, and beyond.</p>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((testi, i) => (
              <div key={testi.name} className={`testimonial-card reveal reveal-delay-${i + 1}`}>
                <div className="testimonial-stars">
                  {[...Array(testi.stars)].map((_, idx) => (
                    <Star key={idx} size={15} fill="#e06c35" color="#e06c35" />
                  ))}
                </div>
                <p className="testimonial-text">&ldquo;{testi.text}&rdquo;</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{testi.avatar}</div>
                  <div className="testimonial-details">
                    <span className="testimonial-name">{testi.name}</span>
                    <span className="testimonial-role">{testi.role}</span>
                  </div>
                  <span className="testimonial-badge">{testi.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          9. FREQUENTLY ASKED QUESTIONS (Accordion)
          =================================================================== */}
      <section className="section-modern section--faq">
        <div className="section-container">
          <div className="section-header center reveal">
            <span className="section-eyebrow" style={{ margin: '0 auto' }}>Got Questions?</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">Everything you need to know about buying, selling, and inspecting on Garage.</p>
          </div>

          <div className="faq-accordion-container reveal">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div key={faq.q} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button 
                    type="button" 
                    className="faq-question-btn"
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-q-text">{faq.q}</span>
                    <span className="faq-toggle-icon">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer-content">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================
          10. DUAL CONVERSION CTA (Buy vs Sell)
          =================================================================== */}
      <section className="section-modern section--dual-cta">
        <div className="section-container">
          <div className="dual-cta-grid">
            <div className="cta-banner cta-banner--buy reveal">
              <span className="cta-kicker">Looking for Your Next Build?</span>
              <h2>Browse 1,200+ Verified Enthusiast Cars</h2>
              <p>Filter by make, budget, or chassis code. Every listing backed with our 100-point inspection guarantee.</p>
              <Link to="/marketplace" className="btn btn-primary cta-action-btn">
                <span>Explore Verified Cars</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="cta-banner cta-banner--sell reveal reveal-delay-2">
              <span className="cta-kicker">Have a Build or Surplus Parts?</span>
              <h2>Consign or Sell Your Vehicle Fast</h2>
              <p>List directly or place your build on our Makati showroom floor. Reach 15,000+ serious Philippine buyers.</p>
              <Link to="/sell" className="btn btn-steel cta-action-btn">
                <span>List Your Build / Part</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          11. NEWSLETTER / GARAGE CLUB PERKS
          =================================================================== */}
      <section className="section-newsletter">
        <div className="newsletter-inner reveal">
          <div className="newsletter-copy">
            <div className="newsletter-badge">
              <Sparkles size={14} /> Join the Garage Club
            </div>
            <h2>Get ₱500 Off Your First Parts Order</h2>
            <p>Subscribe for weekly surplus drops, rare JDM restocks, and exclusive invitations to Makati showroom meets.</p>
          </div>

          <form className="newsletter-form" onSubmit={handleNewsletter}>
            <div className="newsletter-input-group">
              <input 
                type="email" 
                placeholder="Enter your email address..." 
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                <span>Claim ₱500 Voucher</span>
              </button>
            </div>
            {newsletterSubscribed && (
              <div className="newsletter-success-msg">
                <Check size={14} /> You&apos;re in! Check your inbox for your ₱500 voucher code.
              </div>
            )}
          </form>
        </div>
      </section>

      {/* ===================================================================
          12. MODERN COMPREHENSIVE FOOTER
          =================================================================== */}
      <footer className="footer-modern">
        <div className="footer-container">
          <div className="footer-top-grid">
            {/* Brand Column */}
            <div className="footer-brand-col">
              <Link to="/" className="footer-brand-logo" aria-label="Garage Marketplace Home">
                <img 
                  src="/logos/logo-vector.svg"
                  alt="Garage Marketplace" 
                  className="footer-logo-img"
                  width="40"
                  height="40"
                />
                <div className="footer-logo-text">
                  <span className="footer-logo-name">GARAGE</span>
                  <span className="footer-logo-tag">Parts & Cars Marketplace</span>
                </div>
              </Link>
              <p className="footer-bio">
                The Philippines&apos; dedicated marketplace for genuine auto parts, classic restorations, and verified enthusiast cars.
              </p>
              <div className="footer-contact-info">
                <div><MapPin size={14} /> 124 Chino Roces Ave, Makati, Metro Manila</div>
                <div><Clock size={14} /> Showroom & Café: Tue–Sun · 8:00 AM – 7:00 PM</div>
                <div><MessageSquare size={14} /> Hotline: (02) 8888-AUTO · support@garagemarket.ph</div>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="footer-links-col">
              <h4>Explore Market</h4>
              <ul>
                <li><Link to="/marketplace">Verified Cars for Sale</Link></li>
                <li><Link to="/parts">Genuine Parts Catalogue</Link></li>
                <li><Link to="/parts?category=engine">Engines & Turbos</Link></li>
                <li><Link to="/parts?category=wheels">Wheels & Tires</Link></li>
                <li><Link to="/parts?category=brakes">Brakes & Suspension</Link></li>
              </ul>
            </div>

            {/* Services Column */}
            <div className="footer-links-col">
              <h4>Services & Hub</h4>
              <ul>
                <li><Link to="/showroom">Makati Showroom & Café</Link></li>
                <li><Link to="/services">100-Point Inspection</Link></li>
                <li><Link to="/sell">Consign Your Vehicle</Link></li>
                <li><Link to="/services">Nationwide Crated Freight</Link></li>
                <li><Link to="/about">About Our Story</Link></li>
              </ul>
            </div>

            {/* Trust & Safe Payment Column */}
            <div className="footer-trust-col">
              <h4>Guaranteed & Secure</h4>
              <p className="footer-trust-text">
                Every transaction backed with Buyer Protection Guarantees and verified courier tracking.
              </p>
              <div className="payment-badges-row">
                <span className="pay-badge">GCash</span>
                <span className="pay-badge">Maya</span>
                <span className="pay-badge">Visa</span>
                <span className="pay-badge">Mastercard</span>
                <span className="pay-badge">BDO / BPI</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div className="footer-copy">
              © {new Date().getFullYear()} Garage Parts Marketplace Philippines. All rights reserved. Built for drivers & builders.
            </div>
            <div className="footer-legal-links">
              <Link to="/about">Privacy Policy</Link>
              <span>•</span>
              <Link to="/about">Terms of Service</Link>
              <span>•</span>
              <Link to="/about">Inspection Standards</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* RSVP Modal Popup for Saturday Meet */}
      {showRsvpModal && (
        <div className="modal-overlay" onClick={() => setShowRsvpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>RSVP for Saturday Coffee & Turbos</h3>
              <button className="modal-close-btn" onClick={() => setShowRsvpModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Join 50+ local builders this Saturday at 7:00 AM at the Makati Showroom. Enjoy free Kapeng Barako and view our latest project rotation.</p>
              <div style={{ margin: '16px 0', padding: 12, background: 'var(--color-sand-light)', borderRadius: 10, fontSize: 13 }}>
                <strong>📍 Location:</strong> 124 Chino Roces Ave, Makati<br />
                <strong>⏰ Time:</strong> Saturday 7:00 AM – 11:00 AM
              </div>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => {
                  alert('Thank you! Your RSVP is confirmed. See you this Saturday at the Showroom!')
                  setShowRsvpModal(false)
                }}
              >
                Confirm Free RSVP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

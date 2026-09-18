import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Heart, 
  Car, 
  Package, 
  Search, 
  Trash2, 
  ArrowRight, 
  LayoutGrid, 
  List as ListIcon, 
  Sparkles,
  SlidersHorizontal,
  ShieldCheck,
  Fuel,
  Gauge
} from 'lucide-react'
import { useFavorites } from '../context/FavoritesContext.jsx'
import CarCard from '../components/CarCard.jsx'
import PartCard from '../components/PartCard.jsx'
import './Favorites.css'

export default function Favorites() {
  const { 
    savedCarsList, 
    savedPartsList, 
    favoriteCarIds, 
    favoritePartIds, 
    favoritesCount, 
    carsCount, 
    partsCount, 
    loading, 
    toggleCarFavorite, 
    togglePartFavorite, 
    clearAllFavorites 
  } = useFavorites()

  const [activeTab, setActiveTab] = useState('all') // 'all' | 'cars' | 'parts'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'price_asc' | 'price_desc'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Filter and Sort Vehicles
  const filteredCars = useMemo(() => {
    let list = savedCarsList.filter(car => favoriteCarIds.has(Number(car.id)))
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(car => {
        const title = (car.title || `${car.brand || ''} ${car.model || ''}`).toLowerCase()
        const brand = (car.brand || '').toLowerCase()
        const model = (car.model || '').toLowerCase()
        const city = (car.city || car.loc || '').toLowerCase()
        return title.includes(q) || brand.includes(q) || model.includes(q) || city.includes(q)
      })
    }

    return list.sort((a, b) => {
      if (sortBy === 'price_asc') return (Number(a.price) || 0) - (Number(b.price) || 0)
      if (sortBy === 'price_desc') return (Number(b.price) || 0) - (Number(a.price) || 0)
      return 0 // default order (recently saved first)
    })
  }, [savedCarsList, favoriteCarIds, searchQuery, sortBy])

  // Filter and Sort Parts
  const filteredParts = useMemo(() => {
    let list = savedPartsList.filter(part => favoritePartIds.has(Number(part.id)))
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(part => {
        const title = (part.title || '').toLowerCase()
        const brand = (part.brand || '').toLowerCase()
        const partNumber = (part.part_number || '').toLowerCase()
        const cat = (part.category || part.cat || '').toLowerCase()
        const city = (part.city || part.loc || '').toLowerCase()
        return title.includes(q) || brand.includes(q) || partNumber.includes(q) || cat.includes(q) || city.includes(q)
      })
    }

    return list.sort((a, b) => {
      if (sortBy === 'price_asc') return (Number(a.price) || 0) - (Number(b.price) || 0)
      if (sortBy === 'price_desc') return (Number(b.price) || 0) - (Number(a.price) || 0)
      return 0
    })
  }, [savedPartsList, favoritePartIds, searchQuery, sortBy])

  const totalFilteredCount = filteredCars.length + filteredParts.length
  const isWishlistEmpty = favoritesCount === 0

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your saved items?')) {
      clearAllFavorites(activeTab === 'all' ? null : (activeTab === 'cars' ? 'car' : 'part'))
    }
  }

  return (
    <div className="favorites-page">
      {/* Hero Header */}
      <section className="favorites-hero">
        <div className="favorites-hero-inner">
          <div className="favorites-hero-top">
            <div>
              <div className="favorites-eyebrow">
                <Sparkles size={14} /> My Garage & Saved Wishlist
              </div>
              <h1 className="favorites-title">Saved Vehicles & Parts</h1>
              <p className="favorites-lead">
                Track price drops, compare vehicle specs, and keep tabs on high-demand performance parts in one unified hub.
              </p>
            </div>

            <div className="favorites-stats-pill">
              <span>
                <Car size={16} color="#e07a5f" /> {carsCount} {carsCount === 1 ? 'Build' : 'Builds'}
              </span>
              <div className="divider" />
              <span>
                <Package size={16} color="#e07a5f" /> {partsCount} {partsCount === 1 ? 'Part' : 'Parts'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="favorites-container">
        {!isWishlistEmpty && (
          <div className="favorites-toolbar">
            {/* Tabs */}
            <div className="favorites-tabs">
              <button 
                type="button" 
                className={`favorites-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <Heart size={15} fill={activeTab === 'all' ? 'currentColor' : 'none'} />
                <span>All Saved</span>
                <span className="tab-badge">{favoritesCount}</span>
              </button>

              <button 
                type="button" 
                className={`favorites-tab-btn ${activeTab === 'cars' ? 'active' : ''}`}
                onClick={() => setActiveTab('cars')}
              >
                <Car size={15} />
                <span>Vehicles</span>
                <span className="tab-badge">{carsCount}</span>
              </button>

              <button 
                type="button" 
                className={`favorites-tab-btn ${activeTab === 'parts' ? 'active' : ''}`}
                onClick={() => setActiveTab('parts')}
              >
                <Package size={15} />
                <span>Parts & Accessories</span>
                <span className="tab-badge">{partsCount}</span>
              </button>
            </div>

            {/* Actions & Filters */}
            <div className="favorites-actions">
              <div className="favorites-search-wrapper">
                <Search size={15} className="favorites-search-icon" />
                <input 
                  type="text" 
                  className="favorites-search-input" 
                  placeholder="Filter saved items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select 
                className="favorites-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Recently Saved</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>

              <div className="favorites-view-toggle">
                <button 
                  type="button" 
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  type="button" 
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <ListIcon size={16} />
                </button>
              </div>

              <button 
                type="button" 
                className="clear-btn"
                onClick={handleClear}
                title="Clear saved items"
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>
        )}

        {/* Global Empty State */}
        {isWishlistEmpty ? (
          <div className="favorites-empty-card">
            <div className="favorites-empty-icon">
              <Heart size={36} />
            </div>
            <h2 className="favorites-empty-title">Your saved garage is empty</h2>
            <p className="favorites-empty-text">
              You haven't saved any vehicles or automotive parts yet. Click the heart icon on any vehicle build or component in the marketplace to save it here.
            </p>
            <div className="favorites-empty-actions">
              <Link to="/marketplace" className="favorites-btn favorites-btn-primary">
                <Car size={16} /> Browse Verified Cars
              </Link>
              <Link to="/parts" className="favorites-btn favorites-btn-secondary">
                <Package size={16} /> Shop Parts & Accessories
              </Link>
            </div>
          </div>
        ) : totalFilteredCount === 0 && searchQuery ? (
          /* Search Empty State */
          <div className="favorites-empty-card">
            <div className="favorites-empty-icon">
              <Search size={32} />
            </div>
            <h2 className="favorites-empty-title">No matching saved items</h2>
            <p className="favorites-empty-text">
              No saved items matched your query "{searchQuery}". Try searching with a different make, model, or category.
            </p>
            <div className="favorites-empty-actions">
              <button 
                type="button" 
                className="favorites-btn favorites-btn-secondary"
                onClick={() => setSearchQuery('')}
              >
                Reset Search
              </button>
            </div>
          </div>
        ) : (
          /* Content Display */
          <div className="favorites-content">
            {/* Show Vehicles Section */}
            {(activeTab === 'all' || activeTab === 'cars') && filteredCars.length > 0 && (
              <section className="favorites-section">
                {activeTab === 'all' && (
                  <div className="favorites-section-header">
                    <h2 className="favorites-section-title">
                      <Car size={20} color="#e07a5f" /> Saved Vehicles
                    </h2>
                    <span className="favorites-section-count">
                      {filteredCars.length} {filteredCars.length === 1 ? 'vehicle' : 'vehicles'}
                    </span>
                  </div>
                )}

                <div className={viewMode === 'grid' ? 'favorites-grid' : 'favorites-list'}>
                  {filteredCars.map((car) => (
                    <CarCard 
                      key={`fav-car-${car.id}`}
                      car={car}
                      isSaved={true}
                      onToggleSave={() => toggleCarFavorite(car)}
                      variant={viewMode}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Show Parts Section */}
            {(activeTab === 'all' || activeTab === 'parts') && filteredParts.length > 0 && (
              <section className="favorites-section">
                {activeTab === 'all' && (
                  <div className="favorites-section-header">
                    <h2 className="favorites-section-title">
                      <Package size={20} color="#e07a5f" /> Saved Parts & Accessories
                    </h2>
                    <span className="favorites-section-count">
                      {filteredParts.length} {filteredParts.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                )}

                <div className={viewMode === 'grid' ? 'favorites-grid' : 'favorites-list'}>
                  {filteredParts.map((part) => (
                    <PartCard 
                      key={`fav-part-${part.id}`}
                      part={part}
                      isSaved={true}
                      onToggleSave={() => togglePartFavorite(part)}
                      variant={viewMode}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

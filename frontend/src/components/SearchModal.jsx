import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  X as CloseIcon, 
  Car, 
  Layers, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react'
import './SearchModal.css'

const QUICK_SEARCH_CHIPS = [
  { label: '2JZ-GTE Engine', category: 'parts' },
  { label: 'Civic EK9 Hatch', category: 'cars' },
  { label: 'Rays TE37 Wheels', category: 'parts' },
  { label: 'Brembo Brake Kits', category: 'parts' },
  { label: 'Toyota GR86 / BRZ', category: 'cars' },
  { label: 'HKS Hi-Power Exhaust', category: 'parts' },
  { label: 'Bride Low Max Seats', category: 'parts' },
  { label: 'Mazda Miata MX-5', category: 'cars' },
]

const POPULAR_CATEGORIES = [
  { id: 'all', label: 'All Items', icon: Sparkles, hint: 'Search cars & parts' },
  { id: 'cars', label: 'Verified Cars', icon: Car, hint: 'Browse enthusiast vehicles' },
  { id: 'parts', label: 'Genuine Parts', icon: Layers, hint: '50k+ auto components' },
]

export default function SearchModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeScope, setActiveScope] = useState('all') // 'all' | 'cars' | 'parts'

  // Focus input when opened and lock background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 60)
      return () => clearTimeout(timer)
    } else {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Global ESC key listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSearch = (searchQuery = query, scope = activeScope) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    onClose()
    if (scope === 'cars') {
      navigate(`/marketplace?search=${encodeURIComponent(trimmed)}`)
    } else {
      navigate(`/parts?search=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSearch(query, activeScope)
  }

  const handleChipClick = (chip) => {
    setQuery(chip.label)
    handleSearch(chip.label, chip.category)
  }

  return (
    <div className="search-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Global Search">
      <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Pull Bar / Handle */}
        <div className="search-modal-handle" aria-hidden="true" />

        {/* Modal Search Input Header */}
        <div className="search-modal-header">
          <form className="search-modal-form" onSubmit={handleSubmit}>
            <Search size={22} className="search-modal-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-modal-input"
              placeholder="Search 50,000+ parts, project cars, brands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search query"
            />
            {query && (
              <button 
                type="button" 
                className="search-modal-clear-btn" 
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                aria-label="Clear search input"
              >
                <CloseIcon size={18} />
              </button>
            )}
            <button type="submit" className="search-modal-submit-btn">
              <span>Search</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <button 
            type="button" 
            className="search-modal-close-btn" 
            onClick={onClose}
            aria-label="Close search"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Scope Selector Tabs */}
        <div className="search-modal-scopes">
          <span className="search-modal-scope-label">
            <SlidersHorizontal size={14} /> Search in:
          </span>
          <div className="search-modal-scope-pills">
            {POPULAR_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = activeScope === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`search-scope-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveScope(cat.id)}
                >
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="search-modal-body">
          {/* Trending Searches Section */}
          <div className="search-section">
            <div className="search-section-title">
              <TrendingUp size={15} />
              <span>Trending Enthusiast Searches</span>
            </div>
            <div className="search-chips-grid">
              {QUICK_SEARCH_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="search-chip"
                  onClick={() => handleChipClick(chip)}
                >
                  <span className="search-chip-tag">{chip.category === 'cars' ? 'Car' : 'Part'}</span>
                  <span className="search-chip-text">{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts / Guide */}
          <div className="search-modal-footer">
            <div className="search-shortcuts">
              <span className="shortcut-item"><kbd>↵</kbd> to search</span>
              <span className="shortcut-item"><kbd>ESC</kbd> to close</span>
              <span className="shortcut-item"><kbd>⌘K</kbd> quick toggle</span>
            </div>
            <div className="search-footer-meta">
              Garage Verified Nationwide Shipping & Inspection Guarantee
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Flame,
  Trophy,
  Clock,
  ArrowUpRight,
  Gavel,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Zap,
  TrendingUp,
  X,
  AlertCircle,
  Award,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { auctionsApi } from '../api/auctions.js'
import './CarBiddingSection.css'

function formatPeso(num) {
  if (num === null || num === undefined) return '₱ 0'
  return '₱ ' + Number(num).toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

// Single Auction Countdown Timer Component
function CountdownDisplay({ endTime, onEnd }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(endTime))

  function calculateTimeLeft(target) {
    if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
    const difference = new Date(target).getTime() - Date.now()
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
    }
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(endTime)
      setTimeLeft(remaining)
      if (remaining.total <= 0) {
        clearInterval(timer)
        if (onEnd) onEnd()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime, onEnd])

  if (timeLeft.total <= 0) {
    return (
      <div className="auction-timer-pill ended">
        <Clock size={14} />
        <span>Auction Ended</span>
      </div>
    )
  }

  return (
    <div className={`auction-timer-pill ${timeLeft.hours === 0 && timeLeft.days === 0 && timeLeft.minutes < 30 ? 'urgent' : ''}`}>
      <span className="pulse-dot" />
      <Clock size={14} />
      <div className="timer-digits">
        {timeLeft.days > 0 && <span><strong>{timeLeft.days}</strong>d </span>}
        <span><strong>{String(timeLeft.hours).padStart(2, '0')}</strong>h </span>
        <span><strong>{String(timeLeft.minutes).padStart(2, '0')}</strong>m </span>
        <span><strong>{String(timeLeft.seconds).padStart(2, '0')}</strong>s</span>
      </div>
    </div>
  )
}

export default function CarBiddingSection() {
  const [activeTab, setActiveTab] = useState('live') // 'live' | 'winners' | 'upcoming'
  const [auctions, setAuctions] = useState([])
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Bidding Modal State
  const [selectedAuction, setSelectedAuction] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidderName, setBidderName] = useState('')
  const [bidderEmail, setBidderEmail] = useState('')
  const [bidderPhone, setBidderPhone] = useState('')
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [bidSuccessMessage, setBidSuccessMessage] = useState(null)
  const [bidErrorMessage, setBidErrorMessage] = useState(null)

  // Details Modal State
  const [viewAuction, setViewAuction] = useState(null)

  const fetchAuctionsData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [liveRes, winnersRes] = await Promise.allSettled([
        auctionsApi.list({ status: 'all' }),
        auctionsApi.getWinners(),
      ])

      if (liveRes.status === 'fulfilled') {
        const list = liveRes.value?.data || []
        setAuctions(list)
      }
      if (winnersRes.status === 'fulfilled') {
        const winList = winnersRes.value || []
        setWinners(winList)
      }
    } catch (err) {
      setError('Unable to load live bidding data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuctionsData()
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchAuctionsData, 30000)
    return () => clearInterval(interval)
  }, [fetchAuctionsData])

  const liveAuctions = useMemo(() => {
    return auctions.filter((a) => a.status === 'active' && !a.is_ended)
  }, [auctions])

  const concludedAuctions = useMemo(() => {
    const list = auctions.filter((a) => a.status === 'ended' || a.status === 'awarded' || a.is_ended)
    return list.length > 0 ? list : winners
  }, [auctions, winners])

  const upcomingAuctions = useMemo(() => {
    return auctions.filter((a) => a.status === 'upcoming' || (a.status === 'active' && new Date(a.start_time) > new Date()))
  }, [auctions])

  // Open Bidding Modal
  const handleOpenBidModal = (auction) => {
    setSelectedAuction(auction)
    const minBid = Number(auction.min_next_bid || (Number(auction.current_bid || auction.starting_price) + 5000))
    setBidAmount(minBid)
    setBidSuccessMessage(null)
    setBidErrorMessage(null)
  }

  const handlePlacePresetIncrement = (increment) => {
    if (!selectedAuction) return
    const current = Number(selectedAuction.current_bid || selectedAuction.starting_price || 0)
    setBidAmount(current + increment)
  }

  const handleBidSubmit = async (e) => {
    e.preventDefault()
    if (!selectedAuction) return
    setIsSubmittingBid(true)
    setBidSuccessMessage(null)
    setBidErrorMessage(null)

    try {
      const res = await auctionsApi.placeBid(selectedAuction.uuid || selectedAuction.id, {
        bid_amount: Number(bidAmount),
        bidder_name: bidderName.trim() || 'Garage Enthusiast',
        bidder_email: bidderEmail.trim() || undefined,
        bidder_phone: bidderPhone.trim() || undefined,
      })

      setBidSuccessMessage(res.message || 'Bid submitted successfully! You are the highest bidder.')
      // Refresh list
      fetchAuctionsData()
      setTimeout(() => {
        if (res.data?.auction) {
          setSelectedAuction(res.data.auction)
        }
      }, 500)
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.errors?.bid_amount?.[0] || 'Failed to place bid. Please try again.'
      setBidErrorMessage(errMsg)
    } finally {
      setIsSubmittingBid(false)
    }
  }

  // Handle Auction Timer Finished
  const handleAuctionFinished = (auction) => {
    // Update local state to mark as ended and refresh
    setAuctions((prev) =>
      prev.map((item) => (item.id === auction.id ? { ...item, status: 'ended', is_ended: true } : item))
    )
    fetchAuctionsData()
  }

  return (
    <section className="section-bidding reveal">
      <div className="section-container">
        {/* Section Header */}
        <div className="bidding-header-block">
          <div className="bidding-header-left">
            <div className="bidding-badge">
              <span className="bidding-live-pulse" />
              <Flame size={15} className="bidding-badge-icon" />
              <span>Ours Garage Car Bidding Arena</span>
            </div>
            <h2 className="bidding-title">
              Live Car Auctions &amp; <span className="highlight-text">Winner Showcase</span>
            </h2>
            <p className="bidding-subtitle">
              Exclusive garage-curated builds and collector cars released directly for live bidding.
              Transparent minimum increments, real-time counter bids, and verified winner awards!
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="bidding-tabs-wrapper">
            <button
              type="button"
              className={`bidding-tab ${activeTab === 'live' ? 'active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              <Zap size={16} />
              <span>Live Bidding</span>
              {liveAuctions.length > 0 && <span className="tab-count">{liveAuctions.length}</span>}
            </button>

            <button
              type="button"
              className={`bidding-tab ${activeTab === 'winners' ? 'active' : ''}`}
              onClick={() => setActiveTab('winners')}
            >
              <Trophy size={16} />
              <span>Winner&apos;s Circle</span>
              {concludedAuctions.length > 0 && <span className="tab-count gold">{concludedAuctions.length}</span>}
            </button>

            <button
              type="button"
              className={`bidding-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              <Calendar size={16} />
              <span>Upcoming Drops</span>
              {upcomingAuctions.length > 0 && <span className="tab-count">{upcomingAuctions.length}</span>}
            </button>
          </div>
        </div>

        {/* ===================================================================
            TAB 1: LIVE BIDDING SECTION
            =================================================================== */}
        {activeTab === 'live' && (
          <div className="bidding-content-area">
            {loading && auctions.length === 0 ? (
              <div className="bidding-loading-skeleton">
                <div className="skeleton-card" />
                <div className="skeleton-card" />
              </div>
            ) : liveAuctions.length === 0 ? (
              <div className="bidding-empty-state">
                <Trophy size={48} className="empty-icon" />
                <h3>No active auctions right now!</h3>
                <p>All current cars have concluded and moved to the Winner&apos;s Circle. Check upcoming drops or past winners below.</p>
                <button type="button" className="btn btn-primary" onClick={() => setActiveTab('winners')}>
                  <Trophy size={16} />
                  <span>View Winner&apos;s Circle</span>
                </button>
              </div>
            ) : (
              <div className="bidding-grid">
                {liveAuctions.map((auction) => {
                  const currentBidVal = Number(auction.current_bid || auction.starting_price || 0)
                  const minNext = Number(auction.min_next_bid || currentBidVal + 5000)
                  const primaryImg = auction.primary_image || (auction.images && auction.images[0]) || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80'

                  return (
                    <article key={auction.id || auction.uuid} className="auction-card">
                      {/* Image & Badges */}
                      <div className="auction-media">
                        <img src={primaryImg} alt={auction.title} className="auction-img" loading="lazy" />
                        <div className="auction-media-overlay">
                          <CountdownDisplay endTime={auction.end_time} onEnd={() => handleAuctionFinished(auction)} />
                          <div className="auction-badge-total-bids">
                            <Gavel size={13} />
                            <span>{auction.total_bids || 0} Bids Placed</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="auction-body">
                        <div className="auction-meta-row">
                          <span className="auction-brand-tag">{auction.brand} · {auction.year}</span>
                          <span className="auction-location-tag">{auction.city || 'Makati Showroom'}</span>
                        </div>

                        <h3 className="auction-car-title">{auction.title}</h3>

                        {/* Specs Pill List */}
                        <div className="auction-specs-list">
                          <span className="spec-pill">{auction.transmission || 'Manual'}</span>
                          <span className="spec-pill">{auction.fuel_type || 'Petrol'}</span>
                          <span className="spec-pill">{Number(auction.mileage_km || 0).toLocaleString()} km</span>
                          <span className="spec-pill">{auction.condition || 'Used'}</span>
                        </div>

                        {/* Bidding Stats Box */}
                        <div className="auction-price-box">
                          <div className="price-col">
                            <span className="price-label">Current Highest Bid</span>
                            <span className="price-amount">{formatPeso(currentBidVal)}</span>
                          </div>
                          <div className="price-col text-right">
                            <span className="price-label">Min. Next Bid</span>
                            <span className="price-amount-next">{formatPeso(minNext)}</span>
                          </div>
                        </div>

                        {/* Leading Bidder Indicator */}
                        <div className="leading-bidder-pill">
                          <TrendingUp size={14} className="leading-icon" />
                          <span>
                            Leading: <strong>{auction.winner_name || 'Starting Price'}</strong>
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="auction-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-bid-action"
                            onClick={() => handleOpenBidModal(auction)}
                          >
                            <Gavel size={16} />
                            <span>Place Bid Now</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-inspect-action"
                            onClick={() => setViewAuction(auction)}
                            title="Inspect Vehicle Specs"
                          >
                            <Eye size={16} />
                            <span>Specs</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 2: WINNER'S CIRCLE / HALL OF FAME (Winner takes the lead)
            =================================================================== */}
        {activeTab === 'winners' && (
          <div className="bidding-content-area winners-arena">
            <div className="winners-banner">
              <div className="winners-banner-badge">
                <Trophy size={18} />
                <span>HALL OF FAME · OFFICIAL GARAGE WINNERS</span>
              </div>
              <h3>The Winner&apos;s Circle Takes The Lead</h3>
              <p>
                Congratulations to our winning bidders! All awarded vehicles undergo certified 100-point garage inspection
                and secure handover at the Makati Showroom.
              </p>
            </div>

            {concludedAuctions.length === 0 ? (
              <div className="bidding-empty-state">
                <Trophy size={48} className="empty-icon" />
                <h3>No completed auctions yet!</h3>
                <p>When the countdown ends on active cars, the winning bidders are displayed here in the Hall of Fame.</p>
              </div>
            ) : (
              <div className="winners-grid">
                {concludedAuctions.map((auction, idx) => {
                  const winningAmount = auction.winning_bid || auction.current_bid || auction.starting_price
                  const winnerName = auction.winner_name || 'Private Collector'
                  const primaryImg = auction.primary_image || (auction.images && auction.images[0]) || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80'

                  return (
                    <article key={auction.id || auction.uuid} className={`winner-card ${idx === 0 ? 'top-winner-card' : ''}`}>
                      <div className="winner-trophy-ribbon">
                        <Trophy size={16} />
                        <span>AWARDED &amp; WON</span>
                      </div>

                      <div className="winner-media">
                        <img src={primaryImg} alt={auction.title} className="winner-img" loading="lazy" />
                        <div className="winner-stamp">
                          <CheckCircle2 size={16} />
                          <span>100-Pt Verified Handover</span>
                        </div>
                      </div>

                      <div className="winner-body">
                        <div className="winner-car-badge">{auction.brand} · {auction.year}</div>
                        <h4 className="winner-car-title">{auction.title}</h4>

                        {/* Winner Spotlight Banner */}
                        <div className="winner-spotlight-box">
                          <div className="winner-icon-circle">
                            <Award size={22} />
                          </div>
                          <div className="winner-details">
                            <span className="winner-lead-label">WINNING BIDDER TAKES THE CAR</span>
                            <strong className="winner-name-display">{winnerName}</strong>
                            <div className="winner-price-tag">Winning Bid: {formatPeso(winningAmount)}</div>
                          </div>
                        </div>

                        {/* Handover & Bid Summary */}
                        <div className="winner-summary-row">
                          <div className="summary-col">
                            <span className="sub-label">Total Bids</span>
                            <strong>{auction.total_bids || 1} Bids</strong>
                          </div>
                          <div className="summary-col">
                            <span className="sub-label">Location</span>
                            <strong>{auction.location || 'Makati Showroom'}</strong>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 3: UPCOMING DROPS
            =================================================================== */}
        {activeTab === 'upcoming' && (
          <div className="bidding-content-area">
            {upcomingAuctions.length === 0 ? (
              <div className="bidding-empty-state">
                <Calendar size={48} className="empty-icon" />
                <h3>No upcoming drops scheduled yet</h3>
                <p>Our garage mechanics and curators are preparing new builds for the next auction batch. Stay tuned!</p>
              </div>
            ) : (
              <div className="bidding-grid">
                {upcomingAuctions.map((auction) => {
                  const primaryImg = auction.primary_image || (auction.images && auction.images[0]) || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80'

                  return (
                    <article key={auction.id || auction.uuid} className="auction-card upcoming-card">
                      <div className="auction-media">
                        <img src={primaryImg} alt={auction.title} className="auction-img" loading="lazy" />
                        <div className="auction-media-overlay">
                          <div className="upcoming-start-tag">
                            <Calendar size={14} />
                            <span>Releasing Soon</span>
                          </div>
                        </div>
                      </div>

                      <div className="auction-body">
                        <div className="auction-meta-row">
                          <span className="auction-brand-tag">{auction.brand} · {auction.year}</span>
                          <span className="auction-location-tag">{auction.city || 'Makati'}</span>
                        </div>

                        <h3 className="auction-car-title">{auction.title}</h3>
                        <p className="auction-description-snippet">{auction.description || 'Verified garage performance build.'}</p>

                        <div className="auction-price-box">
                          <div className="price-col">
                            <span className="price-label">Starting Price</span>
                            <span className="price-amount">{formatPeso(auction.starting_price)}</span>
                          </div>
                          <div className="price-col text-right">
                            <span className="price-label">Min Increment</span>
                            <span className="price-amount-next">+{formatPeso(auction.bid_increment || 5000)}</span>
                          </div>
                        </div>

                        <div className="auction-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-full"
                            onClick={() => setViewAuction(auction)}
                          >
                            <Eye size={16} />
                            <span>Preview Full Specs</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================
          PLACE BID MODAL
          =================================================================== */}
      {selectedAuction && (
        <div className="modal-backdrop" onClick={() => setSelectedAuction(null)}>
          <div className="modal-dialog bidding-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Gavel size={20} className="modal-icon" />
                <h3>Place Your Bid</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedAuction(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Vehicle Mini Summary */}
              <div className="modal-car-summary">
                <img
                  src={selectedAuction.primary_image || (selectedAuction.images && selectedAuction.images[0])}
                  alt={selectedAuction.title}
                  className="modal-car-thumb"
                />
                <div className="modal-car-details">
                  <h4>{selectedAuction.title}</h4>
                  <div className="modal-car-specs">
                    <span>{selectedAuction.brand}</span> · <span>{selectedAuction.year}</span> · <span>{selectedAuction.transmission}</span>
                  </div>
                </div>
              </div>

              {/* Price Stats */}
              <div className="modal-price-strip">
                <div className="modal-price-item">
                  <span className="lbl">Current Highest Bid</span>
                  <strong className="val">{formatPeso(selectedAuction.current_bid || selectedAuction.starting_price)}</strong>
                </div>
                <div className="modal-price-item text-right">
                  <span className="lbl">Minimum Required Bid</span>
                  <strong className="val highlight">{formatPeso(selectedAuction.min_next_bid || (Number(selectedAuction.current_bid || 0) + 5000))}</strong>
                </div>
              </div>

              {/* Quick Increment Shortcuts */}
              <div className="quick-increments-bar">
                <span className="inc-label">Quick Add:</span>
                <button type="button" className="inc-btn" onClick={() => handlePlacePresetIncrement(5000)}>+₱5,000</button>
                <button type="button" className="inc-btn" onClick={() => handlePlacePresetIncrement(10000)}>+₱10,000</button>
                <button type="button" className="inc-btn" onClick={() => handlePlacePresetIncrement(25000)}>+₱25,000</button>
                <button type="button" className="inc-btn" onClick={() => handlePlacePresetIncrement(50000)}>+₱50,000</button>
              </div>

              {/* Feedback messages */}
              {bidSuccessMessage && (
                <div className="alert-box success">
                  <CheckCircle2 size={18} />
                  <span>{bidSuccessMessage}</span>
                </div>
              )}

              {bidErrorMessage && (
                <div className="alert-box error">
                  <AlertCircle size={18} />
                  <span>{bidErrorMessage}</span>
                </div>
              )}

              {/* Bid Form */}
              <form onSubmit={handleBidSubmit} className="bidding-form">
                <div className="form-group">
                  <label htmlFor="bid-amount-input">Your Bid Amount (PHP) *</label>
                  <div className="input-with-prefix">
                    <span className="currency-prefix">₱</span>
                    <input
                      id="bid-amount-input"
                      type="number"
                      min={selectedAuction.min_next_bid || (Number(selectedAuction.current_bid || 0) + 5000)}
                      step="1000"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      required
                      className="form-input bid-number-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="bidder-name-input">Your Full Name / Alias *</label>
                  <input
                    id="bidder-name-input"
                    type="text"
                    placeholder="e.g. Kenji Takahashi"
                    value={bidderName}
                    onChange={(e) => setBidderName(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="bidder-email-input">Email Address</label>
                    <input
                      id="bidder-email-input"
                      type="email"
                      placeholder="winner@example.com"
                      value={bidderEmail}
                      onChange={(e) => setBidderEmail(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bidder-phone-input">Phone / WhatsApp</label>
                    <input
                      id="bidder-phone-input"
                      type="tel"
                      placeholder="+63 917 000 0000"
                      value={bidderPhone}
                      onChange={(e) => setBidderPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="bid-terms-note">
                  <ShieldCheck size={14} />
                  <span>By placing this bid, you agree to the Garage Buyer Protection and Auction Purchase Terms.</span>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedAuction(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-submit-bid"
                    disabled={isSubmittingBid}
                  >
                    <Gavel size={16} />
                    <span>{isSubmittingBid ? 'Submitting Bid...' : `Confirm Bid of ${formatPeso(bidAmount)}`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VEHICLE SPECS MODAL
          =================================================================== */}
      {viewAuction && (
        <div className="modal-backdrop" onClick={() => setViewAuction(null)}>
          <div className="modal-dialog specs-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Sparkles size={20} className="modal-icon" />
                <h3>Vehicle Inspection &amp; Auction Specs</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setViewAuction(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="specs-modal-hero">
                <img
                  src={viewAuction.primary_image || (viewAuction.images && viewAuction.images[0])}
                  alt={viewAuction.title}
                  className="specs-modal-hero-img"
                />
              </div>

              <h3>{viewAuction.title}</h3>
              <p className="specs-description">{viewAuction.description || 'Full 100-point garage inspection verified.'}</p>

              <div className="specs-grid-table">
                <div className="spec-row"><span className="k">Make / Brand</span><span className="v">{viewAuction.brand}</span></div>
                <div className="spec-row"><span className="k">Model</span><span className="v">{viewAuction.model}</span></div>
                <div className="spec-row"><span className="k">Year</span><span className="v">{viewAuction.year}</span></div>
                <div className="spec-row"><span className="k">Mileage</span><span className="v">{Number(viewAuction.mileage_km || 0).toLocaleString()} km</span></div>
                <div className="spec-row"><span className="k">Transmission</span><span className="v">{viewAuction.transmission}</span></div>
                <div className="spec-row"><span className="k">Fuel Type</span><span className="v">{viewAuction.fuel_type}</span></div>
                <div className="spec-row"><span className="k">Color</span><span className="v">{viewAuction.color || 'Factory OEM'}</span></div>
                <div className="spec-row"><span className="k">VIN / Chassis</span><span className="v">{viewAuction.vin || 'Verified Authentic'}</span></div>
                <div className="spec-row"><span className="k">Location</span><span className="v">{viewAuction.location || 'Makati Flagship Showroom'}</span></div>
              </div>

              <div className="modal-actions mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setViewAuction(null)}>
                  Close
                </button>
                {viewAuction.status === 'active' && !viewAuction.is_ended && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const target = viewAuction
                      setViewAuction(null)
                      handleOpenBidModal(target)
                    }}
                  >
                    <Gavel size={16} />
                    <span>Place Bid on This Car</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

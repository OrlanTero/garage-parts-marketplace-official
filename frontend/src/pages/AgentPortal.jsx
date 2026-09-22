import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import agentsApi from '../api/agents.js'
import { buildShareableUrl, getSocialShareLinks } from '../utils/referral.js'
import './AgentPortal.css'

export default function AgentPortal() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [tagline, setTagline] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Custom Link Generator state
  const [customPath, setCustomPath] = useState('/parts')
  const [generatedLinkCopied, setGeneratedLinkCopied] = useState(false)

  const agentCode = stats?.agent?.agent_code || user?.agent_code || 'AGT-SPECIALIST'
  const storeShareUrl = buildShareableUrl('/', agentCode)
  const customGeneratedUrl = buildShareableUrl(customPath, agentCode)

  const socialLinks = getSocialShareLinks(
    storeShareUrl,
    'Explore Garage Parts Marketplace — High-Performance JDM & OEM Auto Parts',
    'Get authentic car parts, track components, and performance upgrades with verified vehicle chassis & VIN fitment.'
  )

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        if (user) {
          const data = await agentsApi.getStats()
          setStats(data)
          if (data?.agent?.tagline) {
            setTagline(data.agent.tagline)
          }
        }
      } catch (err) {
        console.error('Failed to load agent stats', err)
        setError('Please sign in or create an account to activate and view your full Agent Dashboard.')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [user])

  const handleCopy = async (url, setCopyState) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      } else {
        const input = document.createElement('input')
        input.value = url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopyState(true)
      setTimeout(() => setCopyState(false), 2500)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      setSavingProfile(true)
      await agentsApi.updateProfile({ agent_tagline: tagline })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to update agent profile', err)
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="agent-portal-page">
      <div className="agent-portal-container">
        {/* Header */}
        <div className="agent-portal-hero">
          <div className="agent-hero-badge">💼 Sales Agent & Partner Program</div>
          <h1 className="agent-hero-title">Monetize Your Automotive Network</h1>
          <p className="agent-hero-subtitle">
            Share products or car listings on Facebook, social media, and automotive communities. Earn <strong>5.0% commission</strong> on every verified sales order.
          </p>
        </div>

        {/* Agent Profile & Main Referral Link Card */}
        <div className="agent-identity-card">
          <div className="agent-identity-main">
            <div className="agent-avatar-wrap">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300&auto=format&fit=crop'}
                alt="Agent Avatar"
                className="agent-avatar"
              />
              <span className="agent-verified-badge">✓ Verified Agent</span>
            </div>
            <div className="agent-info-content">
              <div className="agent-name-row">
                <h2>{user?.name || 'Automotive Sales Partner'}</h2>
                <span className="agent-code-pill">Code: <strong>{agentCode}</strong></span>
              </div>
              <p className="agent-commission-callout">
                Active Commission Rate: <span className="highlight-green">{stats?.agent?.commission_rate || user?.commission_rate || 5.0}% per sale</span>
              </p>
              
              {user && (
                <form onSubmit={handleSaveProfile} className="agent-tagline-form">
                  <input
                    type="text"
                    className="agent-tagline-input"
                    placeholder="Your bio or specialty, e.g. JDM Specialist & Track Consultant"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                  <button type="submit" className="agent-btn-save-tagline" disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Update Tagline'}
                  </button>
                  {saveSuccess && <span className="save-success-msg">✓ Saved!</span>}
                </form>
              )}
            </div>
          </div>

          {/* Master Referral Link Bar */}
          <div className="agent-master-link-box">
            <div className="master-link-label">Your General Storefront Referral Link:</div>
            <div className="master-link-input-group">
              <input
                type="text"
                readOnly
                value={storeShareUrl}
                className="master-link-input"
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className={`master-link-btn-copy ${copied ? 'copied' : ''}`}
                onClick={() => handleCopy(storeShareUrl, setCopied)}
              >
                {copied ? '✓ Link Copied!' : 'Copy Link'}
              </button>
            </div>
            <div className="agent-social-quick-share">
              <span className="quick-share-text">Share to:</span>
              <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="quick-social-btn fb">
                Facebook
              </a>
              <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="quick-social-btn wa">
                WhatsApp
              </a>
              <a href={socialLinks.telegram} target="_blank" rel="noopener noreferrer" className="quick-social-btn tg">
                Telegram
              </a>
              <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="quick-social-btn tw">
                X (Twitter)
              </a>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="agent-metrics-grid">
          <div className="agent-metric-card">
            <div className="metric-label">Total Commission Earned</div>
            <div className="metric-value green">
              {stats?.performance?.formatted_total_commission || '₱ 0.00'}
            </div>
            <div className="metric-sub">5% of all referred sales</div>
          </div>

          <div className="agent-metric-card">
            <div className="metric-label">Pending Payouts</div>
            <div className="metric-value orange">
              {stats?.performance?.formatted_pending_commission || '₱ 0.00'}
            </div>
            <div className="metric-sub">Orders currently processing</div>
          </div>

          <div className="agent-metric-card">
            <div className="metric-label">Referred Sales Volume</div>
            <div className="metric-value white">
              {stats?.performance?.formatted_sales_volume || '₱ 0.00'}
            </div>
            <div className="metric-sub">Gross customer order total</div>
          </div>

          <div className="agent-metric-card">
            <div className="metric-label">Successful Orders</div>
            <div className="metric-value cyan">
              {stats?.performance?.total_orders || 0} Orders
            </div>
            <div className="metric-sub">Fitment guaranteed sales</div>
          </div>
        </div>

        {/* Custom Link Generator & Tools Section */}
        <div className="agent-tools-row">
          <div className="agent-tool-box">
            <h3>🔗 Product Link Generator</h3>
            <p>Generate a customized referral link for any catalog section or specific part/car.</p>
            <div className="tool-input-row">
              <select
                className="tool-select"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
              >
                <option value="/parts">All Parts Marketplace (/parts)</option>
                <option value="/marketplace">Car Marketplace (/marketplace)</option>
                <option value="/parts/1">Garrett G30 Turbo (/parts/1)</option>
                <option value="/parts/2">HKS Hi-Power Exhaust (/parts/2)</option>
                <option value="/parts/3">Brembo GT Big Brake Kit (/parts/3)</option>
                <option value="/cars/1">Nissan GT-R R34 (/cars/1)</option>
                <option value="/cars/2">Toyota Supra MK4 (/cars/2)</option>
              </select>
            </div>
            <div className="generated-link-display">
              <input type="text" readOnly value={customGeneratedUrl} className="generated-link-input" />
              <button
                type="button"
                className={`generated-link-btn ${generatedLinkCopied ? 'copied' : ''}`}
                onClick={() => handleCopy(customGeneratedUrl, setGeneratedLinkCopied)}
              >
                {generatedLinkCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="agent-tool-box">
            <h3>📱 QR Code for Car Meets & Events</h3>
            <p>Scan to immediately open your attributed referral store on any mobile device.</p>
            <div className="agent-qr-preview-box">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(storeShareUrl)}`}
                alt="Agent Storefront QR Code"
                className="agent-qr-img"
              />
              <div className="agent-qr-text">
                <span className="qr-badge">Agent ID: {agentCode}</span>
                <p>Print or show this QR code at track days, car meets, or workshops to earn referral rewards.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referred Orders History */}
        <div className="agent-orders-section">
          <div className="agent-orders-header">
            <h3>Recent Referred Sales Orders</h3>
            <span className="orders-count-badge">
              {stats?.recent_orders?.length || 0} Orders
            </span>
          </div>

          {stats?.recent_orders && stats.recent_orders.length > 0 ? (
            <div className="agent-orders-table-wrapper">
              <table className="agent-orders-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Item / Product</th>
                    <th>Vehicle (Chassis / VIN)</th>
                    <th>Order Total</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_orders.map((order) => (
                    <tr key={order.id || order.order_number}>
                      <td className="font-mono">
                        <Link to={`/orders/${order.order_number}`} className="order-link">
                          {order.order_number}
                        </Link>
                      </td>
                      <td>{order.placed_at || 'Just now'}</td>
                      <td>
                        <div className="order-item-title">{order.item?.name || 'Performance Component'}</div>
                        <div className="order-item-buyer">Buyer: {order.buyer?.name}</div>
                      </td>
                      <td>
                        <div className="vehicle-fitment-tag">
                          Chassis: <strong>{order.vehicle?.chassis_number || order.chassis_number}</strong>
                        </div>
                        <div className="vehicle-vin-sub">
                          VIN: {order.vehicle?.vin || order.vin}
                        </div>
                      </td>
                      <td className="font-semibold">
                        ₱ {(order.financials?.total_amount || order.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="font-semibold text-green">
                        ₱ {(order.agent?.commission_amount || order.commission_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`status-badge status-${order.status || 'processing'}`}>
                          {order.status_label || order.status || 'Processing'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="agent-empty-orders">
              <div className="empty-icon">📦</div>
              <h4>No referred orders yet</h4>
              <p>Start sharing product and car links on Facebook, forums, and chat groups to record your first commission!</p>
              <Link to="/parts" className="empty-browse-btn">
                Browse Parts to Share →
              </Link>
            </div>
          )}
        </div>

        {/* How It Works Explainer */}
        <div className="agent-explainer-section">
          <h3>How the Sales Agent Program Works</h3>
          <div className="explainer-grid">
            <div className="explainer-step">
              <div className="step-num">1</div>
              <h4>Grab Product Links</h4>
              <p>Click "Share" on any car or auto part detail page to generate a link containing your unique agent code.</p>
            </div>
            <div className="explainer-step">
              <div className="step-num">2</div>
              <h4>Share with Community</h4>
              <p>Post to Facebook groups, car clubs, Reddit, or message fellow car enthusiasts looking for upgrades.</p>
            </div>
            <div className="explainer-step">
              <div className="step-num">3</div>
              <h4>Fitment & Checkout</h4>
              <p>Customers enter their chassis number & VIN at checkout. The system guarantees fitment and attributes the order to you.</p>
            </div>
            <div className="explainer-step">
              <div className="step-num">4</div>
              <h4>Get 5% Commission</h4>
              <p>Commissions are credited directly to your partner balance upon order processing and fulfillment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import agentsApi from '../api/agents.js'
import { buildShareableUrl, getSocialShareLinks } from '../utils/referral.js'
import './AgentPortal.css'

export default function AgentPortal() {
  const { user, refresh } = useAuth()
  const [stats, setStats] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [tagline, setTagline] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeMsg, setSubscribeMsg] = useState(null)

  // Mock payment checkout state
  const [showPayModal, setShowPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState('gcash')
  const [payAccountName, setPayAccountName] = useState('')
  const [payAccountNumber, setPayAccountNumber] = useState('')
  const [payError, setPayError] = useState(null)
  const [receipt, setReceipt] = useState(null)

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
        setSubscribeMsg(null)
        if (user) {
          const [data, sub] = await Promise.all([
            agentsApi.getStats().catch(() => null),
            agentsApi.getSubscription().catch(() => null),
          ])
          setStats(data)
          setSubscription(sub)
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

  const isActive = stats?.agent?.is_active ?? subscription?.is_active ?? false
  const kycVerified = stats?.agent?.is_kyc_verified ?? subscription?.is_kyc_verified ?? user?.is_kyc_verified ?? false
  const fee = subscription?.fee ?? stats?.agent?.subscription_fee ?? 100
  const reward = subscription?.referral_reward ?? stats?.agent?.referral_reward ?? 50
  const expiresAt = subscription?.expires_at ?? stats?.agent?.subscription_expires_at ?? null

  const payMethodLabel = payMethod === 'gcash' ? 'GCash' : payMethod === 'maya' ? 'Maya' : 'Card'
  const payMethodPrefix = payMethod === 'gcash' ? 'GCASH' : payMethod === 'maya' ? 'MAYA' : 'CARD'

  const openPayModal = () => {
    setPayError(null)
    setReceipt(null)
    setPayAccountName(user?.name || '')
    setPayAccountNumber('')
    setShowPayModal(true)
  }

  const closePayModal = () => {
    if (subscribing) return
    setShowPayModal(false)
    setPayError(null)
  }

  // Mock payment checkout — simulates a payment gateway, then activates
  // the subscription. No real charge is made.
  const handleMockPay = async (e) => {
    if (e) e.preventDefault()
    setPayError(null)
    if (!payAccountName.trim()) {
      setPayError('Enter the mock account holder name.')
      return
    }
    if (payAccountNumber.replace(/\D/g, '').length < 6) {
      setPayError(`Enter a mock ${payMethodLabel} account/card number (min 6 digits).`)
      return
    }
    try {
      setSubscribing(true)
      setSubscribeMsg(null)
      // Simulate gateway processing delay
      await new Promise((r) => setTimeout(r, 1200))
      const ref = `${payMethodPrefix}-AGENT-${Date.now().toString().slice(-6)}`
      const res = await agentsApi.subscribe({
        payment_method: payMethod,
        payment_reference: ref,
        mock_account_name: payAccountName.trim(),
        mock_account_number: payAccountNumber.trim(),
      })
      const [data, sub] = await Promise.all([agentsApi.getStats(), agentsApi.getSubscription()])
      setStats(data)
      setSubscription(sub)
      if (refresh) await refresh()
      setReceipt({
        reference: res?.subscription?.payment_reference || ref,
        amount: res?.subscription?.amount ?? fee,
        method: res?.subscription?.payment_method || payMethod,
        expires_at: res?.subscription?.expires_at || res?.agent?.expires_at || null,
      })
      setSubscribeMsg({ ok: true, text: 'Subscription activated for 1 year. Your referral code is now live.' })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Mock payment failed. Complete KYC verification first.'
      setPayError(msg)
    } finally {
      setSubscribing(false)
    }
  }

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
            Become a verified Sales Agent with <strong>KYC + ₱{fee}/year subscription</strong>. Share products or car
            listings on Facebook and communities — earn <strong>5.0% commission</strong> per sale, plus{' '}
            <strong>₱{reward} to your wallet</strong> for every referred signup who also becomes an agent.
          </p>
        </div>

        {/* Subscription gate */}
        {user && !loading && (
          <div className="agent-identity-card" style={{ borderColor: isActive ? '#10b981' : '#f59e0b' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>{isActive ? '✅' : '🔒'}</span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 800 }}>
                  {isActive ? 'Agent subscription ACTIVE' : 'Agent subscription required'}
                  {isActive && expiresAt ? ` — valid until ${new Date(expiresAt).toLocaleDateString()}` : ''}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                  1) KYC: {kycVerified ? 'verified ✓' : 'not verified — submit in Settings → KYC'}{' '}
                  · 2) Fee: ₱{fee}/year {subscription?.status ? `(${subscription.status})` : ''}
                  {subscription?.referred_by ? ` · Referred by ${subscription.referred_by.agent_code}` : ''}
                </div>
              </div>
              {!isActive && (
                <button
                  type="button"
                  className="master-link-btn-copy"
                  disabled={!kycVerified}
                  onClick={openPayModal}
                  title={!kycVerified ? 'Complete KYC verification first' : `Pay ₱${fee} yearly fee`}
                >
                  {`Subscribe — ₱${fee}/yr`}
                </button>
              )}
            </div>
            {!kycVerified && !isActive && (
              <div style={{ fontSize: 12, marginTop: 8, color: '#b45309' }}>
                Verified KYC is required before activation. <Link to="/settings">Go to KYC verification →</Link>
              </div>
            )}
            {subscribeMsg && (
              <div style={{ fontSize: 13, marginTop: 8, color: subscribeMsg.ok ? '#047857' : '#b91c1c' }}>
                {subscribeMsg.text}
              </div>
            )}
            {isActive && (
              <div style={{ fontSize: 12, marginTop: 8, opacity: 0.85 }}>
                Recruit agents with your link below (signup with ?ref={agentCode}). You earn ₱{reward} wallet credit
                for each recruit who completes KYC + pays the fee.
                {stats?.performance?.recruited_active_agents != null && (
                  <> Recruited: <strong>{stats.performance.recruited_active_agents}/{stats.performance.recruited_agents}</strong> active.</>
                )}
                {stats?.performance?.referral_earnings > 0 && (
                  <> Referral earnings: <strong>{stats.performance.formatted_referral_earnings}</strong>.</>
                )}
              </div>
            )}
          </div>
        )}

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
            <div className="metric-label">Settled to Wallet</div>
            <div className="metric-value green">
              {stats?.performance?.formatted_settled_commission || '₱ 0.00'}
            </div>
            <div className="metric-sub"><Link to="/wallet" style={{ color: '#10b981', fontWeight: 700 }}>Open wallet to cash out →</Link></div>
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

        {/* Mock payment checkout modal */}
        {showPayModal && (
          <div
            className="auth-modal-backdrop"
            onClick={closePayModal}
            role="dialog"
            aria-modal="true"
            aria-label="Agent subscription mock payment"
            style={{ position: 'fixed', inset: 0, zIndex: 60 }}
          >
            <div
              className="agent-identity-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 480, margin: '8vh auto', position: 'relative' }}
            >
              {!receipt ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>💳</span>
                    <h3 style={{ margin: 0 }}>Agent Subscription — Mock Payment</h3>
                  </div>
                  <p style={{ fontSize: 12, opacity: 0.8, margin: '0 0 12px 0' }}>
                    Test checkout only — no real charge is made. The fee is credited to garage revenue.
                  </p>

                  <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Sales Agent Plan (1 year)</span>
                      <strong>₱{Number(fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span>Agent</span>
                      <span className="font-mono">{agentCode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontWeight: 800 }}>
                      <span>Total due</span>
                      <span>₱{Number(fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {['gcash', 'maya', 'card'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayMethod(m)}
                        className={`quick-social-btn ${payMethod === m ? '' : ''}`}
                        style={{
                          flex: 1,
                          fontWeight: payMethod === m ? 800 : 400,
                          outline: payMethod === m ? '2px solid #10b981' : '1px solid #ddd',
                          cursor: 'pointer',
                        }}
                      >
                        {m === 'gcash' ? 'GCash' : m === 'maya' ? 'Maya' : 'Card'}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleMockPay}>
                    <label style={{ fontSize: 12, fontWeight: 700 }}>Account holder name</label>
                    <input
                      type="text"
                      className="agent-tagline-input"
                      style={{ width: '100%', margin: '4px 0 10px 0' }}
                      placeholder="e.g. Juan Dela Cruz"
                      value={payAccountName}
                      onChange={(e) => setPayAccountName(e.target.value)}
                    />
                    <label style={{ fontSize: 12, fontWeight: 700 }}>
                      {payMethod === 'card' ? 'Mock card number' : `Mock ${payMethodLabel} number`}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="agent-tagline-input font-mono"
                      style={{ width: '100%', margin: '4px 0 12px 0' }}
                      placeholder={payMethod === 'card' ? '4111 1111 1111 1111' : '0917-000-0000'}
                      value={payAccountNumber}
                      onChange={(e) => setPayAccountNumber(e.target.value)}
                    />
                    {payError && (
                      <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 10 }}>{payError}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="generated-link-btn"
                        onClick={closePayModal}
                        disabled={subscribing}
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="master-link-btn-copy"
                        disabled={subscribing}
                        style={{ flex: 2 }}
                      >
                        {subscribing ? 'Processing mock payment…' : `Pay ₱${fee} (mock)`}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40 }}>✅</div>
                    <h3 style={{ margin: '8px 0 4px 0' }}>Payment successful (mock)</h3>
                    <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
                      Your Sales Agent subscription is active for 1 year.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '10px 12px', margin: '12px 0', fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Reference</span>
                      <strong className="font-mono">{receipt.reference}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span>Method</span>
                      <span>{receipt.method}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span>Amount</span>
                      <strong>₱{Number(receipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    {receipt.expires_at && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span>Valid until</span>
                        <span>{new Date(receipt.expires_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="master-link-btn-copy"
                    onClick={closePayModal}
                    style={{ width: '100%' }}
                  >
                    Done — start earning
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

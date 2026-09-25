import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { buildShareableUrl, getSocialShareLinks } from '../utils/referral.js'
import './ShareModal.css'

export default function ShareModal({ isOpen, onClose, item }) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [customAgentCode, setCustomAgentCode] = useState('')
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    if (user?.agent_code) {
      setCustomAgentCode(user.agent_code)
    }
  }, [user])

  if (!isOpen || !item) return null

  const effectiveAgentCode = customAgentCode.trim() || user?.agent_code || ''
  const itemIdentifier = item.uuid || item.id
  const itemPath = item.path || (item.type === 'car' ? `/marketplace/${itemIdentifier}` : `/parts/${itemIdentifier}`)
  const shareUrl = buildShareableUrl(itemPath, effectiveAgentCode)
  const itemTitle = item.title || item.name || 'Automotive Performance Component'
  const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0)
  const commissionRate = user?.commission_rate || 5.0
  const estimatedCommission = (itemPrice * (commissionRate / 100)).toFixed(2)

  const socialLinks = getSocialShareLinks(
    shareUrl,
    `${itemTitle} | Garage Parts Marketplace`,
    `Check out this high-performance automotive deal on Garage Parts Marketplace!`
  )

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const input = document.getElementById('share-link-input')
        if (input) {
          input.select()
          document.execCommand('copy')
        }
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <div className="share-modal-title-wrap">
            <span className="share-badge-icon">🚀</span>
            <div>
              <h3>Share & Earn</h3>
              <p>Distribute product links and earn sales commissions</p>
            </div>
          </div>
          <button className="share-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="share-modal-body">
          {/* Product Summary Mini Card */}
          <div className="share-item-preview">
            {item.image && (
              <img src={item.image} alt={itemTitle} className="share-item-thumb" />
            )}
            <div className="share-item-details">
              <div className="share-item-name">{itemTitle}</div>
              <div className="share-item-meta">
                <span className="share-item-price">₱ {itemPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {item.brand && <span className="share-item-brand">{item.brand}</span>}
              </div>
              <div className="share-commission-badge">
                💰 Potential Agent Payout: <strong>₱ {Number(estimatedCommission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ({commissionRate}%)
              </div>
            </div>
          </div>

          {/* Agent Referral Code Input */}
          <div className="share-agent-section">
            <label className="share-label">
              <span>Sales Agent Referral Code</span>
              <span className="share-label-sub">Embed your agent ID for automatic sales commission</span>
            </label>
            <div className="share-agent-input-row">
              <input
                type="text"
                className="share-agent-code-input"
                placeholder="e.g. AGT-ANTON or YOUR_CODE"
                value={customAgentCode}
                onChange={(e) => setCustomAgentCode(e.target.value.toUpperCase())}
              />
              {user?.agent_code && (
                <button
                  type="button"
                  className="share-btn-use-mine"
                  onClick={() => setCustomAgentCode(user.agent_code)}
                >
                  My Code
                </button>
              )}
            </div>
          </div>

          {/* Shareable Link Bar with 1-Click Copy */}
          <div className="share-link-section">
            <label className="share-label">Shareable Link</label>
            <div className="share-link-box">
              <input
                id="share-link-input"
                type="text"
                readOnly
                value={shareUrl}
                className="share-link-input"
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className={`share-btn-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Social Platform Direct Share Buttons */}
          <div className="share-platforms-section">
            <label className="share-label">Share Directly to Social Platforms</label>
            <div className="share-social-grid">
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="share-social-btn share-facebook"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </a>

              <a
                href={socialLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="share-social-btn share-whatsapp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                </svg>
                <span>WhatsApp</span>
              </a>

              <a
                href={socialLinks.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="share-social-btn share-telegram"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.939z"/>
                </svg>
                <span>Telegram</span>
              </a>

              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="share-social-btn share-twitter"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>X / Twitter</span>
              </a>

              <a
                href={socialLinks.email}
                className="share-social-btn share-email"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>Email</span>
              </a>

              <button
                type="button"
                className="share-social-btn share-qr-btn"
                onClick={() => setShowQr(!showQr)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="5" height="5" x="3" y="3" rx="1"/>
                  <rect width="5" height="5" x="16" y="3" rx="1"/>
                  <rect width="5" height="5" x="3" y="16" rx="1"/>
                  <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                  <path d="M21 21v.01"/>
                  <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                  <path d="M3 12h.01"/>
                  <path d="M12 3h.01"/>
                  <path d="M12 16v.01"/>
                  <path d="M16 12h1"/>
                  <path d="M21 12v.01"/>
                  <path d="M12 21v-1"/>
                </svg>
                <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
              </button>
            </div>
          </div>

          {/* QR Code Expansion */}
          {showQr && (
            <div className="share-qr-panel">
              <img src={qrImageUrl} alt="QR Code" className="share-qr-img" />
              <p className="share-qr-note">Scan this QR code with any smartphone camera to open this product page with your agent referral tag.</p>
            </div>
          )}

          {/* Agent Opportunity Tip */}
          <div className="share-agent-tip">
            <div className="share-agent-tip-title">⚡ Anyone can be an Agent!</div>
            <p className="share-agent-tip-desc">
              Share automotive listings to Facebook groups, car clubs, and friends. When a buyer completes an order through your link, you automatically earn <strong>5% sales commission</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

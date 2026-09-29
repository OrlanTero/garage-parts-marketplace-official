/**
 * Helper utility for Product Sharing & Sales Agent Referral tracking.
 */

const STORAGE_KEY = 'gpm_referral_agent_code'

/**
 * Capture referral code from URL query string if present, otherwise read stored code.
 */
export function getActiveReferralCode() {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search)
      const queryRef = urlParams.get('ref') || urlParams.get('agent') || urlParams.get('agent_code')
      if (queryRef && queryRef.trim()) {
        const cleanRef = queryRef.trim().toUpperCase()
        localStorage.setItem(STORAGE_KEY, cleanRef)
        return cleanRef
      }
    }
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch (e) {
    return ''
  }
}

/**
 * Persist an agent referral code in localStorage.
 */
export function setActiveReferralCode(code) {
  try {
    if (code && code.trim()) {
      localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase())
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (e) {
    // storage fallback
  }
}

/**
 * Construct full shareable URL with referral attribution.
 */
export function buildShareableUrl(path = '', agentCode = '') {
  if (typeof window === 'undefined') return ''
  const baseUrl = window.location.origin
  const targetPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(targetPath, baseUrl)
  
  if (agentCode && agentCode.trim()) {
    url.searchParams.set('ref', agentCode.trim())
  }
  
  return url.toString()
}

/**
 * Generate platform-specific social share links.
 */
export function getSocialShareLinks(shareUrl, title = 'Garage Parts Marketplace', description = '') {
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(`${title}${description ? ' - ' + description : ''}`)
  
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title}: ${shareUrl}`)}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check this out on Garage Parts Marketplace:\n\n${title}\n${shareUrl}`)}`,
  }
}

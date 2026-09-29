/**
 * Map storefront deep links from notification rows to admin routes.
 * Unknown paths fall back to the notification inbox.
 */
export function adminNotificationLink(link) {
  if (!link || typeof link !== 'string') return '/my-notifications'
  if (link.startsWith('/admin')) return link
  const order = link.match(/^\/sales-order\/([^/?#]+)/)
  if (order) return `/orders/${order[1]}`
  if (link.startsWith('/wallet') || link.startsWith('/payout')) return '/payouts'
  if (link.startsWith('/messages') || link.startsWith('/inbox')) return '/chat-moderation'
  if (link.startsWith('/parts')) return '/parts'
  if (link.startsWith('/marketplace') || link.startsWith('/cars')) return '/cars'
  if (link.startsWith('/my-listings') || link.startsWith('/sell')) return '/moderation'
  if (link.startsWith('/settings') || link.startsWith('/account')) return '/users'
  return '/my-notifications'
}

export default adminNotificationLink

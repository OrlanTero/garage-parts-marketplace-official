/**
 * Normalize an id for comparison. Realtime broadcast payloads, REST
 * responses, and optimistic messages can mix number/string id types
 * (e.g. `1` vs `"1"`), which breaks strict `===` grouping and flips
 * bubble sides / border-radius on live arrivals.
 */
export function normalizeId(id) {
  if (id === null || id === undefined || id === '') return null
  const num = Number(id)
  return Number.isNaN(num) ? String(id) : num
}

function messageSenderId(msg) {
  if (!msg) return null
  return normalizeId(msg.sender_id ?? msg.sender?.id ?? null)
}

export function isSameSender(a, b) {
  const idA = messageSenderId(a)
  const idB = messageSenderId(b)
  if (idA === null || idB === null) return false
  return idA === idB
}

/**
 * Type-tolerant own-message check. Use everywhere instead of
 * `msg.sender_id === user?.id` so realtime messages (numeric ids from
 * the API) don't flip to the wrong side when `user.id` is a string.
 */
export function isOwnMessage(msg, viewerId) {
  const a = messageSenderId(msg)
  const b = normalizeId(viewerId)
  if (a === null || b === null) return false
  return a === b
}

function messageTimeKey(msg) {
  const t = msg?.created_at ? Date.parse(msg.created_at) : NaN
  if (!Number.isNaN(t)) return t
  return typeof msg?.id === 'number' ? msg.id : 0
}

/**
 * Chronological sort used before rendering and after realtime inserts,
 * so border-radius grouping is computed on adjacent messages in time
 * order even when a live event arrives out of order.
 */
export function sortMessagesByTime(list) {
  return [...(list || [])].sort((a, b) => {
    const ta = messageTimeKey(a)
    const tb = messageTimeKey(b)
    if (ta !== tb) return ta - tb
    const ia = typeof a?.id === 'number' ? a.id : 0
    const ib = typeof b?.id === 'number' ? b.id : 0
    return ia - ib
  })
}

function messageKey(msg) {
  return msg?.id ?? msg?.temp_id ?? null
}

/**
 * Append a realtime message safely: dedupe by id/temp_id (covers the
 * optimistic `temp_*` -> confirmed id swap) and keep the list sorted so
 * the previous bubble automatically transitions last/single -> middle/first
 * and the new bubble renders as last/single with the tail corner.
 */
export function appendRealtimeMessage(prev, incoming) {
  if (!incoming) return prev || []
  const list = prev || []
  const incomingId = incoming?.id ?? null
  const incomingTemp = incoming?.temp_id ?? null
  const exists = list.some((m) => {
    if (incomingId !== null && (m.id === incomingId || m.temp_id === incomingId)) return true
    if (incomingTemp !== null && (m.id === incomingTemp || m.temp_id === incomingTemp)) return true
    return false
  })
  if (exists) return list
  return sortMessagesByTime([...list, incoming])
}

/**
 * Compute the grouping position and header visibility for a message
 * in a conversation thread based on consecutive messages from the same sender.
 *
 * NOTE: positions are derived at render time from the full (sorted)
 * messages array, so when a realtime message is appended every bubble's
 * border-radius class updates automatically — no stored position needed.
 *
 * @param {Array} messages - List of conversation messages
 * @param {number} idx - Current message index
 * @returns {{ position: 'single' | 'first' | 'middle' | 'last', showSenderHeader: boolean, isSameSenderAsPrev: boolean, isSameSenderAsNext: boolean }}
 */
export function getMessagePositionInfo(messages, idx) {
  if (!messages || idx < 0 || idx >= messages.length) {
    return {
      position: 'single',
      showSenderHeader: true,
      isSameSenderAsPrev: false,
      isSameSenderAsNext: false,
    }
  }

  const currentMsg = messages[idx]
  const prevMsg = idx > 0 ? messages[idx - 1] : null
  const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null

  // Realtime-safe: compare ids type-tolerantly (number vs string) and
  // fall back to sender.id when sender_id is missing on live payloads.
  const isSameSenderAsPrev = !!(prevMsg && isSameSender(prevMsg, currentMsg))
  const isSameSenderAsNext = !!(nextMsg && isSameSender(nextMsg, currentMsg))

  let position = 'single'
  if (!isSameSenderAsPrev && !isSameSenderAsNext) {
    position = 'single'
  } else if (!isSameSenderAsPrev && isSameSenderAsNext) {
    position = 'first'
  } else if (isSameSenderAsPrev && isSameSenderAsNext) {
    position = 'middle'
  } else if (isSameSenderAsPrev && !isSameSenderAsNext) {
    position = 'last'
  }

  return {
    position,
    showSenderHeader: !isSameSenderAsPrev,
    isSameSenderAsPrev,
    isSameSenderAsNext,
  }
}

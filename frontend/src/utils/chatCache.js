/**
 * Chat cache — memory-first with bounded localStorage persistence.
 * Kills the inbox flicker: threads and message logs render instantly from
 * cache while a silent background refresh keeps them in sync.
 */

const MAX_CONVS = 15
const MAX_MSGS_PER_CONV = 40

const memConvs = new Map() // uid -> conversation list
const memMsgs = new Map() // `${uid}:${convId}` -> message list

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full/blocked — memory cache still works for this session.
  }
}

const convsKey = (uid) => `gpm_chat_convs_${uid}`
const msgsKey = (uid, convId) => `gpm_chat_msgs_${uid}_${convId}`
const memMsgKey = (uid, convId) => `${uid}:${convId}`

export function getCachedConversations(uid) {
  if (!uid) return []
  if (memConvs.has(uid)) return memConvs.get(uid)
  const stored = read(convsKey(uid))
  const list = Array.isArray(stored) ? stored : []
  memConvs.set(uid, list)
  return list
}

export function setCachedConversations(uid, list) {
  if (!uid || !Array.isArray(list)) return
  const trimmed = list.slice(0, MAX_CONVS)
  memConvs.set(uid, trimmed)
  write(convsKey(uid), trimmed)
}

export function getCachedMessages(uid, convId) {
  if (!uid || convId == null) return null // null = unknown, [] = known-empty
  const key = memMsgKey(uid, convId)
  if (memMsgs.has(key)) return memMsgs.get(key)
  const stored = read(msgsKey(uid, convId))
  if (stored === null) return null
  const list = Array.isArray(stored) ? stored.slice(-MAX_MSGS_PER_CONV) : []
  memMsgs.set(key, list)
  return list
}

export function setCachedMessages(uid, convId, msgs) {
  if (!uid || convId == null || !Array.isArray(msgs)) return
  const trimmed = msgs.slice(-MAX_MSGS_PER_CONV)
  memMsgs.set(memMsgKey(uid, convId), trimmed)
  write(msgsKey(uid, convId), trimmed)
}

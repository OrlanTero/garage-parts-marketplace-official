import { CAR_PRESETS, PART_PRESETS } from './catalogFilters.js'

/**
 * Recommendation engine — "Picked for you" + "Because you viewed".
 *
 * Signals (all client-side, explainable, no backend needed):
 *   1. Interests — onboarding picks (car:<preset>, part:<preset>,
 *      x:oem, x:surplus) matched through the shared catalog matchers.
 *   2. Browse history — recent listing views (recorded on detail pages),
 *      weighted by recency: same brand / category / body style and
 *      nearby price band score higher.
 *
 * Automation path: recordListingView() already centralizes every view
 * event — when a server-side `recently_viewed` endpoint lands, swap the
 * localStorage read in getRecentViews() for that fetch and everything
 * downstream keeps working.
 */

const HISTORY_KEY = 'gpm_recent_views'
const HISTORY_MAX = 30

const norm = (v) => String(v ?? '').toLowerCase().trim()

function readHistory() {
  try {
    const rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function writeHistory(rows) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, HISTORY_MAX)))
  } catch {
    // storage full/blocked — recommendations degrade to interests-only
  }
}

/** Record a listing view (call once per detail-page load). */
export function recordListingView(item, type) {
  if (!item) return
  const id = item.uuid || item.id
  if (id == null) return
  const rows = readHistory().filter(
    (r) => !(r.type === type && String(r.id) === String(id)),
  )
  rows.unshift({
    type,
    id,
    title: item.title || item.name || '',
    image: item.primary_image_url || item.image_url || item.img || null,
    brand: item.brand || item.make || null,
    category: item.category || item.cat || null,
    body: item.body_style || item.bodyStyle || null,
    price: Number(item.price) || null,
    viewed_at: new Date().toISOString(),
  })
  writeHistory(rows)
}

/** Most-recent-first view history (for "recently viewed" rails too). */
export function getRecentViews(limit = 10) {
  return readHistory().slice(0, limit)
}

export function clearRecentViews() {
  writeHistory([])
}

/** Split onboarding interests into car/part preset ids + flags. */
export function parseInterests(user) {
  const raw = Array.isArray(user?.interests) ? user.interests : []
  const carPresets = []
  const partPresets = []
  let oem = false
  let surplus = false
  raw.forEach((entry) => {
    const [kind, id] = String(entry).split(':')
    if (kind === 'car' && id && id !== 'all') carPresets.push(id)
    else if (kind === 'part' && id && id !== 'all') partPresets.push(id)
    else if (entry === 'x:oem') oem = true
    else if (entry === 'x:surplus') surplus = true
  })
  return { carPresets, partPresets, oem, surplus, hasAny: raw.length > 0 }
}

function presetLabel(list, id) {
  return list.find((p) => p.id === id)?.label || id
}

function priceClose(a, b) {
  if (!a || !b) return false
  return Math.abs(a - b) / Math.max(a, b) <= 0.35
}

function scoreCar(car, ctx) {
  let score = 0
  const reasons = []
  ctx.carPresets.forEach((pid) => {
    const preset = CAR_PRESETS.find((p) => p.id === pid)
    try {
      if (preset?.match && preset.match(car)) {
        score += 3
        reasons.push(`Matches your ${presetLabel(CAR_PRESETS, pid)} interest`)
      }
    } catch { /* ignore bad rows */ }
  })
  ctx.historyCars.forEach((view, idx) => {
    const decay = 1 / (1 + idx * 0.25)
    if (view.brand && norm(view.brand) === norm(car.brand || car.make)) {
      score += 2 * decay
      if (reasons.length < 2) reasons.push(`More ${view.brand}-style builds like one you viewed`)
    }
    if (view.body && norm(view.body) === norm(car.body_style || car.bodyStyle)) {
      score += 1 * decay
    }
    if (priceClose(view.price, Number(car.price))) {
      score += 1 * decay
    }
  })
  if (car.inspection_score || car.score) score += 0.5
  return { score: Math.round(score * 10) / 10, reasons: [...new Set(reasons)].slice(0, 2) }
}

function scorePart(part, ctx) {
  let score = 0
  const reasons = []
  ctx.partPresets.forEach((pid) => {
    const preset = PART_PRESETS.find((p) => p.id === pid)
    try {
      if (preset?.match && preset.match(part)) {
        score += 3
        reasons.push(`Matches your ${presetLabel(PART_PRESETS, pid)} interest`)
      }
    } catch { /* ignore bad rows */ }
  })
  if (ctx.oem && /oem|genuine/i.test(`${part.category || ''} ${part.name || part.title || ''}`)) {
    score += 1.5
    reasons.push('OEM genuine pick')
  }
  if (ctx.surplus && /surplus|used/i.test(`${part.condition || ''} ${part.name || part.title || ''}`)) {
    score += 1.5
    reasons.push('Surplus find for you')
  }
  ctx.historyParts.forEach((view, idx) => {
    const decay = 1 / (1 + idx * 0.25)
    if (view.category && norm(view.category) === norm(part.category || part.cat)) {
      score += 2 * decay
      if (reasons.length < 2) reasons.push(`More ${view.category} parts like one you viewed`)
    }
    if (priceClose(view.price, Number(part.price))) {
      score += 1 * decay
    }
  })
  return { score: Math.round(score * 10) / 10, reasons: [...new Set(reasons)].slice(0, 2) }
}

/**
 * Ranked "Picked for you" across both catalogs. Returns
 * [{ kind: 'car'|'part', item, score, reasons }] sorted by score.
 * Items scoring 0 are dropped unless nothing scored (fallback: newest).
 */
export function rankForYou(cars = [], parts = [], user, { limit = 8 } = {}) {
  const parsed = parseInterests(user)
  const history = getRecentViews(20)
  const ctx = {
    ...parsed,
    historyCars: history.filter((h) => h.type === 'car'),
    historyParts: history.filter((h) => h.type === 'part'),
  }
  const ranked = [
    ...cars.map((item) => ({ kind: 'car', item, ...scoreCar(item, ctx) })),
    ...parts.map((item) => ({ kind: 'part', item, ...scorePart(item, ctx) })),
  ].filter((r) => r.score > 0)
  ranked.sort((a, b) => b.score - a.score)
  const picks = ranked.slice(0, limit)
  if (picks.length > 0) return picks
  // Cold start with no signals: newest first, no reasons.
  return [...cars.map((item) => ({ kind: 'car', item, score: 0, reasons: [] }))]
    .concat(parts.map((item) => ({ kind: 'part', item, score: 0, reasons: [] })))
    .slice(0, limit)
}

/** Similar listings to the one being viewed (same pool, excludes itself). */
export function similarListings(item, pool = [], type, limit = 4) {
  if (!item) return []
  const id = item.uuid || item.id
  const ctx = {
    carPresets: [],
    partPresets: [],
    oem: false,
    surplus: false,
    historyCars: type === 'car' ? [{ ...item, type: 'car' }] : [],
    historyParts: type === 'part' ? [{ ...item, type: 'part' }] : [],
  }
  return pool
    .filter((c) => String(c.uuid || c.id) !== String(id))
    .map((c) => ({
      item: c,
      ...(type === 'car' ? scoreCar(c, ctx) : scorePart(c, ctx)),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

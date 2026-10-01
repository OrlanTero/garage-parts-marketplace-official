/**
 * Listing access helpers — who sees buyer CTAs vs manage controls.
 *
 * RULE: the main garage (house account) and a listing's own seller never
 * inquire / buy their own catalog. They get manage controls instead.
 *
 * FUTURE (partner garages & warehouses): give staff a `garage_id` (and/or
 * `warehouse_ids`) on the user and a matching `garage_id` / `warehouse_id`
 * on the listing — then extend `canManagePart`/`canManageCar` with:
 *
 *   const sameGarage = user?.garage_id != null
 *     && part?.garage_id != null
 *     && String(user.garage_id) === String(part.garage_id)
 *
 * No other call sites need to change; they all go through these helpers.
 */

const sameId = (a, b) => {
  if (a == null || b == null || a === '' || b === '') return false
  return Number(a) === Number(b)
}

/** Direct ownership: viewer is the listing's seller. */
export function isOwnerOf(user, listing) {
  const seller = listing?.seller
  if (seller && (seller.id != null || seller.uuid != null)) {
    if (sameId(user?.id, seller.id)) return true
    if (user?.uuid && seller.uuid && user.uuid === seller.uuid) return true
  }
  // Top-level FK fallback (some endpoints omit the nested seller object).
  if (listing?.seller_id != null && sameId(user?.id, listing.seller_id)) return true
  if (listing?.seller_uuid && user?.uuid && listing.seller_uuid === user.uuid) return true
  return false
}

/** Main garage account — manages the whole parts catalog. */
export function isHouseAccount(user) {
  if (!user) return false
  if (user.is_house === true) return true
  // Flagged staff operators (e.g. seller@garagemarket.ph) manage the house
  // catalog without owning the house user row. See backend managesHouseCatalog().
  if (user.manages_house_catalog === true) return true
  if (typeof user.username === 'string' && user.username.toLowerCase() === 'gap_valenzuela_main') return true
  return false
}

/**
 * Partner-garage / warehouse hook (FUTURE — fields don't exist yet).
 * Returns true when viewer staff-share a garage or warehouse with the listing.
 */
export function sharesGarageScope(user, listing) {
  if (!user || !listing) return false
  if (user.garage_id != null && listing.garage_id != null && String(user.garage_id) === String(listing.garage_id)) {
    return true
  }
  const userWarehouses = Array.isArray(user.warehouse_ids) ? user.warehouse_ids.map(String) : []
  const listingWarehouse = listing.warehouse_id != null ? String(listing.warehouse_id) : null
  if (listingWarehouse && userWarehouses.includes(listingWarehouse)) return true
  return false
}

/** Parts: owner, house staff, or future same-garage staff manage; everyone else buys. */
export function canManagePart(user, part) {
  if (!user || !part) return false
  return isOwnerOf(user, part) || isHouseAccount(user) || sharesGarageScope(user, part)
}

/** Cars: same rule (house rarely owns cars, but staff never inquire on managed stock). */
export function canManageCar(user, car) {
  if (!user || !car) return false
  return isOwnerOf(user, car) || isHouseAccount(user) || sharesGarageScope(user, car)
}

/** Buyer CTA visibility = logged in (or guest) AND not a manager of this listing. */
export function canBuyPart(user, part) {
  return !canManagePart(user, part)
}

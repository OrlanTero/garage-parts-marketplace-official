import { CAR_STATUSES, PART_STATUSES, STATUS_LABELS } from '../api/seller.js'
import { sellerCars } from '../api/cars.js'
import { sellerParts } from '../api/parts.js'

// House-managed states (inspection + moderation) are never seller-settable.
const SYSTEM_STATES = ['pending_inspection', 'inspected', 'rejected']

export function sellerStatusOptions(listingType) {
  const all = listingType === 'car' ? CAR_STATUSES : PART_STATUSES
  return all.filter((s) => !SYSTEM_STATES.includes(s))
}

export function normalizeListingStatus(status) {
  return String(status?.value || status || '').toLowerCase()
}

/**
 * One shared listing-status picker used everywhere a seller manages a
 * listing: inbox chat header, floating drawer, detail owner panel, and
 * My Listings rows. Same options (the seller-manageable subset of the
 * canonical status lists), same labels, one set-status endpoint.
 */
export default function ListingStatusPicker({
  listingType,
  listingId,
  value,
  onChanged,
  onError,
  disabled = false,
  confirmSold = true,
  className = '',
  style,
}) {
  const options = sellerStatusOptions(listingType)
  const current = normalizeListingStatus(value)
  const inOptions = options.includes(current)

  const handleChange = async (e) => {
    const next = e.target.value
    if (!next || next === current || disabled) return
    if (next === 'sold' && confirmSold) {
      const ok = window.confirm('Mark this listing as sold? It will leave the public marketplace.')
      if (!ok) {
        e.target.value = current
        return
      }
    }
    const api = listingType === 'car' ? sellerCars : sellerParts
    try {
      await api.setStatus(listingId, next)
      onChanged?.(next)
    } catch (err) {
      e.target.value = current
      onError?.(err)
    }
  }

  return (
    <select
      value={inOptions ? current : ''}
      disabled={disabled}
      onChange={handleChange}
      className={className}
      style={style}
      title="Change this listing's marketplace status"
    >
      {!inOptions && (
        <option value="" disabled>
          {STATUS_LABELS[current] || current || 'Status'}
        </option>
      )}
      {options.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s] || s}
        </option>
      ))}
    </select>
  )
}

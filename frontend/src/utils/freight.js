import { useEffect, useState } from 'react'
import client from '../api/client.js'

/**
 * Freight rules — live policy from the backend, never hardcoded thresholds.
 *
 * Source of truth: backend App\Services\DeliveryFeeService::policy()
 * (Admin → Config can change threshold/fees anytime). This module fetches
 * GET /freight-policy once at boot (see main.jsx) and caches it; the
 * synchronous helpers below always read the cached policy.
 *
 * Rule (mirrors the backend exactly):
 *   1. Cars always ship free.
 *   2. Part flagged `free_shipping` → free.
 *   3. Threshold > 0 AND subtotal at/above it → free (0 = promo disabled,
 *      distance always computes from the dispatch warehouse).
 *   4. Otherwise distance quote (pin/city) clamped [min, max],
 *      or the flat fee with no destination.
 */

const DEFAULT_POLICY = {
  threshold: 10000,
  flat_fee: 350,
  per_km: 15,
  min_fee: 150,
  max_fee: 1200,
  min_quantity: 0,
}

let policy = { ...DEFAULT_POLICY }
let policyLoaded = false
let policyPromise = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try {
      fn({ ...policy })
    } catch {
      // ignore listener errors
    }
  })
}

/** Fetch once, cache forever (per page load). Resolves to the policy. */
export function loadFreightPolicy() {
  if (policyPromise) return policyPromise
  policyPromise = client
    .get('/freight-policy')
    .then((r) => r.data?.data ?? r.data)
    .then((p) => {
      if (p && typeof p === 'object') {
        policy = {
          threshold: Number(p.threshold ?? DEFAULT_POLICY.threshold),
          flat_fee: Number(p.flat_fee ?? DEFAULT_POLICY.flat_fee),
          per_km: Number(p.per_km ?? DEFAULT_POLICY.per_km),
          min_fee: Number(p.min_fee ?? DEFAULT_POLICY.min_fee),
          max_fee: Number(p.max_fee ?? DEFAULT_POLICY.max_fee),
          min_quantity: Number(p.min_quantity ?? 0),
        }
        policyLoaded = true
        notify()
      }
      return { ...policy }
    })
    .catch(() => ({ ...policy }))
  return policyPromise
}

/** Current (possibly default) policy snapshot. */
export function getFreightPolicy() {
  return { ...policy }
}

/** React hook — re-renders when the live policy arrives. */
export function useFreightPolicy() {
  const [current, setCurrent] = useState({ ...policy, loaded: policyLoaded })
  useEffect(() => {
    const fn = (p) => setCurrent({ ...p, loaded: true })
    listeners.add(fn)
    loadFreightPolicy()
    return () => {
      listeners.delete(fn)
    }
  }, [])
  return current
}

export const peso = (v, digits = 2) =>
  '₱ ' + Number(v || 0).toLocaleString('en-PH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

const flagOn = (part) =>
  part != null && (part.free_shipping === true || part.freeShip === true)

/** Synchronous free-freight verdict (cards, badges, pre-quote paint). */
export function partShipsFree(part, subtotal = null, pol = policy) {
  if (!part) return false
  if (flagOn(part)) return true
  const threshold = Number(pol?.threshold ?? DEFAULT_POLICY.threshold)
  if (!(threshold > 0)) return false
  const amount = subtotal ?? Number(part.price || 0)
  return amount >= threshold
}

/** True only when the SELLER flagged this listing free (not threshold). */
export function partFlaggedFree(part) {
  return flagOn(part)
}

/** Short badge copy for cards and detail hero. */
export function freightBadge(part, subtotal = null, pol = policy) {
  if (partShipsFree(part, subtotal, pol)) {
    if (flagOn(part)) return 'Free Freight'
    const threshold = Number(pol?.threshold ?? DEFAULT_POLICY.threshold)
    return `Free Freight ₱${threshold.toLocaleString('en-PH')}+`
  }
  return null
}

// Legacy named exports (pre-policy constants) — prefer useFreightPolicy().
export const FREE_FREIGHT_THRESHOLD = DEFAULT_POLICY.threshold
export const STANDARD_FLAT_FEE = DEFAULT_POLICY.flat_fee

import { useEffect, useState } from 'react'
import client from '../api/client.js'

/**
 * Program economics — live from backend GET /program, never hardcoded.
 * Source of truth: AgentService + PerksService (admin-parameterized).
 *
 *   agent: 3% cars / 10% parts commission, ₱100/yr subscription, ₱50/active referral
 *   perks: ₱100/yr membership, up to 30% off flagged parts + merchant catalog
 */

const DEFAULT_PROGRAM = {
  agent: {
    commission_car_pct: 3,
    commission_part_pct: 10,
    subscription_fee: 100,
    subscription_days: 365,
    referral_reward: 50,
  },
  perks: {
    subscription_fee: 100,
    subscription_days: 365,
    max_part_discount_pct: 30,
  },
}

let program = structuredClone(DEFAULT_PROGRAM)
let programLoaded = false
let programPromise = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(structuredClone(program))
    } catch {
      // ignore listener errors
    }
  })
}

/** Fetch once, cache forever (per page load). */
export function loadProgram() {
  if (programPromise) return programPromise
  programPromise = client
    .get('/program')
    .then((r) => r.data?.data ?? r.data)
    .then((p) => {
      if (p && typeof p === 'object') {
        program = {
          agent: { ...DEFAULT_PROGRAM.agent, ...(p.agent || {}) },
          perks: { ...DEFAULT_PROGRAM.perks, ...(p.perks || {}) },
        }
        programLoaded = true
        notify()
      }
      return structuredClone(program)
    })
    .catch(() => structuredClone(program))
  return programPromise
}

export function getProgram() {
  return structuredClone(program)
}

/** React hook — re-renders when the live program arrives. */
export function useProgram() {
  const [current, setCurrent] = useState({ ...structuredClone(program), loaded: programLoaded })
  useEffect(() => {
    const fn = (p) => setCurrent({ ...p, loaded: true })
    listeners.add(fn)
    loadProgram()
    return () => {
      listeners.delete(fn)
    }
  }, [])
  return current
}

/** "3% cars · 10% parts" style summary for marketing copy. */
export function commissionSummary(prog = program) {
  const car = Number(prog?.agent?.commission_car_pct ?? 3)
  const part = Number(prog?.agent?.commission_part_pct ?? 10)
  return `${car}% cars · ${part}% parts`
}

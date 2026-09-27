import { useEffect, useState } from 'react'

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000
const WEEK = 604_800_000

function toDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Human-friendly relative time: "just now", "5m ago", "3h ago",
 * "2d ago", "3w ago", otherwise a short absolute date.
 */
export function timeAgo(value, now = Date.now()) {
  const d = toDate(value)
  if (!d) return '—'
  const diff = now - d.getTime()
  if (diff < 45_000) return 'just now'
  if (diff < HOUR) {
    const m = Math.max(1, Math.floor(diff / MINUTE))
    return `${m}m ago`
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR)
    return `${h}h ago`
  }
  if (diff < 7 * DAY) {
    const days = Math.floor(diff / DAY)
    return days === 1 ? 'yesterday' : `${days}d ago`
  }
  if (diff < 30 * DAY) {
    const w = Math.floor(diff / WEEK)
    return `${w}w ago`
  }
  return formatDateTime(d)
}

export function formatDateTime(value) {
  const d = toDate(value)
  if (!d) return '—'
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** <TimeAgo value={msg.created_at} /> with full date tooltip. */
export function TimeAgo({ value, style, className }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const d = toDate(value)
  return (
    <span className={className} style={style} title={d ? d.toLocaleString() : undefined}>
      {timeAgo(value)}
    </span>
  )
}

export default timeAgo

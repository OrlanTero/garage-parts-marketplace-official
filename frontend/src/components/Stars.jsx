import { Star } from 'lucide-react'

/**
 * Star rating display + interactive rater.
 * Usage: <Stars value={4.5} /> read-only, or
 * <Stars value={rating} onRate={setRating} size={26} /> interactive.
 */
export default function Stars({ value = 0, size = 14, onRate = null, color = '#e06c35' }) {
  const interactive = typeof onRate === 'function'

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = value >= s - 0.25
        const half = !filled && value >= s - 0.75
        return (
          <span
            key={s}
            role={interactive ? 'radio' : undefined}
            aria-checked={interactive ? value === s : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? () => onRate(s) : undefined}
            onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRate(s) } } : undefined}
            style={{ cursor: interactive ? 'pointer' : 'default', display: 'inline-flex', position: 'relative', outline: 'none' }}
            title={interactive ? `${s} star${s > 1 ? 's' : ''}` : undefined}
          >
            <Star
              size={size}
              color={filled || half ? color : '#475569'}
              fill={filled ? color : 'transparent'}
              strokeWidth={filled ? 0 : 1.5}
            />
            {half && (
              <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: '50%', pointerEvents: 'none' }}>
                <Star size={size} color={color} fill={color} strokeWidth={0} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

import { useState, createContext, useContext } from 'react'
import { ChevronDown } from 'lucide-react'

const AccordionContext = createContext({
  openItems: [],
  toggleItem: () => {},
  allowMultiple: false,
})

export function Accordion({ children, allowMultiple = true, defaultOpen = [], className = '', style = {} }) {
  const [openItems, setOpenItems] = useState(
    Array.isArray(defaultOpen) ? defaultOpen : defaultOpen ? [defaultOpen] : []
  )

  const toggleItem = (id) => {
    setOpenItems((prev) => {
      if (allowMultiple) {
        return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      }
      return prev.includes(id) ? [] : [id]
    })
  }

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, allowMultiple }}>
      <div className={`admin-accordion ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

export function AccordionItem({ id, children, className = '', style = {} }) {
  const { openItems } = useContext(AccordionContext)
  const isOpen = openItems.includes(id)

  return (
    <div
      className={`admin-accordion-item ${isOpen ? 'is-open' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--admin-bg-card)',
        border: '1px solid var(--admin-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: isOpen ? 'var(--shadow-card)' : 'none',
        ...style,
      }}
    >
      {typeof children === 'function' ? children({ isOpen }) : children}
    </div>
  )
}

export function AccordionHeader({ id, title, subtitle, badge, icon: Icon, actions, children }) {
  const { openItems, toggleItem } = useContext(AccordionContext)
  const isOpen = openItems.includes(id)

  return (
    <div
      onClick={() => toggleItem(id)}
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        userSelect: 'none',
        backgroundColor: isOpen ? 'var(--admin-bg-subtle)' : '#FFFFFF',
        transition: 'background-color 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        {Icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isOpen ? 'rgba(146, 68, 36, 0.1)' : 'var(--admin-bg-subtle)',
              color: isOpen ? 'var(--color-rust)' : 'var(--admin-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={18} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {title && (
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                {title}
              </span>
            )}
            {badge && (
              <span className={`badge ${badge.variant ? `badge-${badge.variant}` : 'badge-neutral'}`} style={{ fontSize: 11 }}>
                {badge.label || badge}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
          {children}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={(e) => e.stopPropagation()}>
        {actions}
        <button
          type="button"
          onClick={() => toggleItem(id)}
          aria-label={isOpen ? 'Collapse section' : 'Expand section'}
          style={{
            border: 'none',
            background: 'none',
            padding: 6,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isOpen ? 'var(--color-rust)' : 'var(--admin-text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease, color 0.15s ease',
          }}
        >
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  )
}

export function AccordionBody({ id, children, style = {} }) {
  const { openItems } = useContext(AccordionContext)
  const isOpen = openItems.includes(id)

  if (!isOpen) return null

  return (
    <div
      style={{
        padding: '20px',
        borderTop: '1px solid var(--admin-border-subtle)',
        backgroundColor: '#FFFFFF',
        animation: 'fadeIn 0.2s ease-out',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

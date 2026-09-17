import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const ROUTE_LABELS = {
  cars: 'Car Builds & Showroom',
  parts: 'Parts & Catalog',
  users: 'Users & Roles',
  inspections: 'Garage Inspections',
  system: 'System & Edge Health',
  settings: 'Admin Settings',
}

export function Breadcrumbs() {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter((x) => x)

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: 'var(--admin-text-muted)',
        marginBottom: 20,
      }}
    >
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--admin-text-secondary)',
          fontWeight: 600,
          transition: 'color 0.15s ease',
        }}
      >
        <Home size={15} />
        <span>Admin Hub</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`
        const isLast = index === pathnames.length - 1
        const label = ROUTE_LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1)

        return (
          <div key={to} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ChevronRight size={14} style={{ color: 'var(--admin-text-muted)' }} />
            {isLast ? (
              <span style={{ color: 'var(--color-rust)', fontWeight: 700 }}>{label}</span>
            ) : (
              <Link
                to={to}
                style={{
                  color: 'var(--admin-text-secondary)',
                  fontWeight: 500,
                }}
              >
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

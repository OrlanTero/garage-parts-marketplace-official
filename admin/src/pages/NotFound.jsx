import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="admin-card"
        style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          padding: 36,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: 16,
            backgroundColor: 'var(--color-orange-light)',
            color: 'var(--color-rust)',
            borderRadius: '50%',
            marginBottom: 20,
          }}
        >
          <FileQuestion size={44} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'var(--admin-text-primary)',
            marginBottom: 8,
          }}
        >
          404 — Section Not Found
        </h1>

        <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, marginBottom: 24 }}>
          The requested administrative view does not exist or has been relocated.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Return to Admin Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { marketplaceParts } from '../api/parts.js'

export default function PartDetail() {
  const { id } = useParams()
  const [part, setPart] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    marketplaceParts
      .show(id)
      .then(setPart)
      .catch((e) => setError(e.response?.status === 404 ? 'Part not found or no longer listed.' : e.message))
  }, [id])

  if (error) return <p className="error">{error} <Link to="/parts">Back to parts</Link></p>
  if (!part) return <p>Loading part…</p>

  const specs = [
    ['Category', part.category?.replace('_', ' ')], ['Brand', part.brand || '—'],
    ['Part number', part.part_number || '—'], ['Condition', part.condition],
    ['Quantity', part.quantity],
    ['Price', '₱' + Number(part.price).toLocaleString('en-PH')],
    ['City', part.city || '—'],
  ]

  return (
    <div className="detail-page">
      <div className="page-container">
        <Link to="/parts" className="btn btn-secondary" style={{ marginBottom: 20, display: 'inline-flex' }}>
          ← Back to parts
        </Link>
        <h1>{part.title}</h1>
        <table className="specs">
          <tbody>
            {specs.map(([k, v]) => (
              <tr key={k}><th>{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
        {part.compatibility && (<><h2>Compatibility</h2><p>{part.compatibility}</p></>)}
        {part.description && (<><h2>Seller notes</h2><p>{part.description}</p></>)}
        {part.seller && <p className="muted">Listed by {part.seller.name}</p>}
      </div>
    </div>
  )
}

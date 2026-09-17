import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { marketplaceCars } from '../api/cars.js'

export default function CarDetail() {
  const { id } = useParams()
  const [car, setCar] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    marketplaceCars
      .show(id)
      .then(setCar)
      .catch((e) => setError(e.response?.status === 404 ? 'Car not found or no longer listed.' : e.message))
  }, [id])

  if (error) return <p className="error">{error} <Link to="/marketplace">Back to marketplace</Link></p>
  if (!car) return <p>Loading car…</p>

  const specs = [
    ['Brand', car.brand], ['Model', car.model], ['Year', car.year],
    ['Price', '₱' + Number(car.price).toLocaleString('en-PH')],
    ['Mileage', `${Number(car.mileage_km).toLocaleString()} km`],
    ['Body style', car.body_style], ['Fuel', car.fuel_type],
    ['Transmission', car.transmission?.replace('_', ' ')], ['Condition', car.condition],
    ['Color', car.color || '—'], ['City', car.city || '—'],
  ]

  return (
    <div className="detail-page">
      <div className="page-container">
        <Link to="/marketplace" className="btn btn-secondary" style={{ marginBottom: 20, display: 'inline-flex' }}>
          ← Back to marketplace
        </Link>
        <h1>{car.title}</h1>
        <table className="specs">
          <tbody>
            {specs.map(([k, v]) => (
              <tr key={k}><th>{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
        {car.description && (<><h2>Seller notes</h2><p>{car.description}</p></>)}
        {car.seller && <p className="muted">Listed by {car.seller.name}</p>}
      </div>
    </div>
  )
}

import { useState } from 'react'
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Car,
  Wrench,
  Calendar,
  AlertTriangle,
} from 'lucide-react'

const INSPECTIONS = [
  {
    id: 'INS-2026-081',
    vehicle: '1998 Nissan Silvia S15 Spec-R',
    seller: 'Cebu JDM Performance Hub',
    status: 'passed',
    score: '98/100',
    date: '2026-09-14',
    inspector: 'Chief Mechanic B. Santos',
    notes: 'Chassis rails straight, compression 155psi across all cylinders. Certified.',
  },
  {
    id: 'INS-2026-082',
    vehicle: '2021 Toyota Hilux Conquest 4x4 Expedition',
    seller: 'Davao 4x4 & Overland Depot',
    status: 'passed',
    score: '100/100',
    date: '2026-09-15',
    inspector: 'Senior Tech R. Dizon',
    notes: 'ARB suspension torque-checked, zero underbody corrosion, winch operational.',
  },
  {
    id: 'INS-2026-083',
    vehicle: '1974 Toyota Celica GT Liftback',
    seller: 'Manila Classic Restorations',
    status: 'pending',
    score: 'In Progress',
    date: '2026-09-17',
    inspector: 'Makati Inspection HQ Lift #2',
    notes: '2T-G twin-carb synchronization and floor pan thickness check underway.',
  },
  {
    id: 'INS-2026-084',
    vehicle: '2019 Subaru WRX STI EJ25 Final Edition',
    seller: 'Makati Showroom & HQ',
    status: 'passed',
    score: '96/100',
    date: '2026-09-16',
    inspector: 'Chief Mechanic B. Santos',
    notes: 'Brembo calipers serviced with Motul RBF660, compression test verified.',
  },
]

export default function InspectionsManagement() {
  const [inspections] = useState(INSPECTIONS)
  const [search, setSearch] = useState('')

  const filtered = inspections.filter(
    (i) =>
      !search.trim() ||
      i.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.seller.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--admin-text-primary)',
              margin: '0 0 4px 0',
            }}
          >
            100-Point Garage Certified Inspections
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit physical vehicle hoist checks, compression tests, and buyer guarantee records.
          </p>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Inspection Ref</th>
              <th>Vehicle Specification</th>
              <th>Seller Showroom</th>
              <th>Inspection Score</th>
              <th>Status</th>
              <th>Certified Date</th>
              <th>Diagnostic Findings</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 700, color: 'var(--color-rust)', fontSize: 13 }}>
                  {item.id}
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {item.vehicle}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                    {item.inspector}
                  </div>
                </td>
                <td>{item.seller}</td>
                <td>
                  <span style={{ fontWeight: 700, color: item.status === 'passed' ? '#047857' : '#B45309' }}>
                    {item.score}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      item.status === 'passed'
                        ? 'badge-success'
                        : 'badge-warning'
                    }`}
                  >
                    {item.status === 'passed' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <Clock size={12} />
                    )}
                    {item.status}
                  </span>
                </td>
                <td>{item.date}</td>
                <td>
                  <span style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                    {item.notes}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

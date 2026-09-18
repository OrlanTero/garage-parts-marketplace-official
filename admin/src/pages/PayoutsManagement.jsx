import { useState } from 'react'
import {
  CreditCard,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  Send,
  Download,
  AlertTriangle,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const PAYOUT_BATCHES = [
  {
    id: 'BATCH-2026-09-A',
    date: '2026-09-17',
    totalAmount: '$28,450.00',
    sellersCount: 8,
    status: 'processing',
    statusLabel: 'Processing Stripe Transfer',
    statusVariant: 'warning',
    payoutMethod: 'Automated ACH / Stripe Connect',
    sellers: [
      { store: 'HKS Powerhouse Tokyo', iban: 'JP-***-9921', balance: '$6,420.00', ordersCount: 4 },
      { store: 'Brembo Racing NA', iban: 'US-***-4481', balance: '$8,950.00', ordersCount: 2 },
      { store: 'KW Automotive GmbH', iban: 'DE-***-1192', balance: '$5,800.00', ordersCount: 3 },
      { store: 'Tomei Motorsport UK', iban: 'GB-***-7730', balance: '$3,480.00', ordersCount: 5 },
      { store: 'Apex Carbon Works', iban: 'US-***-8821', balance: '$3,800.00', ordersCount: 2 },
    ],
  },
  {
    id: 'BATCH-2026-09-B',
    date: '2026-09-10',
    totalAmount: '$42,100.00',
    sellersCount: 14,
    status: 'settled',
    statusLabel: 'Settled & Paid',
    statusVariant: 'success',
    payoutMethod: 'Stripe Direct Payout',
    sellers: [
      { store: 'Garrett Motion Direct', iban: 'US-***-1049', balance: '$14,200.00', ordersCount: 9 },
      { store: 'Volk Racing JDM', iban: 'JP-***-3391', balance: '$18,500.00', ordersCount: 6 },
      { store: 'Akrapovic Exhaust Systems', iban: 'SI-***-8829', balance: '$9,400.00', ordersCount: 3 },
    ],
  },
]

export default function PayoutsManagement() {
  const [batches, setBatches] = useState(PAYOUT_BATCHES)
  const [simulatedStatus, setSimulatedStatus] = useState(null)

  const processBatch = (batchId) => {
    setSimulatedStatus(`Executing automated wire disbursement for ${batchId}...`)
    setTimeout(() => {
      setBatches(
        batches.map((b) =>
          b.id === batchId
            ? { ...b, status: 'settled', statusLabel: 'Settled & Paid', statusVariant: 'success' }
            : b
        )
      )
      setSimulatedStatus(`Success: Funds disbursed for batch ${batchId}.`)
    }, 1200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Seller Payout & Settlement Ledger
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit seller clearing accounts, trigger automated Stripe Connect disbursements, and verify commission settlements.
          </p>
        </div>

        <button className="admin-btn admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Download size={15} />
          <span>Export Financial Ledger</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total Cleared Payouts</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$70,550.00</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(216, 98, 44, 0.1)', color: 'var(--color-rust)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Queued in Current Batch</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$28,450.00</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Merchant Accounts</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>38 Verified Sellers</div>
          </div>
        </div>
      </div>

      {simulatedStatus && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
          {simulatedStatus}
        </div>
      )}

      {/* Batches Accordion */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 14px 0' }}>
          Scheduled & Settled Disbursement Batches
        </h2>

        <Accordion defaultOpen={['BATCH-2026-09-A']}>
          {batches.map((b) => (
            <AccordionItem key={b.id} id={b.id}>
              <AccordionHeader
                id={b.id}
                title={`${b.id} · Scheduled ${b.date}`}
                subtitle={`Payout Gateway: ${b.payoutMethod} · ${b.sellersCount} Merchants`}
                badge={{ label: b.statusLabel, variant: b.statusVariant }}
                icon={CreditCard}
                actions={
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--color-rust)' }}>
                    {b.totalAmount}
                  </span>
                }
              />
              <AccordionBody id={b.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Verified Seller Store</th>
                          <th>Routing / IBAN Mask</th>
                          <th>Orders Included</th>
                          <th>Settlement Status</th>
                          <th style={{ textAlign: 'right' }}>Disbursement Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.sellers.map((s, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700 }}>{s.store}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--admin-text-muted)' }}>{s.iban}</td>
                            <td>{s.ordersCount} Completed Orders</td>
                            <td>
                              <span className="badge badge-success" style={{ fontSize: 11 }}>
                                <CheckCircle2 size={11} /> Ready for Settlement
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-rust)' }}>{s.balance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      Marketplace Commission Deducted: <strong>5.0% standard take rate</strong>
                    </div>

                    {b.status === 'processing' && (
                      <button
                        onClick={() => processBatch(b.id)}
                        className="admin-btn admin-btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                      >
                        <Send size={14} />
                        <span>Execute Stripe Wire Disbursement</span>
                      </button>
                    )}
                  </div>
                </div>
              </AccordionBody>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}

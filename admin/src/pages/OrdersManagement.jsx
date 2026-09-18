import { useState } from 'react'
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  AlertCircle,
  PackageCheck,
  ExternalLink,
  ChevronRight,
  User,
  MapPin,
  DollarSign,
  ArrowRight,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const INITIAL_ORDERS = [
  {
    id: 'ORD-8941',
    buyer: { name: 'Kenji Takahashi', email: 'kenji@tokyogarage.jp', location: 'Yokohama, Japan' },
    seller: { name: 'HKS Pro Dealer', store: 'HKS Powerhouse Tokyo', payoutStatus: 'Payment Settled' },
    placedAt: '2026-09-17 11:20 AM',
    status: 'processing',
    statusLabel: 'Order Processing',
    statusVariant: 'rust',
    total: '$3,850.00',
    platformFee: '$192.50',
    netPayout: '$3,657.50',
    trackingNumber: 'DHL-EX-99281741',
    carrier: 'DHL Express Global',
    items: [
      { name: 'Garrett G30-770 Dual Ball Bearing Turbocharger (0.83 A/R)', sku: 'GAR-G30-770-V', qty: 1, price: '$2,450.00' },
      { name: 'Tial 44mm MVR External V-Band Wastegate (Purple)', sku: 'TIAL-MVR-44-P', qty: 1, price: '$480.00' },
      { name: 'Custom Titanium Equal-Length Exhaust Manifold for 2JZ', sku: 'TI-2JZ-MANI-01', qty: 1, price: '$920.00' },
    ],
    shippingAddress: '3-14-2 Minatomirai, Nishi-ku, Yokohama, Kanagawa 220-0012, Japan',
  },
  {
    id: 'ORD-8940',
    buyer: { name: 'Marcus Vance', email: 'marcus.v@apexmotors.com', location: 'Austin, TX, USA' },
    seller: { name: 'Brembo Racing NA', store: 'Brembo Official Store', payoutStatus: 'Dispatched' },
    placedAt: '2026-09-16 04:45 PM',
    status: 'delivered',
    statusLabel: 'Delivered & Completed',
    statusVariant: 'success',
    total: '$4,600.00',
    platformFee: '$230.00',
    netPayout: '$4,370.00',
    trackingNumber: 'FDX-88319920',
    carrier: 'FedEx Priority Freight',
    items: [
      { name: 'Brembo GT-R 6-Piston Billet Monoblock Front Brake Kit 380mm (Porsche 992)', sku: 'BRM-GTR-992-FR', qty: 1, price: '$4,600.00' },
    ],
    shippingAddress: '1204 Apex Circuit Dr, Suite 400, Austin, TX 78701, United States',
  },
  {
    id: 'ORD-8939',
    buyer: { name: 'Sebastian Becker', email: 's.becker@nuerburg.de', location: 'Munich, Germany' },
    seller: { name: 'KW Automotive GmbH', store: 'KW Factory Direct', payoutStatus: 'Payment Settled' },
    placedAt: '2026-09-15 09:12 AM',
    status: 'shipped',
    statusLabel: 'In Transit',
    statusVariant: 'info',
    total: '$3,190.00',
    platformFee: '$159.50',
    netPayout: '$3,030.50',
    trackingNumber: 'UPS-DE-77182930',
    carrier: 'UPS Worldwide Saver',
    items: [
      { name: 'KW Clubsport 3-Way Adjustable Coilover Kit (BMW G80 M3)', sku: 'KW-CS-3W-G80', qty: 1, price: '$3,190.00' },
    ],
    shippingAddress: 'Ringstraße 88, 80331 Munich, Bavaria, Germany',
  },
  {
    id: 'ORD-8938',
    buyer: { name: 'Liam Davies', email: 'liam@silverstoneuk.co.uk', location: 'Northampton, UK' },
    seller: { name: 'Tomei Powered UK', store: 'Tomei Motorsport', payoutStatus: 'On Hold' },
    placedAt: '2026-09-14 02:30 PM',
    status: 'disputed',
    statusLabel: 'Return / Dispute Review',
    statusVariant: 'danger',
    total: '$1,280.00',
    platformFee: '$64.00',
    netPayout: '$1,216.00',
    trackingNumber: 'DPD-UK-44192801',
    carrier: 'DPD UK Courier',
    items: [
      { name: 'Tomei Poncam 260° Camshaft Set for Nissan RB26DETT', sku: 'TM-PON-RB26', qty: 1, price: '$1,280.00' },
    ],
    shippingAddress: '4 Silverstone Paddock Way, Northamptonshire, NN12 8TN, United Kingdom',
  },
]

export default function OrdersManagement() {
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const markCompleted = (orderId) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'delivered',
              statusLabel: 'Delivered & Completed',
              statusVariant: 'success',
              seller: { ...o.seller, payoutStatus: 'Dispatched' },
            }
          : o
      )
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Orders & Marketplace Fulfillment Lifecycle
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Audit marketplace purchases, manage order fulfillment status, track carrier waybills, and process seller payouts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="admin-btn admin-btn-secondary" style={{ fontSize: 13 }}>
            Export Orders CSV
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total Order Volume</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$12,920.00</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <Truck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Shipments</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$7,040.00</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Platform Take (5%)</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$646.00</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)' }}>
          {['all', 'processing', 'shipped', 'delivered', 'disputed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`tab-btn ${statusFilter === st ? 'active' : ''}`}
            >
              {st === 'all' ? 'All Orders' : st.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search order ID, buyer, seller, part..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* Orders Accordion Stream */}
      <Accordion defaultOpen={['ORD-8941']}>
        {filteredOrders.map((ord) => (
          <AccordionItem key={ord.id} id={ord.id}>
            <AccordionHeader
              id={ord.id}
              title={`${ord.id} · ${ord.buyer.name}`}
              subtitle={`Placed on ${ord.placedAt} · Seller: ${ord.seller.store}`}
              badge={{ label: ord.statusLabel, variant: ord.statusVariant }}
              icon={ShoppingBag}
              actions={
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--color-rust)' }}>
                    {ord.total}
                  </span>
                </div>
              }
            />
            <AccordionBody id={ord.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Order Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  {/* Buyer Box */}
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                      <User size={14} /> Buyer Details
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ord.buyer.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{ord.buyer.email}</div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 4 }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {ord.shippingAddress}
                    </div>
                  </div>

                  {/* Seller & Payout Box */}
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                      <DollarSign size={14} /> Payout & Financials
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ord.seller.store}</div>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                      Seller Payout: <strong>{ord.netPayout}</strong> (Platform Fee: {ord.platformFee})
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span className={`badge badge-${ord.seller.payoutStatus === 'Dispatched' ? 'success' : 'warning'}`} style={{ fontSize: 11 }}>
                        {ord.seller.payoutStatus}
                      </span>
                    </div>
                  </div>

                  {/* Shipping Box */}
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                      <Truck size={14} /> Carrier & Tracking
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ord.carrier}</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-rust)', marginTop: 2 }}>
                      {ord.trackingNumber}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6 }}>
                      Courier Waybill Status: Validated
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
                    Order Line Items ({ord.items.length}):
                  </div>
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Item Description</th>
                          <th>SKU</th>
                          <th>Qty</th>
                          <th style={{ textAlign: 'right' }}>Unit Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ord.items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--admin-text-muted)' }}>{item.sku}</td>
                            <td>{item.qty}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-rust)' }}>{item.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Administrative Order Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                    Order ID: <strong>{ord.id}</strong> · Verified Marketplace Order
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {ord.status === 'processing' && (
                      <button
                        onClick={() => markCompleted(ord.id)}
                        className="admin-btn admin-btn-primary"
                        style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <CheckCircle2 size={14} /> Mark Fulfilled & Settle Payout
                      </button>
                    )}
                    <button className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>
                      View Invoice PDF
                    </button>
                  </div>
                </div>
              </div>
            </AccordionBody>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

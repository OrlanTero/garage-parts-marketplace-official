import { useState } from 'react'
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ShieldAlert,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const DISPUTES = [
  {
    id: 'DSP-104',
    orderId: 'ORD-8938',
    claimType: 'Condition Mismatch / Damaged Item',
    buyer: { name: 'Liam Davies', email: 'liam@silverstoneuk.co.uk' },
    seller: { name: 'Tomei Powered UK', store: 'Tomei Motorsport' },
    amount: '$1,280.00',
    openedAt: '2026-09-14 04:10 PM',
    status: 'open_mediation',
    statusLabel: 'Mediation in Progress',
    statusVariant: 'warning',
    claimSummary: 'Buyer reports camshaft packaging arrived crushed with visible score marks on exhaust lobe #4.',
    evidencePhotos: ['lobe4-scratch.jpg', 'crushed-box-exterior.jpg'],
    timeline: [
      { sender: 'Buyer (Liam Davies)', time: 'Sep 14, 04:10 PM', message: 'The packaging had zero foam cushioning on the timing gear side. There is a 2mm gouge on lobe 4.' },
      { sender: 'Seller (Tomei Motorsport)', time: 'Sep 15, 09:30 AM', message: 'We inspected this camshaft prior to dispatch. The carrier DPD must have dropped the freight parcel.' },
      { sender: 'Platform Support Agent', time: 'Sep 16, 11:00 AM', message: 'Carrier insurance claim filed with DPD UK. Awaiting seller return shipping label.' },
    ],
  },
  {
    id: 'DSP-103',
    orderId: 'ORD-8890',
    claimType: 'Incorrect Fitment / Wrong Specification',
    buyer: { name: 'Daisuke Sato', email: 'sato@driftlab.jp' },
    seller: { name: 'Apex Carbon Works', store: 'Apex Carbon' },
    amount: '$2,100.00',
    openedAt: '2026-09-12 10:15 AM',
    status: 'resolved_refunded',
    statusLabel: 'Resolved · Refund Granted',
    statusVariant: 'success',
    claimSummary: 'Front carbon splitter was drilled for pre-facelift R35 bumper instead of NISMO MY2024 spec.',
    evidencePhotos: ['bolt-pattern-mismatch.jpg'],
    timeline: [
      { sender: 'Buyer (Daisuke Sato)', time: 'Sep 12, 10:15 AM', message: 'Mounting brackets do not align with NISMO front subframe.' },
      { sender: 'Seller (Apex Carbon)', time: 'Sep 12, 02:45 PM', message: 'We confirm our listing had an error in chassis compatibility table. Full refund authorized upon return.' },
      { sender: 'Admin Resolution', time: 'Sep 13, 01:00 PM', message: 'Return tracking verified. Order payment refunded to buyer.' },
    ],
  },
]

export default function DisputesManagement() {
  const [disputes, setDisputes] = useState(DISPUTES)
  const [activeTab, setActiveTab] = useState('all')
  const [actionSuccess, setActionSuccess] = useState(null)

  const handleResolution = (disputeId, resolutionType) => {
    setDisputes(
      disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status: resolutionType === 'refund' ? 'resolved_refunded' : 'resolved_seller_paid',
              statusLabel: resolutionType === 'refund' ? 'Resolved · Refunded Buyer' : 'Resolved · Claim Dismissed',
              statusVariant: resolutionType === 'refund' ? 'success' : 'rust',
            }
          : d
      )
    )
    setActionSuccess(`Dispute ${disputeId} successfully resolved (${resolutionType}).`)
    setTimeout(() => setActionSuccess(null), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Dispute Arbitration & Return Mediation
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Arbitrate buyer claims, evaluate transit damage photographic evidence, and manage order return refunds.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Active Mediation Claims</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {disputes.filter((d) => d.status === 'open_mediation').length} Active
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Dispute Resolution Rate</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>98.4% Handled</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total Disputed Capital</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>$3,380.00</div>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
          {actionSuccess}
        </div>
      )}

      {/* Disputes Accordion */}
      <Accordion defaultOpen={['DSP-104']}>
        {disputes.map((disp) => (
          <AccordionItem key={disp.id} id={disp.id}>
            <AccordionHeader
              id={disp.id}
              title={`${disp.id} · ${disp.claimType}`}
              subtitle={`Order: ${disp.orderId} · Buyer: ${disp.buyer.name} vs Seller: ${disp.seller.store}`}
              badge={{ label: disp.statusLabel, variant: disp.statusVariant }}
              icon={AlertTriangle}
              actions={
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--color-rust)' }}>
                  {disp.amount}
                </span>
              }
            />
            <AccordionBody id={disp.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Summary Box */}
                <div style={{ background: 'var(--admin-bg-subtle)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--admin-border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 4 }}>
                    Claim Description:
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--admin-text-primary)', lineHeight: 1.5 }}>
                    {disp.claimSummary}
                  </div>
                </div>

                {/* Evidence Attachments */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
                    Uploaded Photo Evidence ({disp.evidencePhotos.length}):
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {disp.evidencePhotos.map((photo, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          padding: '8px 14px',
                          background: '#FFFFFF',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 12,
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--color-rust)',
                          fontWeight: 600,
                        }}
                      >
                        <FileText size={14} />
                        <span>{photo}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mediation Chat Thread */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={14} /> Mediation Conversation Audit
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {disp.timeline.map((msg, mIdx) => (
                      <div
                        key={mIdx}
                        style={{
                          background: msg.sender.includes('Admin') ? 'rgba(146, 68, 36, 0.06)' : 'var(--admin-bg-subtle)',
                          borderLeft: msg.sender.includes('Admin') ? '3px solid var(--color-rust)' : '3px solid #cbd5e1',
                          padding: '10px 14px',
                          borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{msg.sender}</span>
                          <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{msg.time}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--admin-text-primary)' }}>{msg.message}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mediation Decision Action Bar */}
                {disp.status === 'open_mediation' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                    <button
                      onClick={() => handleResolution(disp.id, 'seller')}
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: 13 }}
                    >
                      Dismiss Claim & Retain Order Payment
                    </button>
                    <button
                      onClick={() => handleResolution(disp.id, 'refund')}
                      className="admin-btn admin-btn-primary"
                      style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <CheckCircle2 size={14} /> Authorize Full Order Refund
                    </button>
                  </div>
                )}
              </div>
            </AccordionBody>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

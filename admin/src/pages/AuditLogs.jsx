import { useState } from 'react'
import {
  Shield,
  Search,
  Filter,
  UserCheck,
  Lock,
  Key,
  DollarSign,
  Settings2,
  FileCode,
  Download,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const INITIAL_AUDIT_LOGS = [
  {
    id: 'LOG-9941',
    actor: 'admin@garageparts.local',
    actorRole: 'Super Admin',
    action: 'ORDER_PAYOUT_AUTHORIZED',
    target: 'Order #ORD-8940 (Brembo Racing NA)',
    ipAddress: '127.0.0.1 (Localhost Secured)',
    timestamp: '2026-09-17 11:45:10',
    status: 'success',
    statusLabel: 'Audit Event Logged',
    statusVariant: 'success',
    diff: {
      before: { order_id: 'ORD-8940', order_status: 'processing', payout_released: false },
      after: { order_id: 'ORD-8940', order_status: 'delivered', payout_released: true, released_amount: 4370.00 },
    },
  },
  {
    id: 'LOG-9940',
    actor: 'admin@garageparts.local',
    actorRole: 'Super Admin',
    action: 'SELLER_KYC_ACCREDITED',
    target: 'Tanaka Engineering & Tuning Works (KYC-9901)',
    ipAddress: '127.0.0.1',
    timestamp: '2026-09-17 10:20:05',
    status: 'success',
    statusLabel: 'Security Authorization',
    statusVariant: 'rust',
    diff: {
      before: { user_id: 14, role: 'buyer', verified_seller_badge: false },
      after: { user_id: 14, role: 'seller', verified_seller_badge: true, accreditation_tier: 'Platinum Certified' },
    },
  },
  {
    id: 'LOG-9939',
    actor: 'system.cron@worker',
    actorRole: 'System Daemon',
    action: 'NGINX_MICROCACHE_PURGE',
    target: 'Zone API_MICROCACHE (Key: /api/v1/cars/featured)',
    ipAddress: '127.0.0.1',
    timestamp: '2026-09-16 18:00:00',
    status: 'success',
    statusLabel: 'Automated Event',
    statusVariant: 'info',
    diff: {
      before: { cache_status: 'HIT', stale_entries: 14 },
      after: { cache_status: 'PURGED', invalidation_reason: 'CarCreated event listener triggered' },
    },
  },
]

export default function AuditLogs() {
  const [logs, setLogs] = useState(INITIAL_AUDIT_LOGS)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.target.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Security Audit Trail & Administrative Ledger
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Immutable tracking of financial disbursements, permission grants, configuration mutations, and cache invalidation operations.
          </p>
        </div>

        <button className="admin-btn admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Download size={15} />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--admin-text-muted)' }} />
        <input
          type="text"
          className="admin-input"
          placeholder="Filter by action, actor, target..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </div>

      {/* Logs Accordion */}
      <Accordion defaultOpen={['LOG-9941']}>
        {filteredLogs.map((log) => (
          <AccordionItem key={log.id} id={log.id}>
            <AccordionHeader
              id={log.id}
              title={`${log.action} · ${log.target}`}
              subtitle={`Actor: ${log.actor} (${log.actorRole}) · IP: ${log.ipAddress}`}
              badge={{ label: log.statusLabel, variant: log.statusVariant }}
              icon={Shield}
              actions={
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                  {log.timestamp}
                </span>
              }
            />
            <AccordionBody id={log.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                  State Mutation Delta (Before vs After JSON Diff):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                      Previous State (Before)
                    </div>
                    <pre
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--admin-border)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: '#64748b',
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(log.diff.before, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-rust)', marginBottom: 4, textTransform: 'uppercase' }}>
                      Committed State (After)
                    </div>
                    <pre
                      style={{
                        background: 'rgba(146, 68, 36, 0.04)',
                        border: '1px solid rgba(146, 68, 36, 0.2)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: 'var(--color-rust-dark)',
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(log.diff.after, null, 2)}
                    </pre>
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

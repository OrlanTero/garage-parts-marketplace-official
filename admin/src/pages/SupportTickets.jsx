import { useState } from 'react'
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  User,
  Send,
  CornerDownRight,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const TICKETS = [
  {
    id: 'TICK-802',
    subject: 'Carrier Tracking Request for Freight Export to Sydney',
    user: { name: 'David Miller', email: 'david@aussieboost.com.au' },
    category: 'Logistics & Shipping',
    priority: 'high',
    priorityLabel: 'High Priority (SLA: 2h)',
    priorityVariant: 'danger',
    status: 'open',
    statusLabel: 'Open & Unassigned',
    statusVariant: 'warning',
    openedAt: '2026-09-17 10:14 AM',
    conversation: [
      { sender: 'David Miller', role: 'Buyer', time: '10:14 AM', text: 'I am arranging international sea container transport for the 1999 R34 GT-R. Where can I enter the carrier booking reference to sync tracking with the seller?' },
      { sender: 'Support Bot', role: 'System', time: '10:15 AM', text: 'Automated Response: You can upload your Bill of Lading (BOL) or sea container tracking reference directly in your Order Details page.' },
    ],
  },
  {
    id: 'TICK-801',
    subject: 'Fitment Question: G30-770 V-Band Housing Compatibility with Tial Manifold',
    user: { name: 'Lucas Rossi', email: 'lucas@rossiracing.it' },
    category: 'Technical Fitment',
    priority: 'medium',
    priorityLabel: 'Medium Priority',
    priorityVariant: 'rust',
    status: 'in_progress',
    statusLabel: 'Assigned to Tuning Specialist',
    statusVariant: 'info',
    openedAt: '2026-09-16 03:20 PM',
    conversation: [
      { sender: 'Lucas Rossi', role: 'Buyer', time: '03:20 PM', text: 'Can you verify if the Garrett G30-770 0.83 A/R V-Band discharge flange matches standard 3-inch Tial turbine clamp specs?' },
      { sender: 'Staff (Alex M.)', role: 'Lead Mechanic', time: '04:05 PM', text: 'Yes, both Garrett G-Series and Tial sport turbine housings utilize identical 3.0" V-Band diameter and 15-degree sealing tapers.' },
    ],
  },
  {
    id: 'TICK-800',
    subject: 'Payout Bank Account Routing Change Verification',
    user: { name: 'HKS Powerhouse Tokyo', email: 'dealer@hks-power.co.jp' },
    category: 'Billing & KYC',
    priority: 'urgent',
    priorityLabel: 'Urgent KYC Verification',
    priorityVariant: 'danger',
    status: 'resolved',
    statusLabel: 'Resolved',
    statusVariant: 'success',
    openedAt: '2026-09-15 08:30 AM',
    conversation: [
      { sender: 'HKS Powerhouse', role: 'Seller', time: '08:30 AM', text: 'We updated our MUFG Tokyo corporate wire IBAN for upcoming batch payouts.' },
      { sender: 'Admin (Security Officer)', role: 'Admin', time: '09:12 AM', text: 'Bank statement verified against commercial registry. Payout profile updated.' },
    ],
  },
]

export default function SupportTickets() {
  const [tickets, setTickets] = useState(TICKETS)
  const [replyText, setReplyText] = useState({})
  const [filter, setFilter] = useState('all')

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'open') return t.status === 'open' || t.status === 'in_progress'
    if (filter === 'resolved') return t.status === 'resolved'
    return true
  })

  const sendReply = (ticketId) => {
    const text = replyText[ticketId]
    if (!text) return

    setTickets(
      tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'in_progress',
              statusLabel: 'Staff Replied · In Progress',
              statusVariant: 'info',
              conversation: [
                ...t.conversation,
                { sender: 'Staff (Admin Operator)', role: 'Admin', time: 'Just now', text },
              ],
            }
          : t
      )
    )
    setReplyText({ ...replyText, [ticketId]: '' })
  }

  const markResolved = (ticketId) => {
    setTickets(
      tickets.map((t) =>
        t.id === ticketId
          ? { ...t, status: 'resolved', statusLabel: 'Resolved', statusVariant: 'success' }
          : t
      )
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Customer Support & Technical Desk Triage
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Resolve technical compatibility inquiries, expedite logistics escalation, and audit support SLA performance.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Average First Response SLA</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>14 mins</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Unresolved Inquiries</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {tickets.filter((t) => t.status !== 'resolved').length} Open
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Resolution Satisfaction</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>99.2%</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
        <button
          onClick={() => setFilter('all')}
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
        >
          All Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setFilter('open')}
          className={`tab-btn ${filter === 'open' ? 'active' : ''}`}
        >
          Open & In Progress ({tickets.filter((t) => t.status !== 'resolved').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`tab-btn ${filter === 'resolved' ? 'active' : ''}`}
        >
          Resolved ({tickets.filter((t) => t.status === 'resolved').length})
        </button>
      </div>

      {/* Support Tickets Accordion */}
      <Accordion defaultOpen={['TICK-802']}>
        {filteredTickets.map((ticket) => (
          <AccordionItem key={ticket.id} id={ticket.id}>
            <AccordionHeader
              id={ticket.id}
              title={`${ticket.id} · ${ticket.subject}`}
              subtitle={`From: ${ticket.user.name} (${ticket.category}) · ${ticket.openedAt}`}
              badge={{ label: ticket.statusLabel, variant: ticket.statusVariant }}
              icon={LifeBuoy}
              actions={
                <span className={`badge badge-${ticket.priorityVariant}`} style={{ fontSize: 11, fontWeight: 700 }}>
                  {ticket.priorityLabel}
                </span>
              }
            />
            <AccordionBody id={ticket.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Conversation Thread */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ticket.conversation.map((msg, mIdx) => (
                    <div
                      key={mIdx}
                      style={{
                        background: msg.role === 'Admin' ? 'rgba(146, 68, 36, 0.06)' : 'var(--admin-bg-subtle)',
                        borderLeft: msg.role === 'Admin' ? '3px solid var(--color-rust)' : '3px solid #cbd5e1',
                        padding: '12px 16px',
                        borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: msg.role === 'Admin' ? 'var(--color-rust)' : 'var(--admin-text-primary)' }}>
                          {msg.sender} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--admin-text-muted)' }}>({msg.role})</span>
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{msg.time}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--admin-text-primary)', lineHeight: 1.5 }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                {ticket.status !== 'resolved' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CornerDownRight size={14} /> Send Official Staff Response:
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="Type response to buyer/seller..."
                        value={replyText[ticket.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [ticket.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendReply(ticket.id)
                        }}
                      />
                      <button
                        onClick={() => sendReply(ticket.id)}
                        className="admin-btn admin-btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                      >
                        <Send size={14} /> Send
                      </button>
                      <button
                        onClick={() => markResolved(ticket.id)}
                        className="admin-btn admin-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, color: '#047857' }}
                      >
                        <CheckCircle2 size={14} /> Mark Resolved
                      </button>
                    </div>
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

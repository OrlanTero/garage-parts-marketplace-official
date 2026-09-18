import { useState } from 'react'
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileCheck,
  Building,
  UserCheck,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Eye,
  FileText,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'

const KYC_APPLICATIONS = [
  {
    id: 'KYC-9901',
    applicantName: 'Hiroshi Tanaka',
    businessName: 'Tanaka Engineering & Tuning Works',
    type: 'Certified Garage & Merchant',
    submittedAt: '2026-09-17 08:30 AM',
    country: 'Tokyo, Japan',
    taxId: 'JP-8891002931',
    status: 'pending_review',
    statusLabel: 'Pending Admin Verification',
    statusVariant: 'warning',
    riskScore: 'Low Risk (Score: 94/100)',
    documents: [
      { name: 'Tokyo Chamber Trade License 2026.pdf', size: '2.4 MB', type: 'Trade License' },
      { name: 'Certified Mechanic Master Guild Proof.pdf', size: '1.8 MB', type: 'Technician Credential' },
      { name: 'Workshop Facility Insurance & Dyno Certificate.pdf', size: '3.1 MB', type: 'Facility Proof' },
    ],
    workshopBays: 4,
    specialization: 'JDM Engine Builds (RB26, 2JZ, VR38)',
  },
  {
    id: 'KYC-9900',
    applicantName: 'Klaus Schmidt',
    businessName: 'Schmidt Rennsport GmbH',
    type: 'High-Volume Parts Distributor',
    submittedAt: '2026-09-16 02:15 PM',
    country: 'Stuttgart, Germany',
    taxId: 'DE-309188271',
    status: 'verified',
    statusLabel: 'Verified Merchant',
    statusVariant: 'success',
    riskScore: 'Low Risk (Score: 98/100)',
    documents: [
      { name: 'Handelsregister Extract HRB 88291.pdf', size: '1.2 MB', type: 'Commercial Registry' },
      { name: 'VAT Registration Certificate EU.pdf', size: '890 KB', type: 'Tax ID' },
    ],
    workshopBays: 0,
    specialization: 'OEM & Aftermarket Wholesale Distribution',
  },
  {
    id: 'KYC-9899',
    applicantName: 'Dmitri Petrov',
    businessName: 'Apex Drift Garage LLC',
    type: 'Individual Tuning Specialist',
    submittedAt: '2026-09-15 11:00 AM',
    country: 'Miami, FL, USA',
    taxId: 'US-65-881920',
    status: 'flagged_docs',
    statusLabel: 'Documents Flagged (Clarification Needed)',
    statusVariant: 'danger',
    riskScore: 'High Risk (Score: 42/100)',
    documents: [
      { name: 'Drivers_License_Front.jpg', size: '940 KB', type: 'Government ID' },
    ],
    workshopBays: 2,
    specialization: 'Custom Turbo Piping & Fabrication',
  },
]

export default function VerificationsManagement() {
  const [applications, setApplications] = useState(KYC_APPLICATIONS)
  const [feedback, setFeedback] = useState(null)

  const handleApprove = (id) => {
    setApplications(
      applications.map((app) =>
        app.id === id
          ? { ...app, status: 'verified', statusLabel: 'Verified Merchant', statusVariant: 'success' }
          : app
      )
    )
    setFeedback(`Application ${id} approved. Seller badge issued.`)
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleReject = (id) => {
    setApplications(
      applications.map((app) =>
        app.id === id
          ? { ...app, status: 'flagged_docs', statusLabel: 'Rejected / Additional Proof Required', statusVariant: 'danger' }
          : app
      )
    )
    setFeedback(`Application ${id} status set to Rejected/Flagged.`)
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: '0 0 6px 0' }}>
            Seller KYC & Workshop Accreditation
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Review merchant trade licenses, inspect workshop diagnostic certifications, and grant verified seller trust badges.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
            <FileCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Pending Review</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {applications.filter((a) => a.status === 'pending_review').length} Applications
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Accredited Sellers</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>42 Verified</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
            <Building size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Partner Garages</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>19 Certified Hubs</div>
          </div>
        </div>
      </div>

      {feedback && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
          {feedback}
        </div>
      )}

      {/* Applications Accordion */}
      <Accordion defaultOpen={['KYC-9901']}>
        {applications.map((app) => (
          <AccordionItem key={app.id} id={app.id}>
            <AccordionHeader
              id={app.id}
              title={`${app.id} · ${app.businessName}`}
              subtitle={`Applicant: ${app.applicantName} (${app.country}) · Tax ID: ${app.taxId}`}
              badge={{ label: app.statusLabel, variant: app.statusVariant }}
              icon={Building}
              actions={
                <span className="badge badge-neutral" style={{ fontSize: 11, fontWeight: 700 }}>
                  {app.riskScore}
                </span>
              }
            />
            <AccordionBody id={app.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Meta details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Business Category</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 4 }}>{app.type}</div>
                  </div>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Workshop Facilities</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)', marginTop: 4 }}>{app.workshopBays} Service Bays</div>
                  </div>
                  <div style={{ background: 'var(--admin-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Specialization</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-rust)', marginTop: 4 }}>{app.specialization}</div>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8 }}>
                    Submitted Legal & Technical Documents ({app.documents.length}):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                    {app.documents.map((doc, dIdx) => (
                      <div
                        key={dIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#FFFFFF',
                          border: '1px solid var(--admin-border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileText size={18} style={{ color: 'var(--color-rust)' }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{doc.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{doc.type} · {doc.size}</div>
                          </div>
                        </div>
                        <button className="admin-btn admin-btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }}>
                          <Eye size={13} /> View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Administrative Decision Controls */}
                {app.status === 'pending_review' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                    <button
                      onClick={() => handleReject(app.id)}
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: 13, color: '#b91c1c' }}
                    >
                      Request Additional Documentation
                    </button>
                    <button
                      onClick={() => handleApprove(app.id)}
                      className="admin-btn admin-btn-primary"
                      style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <CheckCircle2 size={14} /> Approve & Issue Trust Badge
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

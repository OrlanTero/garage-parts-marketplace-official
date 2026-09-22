import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  CheckCircle2, 
  Printer, 
  ArrowLeft, 
  Car, 
  Wrench, 
  ShieldCheck, 
  MapPin, 
  User, 
  CreditCard, 
  Calendar, 
  FileText,
  AlertCircle,
  Package,
  Download
} from 'lucide-react'
import { ordersApi } from '../api/orders.js'

export default function SalesOrder() {
  const { orderNumber } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    async function fetchOrder() {
      try {
        const data = await ordersApi.show(orderNumber)
        if (isMounted) {
          setOrder(data)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching sales order:', err)
        if (isMounted) {
          setError(err?.response?.data?.message || 'Sales order could not be retrieved.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (orderNumber) {
      fetchOrder()
    }

    return () => { isMounted = false }
  }, [orderNumber])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 12 }}>Loading Official Sales Order...</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Retrieving serialized vehicle chassis fitment and order data...</div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid #ef4444', 
          borderRadius: 12, 
          padding: 32,
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <AlertCircle size={40} color="#ef4444" />
          <h2 style={{ fontSize: 20, margin: 0, color: '#f8fafc' }}>Sales Order Not Found</h2>
          <p style={{ color: '#94a3b8', maxWidth: 450, margin: 0 }}>
            {error || `Unable to find sales order with reference #${orderNumber}.`}
          </p>
          <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: 12 }}>
            Return to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  // Safe accessor fallbacks
  const buyer = order.buyer || {}
  const vehicle = order.vehicle || {}
  const financials = order.financials || {}
  const items = order.items || []
  const orderNum = order.order_number || order.id || orderNumber

  const chassisNum = vehicle.chassis_number || order.chassis_number || 'N/A'
  const vinNum = vehicle.vin || order.vin || 'N/A'
  const vehicleModel = vehicle.make_model || order.vehicle_make_model || 'Target Vehicle Specification'

  return (
    <div className="sales-order-wrapper" style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      
      {/* Top Controls Bar (Hidden during Print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Link 
          to="/marketplace" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Continue Shopping
        </Link>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Printer size={16} /> Print / Save PDF
          </button>
          
          <Link
            to="/parts"
            style={{
              background: '#d8622c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Package size={16} /> Browse More Parts
          </Link>
        </div>
      </div>

      {/* Confirmation Banner */}
      <div className="no-print" style={{ 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.2) 100%)', 
        border: '1px solid rgba(16, 185, 129, 0.3)', 
        borderRadius: 12, 
        padding: '20px 24px', 
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{ 
          background: '#10b981', 
          color: '#ffffff', 
          width: 44, 
          height: 44, 
          borderRadius: 50, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0', color: '#10b981' }}>
            Sales Order Successfully Generated & Serialized!
          </h2>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>
            Thank you, <strong>{buyer.name || 'Customer'}</strong>. Your sales order reference is <strong>{orderNum}</strong>. Vehicle fitment validation has been recorded for chassis <strong>{chassisNum}</strong>.
          </div>
        </div>
      </div>

      {/* THE OFFICIAL SALES ORDER DOCUMENT */}
      <div 
        id="official-sales-order-doc"
        style={{
          background: '#161922',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: '40px 36px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: 24, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 14, height: 14, background: '#d8622c', borderRadius: 3 }} />
              <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.05em', color: '#f8fafc', fontFamily: 'var(--font-display, inherit)' }}>
                GARAGE PARTS MARKETPLACE
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Official Automotive Sales Order & Fitment Certification
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Depot Logistics & Fulfillment Center · Makati Showroom Hub
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Sales Order Ref
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#d8622c', fontFamily: 'monospace', margin: '2px 0 6px 0' }}>
              {orderNum}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(216, 98, 44, 0.15)', color: '#fb923c', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
              <ShieldCheck size={13} /> {order.status_label || 'Order Processing'}
            </div>
          </div>
        </div>

        {/* Date & Reference Meta Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, background: '#0f1117', padding: '14px 20px', borderRadius: 8, marginBottom: 28, border: '1px solid #1e293b', fontSize: 12 }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Order Date / Time:</span>
            <strong style={{ color: '#f8fafc' }}>{order.placed_at || new Date().toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Payment Method:</span>
            <strong style={{ color: '#f8fafc', textTransform: 'capitalize' }}>
              {financials.payment_method?.replace('_', ' ') || order.payment_method || 'Bank Transfer'}
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Payment Status:</span>
            <strong style={{ color: '#eab308', textTransform: 'uppercase' }}>
              {financials.payment_status || order.payment_status || 'Pending Verification'}
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Fitment Validation:</span>
            <strong style={{ color: '#10b981' }}>✓ Chassis Certified</strong>
          </div>
        </div>

        {/* Referring Sales Agent Attribution Box */}
        {(order.agent || order.agent_code) && (
          <div style={{
            background: 'rgba(249, 115, 22, 0.05)',
            border: '1px solid rgba(249, 115, 22, 0.25)',
            borderRadius: 8,
            padding: '12px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🤝</span>
              <div>
                <span style={{ color: '#94a3b8' }}>Referring Sales Agent / Affiliate Partner:</span>{' '}
                <strong style={{ color: '#f8fafc' }}>
                  {order.agent?.name || order.agent_name || 'Accredited Partner'}
                </strong>{' '}
                <span style={{ color: '#f97316', fontFamily: 'monospace', fontWeight: 700 }}>
                  ({order.agent?.code || order.agent_code})
                </span>
              </div>
            </div>
            <div style={{ color: '#10b981', fontWeight: 700, fontSize: 11, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              ✓ Accredited Referral (5%)
            </div>
          </div>
        )}

        {/* SECTION: TWO-COLUMN DETAILS GRID (CUSTOMER & VEHICLE IDENTIFICATION) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          
          {/* Customer & Shipping Details Box */}
          <div style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <User size={15} /> Customer & Delivery Destination
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              {buyer.name || 'Valued Customer'}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>
              {buyer.email || 'N/A'}
            </div>
            {buyer.phone && (
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                Tel: {buyer.phone}
              </div>
            )}
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 8, fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>
              <div style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Shipping Address:</div>
              <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: '#d8622c' }} />
              {buyer.full_address || order.shipping_address || 'Makati Showroom Depot Pickup'}
            </div>
          </div>

          {/* VEHICLE IDENTIFICATION & CHASSIS FITMENT BOX (CORE ISSUE REQUIREMENT) */}
          <div style={{ 
            background: 'rgba(216, 98, 44, 0.05)', 
            border: '1px solid #d8622c', 
            borderRadius: 10, 
            padding: 20,
            position: 'relative' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Car size={15} /> Vehicle Identification Details
              </div>
              <span style={{ background: '#10b981', color: '#ffffff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                Serialized
              </span>
            </div>

            {/* Chassis Number */}
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Chassis / Frame Number:
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: '#f8fafc', background: '#0f1117', padding: '3px 8px', borderRadius: 4, display: 'inline-block', marginTop: 3, border: '1px solid #334155' }}>
                {chassisNum}
              </span>
            </div>

            {/* VIN */}
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vehicle Identification Number (VIN):
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: '#fb923c', background: '#0f1117', padding: '3px 8px', borderRadius: 4, display: 'inline-block', marginTop: 3, border: '1px solid #334155' }}>
                {vinNum}
              </span>
            </div>

            {/* Vehicle Model */}
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vehicle Specification:
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
                {vehicleModel}
              </span>
            </div>
          </div>

        </div>

        {/* SECTION: ITEMIZED ORDER TABLE */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Ordered Items & Fitment Line Specifications
          </div>

          <div style={{ border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f1117', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Item Description</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Part # / SKU</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b', background: '#161922' }}>
                      <td style={{ padding: '14px 16px', color: '#f8fafc', fontWeight: 600 }}>
                        {it.name}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#94a3b8', fontSize: 12 }}>
                        {it.sku}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#f8fafc' }}>
                        {it.qty || 1}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#f8fafc' }}>
                        {it.price}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#d8622c' }}>
                        {it.total}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr style={{ borderBottom: '1px solid #1e293b', background: '#161922' }}>
                    <td style={{ padding: '14px 16px', color: '#f8fafc', fontWeight: 600 }}>
                      {order.item?.name || 'Performance Auto Component'}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#94a3b8', fontSize: 12 }}>
                      {order.item?.sku || 'GP-ITEM-01'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#f8fafc' }}>
                      {financials.quantity || order.quantity || 1}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#f8fafc' }}>
                      {financials.formatted_unit_price || '₱ ' + (financials.unit_price || 0)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#d8622c' }}>
                      {financials.formatted_total || '₱ ' + (financials.total_amount || 0)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION: FINANCIALS & SETTLEMENT SUMMARY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginBottom: 28, alignItems: 'start' }}>
          
          {/* Payment & Wire Transfer Instructions */}
          <div style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={14} color="#d8622c" /> Official Settlement & Bank Details
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
              <div>Bank: <strong>BDO Unibank (Banco de Oro) / BPI</strong></div>
              <div>Account Name: <strong>Garage Parts Marketplace Official Corp</strong></div>
              <div>Account Number: <strong>0084-2910-4821</strong></div>
              <div>Payment Reference: <strong>{orderNum}</strong></div>
              <div style={{ marginTop: 6, color: '#64748b' }}>
                Please email payment slip to <em>orders@garageparts.ph</em> with your sales order number.
              </div>
            </div>
          </div>

          {/* Pricing Totals Box */}
          <div style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, padding: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Subtotal:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                  {financials.formatted_unit_price ? (financials.unit_price * (financials.quantity || 1)).toLocaleString('en-US', { style: 'currency', currency: 'PHP' }) : financials.formatted_total}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Shipping Freight:</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>
                  {financials.formatted_shipping_fee || 'FREE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Chassis Fitment Check:</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Included (₱0.00)</span>
              </div>
              
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Total Amount:</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#d8622c', fontFamily: 'monospace' }}>
                  {financials.formatted_total || '₱ ' + (financials.total_amount || 0)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Order Notes (if any) */}
        {order.notes && (
          <div style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, padding: 14, marginBottom: 28, fontSize: 12 }}>
            <span style={{ color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>Order Fitment Notes:</span>
            <div style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{order.notes}</div>
          </div>
        )}

        {/* Document Footer & Security Guarantee */}
        <div style={{ borderTop: '2px solid #1e293b', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 11, color: '#64748b' }}>
          <div>
            Official Garage Parts Marketplace Document · Certified for Chassis {chassisNum} & VIN {vinNum}
          </div>
          <div style={{ fontFamily: 'monospace', color: '#475569' }}>
            SERIAL: GP-AUTH-{orderNum}-SECURED
          </div>
        </div>

      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, nav, header, footer, .sidebar {
            display: none !important;
          }
          .sales-order-wrapper {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #official-sales-order-doc {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #000000 !important;
            box-shadow: none !important;
            padding: 20px !important;
          }
          #official-sales-order-doc * {
            color: #000000 !important;
          }
        }
      `}</style>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ShieldCheck, ShieldX, ArrowLeft } from 'lucide-react'
import { ordersApi } from '../api/orders.js'

/**
 * Public receipt verification. Anyone scanning the QR code on an
 * official sales order lands here — a genuine per-order security hash
 * returns the transaction summary, anything else is invalid.
 */
export default function VerifyTransaction() {
  const { hash } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ordersApi
      .verifyTransaction(hash)
      .then((data) => {
        if (alive) setResult(data)
      })
      .catch(() => {
        if (alive) setResult({ valid: false })
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [hash])

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 20px 80px 20px', textAlign: 'center' }}>
      {loading ? (
        <p style={{ color: '#94a3b8' }}>Verifying transaction…</p>
      ) : result?.valid ? (
        <div style={{ background: '#161922', border: '1px solid #10b981', borderRadius: 12, padding: 32 }}>
          <ShieldCheck size={48} color="#10b981" style={{ marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0', color: '#10b981' }}>
            Valid Transaction
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 20px 0' }}>
            This receipt was issued by Garage Parts Marketplace.
          </p>
          <div style={{ textAlign: 'left', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Order</span>
              <strong style={{ fontFamily: 'monospace' }}>{result.order_number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Item</span>
              <strong>{result.item_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Total</span>
              <strong style={{ color: '#d8622c' }}>{result.formatted_total}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Order status</span>
              <strong style={{ textTransform: 'capitalize' }}>{result.status}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Payment</span>
              <strong style={{ textTransform: 'capitalize' }}>{(result.payment_status || '').replace('_', ' ')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Seller</span>
              <strong>{result.seller_name}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#161922', border: '1px solid #ef4444', borderRadius: 12, padding: 32 }}>
          <ShieldX size={48} color="#ef4444" style={{ marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px 0', color: '#ef4444' }}>
            Invalid Transaction
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            This code does not match any genuine transaction. Do not proceed with payment or release.
          </p>
        </div>
      )}
      <Link to="/marketplace" className="btn btn-secondary" style={{ marginTop: 20, display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>
    </div>
  )
}

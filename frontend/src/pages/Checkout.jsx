import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ShieldCheck, 
  Truck, 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Building2, 
  Smartphone, 
  HelpCircle,
  Package,
  Wrench,
  Car
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { marketplaceParts } from '../api/parts.js'
import { marketplaceCars } from '../api/cars.js'
import { ordersApi } from '../api/orders.js'
import { agentsApi } from '../api/agents.js'
import { getActiveReferralCode } from '../utils/referral.js'

export default function Checkout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const partId = searchParams.get('part_id')
  const carId = searchParams.get('car_id')
  const initialRef = searchParams.get('ref') || searchParams.get('agent') || getActiveReferralCode() || ''

  const [item, setItem] = useState(null)
  const [itemType, setItemType] = useState(carId ? 'car' : 'part')
  const [loadingItem, setLoadingItem] = useState(true)
  const [quantity, setQuantity] = useState(1)

  // Customer Form Data
  const [formData, setFormData] = useState({
    buyer_name: user?.name || '',
    buyer_email: user?.email || '',
    buyer_phone: '',
    shipping_address: '',
    shipping_city: 'Metro Manila',
    shipping_postal_code: '1200',

    // Mandatory Vehicle Details
    chassis_number: '',
    vin: '',
    vehicle_make_model: '',

    // Sales Agent Referral Code
    agent_code: initialRef,

    // Payment & Notes
    payment_method: 'bank_transfer',
    notes: '',
  })

  const [agentInfo, setAgentInfo] = useState(null)
  const [verifyingAgent, setVerifyingAgent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  // Verify Agent Code
  useEffect(() => {
    let active = true
    const code = formData.agent_code?.trim()
    if (!code) {
      setAgentInfo(null)
      return
    }

    setVerifyingAgent(true)
    const timer = setTimeout(async () => {
      try {
        const res = await agentsApi.verify(code)
        if (active && res?.valid) {
          setAgentInfo(res.agent)
        }
      } catch (err) {
        if (active) {
          setAgentInfo(null)
        }
      } finally {
        if (active) setVerifyingAgent(false)
      }
    }, 400)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [formData.agent_code])

  // Pre-fill user data if auth changes
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        buyer_name: prev.buyer_name || user.name || '',
        buyer_email: prev.buyer_email || user.email || '',
      }))
    }
  }, [user])

  // Load Item Details (Part or Car)
  useEffect(() => {
    let isMounted = true
    setLoadingItem(true)

    async function loadItemData() {
      try {
        if (partId) {
          setItemType('part')
          const partData = await marketplaceParts.show(partId)
          if (isMounted) setItem(partData)
        } else if (carId) {
          setItemType('car')
          const carData = await marketplaceCars.show(carId)
          if (isMounted) setItem(carData)
        } else {
          // Default fallback demo part if accessed without params
          setItemType('part')
          setItem({
            id: null,
            title: 'Garrett G30-770 Dual Ball Bearing Turbocharger (0.83 A/R)',
            brand: 'Garrett Motion',
            part_number: 'GAR-G30-770-V',
            price: 135000,
            primary_image_url: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=800&q=80',
            seller: { name: 'HKS Powerhouse Tokyo & Garage Pro' },
            free_shipping: true,
          })
        }
      } catch (err) {
        console.error('Failed to load item for checkout:', err)
      } finally {
        if (isMounted) setLoadingItem(false)
      }
    }

    loadItemData()
    return () => { isMounted = false }
  }, [partId, carId])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  // Price calculation
  const unitPrice = item ? parseFloat(item.price || 0) : 0
  const subtotal = unitPrice * quantity
  const isFreeShipping = (item && (item.free_shipping || item.freeShip)) || subtotal >= 10000 || itemType === 'car'
  const shippingFee = isFreeShipping ? 0 : 350
  const grandTotal = subtotal + shippingFee

  const formatCurrency = (val) => {
    return '₱ ' + Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const handleSubmitOrder = async (e) => {
    e.preventDefault()
    setGeneralError('')
    setErrors({})

    // Client-side validation
    const newErrors = {}
    if (!formData.buyer_name.trim()) newErrors.buyer_name = 'Full name is required'
    if (!formData.buyer_email.trim()) newErrors.buyer_email = 'Valid email is required'
    if (!formData.shipping_address.trim()) newErrors.shipping_address = 'Shipping destination address is required'
    
    // Vehicle identification validation (Mandatory for Sales Order)
    if (!formData.chassis_number.trim()) {
      newErrors.chassis_number = 'Vehicle Chassis Number is required for fitment validation & sales order serialization'
    }
    if (!formData.vin.trim()) {
      newErrors.vin = 'VIN (Vehicle Identification Number) is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      window.scrollTo({ top: 180, behavior: 'smooth' })
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        buyer_name: formData.buyer_name,
        buyer_email: formData.buyer_email,
        buyer_phone: formData.buyer_phone,
        shipping_address: formData.shipping_address,
        shipping_city: formData.shipping_city,
        shipping_postal_code: formData.shipping_postal_code,

        // Required Vehicle Identification Fields
        chassis_number: formData.chassis_number.trim().toUpperCase(),
        vin: formData.vin.trim().toUpperCase(),
        vehicle_make_model: formData.vehicle_make_model.trim() || undefined,

        // Sales Agent Attribution
        agent_code: formData.agent_code?.trim().toUpperCase() || undefined,

        // Item & Pricing
        part_id: itemType === 'part' && item?.id ? item.id : undefined,
        car_id: itemType === 'car' && item?.id ? item.id : undefined,
        item_type: itemType,
        item_name: item?.title || 'Automotive Component',
        item_sku: item?.part_number || item?.vin || (item?.id ? `GP-${item.id}` : 'GP-ORD-01'),
        quantity: quantity,
        payment_method: formData.payment_method,
        notes: formData.notes,
      }

      const response = await ordersApi.create(payload)
      const orderNumber = response?.order_number || response?.id || 'LATEST'
      
      // Navigate to the official serialized sales order page
      navigate(`/sales-order/${orderNumber}`)
    } catch (err) {
      console.error('Order placement failed:', err)
      const serverMsg = err?.response?.data?.message
      const serverErrors = err?.response?.data?.errors
      if (serverErrors) {
        setErrors(serverErrors)
      } else {
        setGeneralError(serverMsg || 'Failed to place order. Please check all fields and try again.')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px 80px 20px' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Link 
          to={partId ? `/parts/${partId}` : carId ? `/marketplace/${carId}` : '/parts'} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Return to listing
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
          <ShieldCheck size={16} /> 256-Bit Encrypted Marketplace Checkout
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px 0', fontFamily: 'var(--font-display, inherit)' }}>
          Secure Checkout & Sales Order Generation
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 15, margin: 0 }}>
          Please enter your delivery destination and mandatory vehicle identification details (Chassis Number and VIN) to verify exact mechanical fitment and serialize your official sales order.
        </p>
      </div>

      {generalError && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid #ef4444', 
          color: '#f87171', 
          padding: '14px 18px', 
          borderRadius: 8, 
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 14
        }}>
          <AlertCircle size={20} />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 32, alignItems: 'start' }}>
          
          {/* Left Column: Checkout Form Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* SECTION 1: VEHICLE IDENTIFICATION & FITMENT DETAILS (MANDATORY REQUIREMENT) */}
            <div style={{ 
              background: '#161922', 
              border: '1px solid #d8622c', 
              borderRadius: 12, 
              padding: 24,
              boxShadow: '0 4px 20px rgba(216, 98, 44, 0.12)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ 
                    background: 'rgba(216, 98, 44, 0.15)', 
                    color: '#d8622c', 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Vehicle Identification & Fitment Details</h2>
                    <div style={{ fontSize: 12, color: '#d8622c', fontWeight: 600, marginTop: 2 }}>
                      Mandatory for Official Sales Order & Fitment Warranty
                    </div>
                  </div>
                </div>
                <span style={{ 
                  background: 'rgba(216, 98, 44, 0.2)', 
                  color: '#fb923c', 
                  fontSize: 11, 
                  fontWeight: 700, 
                  padding: '4px 10px', 
                  borderRadius: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Required
                </span>
              </div>

              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
                To guarantee 100% bolt-on compatibility and serialize your official sales order documentation, our master depot engineers cross-reference the chassis number and VIN with original factory schematics.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                
                {/* Chassis Number */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    Vehicle Chassis / Frame Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="chassis_number"
                    value={formData.chassis_number}
                    onChange={handleInputChange}
                    placeholder="e.g. JZA80-0012948 / S15-0928174"
                    style={{
                      width: '100%',
                      background: '#0f1117',
                      border: errors.chassis_number ? '1px solid #ef4444' : '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                  {errors.chassis_number ? (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.chassis_number) ? errors.chassis_number[0] : errors.chassis_number}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                      Found on vehicle chassis plate, engine bay stamp, or registration card.
                    </div>
                  )}
                </div>

                {/* VIN */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    Vehicle Identification Number (VIN) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleInputChange}
                    placeholder="e.g. 1N4AL3AP8JC123456"
                    style={{
                      width: '100%',
                      background: '#0f1117',
                      border: errors.vin ? '1px solid #ef4444' : '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                  {errors.vin ? (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.vin) ? errors.vin[0] : errors.vin}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                      17-character international standard or JDM serialization.
                    </div>
                  )}
                </div>

                {/* Vehicle Make / Model / Year */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    Target Vehicle Make, Model & Year (Optional)
                  </label>
                  <input
                    type="text"
                    name="vehicle_make_model"
                    value={formData.vehicle_make_model}
                    onChange={handleInputChange}
                    placeholder="e.g. 1999 Nissan Silvia S15 Spec-R / 1998 Toyota Supra RZ"
                    style={{
                      width: '100%',
                      background: '#0f1117',
                      border: '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

              </div>
            </div>

            {/* SECTION 2: CUSTOMER & DELIVERY ADDRESS */}
            <div style={{ 
              background: '#161922', 
              border: '1px solid #1e293b', 
              borderRadius: 12, 
              padding: 24 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.15)', 
                  color: '#60a5fa', 
                  width: 36, 
                  height: 36, 
                  borderRadius: 8, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Truck size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Customer & Delivery Destination</h2>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Official recipient information for freight logistics and sales order dispatch
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    Customer / Recipient Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="buyer_name"
                    value={formData.buyer_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Kenji Takahashi"
                    style={{
                      width: '100%',
                      background: '#0f1117',
                      border: errors.buyer_name ? '1px solid #ef4444' : '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  {errors.buyer_name && (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.buyer_name) ? errors.buyer_name[0] : errors.buyer_name}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    Email Address for Sales Order PDF <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="buyer_email"
                    value={formData.buyer_email}
                    onChange={handleInputChange}
                    placeholder="e.g. kenji@tokyogarage.jp"
                    style={{
                      width: '100%',
                      background: '#0f1117',
                      border: errors.buyer_email ? '1px solid #ef4444' : '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  {errors.buyer_email && (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.buyer_email) ? errors.buyer_email[0] : errors.buyer_email}
                    </div>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    Contact Phone / Mobile Number
                  </label>
                  <input
                    type="tel"
                    name="buyer_phone"
                    value={formData.buyer_phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +63 917 123 4567"
                    style={{
                      width: '100%',
                      background: '#0f1117',
                      border: '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* City */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    name="shipping_city"
                    value={formData.shipping_city}
                    onChange={handleInputChange}
                    placeholder="e.g. Makati City, Metro Manila"
                    style={{
                      width: '100%',
                      background: '#0f1117',
                      border: '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Street Address */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                    Complete Street Address / Garage Workshop Destination <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={2}
                    name="shipping_address"
                    value={formData.shipping_address}
                    onChange={handleInputChange}
                    placeholder="Unit / House No., Street, Barangay, Landmark (e.g. 3-14-2 Minatomirai, Nishi-ku or Unit 4B Chino Roces Ave)"
                    style={{
                      width: '100%',
                      background: '#0f1117',
                      border: errors.shipping_address ? '1px solid #ef4444' : '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                  {errors.shipping_address && (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.shipping_address) ? errors.shipping_address[0] : errors.shipping_address}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* SECTION 3: SALES AGENT & REFERRAL PARTNER (OPTIONAL) */}
            <div style={{ 
              background: '#161922', 
              border: agentInfo ? '1px solid #10b981' : '1px solid #1e293b', 
              borderRadius: 12, 
              padding: 24,
              transition: 'border-color 0.2s ease' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ 
                    background: 'rgba(249, 115, 22, 0.15)', 
                    color: '#f97316', 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Sales Agent / Referral Partner</h2>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      Support your referring tuning shop, advisor, or garage affiliate
                    </div>
                  </div>
                </div>
                {agentInfo && (
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    color: '#10b981', 
                    fontSize: 12, 
                    fontWeight: 700, 
                    padding: '4px 10px', 
                    borderRadius: 20 
                  }}>
                    ✓ Verified Partner
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                  Sales Agent Referral Code (Optional)
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    name="agent_code"
                    value={formData.agent_code}
                    onChange={handleInputChange}
                    placeholder="e.g. AGT-ANTON or YOUR_AGENT_CODE"
                    style={{
                      flex: 1,
                      background: '#0f1117',
                      border: agentInfo ? '1px solid #10b981' : '1px solid #2d3748',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#f8fafc',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                </div>

                {verifyingAgent && (
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                    Checking agent code...
                  </div>
                )}

                {agentInfo && (
                  <div style={{ 
                    marginTop: 10, 
                    padding: '10px 14px', 
                    background: 'rgba(16, 185, 129, 0.08)', 
                    border: '1px solid rgba(16, 185, 129, 0.25)', 
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13
                  }}>
                    <span style={{ fontSize: 16 }}>🤝</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#10b981' }}>
                        Accredited Agent: {agentInfo.name} ({agentInfo.agent_code})
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {agentInfo.tagline || 'Official Garage Parts Sales Specialist'} · 5% Sales Commission Accredited
                      </div>
                    </div>
                  </div>
                )}

                {!agentInfo && formData.agent_code && !verifyingAgent && (
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                    Sales attribution code <strong>{formData.agent_code}</strong> will be recorded on your sales order.
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: PAYMENT METHOD */}
            <div style={{ 
              background: '#161922', 
              border: '1px solid #1e293b', 
              borderRadius: 12, 
              padding: 24 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  color: '#34d399', 
                  width: 36, 
                  height: 36, 
                  borderRadius: 8, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Payment Settlement Method</h2>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Sales order is generated immediately; settlement instructions provided upon submission
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  { id: 'bank_transfer', label: 'Direct Bank Wire / Transfer', desc: 'BDO / BPI / UnionBank Corporate', icon: Building2 },
                  { id: 'ewallet', label: 'GCash / Maya Digital Pay', desc: 'Instant QR Code verification', icon: Smartphone },
                  { id: 'credit_card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, JCB Secure', icon: CreditCard },
                ].map((pay) => {
                  const Icon = pay.icon
                  const isSelected = formData.payment_method === pay.id
                  return (
                    <label
                      key={pay.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '14px 16px',
                        background: isSelected ? 'rgba(216, 98, 44, 0.08)' : '#0f1117',
                        border: isSelected ? '1px solid #d8622c' : '1px solid #2d3748',
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={pay.id}
                        checked={isSelected}
                        onChange={handleInputChange}
                        style={{ marginTop: 3, accentColor: '#d8622c' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: '#f8fafc' }}>
                          <Icon size={14} color={isSelected ? '#d8622c' : '#94a3b8'} />
                          {pay.label}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{pay.desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* SECTION 4: NOTES & FITMENT INSTRUCTIONS */}
            <div style={{ 
              background: '#161922', 
              border: '1px solid #1e293b', 
              borderRadius: 12, 
              padding: 24 
            }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                Special Fitment Notes / Dispatch Instructions
              </label>
              <textarea
                rows={2}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Include custom vehicle setup, requested courier notes, or specific mechanics requests..."
                style={{
                  width: '100%',
                  background: '#0f1117',
                  border: '1px solid #2d3748',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: '#f8fafc',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

          </div>

          {/* Right Column: Order Summary & Sales Order Generator */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ 
              background: '#161922', 
              border: '1px solid #1e293b', 
              borderRadius: 12, 
              padding: 24,
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={18} color="#d8622c" /> Order Summary
                </h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>1 Item</span>
              </div>

              {/* Item Card Preview */}
              {loadingItem ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Loading order item details...
                </div>
              ) : item ? (
                <div style={{ display: 'flex', gap: 14, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 20 }}>
                  <div style={{ 
                    width: 72, 
                    height: 72, 
                    borderRadius: 8, 
                    overflow: 'hidden', 
                    background: '#0f1117', 
                    flexShrink: 0,
                    border: '1px solid #2d3748'
                  }}>
                    <img 
                      src={item.primary_image_url || item.primaryImageUrl || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=400&q=80'} 
                      alt={item.title || 'Item'} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', lineHeight: 1.3, marginBottom: 4 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 6 }}>
                      SKU: {item.part_number || item.vin || (item.id ? `GP-${item.id}` : 'GP-ORD-01')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#d8622c' }}>
                        {formatCurrency(unitPrice)}
                      </div>
                      
                      {/* Qty Selector */}
                      {itemType !== 'car' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f1117', border: '1px solid #2d3748', borderRadius: 6, padding: '2px 8px' }}>
                          <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0 }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0 }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Price Calculation Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Items Subtotal</span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Express Freight Logistics</span>
                  <span style={{ color: isFreeShipping ? '#10b981' : '#f8fafc', fontWeight: 600 }}>
                    {isFreeShipping ? 'FREE (Special Promo)' : formatCurrency(shippingFee)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Chassis & VIN Fitment Validation</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Included (₱0.00)</span>
                </div>
                
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Total Payable</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#d8622c', fontFamily: 'var(--font-display, inherit)' }}>
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || loadingItem}
                style={{
                  width: '100%',
                  background: submitting ? '#9a431c' : '#d8622c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 20px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.15s ease',
                  boxShadow: '0 4px 14px rgba(216, 98, 44, 0.4)',
                }}
              >
                {submitting ? (
                  <>Processing & Generating Sales Order...</>
                ) : (
                  <>
                    <FileText size={18} /> Complete & Generate Sales Order
                  </>
                )}
              </button>

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                  <CheckCircle2 size={13} color="#10b981" /> Official Sales Order document serialized instantly
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                  <CheckCircle2 size={13} color="#10b981" /> Chassis number & VIN recorded on official receipt
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                  <CheckCircle2 size={13} color="#10b981" /> Money-back fitment guarantee policy
                </div>
              </div>

            </div>
          </div>

        </div>
      </form>
    </div>
  )
}

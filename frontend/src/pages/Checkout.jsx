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
  HelpCircle,
  Package,
  Wrench,
  Car,
  MapPin,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { marketplaceParts } from '../api/parts.js'
import { marketplaceCars } from '../api/cars.js'
import { ordersApi } from '../api/orders.js'
import { agentsApi } from '../api/agents.js'
import { getActiveReferralCode } from '../utils/referral.js'
import { partShipsFree, useFreightPolicy } from '../utils/freight.js'
import { useProgram } from '../utils/program.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import DeliveryMapPicker from '../components/DeliveryMapPicker.jsx'
import { accountApi, ADDRESS_LABELS } from '../api/account.js'

export default function Checkout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const isCompact = useMediaQuery('(max-width: 900px)')
  const isPhone = useMediaQuery('(max-width: 600px)')

  const partId = searchParams.get('part_id')
  const carId = searchParams.get('car_id')
  const offerToken = searchParams.get('offer_token')
  const initialRef = searchParams.get('ref') || searchParams.get('agent') || getActiveReferralCode() || ''

  const [item, setItem] = useState(null)
  const [itemType, setItemType] = useState(carId ? 'car' : 'part')
  const freightPolicy = useFreightPolicy()
  const program = useProgram()
  const [loadingItem, setLoadingItem] = useState(true)
  const [quantity, setQuantity] = useState(1)

  // Deal checkout: seller-issued link locks the agreed chat price.
  const [dealLocked, setDealLocked] = useState(false)
  const [dealSeller, setDealSeller] = useState('')

  // Customer Form Data
  const [formData, setFormData] = useState({
    buyer_name: user?.name || '',
    buyer_email: user?.email || '',
    buyer_phone: '',
    shipping_address: '',
    shipping_city: 'Metro Manila',
    shipping_postal_code: '1200',

    // Optional delivery pinpoint (also pinnable later on the sales order)
    delivery_latitude: '',
    delivery_longitude: '',
    delivery_label: '',

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
  const [savedAddresses, setSavedAddresses] = useState([])
  // Destination source: 'saved' (address-book card) or 'new' (manual form)
  const [destMode, setDestMode] = useState('new')
  const [selectedAddressId, setSelectedAddressId] = useState('')
  // Save the entered destination into the address book for next time
  const [saveToBook, setSaveToBook] = useState(false)
  const [bookLabel, setBookLabel] = useState('Home')

  // Saved address book — one flow for cars & parts: pick a card and the
  // street/city/postal/phone/pin fill in together. Manual form otherwise.
  useEffect(() => {
    if (!user) return
    let alive = true
    accountApi.listAddresses()
      .then((list) => {
        if (!alive) return
        const arr = Array.isArray(list) ? list : []
        setSavedAddresses(arr)
        const def = arr.find((a) => a.is_default) || arr[0]
        if (!def) return
        setDestMode('saved')
        setSelectedAddressId(String(def.id))
        applyAddressFields(def)
      })
      .catch(() => setSavedAddresses([]))
    return () => { alive = false }
  }, [user])

  // Write one address book entry into the order form (WHO stays untouched).
  const applyAddressFields = (addr) => {
    if (!addr) return
    setFormData((prev) => {
      const next = { ...prev }
      if (!prev.shipping_address && addr.address_line) next.shipping_address = addr.address_line
      if ((!prev.shipping_city || prev.shipping_city === 'Metro Manila') && addr.city) next.shipping_city = addr.city
      if ((!prev.shipping_postal_code || prev.shipping_postal_code === '1200') && addr.postal_code) next.shipping_postal_code = addr.postal_code
      if (!prev.buyer_phone && addr.phone) next.buyer_phone = addr.phone
      if (addr.latitude != null && addr.longitude != null) {
        next.delivery_latitude = addr.latitude
        next.delivery_longitude = addr.longitude
        next.delivery_label = addr.landmark || ''
      }
      return next
    })
  }

  const chooseSavedAddress = (id) => {
    const addr = savedAddresses.find((a) => String(a.id) === String(id))
    if (!addr) return
    setSelectedAddressId(String(id))
    setDestMode('saved')
    // Card is source of truth — overwrite destination (contact name/email stay).
    setFormData((prev) => ({
      ...prev,
      buyer_phone: addr.phone || prev.buyer_phone,
      shipping_address: addr.address_line || prev.shipping_address,
      shipping_city: addr.city || prev.shipping_city,
      shipping_postal_code: addr.postal_code || prev.shipping_postal_code,
      delivery_latitude: addr.latitude ?? '',
      delivery_longitude: addr.longitude ?? '',
      delivery_label: addr.landmark || '',
    }))
  }
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  // Mock settlement (real gateway plugs in later): paid automatically
  // when the sales order is generated — every created order is paid.
  // The Pay button below is an optional early-pay that just pre-fills
  // the reference shown on the receipt.
  const [mockPaid, setMockPaid] = useState(false)
  const [mockRef, setMockRef] = useState('')
  const [payProcessing, setPayProcessing] = useState(false)

  const choosePayMethod = (method) => {
    setFormData((prev) => ({ ...prev, payment_method: method }))
    setMockPaid(false)
    setMockRef('')
  }

  const handleMockPay = () => {
    if (payProcessing || mockPaid) return
    setPayProcessing(true)
    window.setTimeout(() => {
      const ref = `MOCK-${(formData.payment_method || 'bank_transfer').replace('_', '').toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`
      setMockRef(ref)
      setMockPaid(true)
      setPayProcessing(false)
    }, 1200)
  }

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
        if (offerToken) {
          const q = await ordersApi.getOfferQuote(offerToken)
          if (isMounted) {
            setItemType(q.item_type || 'car')
            setItem({
              id: q.item_type === 'car' ? q.car_id : q.part_id,
              title: q.listing_title || 'Agreed Deal',
              price: q.agreed_amount,
              primary_image_url: q.listing_image_url,
              seller: { name: q.seller_username || 'Verified Seller' },
              free_shipping: false,
            })
            setDealLocked(true)
            setDealSeller(q.seller_username || '')
          }
        } else if (partId) {
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
  }, [partId, carId, offerToken])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  // Price calculation — server is the source of truth at submit time;
  // the live quote below mirrors the backend DeliveryFeeService tiers
  // (GAP Valenzuela Main Depot → drop-off pin or city centroid).
  const unitPrice = item ? parseFloat(item.price || 0) : 0
  const subtotal = unitPrice * quantity
  const [quote, setQuote] = useState(null)

  useEffect(() => {
    if (itemType !== 'part' || !item?.id) return
    const latRaw = formData.delivery_latitude
    const lngRaw = formData.delivery_longitude
    const lat = latRaw !== '' && latRaw != null ? Number(latRaw) : undefined
    const lng = lngRaw !== '' && lngRaw != null ? Number(lngRaw) : undefined
    if ((lat !== undefined && Number.isNaN(lat)) || (lng !== undefined && Number.isNaN(lng))) return
    const timer = setTimeout(async () => {
      try {
        const q = await ordersApi.getDeliveryQuote({
          latitude: lat,
          longitude: lng,
          city: formData.shipping_city?.trim() || undefined,
          part_id: item.id,
          item_type: 'part',
          quantity,
        })
        setQuote(q)
      } catch {
        setQuote(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [itemType, item?.id, quantity, formData.delivery_latitude, formData.delivery_longitude, formData.shipping_city])

  const localFreeShipping = itemType === 'car' || partShipsFree(item, subtotal, freightPolicy)
  const isFreeShipping = quote ? Boolean(quote.free) : localFreeShipping
  const shippingFee = quote ? Number(quote.fee || 0) : (isFreeShipping ? 0 : Number(freightPolicy.flat_fee || 350))
  // Member perks preview (server recomputes authoritatively at submit).
  const perksPct = itemType === 'part' && user?.is_perks_member
    ? Math.max(0, Math.min(Number(program.perks.max_part_discount_pct || 0), Number(item?.perks_discount_pct || 0)))
    : 0
  const perksDiscount = perksPct > 0 ? Math.round(subtotal * (perksPct / 100) * 100) / 100 : 0
  const grandTotal = subtotal + shippingFee - perksDiscount

  // Chassis/VIN fitment identity is mandatory for PART orders only —
  // the buyer's vehicle must match the part. Car orders record the
  // purchased vehicle's own VIN automatically, so buyers enter nothing.
  const isPartOrder = itemType === 'part'

  const formatCurrency = (val) => {
    return '₱ ' + Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Common sense: sellers cannot buy their own listing.
  const isOwnListing = Boolean(
    user?.id && item?.seller?.id && Number(item.seller.id) === Number(user.id),
  )

  const handleSubmitOrder = async (e) => {
    e.preventDefault()
    setGeneralError('')
    setErrors({})
    if (isOwnListing) {
      setGeneralError('You cannot purchase your own listing.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Client-side validation
    const newErrors = {}
    if (!formData.buyer_name.trim()) newErrors.buyer_name = 'Full name is required'
    if (!formData.buyer_email.trim()) newErrors.buyer_email = 'Valid email is required'
    if (!formData.shipping_address.trim()) newErrors.shipping_address = 'Shipping destination address is required'

    // Auto-pay on generate: submitting the sales order settles payment
    // inline (mock gateway), so generating always produces a paid order —
    // no separate pay step required.
    let payRef = mockRef
    if (!mockPaid || !payRef) {
      payRef = `MOCK-${(formData.payment_method || 'bank_transfer').replace('_', '').toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`
      setMockRef(payRef)
      setMockPaid(true)
    }

    // Vehicle identification validation (Mandatory for PART orders only)
    if (isPartOrder) {
      if (!formData.chassis_number.trim()) {
        newErrors.chassis_number = 'Vehicle Chassis Number is required for fitment validation & sales order serialization'
      }
      if (!formData.vin.trim()) {
        newErrors.vin = 'VIN (Vehicle Identification Number) is required'
      }
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

        // Vehicle Identification Fields (parts only — car orders use the listing's own VIN)
        chassis_number: isPartOrder ? formData.chassis_number.trim().toUpperCase() : undefined,
        vin: isPartOrder ? formData.vin.trim().toUpperCase() : undefined,
        vehicle_make_model: isPartOrder ? formData.vehicle_make_model.trim() || undefined : undefined,

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
        // Settled inline on generate — the order is born paid.
        mock_paid: true,
        payment_reference: payRef,
        // Deal checkout: agreed chat price (single-use token).
        offer_token: offerToken || undefined,
        notes: formData.notes,
        // Optional upfront delivery pinpoint
        delivery_latitude: formData.delivery_latitude !== '' ? Number(formData.delivery_latitude) : undefined,
        delivery_longitude: formData.delivery_longitude !== '' ? Number(formData.delivery_longitude) : undefined,
        delivery_label: formData.delivery_label?.trim() || undefined,
      }

      const response = await ordersApi.create(payload)
      const orderNumber = response?.order_number || response?.id || 'LATEST'

      // Optionally persist this destination into the address book for later.
      if (saveToBook && user) {
        try {
          await accountApi.createAddress({
            label: bookLabel,
            recipient_name: formData.buyer_name.trim(),
            phone: formData.buyer_phone.trim() || undefined,
            address_line: formData.shipping_address.trim(),
            city: formData.shipping_city.trim() || undefined,
            postal_code: formData.shipping_postal_code.trim() || undefined,
            latitude: formData.delivery_latitude !== '' ? Number(formData.delivery_latitude) : null,
            longitude: formData.delivery_longitude !== '' ? Number(formData.delivery_longitude) : null,
            landmark: formData.delivery_label?.trim() || undefined,
          })
        } catch {
          // Never block the order on an address-book failure.
        }
      }

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
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 14, textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Return to listing
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>
          <ShieldCheck size={16} /> 256-Bit Encrypted Marketplace Checkout
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px 0', fontFamily: 'var(--font-display, inherit)' }}>
          Secure Checkout & Sales Order Generation
        </h1>
        {dealLocked && (
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--color-success)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--color-success)' }}>Deal checkout — agreed price locked.</strong>{' '}
            You negotiated this price in chat{dealSeller ? <> with <strong>@{dealSeller}</strong></> : null}; the seller-issued link applies it automatically and can be used once.
          </div>
        )}
        {isPartOrder ? (
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--color-success)' }}>Direct payment — order confirmed on checkout.</strong>{' '}
            Parts are not held in escrow. Your payment confirms the order immediately and the seller prepares dispatch. Delivery completes the order.
          </div>
        ) : (
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--color-info-text)' }}>Payment is held & secured — order not complete yet.</strong>{' '}
            Your payment goes into platform escrow when you check out. It is released to the seller only after the car is delivered and you accept it on inspection. Rejected delivery opens a dispute → refund path.
          </div>
        )}
        <p style={{ color: 'var(--color-text-muted)', fontSize: 15, margin: 0 }}>
          {isPartOrder
            ? 'Please enter your delivery destination and mandatory vehicle identification details (Chassis Number and VIN) to verify exact mechanical fitment and serialize your official sales order.'
            : 'Please enter your delivery destination to serialize your official vehicle sales order. The vehicle\u2019s own VIN is recorded automatically from its verified listing.'}
        </p>
      </div>

      {generalError && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid var(--color-error)', 
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
        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(0, 1fr) 380px', gap: isCompact ? 20 : 32, alignItems: 'start' }}>
          
          {/* Left Column: Checkout Form Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* SECTION 1: VEHICLE IDENTIFICATION & FITMENT DETAILS (PART ORDERS ONLY) */}
            {isPartOrder && (
            <div style={{ 
              background: 'var(--card-bg)', 
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
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>Vehicle Identification & Fitment Details</h2>
                    <div style={{ fontSize: 12, color: '#d8622c', fontWeight: 600, marginTop: 2 }}>
                      Mandatory for Official Sales Order & Fitment Warranty
                    </div>
                  </div>
                </div>
                <span style={{ 
                  background: 'rgba(216, 98, 44, 0.2)', 
                  color: 'var(--color-accent)', 
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

              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
                To guarantee 100% bolt-on compatibility and serialize your official sales order documentation, our master depot engineers cross-reference the chassis number and VIN with original factory schematics.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '1fr 1fr', gap: 16 }}>

                {/* Chassis Number */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                    Vehicle Chassis / Frame Number <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="chassis_number"
                    value={formData.chassis_number}
                    onChange={handleInputChange}
                    placeholder="e.g. JZA80-0012948 / S15-0928174"
                    style={{
                      width: '100%',
                      background: 'var(--color-surface-inset)',
                      border: errors.chassis_number ? '1px solid var(--color-error)' : '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                  {errors.chassis_number ? (
                    <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.chassis_number) ? errors.chassis_number[0] : errors.chassis_number}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 4 }}>
                      Found on vehicle chassis plate, engine bay stamp, or registration card.
                    </div>
                  )}
                </div>

                {/* VIN */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                    Vehicle Identification Number (VIN) <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleInputChange}
                    placeholder="e.g. 1N4AL3AP8JC123456"
                    style={{
                      width: '100%',
                      background: 'var(--color-surface-inset)',
                      border: errors.vin ? '1px solid var(--color-error)' : '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                  {errors.vin ? (
                    <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.vin) ? errors.vin[0] : errors.vin}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 4 }}>
                      17-character international standard or JDM serialization.
                    </div>
                  )}
                </div>

                {/* Vehicle Make / Model / Year */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
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
                      background: 'var(--color-surface-inset)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

              </div>
            </div>
            )}

            {/* SECTION 2: CUSTOMER & DELIVERY ADDRESS */}
            <div style={{ 
              background: 'var(--card-bg)', 
              border: '1px solid var(--card-border)', 
              borderRadius: 12, 
              padding: 24 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.15)', 
                  color: 'var(--color-info-text)', 
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>Customer & Delivery Destination</h2>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Official recipient information for freight logistics and sales order dispatch
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '1fr 1fr', gap: 16 }}>

                {/* Destination source — saved cards or manual entry */}
                {savedAddresses.length > 0 && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
                    <span>Deliver to</span>
                    <Link to="/settings?tab=addresses" style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>Manage addresses</Link>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    {savedAddresses.map((a) => {
                      const selected = destMode === 'saved' && String(selectedAddressId) === String(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => chooseSavedAddress(a.id)}
                          style={{
                            textAlign: 'left',
                            background: selected ? 'rgba(216, 98, 44, 0.08)' : 'var(--color-surface-inset)',
                            border: selected ? '1px solid #d8622c' : '1px solid var(--input-border)',
                            borderRadius: 10,
                            padding: '12px 14px',
                            cursor: 'pointer',
                            color: 'var(--color-heading)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                            <MapPin size={13} color={selected ? '#d8622c' : 'var(--color-text-muted)'} />
                            {a.is_default ? '★ ' : ''}{a.label}
                            {a.latitude != null && <span style={{ fontSize: 11, color: 'var(--color-success)' }}>· pinned</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                            {a.full_address || a.address_line}
                          </div>
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => { setDestMode('new'); setSelectedAddressId('') }}
                      style={{
                        background: destMode === 'new' ? 'rgba(216, 98, 44, 0.08)' : 'transparent',
                        border: destMode === 'new' ? '1px solid #d8622c' : '1px dashed var(--input-border)',
                        borderRadius: 10,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        color: destMode === 'new' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      + Use a new address
                    </button>
                  </div>
                </div>
                )}

                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                    Customer / Recipient Full Name <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="buyer_name"
                    value={formData.buyer_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Kenji Takahashi"
                    style={{
                      width: '100%',
                      background: 'var(--color-surface-inset)',
                      border: errors.buyer_name ? '1px solid var(--color-error)' : '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  {errors.buyer_name && (
                    <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.buyer_name) ? errors.buyer_name[0] : errors.buyer_name}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                    Email Address for Sales Order PDF <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="buyer_email"
                    value={formData.buyer_email}
                    onChange={handleInputChange}
                    placeholder="e.g. kenji@tokyogarage.jp"
                    style={{
                      width: '100%',
                      background: 'var(--color-surface-inset)',
                      border: errors.buyer_email ? '1px solid var(--color-error)' : '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  {errors.buyer_email && (
                    <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.buyer_email) ? errors.buyer_email[0] : errors.buyer_email}
                    </div>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
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
                      background: 'var(--color-surface-inset)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* City */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
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
                      background: 'var(--color-surface-inset)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Street Address */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                    Complete Street Address / Garage Workshop Destination <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <textarea
                    rows={2}
                    name="shipping_address"
                    value={formData.shipping_address}
                    onChange={handleInputChange}
                    placeholder="Unit / House No., Street, Barangay, Landmark (e.g. 3-14-2 Minatomirai, Nishi-ku or Unit 4B Chino Roces Ave)"
                    style={{
                      width: '100%',
                      background: 'var(--color-surface-inset)',
                      border: errors.shipping_address ? '1px solid var(--color-error)' : '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                  {errors.shipping_address && (
                    <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 4 }}>
                      {Array.isArray(errors.shipping_address) ? errors.shipping_address[0] : errors.shipping_address}
                    </div>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                    Postal / ZIP Code
                  </label>
                  <input
                    type="text"
                    name="shipping_postal_code"
                    value={formData.shipping_postal_code}
                    onChange={handleInputChange}
                    placeholder="e.g. 1200"
                    style={{
                      width: '100%',
                      background: 'var(--color-surface-inset)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Precise drop-off pin (parts freight) — always visible, no extra step */}
                {isPartOrder && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
                    <MapPin size={14} />
                    <span>Drop-off Pin</span>
                    {formData.delivery_latitude !== '' && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)' }}>
                        {Number(formData.delivery_latitude).toFixed(5)}, {Number(formData.delivery_longitude).toFixed(5)}
                      </span>
                    )}
                  </label>
                  <DeliveryMapPicker
                    height={280}
                    value={formData.delivery_latitude !== '' ? {
                      latitude: Number(formData.delivery_latitude),
                      longitude: Number(formData.delivery_longitude),
                      label: formData.delivery_label,
                    } : null}
                    confirmLabel={formData.delivery_latitude !== '' ? 'Update Pin' : 'Set Drop-off Pin'}
                    onConfirm={(pin) => {
                      setFormData((prev) => ({
                        ...prev,
                        delivery_latitude: pin.latitude,
                        delivery_longitude: pin.longitude,
                        delivery_label: pin.label,
                      }))
                    }}
                  />
                </div>
                )}

                {/* Save this destination for later (logged-in buyers) */}
                {user && (
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--color-surface-inset)', border: '1px solid var(--card-border)', borderRadius: 8, padding: '12px 14px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={saveToBook}
                      onChange={(e) => setSaveToBook(e.target.checked)}
                      style={{ accentColor: '#d8622c', width: 16, height: 16 }}
                    />
                    Save this delivery info to my Address Book
                  </label>
                  {saveToBook && (
                    <select
                      value={bookLabel}
                      onChange={(e) => setBookLabel(e.target.value)}
                      aria-label="Address book label"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--color-heading)', fontSize: 13, outline: 'none' }}
                    >
                      {ADDRESS_LABELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  )}
                </div>
                )}

              </div>
            </div>

            {/* SECTION 3: SALES AGENT & REFERRAL PARTNER (OPTIONAL) */}
            <div style={{ 
              background: 'var(--card-bg)', 
              border: agentInfo ? '1px solid var(--color-success)' : '1px solid var(--card-border)', 
              borderRadius: 12, 
              padding: 24,
              transition: 'border-color 0.2s ease' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ 
                    background: 'rgba(249, 115, 22, 0.15)', 
                    color: 'var(--color-accent)', 
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
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>Sales Agent / Referral Partner</h2>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Support your referring tuning shop, advisor, or garage affiliate
                    </div>
                  </div>
                </div>
                {agentInfo && (
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    color: 'var(--color-success)', 
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
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
                      background: 'var(--color-surface-inset)',
                      border: agentInfo ? '1px solid var(--color-success)' : '1px solid var(--input-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--color-heading)',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                </div>

                {verifyingAgent && (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 6 }}>
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
                      <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                        Accredited Agent: {agentInfo.name} ({agentInfo.agent_code})
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {agentInfo.tagline || 'Official Garage Parts Sales Specialist'} · {agentInfo.commission_car_pct ?? program.agent.commission_car_pct}% cars · {agentInfo.commission_part_pct ?? program.agent.commission_part_pct}% parts accredited
                      </div>
                    </div>
                  </div>
                )}

                {!agentInfo && formData.agent_code && !verifyingAgent && (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 6 }}>
                    Sales attribution code <strong>{formData.agent_code}</strong> will be recorded on your sales order.
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: PAYMENT — PAY FIRST (MOCK SETTLEMENT) */}
            <div style={{
              background: 'var(--card-bg)',
              border: mockPaid ? '1px solid var(--color-success)' : '1px solid var(--card-border)',
              borderRadius: 12,
              padding: 24,
              transition: 'border-color 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  background: mockPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(216, 98, 44, 0.15)',
                  color: mockPaid ? 'var(--color-success)' : '#d8622c',
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>Payment Settlement</h2>
                  <div style={{ fontSize: 12, color: mockPaid ? 'var(--color-success)' : 'var(--color-warning)', marginTop: 2, fontWeight: 600 }}>
                    {mockPaid ? 'Paid — order will be created as a complete sales order' : 'Pay now — checkout completes only after settlement'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {[
                  { id: 'bank_transfer', label: 'Bank Transfer' },
                  { id: 'ewallet', label: 'GCash / Maya' },
                  { id: 'credit_card', label: 'Card' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => choosePayMethod(m.id)}
                    disabled={payProcessing}
                    style={{
                      fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
                      background: formData.payment_method === m.id ? 'rgba(216, 98, 44, 0.15)' : 'transparent',
                      border: formData.payment_method === m.id ? '1px solid #d8622c' : '1px solid var(--input-border)',
                      color: formData.payment_method === m.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--color-surface-inset)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Amount due</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#d8622c', fontFamily: 'var(--font-display, inherit)' }}>
                    {formatCurrency(grandTotal)}
                  </div>
                  {mockPaid && (
                    <div style={{ fontSize: 11, color: 'var(--color-success)', fontFamily: 'monospace', marginTop: 2 }}>
                      Ref: {mockRef} · MOCK — real gateway plugs in later
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleMockPay}
                  disabled={payProcessing || mockPaid}
                  style={{
                    background: mockPaid ? 'var(--color-success)' : '#d8622c',
                    color: '#fff', border: 'none', borderRadius: 8, padding: '12px 22px',
                    fontSize: 14, fontWeight: 700, cursor: (payProcessing || mockPaid) ? 'default' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    opacity: payProcessing ? 0.7 : 1,
                  }}
                >
                  <CreditCard size={16} />
                  <span>{payProcessing ? 'Processing Payment…' : mockPaid ? '✓ Payment Complete' : `Pay ${formatCurrency(grandTotal)}`}</span>
                </button>
              </div>
            </div>

            {/* SECTION 4: NOTES & FITMENT INSTRUCTIONS */}
            <div style={{ 
              background: 'var(--card-bg)', 
              border: '1px solid var(--card-border)', 
              borderRadius: 12, 
              padding: 24 
            }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
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
                  background: 'var(--color-surface-inset)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: 'var(--color-heading)',
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
              background: 'var(--card-bg)', 
              border: '1px solid var(--card-border)', 
              borderRadius: 12, 
              padding: 24,
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={18} color="#d8622c" /> Order Summary
                </h3>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>1 Item</span>
              </div>

              {/* Item Card Preview */}
              {loadingItem ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Loading order item details...
                </div>
              ) : item ? (
                <div style={{ display: 'flex', gap: 14, marginBottom: 20, borderBottom: '1px solid var(--card-border)', paddingBottom: 20 }}>
                  <div style={{ 
                    width: 72, 
                    height: 72, 
                    borderRadius: 8, 
                    overflow: 'hidden', 
                    background: 'var(--color-surface-inset)', 
                    flexShrink: 0,
                    border: '1px solid var(--input-border)'
                  }}>
                    <img 
                      src={item.primary_image_url || item.primaryImageUrl || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=400&q=80'} 
                      alt={item.title || 'Item'} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-heading)', lineHeight: 1.3, marginBottom: 4 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: 6 }}>
                      SKU: {item.part_number || item.vin || (item.id ? `GP-${item.id}` : 'GP-ORD-01')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#d8622c' }}>
                        {formatCurrency(unitPrice)}
                      </div>
                      
                      {/* Qty Selector */}
                      {itemType !== 'car' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-inset)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '2px 8px' }}>
                          <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-heading)' }}>{quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                  <span>Items Subtotal</span>
                  <span style={{ color: 'var(--color-heading)', fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                  <span>
                    Express Freight Logistics
                    {quote?.zone && (
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {quote.zone}{quote.distance_km != null ? ` · ${quote.distance_km} km` : ''}
                      </span>
                    )}
                    {isFreeShipping && (
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--color-success)', marginTop: 2 }}>
                        {quote?.reason || (item?.free_shipping || item?.freeShip
                          ? 'Seller offers free shipping on this listing.'
                          : freightPolicy.threshold > 0
                            ? `Free freight for orders at/above ₱${Number(freightPolicy.threshold).toLocaleString('en-PH')}.`
                            : 'Free freight applied.')}
                      </span>
                    )}
                  </span>
                  <span style={{ color: isFreeShipping ? 'var(--color-success)' : 'var(--color-heading)', fontWeight: 600 }}>
                    {isFreeShipping ? 'FREE' : formatCurrency(shippingFee)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                  <span>Chassis & VIN Fitment Validation</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Included (₱0.00)</span>
                </div>
                {perksDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                    <span>Member perks ({perksPct}% off parts)</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>−{formatCurrency(perksDiscount)}</span>
                  </div>
                )}
                {!user?.is_perks_member && itemType === 'part' && Number(item?.perks_discount_pct || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                    <span>Member price available</span>
                    <Link to="/perks" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
                      Save {Math.min(Number(program.perks.max_part_discount_pct || 0), Number(item.perks_discount_pct))}% — join perks
                    </Link>
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-heading)' }}>Total Payable</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#d8622c', fontFamily: 'var(--font-display, inherit)' }}>
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {isOwnListing && !loadingItem && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--color-error)',
                  color: '#f87171',
                  padding: '14px 18px',
                  borderRadius: 8,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  <AlertCircle size={20} />
                  <span>This is your own listing — you cannot check out on it.</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || loadingItem || isOwnListing}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <CheckCircle2 size={13} color="var(--color-success)" /> Official Sales Order document serialized instantly
                </div>
                {isPartOrder ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                      <CheckCircle2 size={13} color="var(--color-success)" /> Chassis number & VIN recorded on official receipt
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                      <CheckCircle2 size={13} color="var(--color-success)" /> Money-back fitment guarantee policy
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    <CheckCircle2 size={13} color="var(--color-success)" /> Vehicle VIN recorded from verified listing
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </form>
    </div>
  )
}

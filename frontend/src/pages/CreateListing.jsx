import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Car,
  Package,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UploadCloud,
  ShieldCheck,
  Eye,
  Wrench,
  Tag,
  MapPin,
  RotateCcw,
  DollarSign,
  Fuel,
  Gauge,
  Sliders,
  Check,
  Layers,
  HelpCircle,
  Upload,
  Loader2,
  FileImage,
  Star
} from 'lucide-react'
import { sellerCars, CAR_FILTER_META } from '../api/cars.js'
import { sellerParts, PART_FILTER_META } from '../api/parts.js'
import { mediaApi } from '../api/media.js'
import { useAuth } from '../auth/AuthContext.jsx'
import './CreateListing.css'

// Preset photo assets for quick demonstration and testing
const CAR_PRESETS = [
  {
    label: 'Nissan Silvia S15 (JDM)',
    title: '1998 Nissan Silvia S15 Spec-R Aero SR20DET',
    brand: 'Nissan',
    model: 'Silvia S15 Spec-R',
    year: 1998,
    price: 1350000,
    original_price: 1450000,
    mileage_km: 74000,
    body_style: 'coupe',
    fuel_type: 'petrol',
    transmission: 'manual',
    condition: 'used',
    color: 'Pearl White',
    vin: 'S15-0928174625103',
    tag: 'JDM Icon · SR20DET',
    city: 'Makati City',
    location: 'Makati Showroom & Lift Bay',
    inspection_score: '99/100',
    description: 'Freshly imported and verified Nissan Silvia S15 Spec-R. Original SR20DET ball-bearing turbo, 6-speed manual with factory helical LSD. Upgraded Tomei titanium catback exhaust, Tein Monoflex coilovers, and genuine Work Emotion CR Kiwami 18x9.5 wheels. Complete Japanese auction sheet (Grade 4.5B) and cleared Philippine LTO registration papers.',
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop'
    ]
  },
  {
    label: 'Toyota Celica GT Restored',
    title: '1972 Toyota Celica GT 1600 (TA22) Restomod',
    brand: 'Toyota',
    model: 'Celica GT 1600 TA22',
    year: 1972,
    price: 890000,
    original_price: 950000,
    mileage_km: 42000,
    body_style: 'coupe',
    fuel_type: 'petrol',
    transmission: 'manual',
    condition: 'used',
    color: 'Vintage Mustard Yellow',
    vin: 'TA22-8172645091823',
    tag: 'Concours Resto · 2T-G',
    city: 'Manila HQ',
    location: 'Manila Classic Restorations',
    inspection_score: '98/100',
    description: 'Full rotisserie restored 1972 Celica GT TA22. Period-correct 2T-G Yamaha twin-cam engine with dual Mikuni Solex 40 carbs. Custom stainless steel header, vintage Hayashi Racing rims, authentic black interior with restored gauges. 100-Point certified by master restoration mechanics.',
    images: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop'
    ]
  },
  {
    label: 'Ford Ranger Raptor 4x4',
    title: '2021 Ford Ranger Raptor 2.0 Bi-Turbo 4x4',
    brand: 'Ford',
    model: 'Ranger Raptor',
    year: 2021,
    price: 1650000,
    original_price: 1780000,
    mileage_km: 29000,
    body_style: 'pickup',
    fuel_type: 'diesel',
    transmission: 'automatic',
    condition: 'used',
    color: 'Conquer Grey',
    vin: 'MNB-9281746201948',
    tag: '1-Owner · Overland Ready',
    city: 'Pampanga',
    location: 'Central Luzon 4x4 Depot',
    inspection_score: '97/100',
    description: 'First-owner Ford Ranger Raptor with complete casa service records at Ford Pampanga. Factory Fox 2.5 internal bypass shocks, BFGoodrich KO2 all-terrain tires, Ironman 4x4 steel rear bumper, and heavy-duty underbody bash plates.',
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop'
    ]
  }
]

const PART_PRESETS = [
  {
    label: 'Brembo GT 6-Piston Big Brakes',
    title: 'Brembo GT 6-Piston Monobloc Big Brake Kit 355mm',
    category: 'brakes',
    brand: 'Brembo',
    part_number: '1M2.8041A-RED',
    compatibility: 'Toyota GR Yaris, Honda Civic Type R (FK8/FL5), Subaru WRX STI (2015+)',
    condition: 'new',
    quantity: 3,
    price: 42500,
    original_price: 48000,
    free_shipping: true,
    tag: 'Brand New OEM Italy',
    city: 'Makati Showroom Hub',
    location: 'Makati Parts Warehouse',
    description: 'Genuine Brembo GT 6-piston forged monobloc calipers with 355x32mm cross-drilled 2-piece floating disc rotors. Includes Brembo high-performance street/track brake pads, stainless steel braided brake lines, and billet aluminum mounting brackets.',
    images: [
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=600&auto=format&fit=crop'
    ]
  },
  {
    label: 'HKS Hi-Power Titanium Exhaust',
    title: 'HKS Hi-Power Spec-L II Titanium Tip Catback Exhaust',
    category: 'exhaust',
    brand: 'HKS',
    part_number: '31019-AF131',
    compatibility: 'Subaru WRX / STI (VA Chassis 2015-2021), Levorg 2.0T',
    condition: 'new',
    quantity: 2,
    price: 31000,
    original_price: 35500,
    free_shipping: false,
    tag: 'Made in Japan · Genuine',
    city: 'Cebu City',
    location: 'Cebu Performance Depot',
    description: 'Authentic HKS Spec-L II catback exhaust manufactured in Japan. Ultra-lightweight SUS304 stainless steel tubing with titanium dual slash tips. 44% lighter than factory exhaust with deep resonant exhaust note (89dB JASMA certified).',
    images: [
      'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop'
    ]
  },
  {
    label: 'RAYS Volk Racing TE37 Wheels',
    title: 'RAYS Volk Racing TE37 Saga S-Plus 18x9.5 +38 5x114.3 Bronze',
    category: 'wheels',
    brand: 'RAYS Volk Racing',
    part_number: 'TE37S-1895-BR',
    compatibility: 'Honda Civic Type R, Subaru WRX STI, Mitsubishi Lancer Evo 8/9/X, Nissan Silvia',
    condition: 'new',
    quantity: 4,
    price: 88000,
    original_price: 96000,
    free_shipping: true,
    tag: 'Forged Monobloc Japan',
    city: 'Makati Showroom Hub',
    location: 'Showroom Wheel Gallery',
    description: 'Set of 4 brand new in box RAYS Volk Racing TE37 Saga S-Plus forged 1-piece wheels. Legendary Almite Bronze finish, knurled bead seats to prevent tire slippage under high torque. Includes RAYS warranty certificates and aluminum valve stems.',
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=600&auto=format&fit=crop'
    ]
  }
]

export default function CreateListing({ defaultType = 'car' }) {
  const [searchParams] = useSearchParams()
  const urlType = searchParams.get('type')
  const [listingType, setListingType] = useState(urlType === 'part' || defaultType === 'part' ? 'part' : 'car')
  
  const { isAuthenticated, user, openLoginModal } = useAuth()
  const navigate = useNavigate()

  // --- Car Form State ---
  const [carData, setCarData] = useState({
    title: '1998 Nissan Silvia S15 Spec-R Turbo',
    brand: 'Nissan',
    model: 'Silvia S15',
    year: 1998,
    price: 1350000,
    original_price: 1450000,
    mileage_km: 74000,
    body_style: 'coupe',
    fuel_type: 'petrol',
    transmission: 'manual',
    condition: 'used',
    color: 'Pearl White',
    vin: 'S15-0928174625103',
    tag: 'JDM Icon · SR20DET',
    city: 'Makati City',
    location: 'Makati Showroom & Lift Bay',
    inspection_score: '99/100',
    description: 'Verified enthusiast build with authenticated papers, clean chassis, and full mod list.',
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop'
    ],
  })

  // --- Part Form State ---
  const [partData, setPartData] = useState({
    title: 'Brembo GT 6-Piston Big Brake Kit 355mm',
    category: 'brakes',
    brand: 'Brembo',
    part_number: '1M2.8041A',
    compatibility: 'Honda Civic Type R (FK8/FL5), Subaru WRX STI (2015+), Toyota GR Yaris',
    condition: 'new',
    quantity: 2,
    price: 42500,
    original_price: 48000,
    free_shipping: true,
    tag: 'Brand New OEM',
    city: 'Makati Showroom Hub',
    location: 'Makati Warehouse Lift Bay',
    description: 'Brand new in box 6-piston big brake kit with cross-drilled rotors, pads, and braided brake lines.',
    images: [
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=600&auto=format&fit=crop'
    ],
  })

  const [newCarImgUrl, setNewCarImgUrl] = useState('')
  const [newPartImgUrl, setNewPartImgUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [createdResult, setCreatedResult] = useState(null) // { type: 'car'|'part', data: {...}, published: boolean }

  // Upload States for High-Resolution Media
  const [carUploading, setCarUploading] = useState(false)
  const [carUploadError, setCarUploadError] = useState(null)
  const [carDragOver, setCarDragOver] = useState(false)
  const [showCarUrlInput, setShowCarUrlInput] = useState(false)
  const carFileInputRef = useRef(null)

  const [partUploading, setPartUploading] = useState(false)
  const [partUploadError, setPartUploadError] = useState(null)
  const [partDragOver, setPartDragOver] = useState(false)
  const [showPartUrlInput, setShowPartUrlInput] = useState(false)
  const partFileInputRef = useRef(null)

  // Sync tab with URL parameter if provided
  useEffect(() => {
    if (urlType === 'part') setListingType('part')
    else if (urlType === 'car') setListingType('car')
  }, [urlType])

  // --- Handlers for Car Form ---
  const handleCarChange = (e) => {
    const { name, value, type } = e.target
    setCarData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  const handleAddCarImage = () => {
    if (!newCarImgUrl.trim()) return
    setCarData((prev) => ({
      ...prev,
      images: [...prev.images, newCarImgUrl.trim()]
    }))
    setNewCarImgUrl('')
  }

  const handleRemoveCarImage = (index) => {
    setCarData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSetPrimaryCarImage = (index) => {
    if (index === 0) return
    setCarData(prev => {
      const nextImages = [...prev.images]
      const [selected] = nextImages.splice(index, 1)
      nextImages.unshift(selected)
      return { ...prev, images: nextImages }
    })
  }

  const handleCarFileUpload = async (files) => {
    if (!files || files.length === 0) return
    setCarUploading(true)
    setCarUploadError(null)

    try {
      const fileList = Array.from(files)
      let uploadedUrls = []

      if (fileList.length === 1) {
        const res = await mediaApi.upload(fileList[0], { type: 'image' })
        if (res?.data?.url) {
          uploadedUrls.push(res.data.url)
        }
      } else {
        const res = await mediaApi.uploadMultiple(fileList, { type: 'image' })
        if (Array.isArray(res?.data)) {
          uploadedUrls = res.data.map(item => item.url)
        }
      }

      if (uploadedUrls.length > 0) {
        setCarData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls]
        }))
      }
    } catch (err) {
      setCarUploadError(err?.response?.data?.message || 'Failed to upload photo. Ensure file is JPG/PNG/WEBP and under 20MB.')
    } finally {
      setCarUploading(false)
      if (carFileInputRef.current) carFileInputRef.current.value = ''
    }
  }

  const handleApplyCarPreset = (preset) => {
    setCarData({
      title: preset.title,
      brand: preset.brand,
      model: preset.model,
      year: preset.year,
      price: preset.price,
      original_price: preset.original_price,
      mileage_km: preset.mileage_km,
      body_style: preset.body_style,
      fuel_type: preset.fuel_type,
      transmission: preset.transmission,
      condition: preset.condition,
      color: preset.color,
      vin: preset.vin,
      tag: preset.tag,
      city: preset.city,
      location: preset.location,
      inspection_score: preset.inspection_score,
      description: preset.description,
      images: preset.images,
    })
  }

  // --- Handlers for Part Form ---
  const handlePartChange = (e) => {
    const { name, value, type, checked } = e.target
    setPartData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  const handleAddPartImage = () => {
    if (!newPartImgUrl.trim()) return
    setPartData((prev) => ({
      ...prev,
      images: [...prev.images, newPartImgUrl.trim()]
    }))
    setNewPartImgUrl('')
  }

  const handleRemovePartImage = (index) => {
    setPartData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSetPrimaryPartImage = (index) => {
    if (index === 0) return
    setPartData(prev => {
      const nextImages = [...prev.images]
      const [selected] = nextImages.splice(index, 1)
      nextImages.unshift(selected)
      return { ...prev, images: nextImages }
    })
  }

  const handlePartFileUpload = async (files) => {
    if (!files || files.length === 0) return
    setPartUploading(true)
    setPartUploadError(null)

    try {
      const fileList = Array.from(files)
      let uploadedUrls = []

      if (fileList.length === 1) {
        const res = await mediaApi.upload(fileList[0], { type: 'image' })
        if (res?.data?.url) {
          uploadedUrls.push(res.data.url)
        }
      } else {
        const res = await mediaApi.uploadMultiple(fileList, { type: 'image' })
        if (Array.isArray(res?.data)) {
          uploadedUrls = res.data.map(item => item.url)
        }
      }

      if (uploadedUrls.length > 0) {
        setPartData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls]
        }))
      }
    } catch (err) {
      setPartUploadError(err?.response?.data?.message || 'Failed to upload photo. Ensure file is JPG/PNG/WEBP and under 20MB.')
    } finally {
      setPartUploading(false)
      if (partFileInputRef.current) partFileInputRef.current.value = ''
    }
  }

  const handleApplyPartPreset = (preset) => {
    setPartData({
      title: preset.title,
      category: preset.category,
      brand: preset.brand,
      part_number: preset.part_number,
      compatibility: preset.compatibility,
      condition: preset.condition,
      quantity: preset.quantity,
      price: preset.price,
      original_price: preset.original_price,
      free_shipping: preset.free_shipping,
      tag: preset.tag,
      city: preset.city,
      location: preset.location,
      description: preset.description,
      images: preset.images,
    })
  }

  // --- Submit Handler ---
  const handleSubmit = async (publishNow = true) => {
    setErrorMsg(null)

    if (!isAuthenticated) {
      openLoginModal()
      return
    }

    setSubmitting(true)

    try {
      if (listingType === 'car') {
        const payload = {
          title: carData.title,
          brand: carData.brand,
          model: carData.model,
          year: Number(carData.year),
          price: Number(carData.price),
          original_price: carData.original_price ? Number(carData.original_price) : null,
          mileage_km: Number(carData.mileage_km || 0),
          body_style: carData.body_style,
          fuel_type: carData.fuel_type,
          transmission: carData.transmission,
          condition: carData.condition,
          color: carData.color || null,
          vin: carData.vin || null,
          tag: carData.tag || null,
          city: carData.city || null,
          location: carData.location || null,
          inspection_score: carData.inspection_score || null,
          description: carData.description || null,
          images: carData.images && carData.images.length > 0 ? carData.images : undefined,
        }

        const created = await sellerCars.create(payload)
        const carId = created.id

        if (publishNow && carId) {
          await sellerCars.publish(carId)
        }

        setCreatedResult({
          type: 'car',
          data: { ...created, id: carId, title: payload.title },
          published: publishNow,
        })
      } else {
        const payload = {
          title: partData.title,
          category: partData.category,
          brand: partData.brand || null,
          part_number: partData.part_number || null,
          compatibility: partData.compatibility || null,
          condition: partData.condition,
          quantity: Number(partData.quantity || 1),
          price: Number(partData.price),
          original_price: partData.original_price ? Number(partData.original_price) : null,
          free_shipping: Boolean(partData.free_shipping),
          tag: partData.tag || null,
          city: partData.city || null,
          location: partData.location || null,
          description: partData.description || null,
          images: partData.images && partData.images.length > 0 ? partData.images : undefined,
        }

        const created = await sellerParts.create(payload)
        const partId = created.id

        if (publishNow && partId) {
          await sellerParts.publish(partId)
        }

        setCreatedResult({
          type: 'part',
          data: { ...created, id: partId, title: payload.title },
          published: publishNow,
        })
      }
    } catch (err) {
      const responseData = err?.response?.data
      if (responseData?.errors) {
        const firstErrorKey = Object.keys(responseData.errors)[0]
        setErrorMsg(responseData.errors[firstErrorKey][0] || 'Validation error occurred.')
      } else if (responseData?.message) {
        setErrorMsg(responseData.message)
      } else {
        setErrorMsg('Failed to submit listing. Please ensure all required fields are valid.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Format currency helper
  const formatPhp = (val) => {
    if (!val && val !== 0) return '₱ 0'
    return '₱ ' + Number(val).toLocaleString('en-PH')
  }

  const isBuyerRole = user?.role === 'buyer'

  // --- Success Render View ---
  if (createdResult) {
    const isCar = createdResult.type === 'car'
    const targetUrl = isCar ? `/marketplace/${createdResult.data.id}` : `/parts/${createdResult.data.id}`

    return (
      <div className="create-listing-page">
        <div className="create-listing-hero">
          <div className="create-listing-hero-inner">
            <span className="create-listing-eyebrow">
              <CheckCircle2 size={14} /> Listing Confirmed
            </span>
            <h1 className="create-listing-title">Your Listing is Live on Garage Marketplace</h1>
            <p className="create-listing-lead">
              Congratulations! Your {isCar ? 'vehicle build' : 'parts & accessories listing'} has been saved and is accessible across our network.
            </p>
          </div>
        </div>

        <div className="listing-success-card">
          <div className="success-icon-wrap">
            <Check size={36} />
          </div>
          <h2 className="listing-success-title">
            {createdResult.data.title || (isCar ? 'Vehicle Listing' : 'Part Listing')}
          </h2>
          <p className="listing-success-desc">
            Status: <strong>{createdResult.published ? 'Active & Published' : 'Saved as Draft'}</strong>. Enthusiasts and buyers can now discover your specs, inspection score, and direct contact details.
          </p>

          <div className="success-actions">
            <Link to={targetUrl} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>
              <span>View Listing on Marketplace</span>
              <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setCreatedResult(null)
                setErrorMsg(null)
              }}
            >
              <Plus size={16} />
              <span>Create Another Listing</span>
            </button>
            <Link to={isCar ? '/marketplace' : '/parts'} className="btn btn-secondary">
              <span>Return to Catalog</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="create-listing-page">
      {/* 1. Header Hero Banner with Type Switcher */}
      <section className="create-listing-hero">
        <div className="create-listing-hero-inner">
          <span className="create-listing-eyebrow">
            <Sparkles size={14} /> Sell On Garage Marketplace
          </span>
          <h1 className="create-listing-title">Create a Verified Marketplace Listing</h1>
          <p className="create-listing-lead">
            Post your enthusiast vehicle or automotive parts & accessories to over 15,000+ serious Philippine car enthusiasts and verified workshops.
          </p>

          {/* Type Toggle Selector */}
          <div className="listing-type-selector">
            <button
              type="button"
              className={`type-select-card ${listingType === 'car' ? 'active' : ''}`}
              onClick={() => {
                setListingType('car')
                setErrorMsg(null)
              }}
            >
              <div className="type-icon-wrapper">
                <Car size={22} />
              </div>
              <div className="type-meta">
                <span className="type-title">Vehicle / Car Listing</span>
                <span className="type-desc">Sell a complete build, JDM icon, classic, 4x4 or daily</span>
              </div>
            </button>

            <button
              type="button"
              className={`type-select-card ${listingType === 'part' ? 'active' : ''}`}
              onClick={() => {
                setListingType('part')
                setErrorMsg(null)
              }}
            >
              <div className="type-icon-wrapper">
                <Package size={22} />
              </div>
              <div className="type-meta">
                <span className="type-title">Parts & Accessories</span>
                <span className="type-desc">Sell engines, big brakes, wheels, turbos, aero & gear</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Main Form Container & Live Preview */}
      <div className="create-listing-container">
        {/* Left Column: Form Details */}
        <div className="listing-form">
          {/* Buyer Role Alert Notice */}
          {isAuthenticated && isBuyerRole && (
            <div className="role-warning-banner">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Account Notice:</strong> You are currently logged in as a <strong>Buyer</strong>. To publish inventory, your account can be elevated to a <strong>Seller</strong>, <strong>Dealer</strong>, or <strong>Parts Seller</strong> account.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="role-warning-banner" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Error submitting listing:</strong> {errorMsg}
              </div>
            </div>
          )}

          {/* ===================================================================
              A. VEHICLE LISTING FORM
              =================================================================== */}
          {listingType === 'car' && (
            <>
              {/* Quick Preset Selector */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <Sparkles size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Quick Demo Presets</h3>
                    <p className="form-section-subtitle">Load pre-filled enthusiast specs to instantly test the form.</p>
                  </div>
                </div>
                <div className="media-preset-buttons">
                  {CAR_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-img-btn"
                      onClick={() => handleApplyCarPreset(p)}
                    >
                      <Plus size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Load {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Basic Vehicle Information */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <Car size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Vehicle Specifications</h3>
                    <p className="form-section-subtitle">Core make, model, year, body style and engine transmission details.</p>
                  </div>
                </div>

                <div className="form-grid-1" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>
                      Listing Title <span className="label-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      className="form-input"
                      placeholder="e.g. 1998 Nissan Silvia S15 Spec-R Turbo"
                      value={carData.title}
                      onChange={handleCarChange}
                      required
                    />
                    <span className="form-hint">Make it descriptive: Year + Make + Model + Trim / Engine</span>
                  </div>
                </div>

                <div className="form-grid-3" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>
                      Make / Brand <span className="label-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="brand"
                      className="form-input"
                      placeholder="e.g. Nissan, Toyota, Honda"
                      value={carData.brand}
                      onChange={handleCarChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Model <span className="label-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="model"
                      className="form-input"
                      placeholder="e.g. Silvia S15, Civic Type R"
                      value={carData.model}
                      onChange={handleCarChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Year <span className="label-required">*</span>
                    </label>
                    <input
                      type="number"
                      name="year"
                      className="form-input"
                      min="1900"
                      max="2030"
                      value={carData.year}
                      onChange={handleCarChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-4">
                  <div className="form-group">
                    <label>Body Style</label>
                    <select
                      name="body_style"
                      className="form-select"
                      value={carData.body_style}
                      onChange={handleCarChange}
                    >
                      {CAR_FILTER_META.bodyStyles.map((style) => (
                        <option key={style} value={style}>
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Transmission</label>
                    <select
                      name="transmission"
                      className="form-select"
                      value={carData.transmission}
                      onChange={handleCarChange}
                    >
                      <option value="manual">Manual</option>
                      <option value="automatic">Automatic</option>
                      <option value="semi_automatic">Semi-Automatic / DCT</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Fuel Type</label>
                    <select
                      name="fuel_type"
                      className="form-select"
                      value={carData.fuel_type}
                      onChange={handleCarChange}
                    >
                      <option value="petrol">Petrol / Gasoline</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="electric">Electric (EV)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Condition</label>
                    <select
                      name="condition"
                      className="form-select"
                      value={carData.condition}
                      onChange={handleCarChange}
                    >
                      <option value="used">Used / Pre-Owned</option>
                      <option value="new">Brand New</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Pricing, Mileage & Identification */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <DollarSign size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Pricing, Mileage & Documentation</h3>
                    <p className="form-section-subtitle">Set your asking price, mileage reading, and optional chassis / VIN verification.</p>
                  </div>
                </div>

                <div className="form-grid-3" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>
                      Asking Price (₱) <span className="label-required">*</span>
                    </label>
                    <div className="input-with-affix">
                      <span className="input-prefix">₱</span>
                      <input
                        type="number"
                        name="price"
                        className="form-input"
                        placeholder="1350000"
                        value={carData.price}
                        onChange={handleCarChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Original / Valuation Price (₱)</label>
                    <div className="input-with-affix">
                      <span className="input-prefix">₱</span>
                      <input
                        type="number"
                        name="original_price"
                        className="form-input"
                        placeholder="1450000"
                        value={carData.original_price || ''}
                        onChange={handleCarChange}
                      />
                    </div>
                    <span className="form-hint">Shows as strikethrough price if discounted</span>
                  </div>

                  <div className="form-group">
                    <label>
                      Mileage (km) <span className="label-required">*</span>
                    </label>
                    <input
                      type="number"
                      name="mileage_km"
                      className="form-input"
                      placeholder="74000"
                      value={carData.mileage_km}
                      onChange={handleCarChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-3" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>Exterior Color</label>
                    <input
                      type="text"
                      name="color"
                      className="form-input"
                      placeholder="e.g. Pearl White, Midnight Purple"
                      value={carData.color}
                      onChange={handleCarChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>VIN / Chassis Number</label>
                    <input
                      type="text"
                      name="vin"
                      className="form-input"
                      placeholder="e.g. S15-0928174625103"
                      value={carData.vin}
                      onChange={handleCarChange}
                    />
                    <span className="form-hint">Used for 100-Point Lift Bay verification</span>
                  </div>

                  <div className="form-group">
                    <label>Inspection Score</label>
                    <input
                      type="text"
                      name="inspection_score"
                      className="form-input"
                      placeholder="e.g. 99/100"
                      value={carData.inspection_score}
                      onChange={handleCarChange}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>City / Province</label>
                    <input
                      type="text"
                      name="city"
                      className="form-input"
                      placeholder="e.g. Makati City, Cebu City"
                      value={carData.city}
                      onChange={handleCarChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Custom Highlight Tag / Badge</label>
                    <input
                      type="text"
                      name="tag"
                      className="form-input"
                      placeholder="e.g. JDM Icon · SR20DET, 1-Owner"
                      value={carData.tag}
                      onChange={handleCarChange}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Build Sheet & Description */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <Wrench size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Build Sheet & Story</h3>
                    <p className="form-section-subtitle">Detail modifications, maintenance logs, compression numbers, and papers.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Description & Modifications List</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    rows="5"
                    placeholder="Describe engine mods, suspension setup, wheel specs, interior condition, LTO OR/CR paperwork status, and viewing availability..."
                    value={carData.description}
                    onChange={handleCarChange}
                  />
                </div>
              </div>

              {/* 4. Photo Gallery & Media */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <ImageIcon size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">High-Resolution Photos & Media</h3>
                    <p className="form-section-subtitle">Upload 4K/UHD photos to showcase exterior walkaround, interior, engine bay, and documents.</p>
                  </div>
                </div>

                {/* Drag-and-Drop Upload Zone */}
                <input
                  type="file"
                  ref={carFileInputRef}
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/avif"
                  style={{ display: 'none' }}
                  onChange={(e) => handleCarFileUpload(e.target.files)}
                />

                <div
                  className={`media-upload-dropzone ${carDragOver ? 'dragover' : ''}`}
                  onClick={() => carFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setCarDragOver(true)
                  }}
                  onDragLeave={() => setCarDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setCarDragOver(false)
                    if (e.dataTransfer.files) {
                      handleCarFileUpload(e.dataTransfer.files)
                    }
                  }}
                >
                  <div className="dropzone-icon-wrap">
                    {carUploading ? (
                      <Loader2 size={24} className="upload-spinner" />
                    ) : (
                      <UploadCloud size={26} />
                    )}
                  </div>
                  <p className="dropzone-title">
                    {carUploading ? 'Uploading High-Resolution Media...' : (
                      <>Drag & drop photos here, or <span>browse from computer</span></>
                    )}
                  </p>
                  <p className="dropzone-subtitle">
                    Supports high-resolution JPG, PNG, WEBP, AVIF up to 20MB per photo. First photo serves as Primary Cover.
                  </p>
                  <div className="dropzone-badge-row">
                    <span className="dropzone-pill">High-Res 4K Ready</span>
                    <span className="dropzone-pill">Laravel Storage / S3</span>
                    <span className="dropzone-pill">Multi-Photo Walkaround</span>
                  </div>
                </div>

                {/* Upload Status Banner */}
                {carUploading && (
                  <div className="upload-loading-banner">
                    <Loader2 size={16} className="upload-spinner" />
                    <span>Processing and uploading high-resolution photos to storage...</span>
                  </div>
                )}

                {carUploadError && (
                  <div className="role-warning-banner" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: 14 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <div>{carUploadError}</div>
                  </div>
                )}

                {/* Alternate URL Input Toggle */}
                <div style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className="media-url-toggle-btn"
                    onClick={() => setShowCarUrlInput(!showCarUrlInput)}
                  >
                    <Plus size={14} />
                    {showCarUrlInput ? 'Hide manual image URL input' : 'Or paste image URL / external link'}
                  </button>

                  {showCarUrlInput && (
                    <div className="media-add-row" style={{ marginTop: 8 }}>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="Paste image URL (https://...)"
                        value={newCarImgUrl}
                        onChange={(e) => setNewCarImgUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCarImage()
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddCarImage}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <Plus size={16} /> Add URL
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {carData.images && carData.images.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        Uploaded Vehicle Photos ({carData.images.length})
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Tip: Hover thumbnail to set as Primary Cover
                      </span>
                    </div>

                    <div className="media-thumbnails">
                      {carData.images.map((url, i) => (
                        <div key={i} className="media-thumb-item">
                          <img src={url} alt={`Car Photo ${i + 1}`} className="media-thumb-img" />
                          {i === 0 ? (
                            <span className="media-thumb-badge">Primary Cover</span>
                          ) : (
                            <button
                              type="button"
                              className="media-thumb-make-primary"
                              onClick={() => handleSetPrimaryCarImage(i)}
                              title="Set as Primary Cover"
                            >
                              ★ Set as Cover
                            </button>
                          )}
                          <button
                            type="button"
                            className="media-thumb-remove"
                            title="Remove image"
                            onClick={() => handleRemoveCarImage(i)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No photos added yet. Drag and drop photos above or load a quick demo preset.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===================================================================
              B. PARTS & ACCESSORIES LISTING FORM
              =================================================================== */}
          {listingType === 'part' && (
            <>
              {/* Quick Preset Selector for Parts */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <Sparkles size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Quick Demo Presets</h3>
                    <p className="form-section-subtitle">Load pre-filled parts & accessories to quickly test the form.</p>
                  </div>
                </div>
                <div className="media-preset-buttons">
                  {PART_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-img-btn"
                      onClick={() => handleApplyPartPreset(p)}
                    >
                      <Plus size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Load {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Basic Part Information */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <Package size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Part Specifications & Category</h3>
                    <p className="form-section-subtitle">Select component category, manufacturer, part numbers, and stock quantity.</p>
                  </div>
                </div>

                <div className="form-grid-1" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>
                      Part Title <span className="label-required">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      className="form-input"
                      placeholder="e.g. Brembo GT 6-Piston Big Brake Kit 355mm"
                      value={partData.title}
                      onChange={handlePartChange}
                      required
                    />
                    <span className="form-hint">Descriptive name including brand, model, and dimension / spec</span>
                  </div>
                </div>

                <div className="form-grid-3" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>
                      Category <span className="label-required">*</span>
                    </label>
                    <select
                      name="category"
                      className="form-select"
                      value={partData.category}
                      onChange={handlePartChange}
                      required
                    >
                      {PART_FILTER_META.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Brand / Manufacturer</label>
                    <input
                      type="text"
                      name="brand"
                      className="form-input"
                      placeholder="e.g. Brembo, HKS, RAYS, Recaro"
                      value={partData.brand}
                      onChange={handlePartChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Part / OEM Serial Number</label>
                    <input
                      type="text"
                      name="part_number"
                      className="form-input"
                      placeholder="e.g. 1M2.8041A"
                      value={partData.part_number}
                      onChange={handlePartChange}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Condition</label>
                    <select
                      name="condition"
                      className="form-select"
                      value={partData.condition}
                      onChange={handlePartChange}
                    >
                      <option value="new">Brand New</option>
                      <option value="used">Surplus / Used</option>
                      <option value="refurbished">Refurbished / Restored</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Quantity In Stock</label>
                    <input
                      type="number"
                      name="quantity"
                      className="form-input"
                      min="1"
                      value={partData.quantity}
                      onChange={handlePartChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>City / Depot Hub</label>
                    <input
                      type="text"
                      name="city"
                      className="form-input"
                      placeholder="e.g. Makati Showroom Hub"
                      value={partData.city}
                      onChange={handlePartChange}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Fitment Compatibility & Pricing */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <Sliders size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Fitment & Pricing Details</h3>
                    <p className="form-section-subtitle">List compatible vehicle models, chassis codes, and shipping options.</p>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Compatible Vehicles / Fitment Guide</label>
                  <input
                    type="text"
                    name="compatibility"
                    className="form-input"
                    placeholder="e.g. Honda Civic Type R (FK8/FL5), Subaru WRX STI (2015+), Toyota GR Yaris"
                    value={partData.compatibility}
                    onChange={handlePartChange}
                  />
                  <span className="form-hint">Specify make, model, chassis code, or engine generations</span>
                </div>

                <div className="form-grid-3" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>
                      Asking Price (₱) <span className="label-required">*</span>
                    </label>
                    <div className="input-with-affix">
                      <span className="input-prefix">₱</span>
                      <input
                        type="number"
                        name="price"
                        className="form-input"
                        placeholder="42500"
                        value={partData.price}
                        onChange={handlePartChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Original / MSRP Price (₱)</label>
                    <div className="input-with-affix">
                      <span className="input-prefix">₱</span>
                      <input
                        type="number"
                        name="original_price"
                        className="form-input"
                        placeholder="48000"
                        value={partData.original_price || ''}
                        onChange={handlePartChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Highlight Badge / Tag</label>
                    <input
                      type="text"
                      name="tag"
                      className="form-input"
                      placeholder="e.g. Brand New OEM, Made in Japan"
                      value={partData.tag}
                      onChange={handlePartChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none' }}>
                    <input
                      type="checkbox"
                      name="free_shipping"
                      checked={partData.free_shipping}
                      onChange={handlePartChange}
                      style={{ width: 18, height: 18, accentColor: '#e07a5f' }}
                    />
                    <span><strong>Free Nationwide Freight</strong> (Cover crated shipping across PH)</span>
                  </label>
                </div>
              </div>

              {/* 3. Description & Technical Details */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <Wrench size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Technical Description</h3>
                    <p className="form-section-subtitle">Include material composition, bolt patterns, rotor sizes, and warranty notes.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Part Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    rows="4"
                    placeholder="Provide technical details, package contents, authenticity certificates, warranty terms, and installation requirements..."
                    value={partData.description}
                    onChange={handlePartChange}
                  />
                </div>
              </div>

              {/* 4. Photo Gallery & Media */}
              <div className="form-section-card">
                <div className="form-section-header">
                  <ImageIcon size={20} className="form-section-icon" />
                  <div>
                    <h3 className="form-section-title">Component Photos & Media</h3>
                    <p className="form-section-subtitle">Upload high-resolution photos of the part, serial badges, brackets, and original box packaging.</p>
                  </div>
                </div>

                {/* Drag-and-Drop Upload Zone */}
                <input
                  type="file"
                  ref={partFileInputRef}
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/avif"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePartFileUpload(e.target.files)}
                />

                <div
                  className={`media-upload-dropzone ${partDragOver ? 'dragover' : ''}`}
                  onClick={() => partFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setPartDragOver(true)
                  }}
                  onDragLeave={() => setPartDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setPartDragOver(false)
                    if (e.dataTransfer.files) {
                      handlePartFileUpload(e.dataTransfer.files)
                    }
                  }}
                >
                  <div className="dropzone-icon-wrap">
                    {partUploading ? (
                      <Loader2 size={24} className="upload-spinner" />
                    ) : (
                      <UploadCloud size={26} />
                    )}
                  </div>
                  <p className="dropzone-title">
                    {partUploading ? 'Uploading High-Resolution Media...' : (
                      <>Drag & drop component photos here, or <span>browse from computer</span></>
                    )}
                  </p>
                  <p className="dropzone-subtitle">
                    Supports high-resolution JPG, PNG, WEBP, AVIF up to 20MB per item. First photo serves as Primary Cover.
                  </p>
                  <div className="dropzone-badge-row">
                    <span className="dropzone-pill">High-Res Component Photo</span>
                    <span className="dropzone-pill">Laravel Storage / S3</span>
                    <span className="dropzone-pill">Multi-Angle Inspection</span>
                  </div>
                </div>

                {/* Upload Status Banner */}
                {partUploading && (
                  <div className="upload-loading-banner">
                    <Loader2 size={16} className="upload-spinner" />
                    <span>Processing and uploading high-resolution photos to storage...</span>
                  </div>
                )}

                {partUploadError && (
                  <div className="role-warning-banner" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', marginBottom: 14 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <div>{partUploadError}</div>
                  </div>
                )}

                {/* Alternate URL Input Toggle */}
                <div style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className="media-url-toggle-btn"
                    onClick={() => setShowPartUrlInput(!showPartUrlInput)}
                  >
                    <Plus size={14} />
                    {showPartUrlInput ? 'Hide manual image URL input' : 'Or paste image URL / external link'}
                  </button>

                  {showPartUrlInput && (
                    <div className="media-add-row" style={{ marginTop: 8 }}>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="Paste image URL (https://...)"
                        value={newPartImgUrl}
                        onChange={(e) => setNewPartImgUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddPartImage()
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddPartImage}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <Plus size={16} /> Add URL
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {partData.images && partData.images.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        Uploaded Part Photos ({partData.images.length})
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Tip: Hover thumbnail to set as Primary Cover
                      </span>
                    </div>

                    <div className="media-thumbnails">
                      {partData.images.map((url, i) => (
                        <div key={i} className="media-thumb-item">
                          <img src={url} alt={`Part Photo ${i + 1}`} className="media-thumb-img" />
                          {i === 0 ? (
                            <span className="media-thumb-badge">Primary Cover</span>
                          ) : (
                            <button
                              type="button"
                              className="media-thumb-make-primary"
                              onClick={() => handleSetPrimaryPartImage(i)}
                              title="Set as Primary Cover"
                            >
                              ★ Set as Cover
                            </button>
                          )}
                          <button
                            type="button"
                            className="media-thumb-remove"
                            title="Remove image"
                            onClick={() => handleRemovePartImage(i)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No photos added yet. Drag and drop photos above or load a quick demo preset.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Live Sticky Preview Card & Submit Controls */}
        <aside className="listing-preview-sticky">
          <div className="preview-card-wrapper">
            <div className="preview-header">
              <span className="preview-pill">Live Marketplace Card Preview</span>
              <Eye size={16} color="#64748b" />
            </div>

            <div className="preview-body">
              {/* Image Preview Box */}
              <div className="preview-media-box">
                {listingType === 'car' ? (
                  <>
                    <img
                      src={carData.images[0] || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop'}
                      alt="Car Preview"
                      className="preview-img"
                    />
                    {carData.tag && <span className="preview-tag-badge">{carData.tag}</span>}
                    {carData.inspection_score && (
                      <span className="preview-score-badge">
                        <ShieldCheck size={13} /> {carData.inspection_score}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <img
                      src={partData.images[0] || 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop'}
                      alt="Part Preview"
                      className="preview-img"
                    />
                    {partData.tag && <span className="preview-tag-badge">{partData.tag}</span>}
                    {partData.free_shipping && (
                      <span className="preview-score-badge" style={{ color: '#ffffff', background: '#059669' }}>
                        Free Freight
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Title & Price */}
              <h4 className="preview-title">
                {listingType === 'car' ? (carData.title || 'Vehicle Title') : (partData.title || 'Part Title')}
              </h4>

              <div className="preview-price-row">
                <span className="preview-price">
                  {listingType === 'car' ? formatPhp(carData.price) : formatPhp(partData.price)}
                </span>
                {listingType === 'car' && carData.original_price && (
                  <span className="preview-orig-price">{formatPhp(carData.original_price)}</span>
                )}
                {listingType === 'part' && partData.original_price && (
                  <span className="preview-orig-price">{formatPhp(partData.original_price)}</span>
                )}
              </div>

              {/* Spec Pills */}
              <div className="preview-spec-pills">
                {listingType === 'car' ? (
                  <>
                    <span className="preview-spec-item">{carData.year}</span>
                    <span className="preview-spec-item">{(Number(carData.mileage_km || 0)).toLocaleString()} km</span>
                    <span className="preview-spec-item">{carData.transmission}</span>
                    <span className="preview-spec-item">{carData.fuel_type}</span>
                  </>
                ) : (
                  <>
                    <span className="preview-spec-item" style={{ textTransform: 'capitalize' }}>
                      {partData.category}
                    </span>
                    <span className="preview-spec-item">{partData.condition}</span>
                    {partData.brand && <span className="preview-spec-item">{partData.brand}</span>}
                    <span className="preview-spec-item">Qty: {partData.quantity}</span>
                  </>
                )}
              </div>

              {/* Footer Row */}
              <div className="preview-footer-row">
                <span>
                  <MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  {listingType === 'car' ? (carData.city || 'Philippines') : (partData.city || 'Philippines')}
                </span>
                <span>Verified Listing</span>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="submit-action-card">
            <div className="submit-btn-group">
              <button
                type="button"
                className="btn-publish"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
              >
                <Sparkles size={18} />
                <span>{submitting ? 'Publishing Listing...' : 'Publish to Marketplace'}</span>
              </button>

              <button
                type="button"
                className="btn-draft"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
              >
                <span>{submitting ? 'Saving...' : 'Save as Draft'}</span>
              </button>
            </div>

            <div className="submit-guarantee-note">
              <ShieldCheck size={16} color="#059669" />
              <span>100-Point Inspection Guaranteed & Protected</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

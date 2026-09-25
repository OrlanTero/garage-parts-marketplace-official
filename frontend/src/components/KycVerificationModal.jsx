import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Upload,
  UserCheck,
  X,
  AlertCircle,
  Camera,
  ChevronRight,
  ChevronLeft,
  Lock,
  Trash2,
} from 'lucide-react'
import { kycApi } from '../api/kyc.js'
import { useAuth } from '../auth/AuthContext.jsx'
import './KycVerificationModal.css'

const DOCUMENT_TYPES = [
  { value: 'drivers_license', label: "Philippine Driver's License (LTO)", desc: 'Recommended for individual vehicle builders' },
  { value: 'passport', label: 'Philippine / International Passport (DFA)', desc: 'Valid for local & foreign sellers' },
  { value: 'national_id', label: 'PhilSys National ID (Philsys)', desc: 'Digital or physical PhilID card' },
  { value: 'umid', label: 'Unified Multi-Purpose ID (UMID / SSS / GSIS)', desc: 'Government agency issued' },
  { value: 'business_permit', label: "DTI / SEC Business Registration & Mayor's Permit", desc: 'Required for commercial garages & dealers' },
  { value: 'prc_id', label: 'Professional Regulation Commission (PRC) ID', desc: 'Certified professional license' },
  { value: 'voter_id', label: "COMELEC Voter's ID / Certification", desc: 'Voters certification with signature' },
]

export default function KycVerificationModal({ isOpen, onClose }) {
  const { user, refresh } = useAuth()
  const [kycData, setKycData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // 1: Document info, 2: Uploads & Selfies, 3: Review & submit
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Form states
  const [documentType, setDocumentType] = useState('drivers_license')
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [documentPreview, setDocumentPreview] = useState(null)
  const [documentUrl, setDocumentUrl] = useState('')
  const [selfieFile, setSelfieFile] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [selfieUrl, setSelfieUrl] = useState('')
  const [notes, setNotes] = useState('')

  const fetchKycStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await kycApi.getStatus()
      setKycData(res.kyc || null)
      if (res.kyc?.document_type) setDocumentType(res.kyc.document_type)
      if (res.kyc?.document_number) setDocumentNumber(res.kyc.document_number)
      if (res.kyc?.document_url) setDocumentUrl(res.kyc.document_url)
      if (res.kyc?.selfie_url) setSelfieUrl(res.kyc.selfie_url)
      if (res.kyc?.notes) setNotes(res.kyc.notes)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchKycStatus()
      setCurrentStep(1)
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen])

  const handleDocumentFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setDocumentFile(file)
      setDocumentPreview(URL.createObjectURL(file))
    }
  }

  const handleSelfieFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelfieFile(file)
      setSelfiePreview(URL.createObjectURL(file))
    }
  }

  const handleNextStep = () => {
    setError(null)
    if (currentStep === 1) {
      if (!documentNumber.trim()) {
        setError('Please enter your valid ID or Registration document number.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!documentFile && !documentUrl.trim() && !kycData?.document_url) {
        setError('Please attach an image scan or document URL of your government-issued ID.')
        return
      }
      setCurrentStep(3)
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!documentNumber.trim()) {
      setError('Please provide your valid ID document number.')
      setCurrentStep(1)
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('document_type', documentType)
      formData.append('document_number', documentNumber.trim())
      if (documentFile) formData.append('document_file', documentFile)
      if (documentUrl.trim()) formData.append('document_url', documentUrl.trim())
      if (selfieFile) formData.append('selfie_file', selfieFile)
      if (selfieUrl.trim()) formData.append('selfie_url', selfieUrl.trim())
      if (notes.trim()) formData.append('notes', notes.trim())

      const res = await kycApi.submit(formData)
      setSuccessMsg(res.message || 'KYC submitted successfully for compliance verification.')
      if (refresh) await refresh()
      await fetchKycStatus()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit KYC verification.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const isApproved = kycData?.status === 'approved' && kycData?.is_verified
  const isPending = kycData?.status === 'pending'
  const isRejected = kycData?.status === 'rejected'

  const headerIconClass = isApproved
    ? 'kyc-modal-header-icon--approved'
    : isPending
    ? 'kyc-modal-header-icon--pending'
    : 'kyc-modal-header-icon--default'

  return createPortal(
    <div className="kyc-modal-overlay" onClick={onClose}>
      <div className="kyc-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="kyc-modal-handle" />

        {/* Top Header */}
        <div className="kyc-modal-header">
          <div className="kyc-modal-header-main">
            <div className={`kyc-modal-header-icon ${headerIconClass}`}>
              {isApproved ? <ShieldCheck size={26} /> : isPending ? <Clock size={24} /> : <UserCheck size={24} />}
            </div>
            <div>
              <h2 className="kyc-modal-header-title">Seller Identity & Trust Verification</h2>
              <p className="kyc-modal-header-sub">
                Earn the Verified Builder Trust Badge across all vehicle builds & chat threads.
              </p>
            </div>
          </div>
          <button type="button" className="kyc-modal-close" onClick={onClose} aria-label="Close KYC verification">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="kyc-modal-body">
          {loading ? (
            <div className="kyc-modal-loading">
              <div className="kyc-spinner" />
              <span>Fetching seller compliance credentials...</span>
            </div>
          ) : isApproved ? (
            /* Approved State */
            <div className="kyc-approved">
              <div className="kyc-approved__badge">
                <ShieldCheck size={46} />
              </div>
              <h3 className="kyc-approved__title">You are an Official Verified Seller</h3>
              <p className="kyc-approved__sub">✓ Verified Seller Badge Active on Car Builds & Direct Messaging</p>

              <div className="kyc-approved__card">
                <div className="kyc-approved__row">
                  <span className="kyc-approved__row-label">Verified Document:</span>
                  <span className="kyc-approved__row-value">
                    {kycData.document_type?.replace('_', ' ')} ({kycData.document_number})
                  </span>
                </div>
                <div className="kyc-approved__row">
                  <span className="kyc-approved__row-label">Approval Date:</span>
                  <span className="kyc-approved__row-value">
                    {kycData.verified_at ? new Date(kycData.verified_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Active'}
                  </span>
                </div>
                <div className="kyc-approved__row">
                  <span className="kyc-approved__row-label">Privacy Level:</span>
                  <span className="kyc-approved__row-value kyc-approved__row-value--ok">Username Only Exposed (@{user?.username})</span>
                </div>
              </div>

              <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: '100%', padding: '12px' }}>
                Done
              </button>
            </div>
          ) : (
            /* Multi-step Submission Form */
            <div>
              {/* Status Alert Banner if Pending or Rejected */}
              {isPending && (
                <div className="kyc-banner kyc-banner--pending">
                  <Clock size={22} className="kyc-banner__icon" />
                  <div>
                    <strong className="kyc-banner__title">Compliance Verification in Progress</strong>
                    <span className="kyc-banner__text">
                      Submitted on {new Date(kycData.submitted_at).toLocaleDateString()}. You may update or re-upload your document credentials below anytime.
                    </span>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="kyc-banner kyc-banner--rejected">
                  <ShieldAlert size={22} className="kyc-banner__icon" />
                  <div>
                    <strong className="kyc-banner__title">Verification Action Required</strong>
                    <span className="kyc-banner__text">
                      Feedback: <strong>{kycData.rejection_reason || 'Document could not be approved.'}</strong>
                      <br />Please provide clear, valid credentials below to obtain your badge.
                    </span>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="kyc-banner kyc-banner--success">
                  <CheckCircle2 size={16} className="kyc-banner__icon" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="kyc-banner kyc-banner--error">
                  <AlertCircle size={16} className="kyc-banner__icon" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step Progress Pills */}
              <div className="kyc-steps">
                <div className={`kyc-step ${currentStep === 1 ? 'kyc-step--active' : currentStep > 1 ? 'kyc-step--done' : 'kyc-step--idle'}`}>
                  <span className={`kyc-step__dot ${currentStep === 1 ? 'kyc-step__dot--active' : currentStep > 1 ? 'kyc-step__dot--done' : 'kyc-step__dot--idle'}`}>1</span>
                  <span className="kyc-step__label">Document Type</span>
                </div>

                <div className="kyc-steps__connector" />

                <div className={`kyc-step ${currentStep === 2 ? 'kyc-step--active' : currentStep > 2 ? 'kyc-step--done' : 'kyc-step--idle'}`}>
                  <span className={`kyc-step__dot ${currentStep === 2 ? 'kyc-step__dot--active' : currentStep > 2 ? 'kyc-step__dot--done' : 'kyc-step__dot--idle'}`}>2</span>
                  <span className="kyc-step__label">Photo Upload</span>
                </div>

                <div className="kyc-steps__connector" />

                <div className={`kyc-step ${currentStep === 3 ? 'kyc-step--active' : 'kyc-step--idle'}`}>
                  <span className={`kyc-step__dot ${currentStep === 3 ? 'kyc-step__dot--active' : 'kyc-step__dot--idle'}`}>3</span>
                  <span className="kyc-step__label">Submit</span>
                </div>
              </div>

              {/* Step 1: Document Selection */}
              {currentStep === 1 && (
                <div>
                  <div className="kyc-form-block">
                    <label className="kyc-label">Select Government-Issued ID or Business Documentation *</label>
                    <div className="kyc-doc-list">
                      {DOCUMENT_TYPES.map((dt) => {
                        const isSelected = documentType === dt.value
                        return (
                          <button
                            type="button"
                            key={dt.value}
                            onClick={() => setDocumentType(dt.value)}
                            className={`kyc-doc-option ${isSelected ? 'kyc-doc-option--selected' : ''}`}
                          >
                            <div>
                              <strong className="kyc-doc-option__name">{dt.label}</strong>
                              <span className="kyc-doc-option__desc">{dt.desc}</span>
                            </div>
                            <div className="kyc-doc-option__radio" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="kyc-form-block">
                    <label className="kyc-label">Document / Permit Registration Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. N02-18-992140 or PhilSys Card Number"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      className="kyc-input"
                    />
                  </div>

                  <div className="kyc-modal-foot kyc-modal-foot--start">
                    <button type="button" className="btn btn-primary" onClick={handleNextStep} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
                      <span>Continue to Upload Photos</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Uploads & Selfies */}
              {currentStep === 2 && (
                <div>
                  {/* ID Upload */}
                  <div className="kyc-form-block">
                    <label className="kyc-label">Front Scan or Clear Photo of ID *</label>
                    <div className={`kyc-upload-zone ${documentPreview || documentUrl ? 'kyc-upload-zone--filled' : ''}`}>
                      {documentPreview || documentUrl ? (
                        <div className="kyc-preview">
                          <img src={documentPreview || documentUrl} alt="Document preview" className="kyc-preview__img" />
                          <button
                            type="button"
                            className="kyc-preview__remove"
                            onClick={() => {
                              setDocumentFile(null)
                              setDocumentPreview(null)
                              setDocumentUrl('')
                            }}
                            aria-label="Remove document image"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload size={28} className="kyc-upload-icon" />
                          <p className="kyc-upload-title">Drag & drop ID image here, or click to browse</p>
                          <span className="kyc-upload-hint">Supports JPG, PNG, WEBP, PDF (Max 10MB)</span>
                          <input type="file" accept="image/*,.pdf" onChange={handleDocumentFileChange} className="kyc-upload-input" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selfie Upload */}
                  <div className="kyc-form-block" style={{ marginBottom: 24 }}>
                    <label className="kyc-label">Selfie Holding ID / Showroom Photo (Recommended)</label>
                    <div className={`kyc-upload-zone ${selfiePreview || selfieUrl ? 'kyc-upload-zone--filled' : ''}`}>
                      {selfiePreview || selfieUrl ? (
                        <div className="kyc-preview">
                          <img src={selfiePreview || selfieUrl} alt="Selfie preview" className="kyc-preview__img" />
                          <button
                            type="button"
                            className="kyc-preview__remove"
                            onClick={() => {
                              setSelfieFile(null)
                              setSelfiePreview(null)
                              setSelfieUrl('')
                            }}
                            aria-label="Remove selfie image"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Camera size={28} className="kyc-upload-icon" />
                          <p className="kyc-upload-title">Upload a photo holding your ID or physical garage workshop</p>
                          <span className="kyc-upload-hint">Accelerates compliance approval speed</span>
                          <input type="file" accept="image/*" onChange={handleSelfieFileChange} className="kyc-upload-input" />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="kyc-modal-foot">
                    <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ChevronLeft size={16} />
                      <span>Back</span>
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleNextStep} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>Review Details</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div>
                  <div className="kyc-review-card">
                    <h4 className="kyc-review-card__title">Review Submission Summary</h4>
                    <div className="kyc-review-grid">
                      <div>
                        <span className="kyc-review-item__label">Document Type</span>
                        <strong className="kyc-review-item__value">{documentType?.replace('_', ' ')}</strong>
                      </div>
                      <div>
                        <span className="kyc-review-item__label">ID Number</span>
                        <strong className="kyc-review-item__value kyc-review-item__value--mono">{documentNumber}</strong>
                      </div>
                      <div>
                        <span className="kyc-review-item__label">ID Photo Attached</span>
                        <span className="kyc-review-item__value kyc-review-item__value--ok">✓ Document Attached</span>
                      </div>
                      <div>
                        <span className="kyc-review-item__label">Selfie Attached</span>
                        <span className={selfieFile || selfieUrl ? 'kyc-review-item__value kyc-review-item__value--ok' : 'kyc-review-item__value'}>
                          {selfieFile || selfieUrl ? '✓ Photo Attached' : 'None (Optional)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="kyc-form-block">
                    <label className="kyc-label" style={{ fontWeight: 600 }}>
                      Additional Workshop / Showroom Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Specializing in Japanese Domestic Market (JDM) restorations located in Makati."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="kyc-textarea"
                    />
                  </div>

                  <div className="kyc-info-note">
                    <Lock size={15} className="kyc-info-note__icon" />
                    <span>Your documents are securely encrypted and reviewed strictly by our platform administrators.</span>
                  </div>

                  <div className="kyc-modal-foot">
                    <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(2)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ChevronLeft size={16} />
                      <span>Back</span>
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px' }}>
                      {submitting ? 'Submitting Documents...' : isPending ? 'Update Verification Credentials' : 'Confirm & Submit for Verification'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
import { useRef, useState } from 'react'
import { X, Camera, FileCheck2, Upload, Trash2, Loader2 } from 'lucide-react'
import { sellerOrdersApi } from '../../api/seller.js'
import { mediaApi } from '../../api/media.js'

export default function ProofSubmitModal({ order, onClose, onSubmitted }) {
  const [note, setNote] = useState('')
  const [urls, setUrls] = useState('')
  const [uploads, setUploads] = useState([]) // uploaded URLs from device files
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  if (!order) return null
  const orderNum = order.order_number || `#${order.id}`
  const isResubmit = order?.proof?.status === 'pending' || order?.proof?.status === 'rejected'

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    if (uploads.length + files.length > 10) {
      setUploadError('Maximum 10 proof photos per submission.')
      return
    }
    e.target.value = ''
    setUploading(true)
    setUploadError('')
    try {
      const res = await mediaApi.uploadMultiple(files, { caption: `Handover proof ${orderNum}` })
      const rows = res?.data ?? res ?? []
      const newUrls = (Array.isArray(rows) ? rows : [rows])
        .map((m) => m?.url)
        .filter(Boolean)
      if (newUrls.length === 0) throw new Error('Upload returned no URLs.')
      setUploads((prev) => [...prev, ...newUrls].slice(0, 10))
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Photo upload failed — try again or paste URLs below.')
    } finally {
      setUploading(false)
    }
  }

  const removeUpload = (url) => setUploads((prev) => prev.filter((u) => u !== url))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const typed = urls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
      const images = [...uploads, ...typed].filter((u, i, arr) => arr.indexOf(u) === i).slice(0, 10)
      const updated = await sellerOrdersApi.submitProof(order.id, {
        images,
        note: note.trim() || undefined,
      })
      onSubmitted?.(updated)
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit handover proof.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="proof-modal-overlay" onClick={onClose}>
      <div className="proof-modal" onClick={(e) => e.stopPropagation()}>
        <div className="proof-modal-head">
          <div>
            <h3><FileCheck2 size={18} /> {isResubmit ? 'Resubmit handover proof' : 'Submit handover proof'}</h3>
            <p className="muted">Order {orderNum} · Admin review releases your held funds to your wallet.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {order?.proof?.status === 'rejected' && order?.proof?.rejection_reason && (
          <div className="my-listings-alert my-listings-alert--error">
            Rejected: {order.proof.rejection_reason}
          </div>
        )}

        <form onSubmit={handleSubmit} className="proof-modal-form">
          <label>
            Handover note for the admin reviewer
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Turnover location, odometer reading, keys / OR-CR handed over…"
            />
          </label>
          <div>
            <span className="proof-upload-label"><Camera size={13} /> Handover photos — upload from device</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm proof-upload-btn"
              disabled={uploading || uploads.length >= 10}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : uploads.length > 0 ? `Add more (${uploads.length}/10)` : 'Choose photos'}
            </button>
            {uploadError && <div className="my-listings-alert my-listings-alert--error" style={{ marginTop: 8 }}>{uploadError}</div>}
            {uploads.length > 0 && (
              <div className="proof-upload-thumbs">
                {uploads.map((src) => (
                  <span key={src} className="proof-upload-thumb">
                    <img src={src} alt="Handover proof" loading="lazy" />
                    <button type="button" title="Remove" onClick={() => removeUpload(src)}>
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <label>
            <span>…or paste photo proof URLs (one per line or comma-separated)</span>
            <textarea
              rows={3}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={'https://…/handover-1.jpg\nhttps://…/odometer.jpg\nhttps://…/or-cr.jpg'}
            />
          </label>
          <p className="muted" style={{ fontSize: 12 }}>
            Tip: handover photo + odometer + OR/CR gets approved fastest. After approval the
            escrowed funds move to your wallet balance.
          </p>
          {error && <div className="my-listings-alert my-listings-alert--error">{error}</div>}
          <div className="proof-modal-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Submitting…' : isResubmit ? 'Resubmit for review' : 'Submit for admin review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

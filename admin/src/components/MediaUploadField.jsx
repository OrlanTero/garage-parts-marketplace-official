import { useRef, useState } from 'react'
import { Upload, X, Star } from 'lucide-react'

/**
 * Shared multi-photo upload field (file upload only — no URL pasting).
 * images: string[] of URLs. First image is the primary cover.
 * uploadFiles(files: File[]) -> Promise<string[]> must return uploaded URLs.
 */
export default function MediaUploadField({ images = [], onChange, uploadFiles, label = 'Photos (upload files)' }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const urls = await uploadFiles(files)
      onChange([...(images || []), ...urls.filter(Boolean)])
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed. Images must be under 20 MB each.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAt = (idx) => {
    onChange((images || []).filter((_, i) => i !== idx))
  }

  const makePrimary = (idx) => {
    if (idx === 0) return
    const next = [...(images || [])]
    const [picked] = next.splice(idx, 1)
    next.unshift(picked)
    onChange(next)
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label className="admin-label">{label} {images?.length > 0 && <span style={{ color: 'var(--admin-text-muted)', fontWeight: 400 }}>({images.length})</span>}</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/avif"
          multiple
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
        >
          <Upload size={14} />
          <span>{uploading ? 'Uploading…' : 'Upload Photos'}</span>
        </button>
        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>JPG / PNG / WEBP · multiple files · first photo is the cover</span>
      </div>
      {error && <div style={{ color: 'var(--admin-danger)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      {(images || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {images.map((url, idx) => (
            <div key={`${url}-${idx}`} style={{ position: 'relative', width: 72, height: 72 }}>
              <img
                src={url}
                alt={`Upload ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: idx === 0 ? '2px solid var(--color-rust)' : '1px solid var(--admin-border)' }}
              />
              {idx === 0 && (
                <span style={{ position: 'absolute', top: 2, left: 2, background: 'var(--color-rust)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  <Star size={8} /> Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                title="Remove photo"
                style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.65)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={12} />
              </button>
              {idx !== 0 && (
                <button
                  type="button"
                  onClick={() => makePrimary(idx)}
                  title="Set as cover"
                  style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 9, fontWeight: 700, border: 'none', background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: 4, padding: '1px 5px', cursor: 'pointer' }}
                >
                  Cover
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

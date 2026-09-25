import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, MapPin, Search } from 'lucide-react'
import { searchPlaces, reverseGeocode, osmLink } from '../api/geocode.js'
import './DeliveryMapPicker.css'

const PH_CENTER = [12.8797, 121.774]
const PH_ZOOM = 6
const PIN_ZOOM = 16

const pinIcon = () =>
  L.divIcon({
    className: 'gpm-pin-wrap',
    html: '<div class="gpm-pin"></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

const hasPin = (v) =>
  v && Number.isFinite(Number(v.latitude)) && Number.isFinite(Number(v.longitude))

/**
 * Reusable delivery-address pinpoint module (Leaflet + OpenStreetMap).
 * Drag the pin / click the map / search / use GPS — then confirm.
 *
 * Props:
 *   value      { latitude, longitude, label } | null
 *   onConfirm  ({ latitude, longitude, label }) => void
 *   readonly   render a locked mini-map of a saved pin (no editing)
 *   height     map height in px
 *   confirmLabel
 */
export default function DeliveryMapPicker({
  value = null,
  onConfirm,
  readonly = false,
  height = 340,
  confirmLabel = 'Confirm Delivery Pin',
}) {
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const revReqRef = useRef(0)

  const [position, setPosition] = useState(() =>
    hasPin(value) ? [Number(value.latitude), Number(value.longitude)] : [...PH_CENTER],
  )
  const [label, setLabel] = useState(value?.label || '')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [mapFailed, setMapFailed] = useState(false)
  const [searchTimer, setSearchTimer] = useState(null)

  // Init map once.
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return
    let map = null
    try {
      map = L.map(mapElRef.current, {
        center: hasPin(value) ? [Number(value.latitude), Number(value.longitude)] : [...PH_CENTER],
        zoom: hasPin(value) ? PIN_ZOOM : PH_ZOOM,
        scrollWheelZoom: !readonly,
        dragging: !readonly,
        zoomControl: !readonly,
        attributionControl: true,
      })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      const marker = L.marker(map.getCenter(), {
        icon: pinIcon(),
        draggable: !readonly,
        autoPan: true,
      }).addTo(map)
      markerRef.current = marker

      if (!readonly) {
        marker.on('dragend', () => {
          const ll = marker.getLatLng()
          movePin(ll.lat, ll.lng, { reverse: true })
        })
        map.on('click', (e) => movePin(e.latlng.lat, e.latlng.lng, { reverse: true }))
      }
      mapRef.current = map
    } catch {
      setMapFailed(true)
    }
    return () => {
      try {
        map?.remove()
      } catch { /* ignore */ }
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep marker + view in sync with position state.
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    const ll = L.latLng(position[0], position[1])
    const cur = marker.getLatLng()
    if (cur.distanceTo(ll) > 1) {
      marker.setLatLng(ll)
      map.panTo(ll)
    }
  }, [position])

  const movePin = (lat, lng, { reverse = false, newLabel } = {}) => {
    const latitude = Number(Number(lat).toFixed(7))
    const longitude = Number(Number(lng).toFixed(7))
    setPosition([latitude, longitude])
    if (newLabel !== undefined) {
      setLabel(newLabel)
      return
    }
    if (!reverse) return
    const myReq = ++revReqRef.current
    reverseGeocode(latitude, longitude)
      .then((name) => {
        if (myReq === revReqRef.current && name) setLabel(name)
      })
      .catch(() => {})
  }

  const handleSearchInput = (text) => {
    setQuery(text)
    if (searchTimer) clearTimeout(searchTimer)
    if (text.trim().length < 3) {
      setSuggestions([])
      return
    }
    setSearching(true)
    setSearchTimer(
      setTimeout(async () => {
        try {
          setSuggestions(await searchPlaces(text))
        } catch {
          setSuggestions([])
        } finally {
          setSearching(false)
        }
      }, 450),
    )
  }

  const pickSuggestion = (s) => {
    setSuggestions([])
    setQuery('')
    mapRef.current?.setView([s.latitude, s.longitude], PIN_ZOOM)
    movePin(s.latitude, s.longitude, { newLabel: s.label })
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], PIN_ZOOM)
        movePin(pos.coords.latitude, pos.coords.longitude, { reverse: true })
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleConfirm = () => {
    onConfirm?.({
      latitude: position[0],
      longitude: position[1],
      label: label.trim(),
    })
  }

  if (readonly) {
    return (
      <div>
        {!mapFailed && <div ref={mapElRef} className="gpm-map" style={{ height }} />}
        <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 10, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <MapPin size={14} color="#d8622c" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{label || 'Pinned delivery location'}</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
            {Number(position[0]).toFixed(6)}, {Number(position[1]).toFixed(6)} ·{' '}
            <a href={osmLink(position[0], position[1])} target="_blank" rel="noreferrer" style={{ color: '#fb923c' }}>
              Open in OpenStreetMap
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {!mapFailed && (
        <div style={{ position: 'relative' }}>
          <div ref={mapElRef} className="gpm-map" style={{ height }} />
          <div className="gpm-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search barangay, street, landmark..."
              aria-label="Search delivery location"
            />
            {searching && <span className="gpm-search-spin" />}
          </div>
          {suggestions.length > 0 && (
            <div className="gpm-suggestions">
              {suggestions.map((s, i) => (
                <button key={`${s.latitude}-${s.longitude}-${i}`} type="button" onClick={() => pickSuggestion(s)}>
                  <MapPin size={13} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="gpm-locate" onClick={useMyLocation} disabled={locating} title="Use my current location">
            <Crosshair size={15} /> {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
      )}

      {/* Manual fallback — also covers tile-outage cases */}
      <div className="gpm-manual">
        <div className="gpm-manual-row">
          <label>
            Latitude
            <input
              type="number" step="any" value={position[0]}
              onChange={(e) => setPosition([Number(e.target.value) || 0, position[1]])}
            />
          </label>
          <label>
            Longitude
            <input
              type="number" step="any" value={position[1]}
              onChange={(e) => setPosition([position[0], Number(e.target.value) || 0])}
            />
          </label>
        </div>
        <label>
          Delivery landmark / notes
          <input
            type="text" value={label} maxLength={500}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Gate 2, blue warehouse beside the chapel"
          />
        </label>
      </div>

      <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={handleConfirm}>
        <MapPin size={15} /> {confirmLabel}
      </button>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
        Drag the pin or click the map — address resolves automatically. Tiles © OpenStreetMap contributors.
      </div>
    </div>
  )
}

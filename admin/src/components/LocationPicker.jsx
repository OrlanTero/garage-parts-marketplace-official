import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, MapPin, Search } from 'lucide-react'
import { searchPlaces, reverseGeocode, osmLink } from '../api/geocode.js'
import './LocationPicker.css'

const PH_CENTER = [12.8797, 121.774]
const PH_ZOOM = 6
const PIN_ZOOM = 16

const pinIcon = () =>
  L.divIcon({
    className: 'loc-pin-wrap',
    html: '<div class="loc-pin"></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

const hasPin = (v) =>
  v && Number.isFinite(Number(v.latitude)) && Number.isFinite(Number(v.longitude))

/**
 * Warehouse address pinpoint (Leaflet + OpenStreetMap).
 * Drag the pin / click the map / search / use GPS - then confirm.
 * The confirmed coordinates become the delivery-fee origin for orders
 * dispatched from this warehouse.
 *
 * Props mirror the storefront DeliveryMapPicker:
 *   value      { latitude, longitude, label } | null
 *   onConfirm  ({ latitude, longitude, label }) => void
 *   height     map height in px
 *   confirmLabel
 */
export default function LocationPicker({
  value = null,
  onConfirm,
  height = 300,
  confirmLabel = 'Set Warehouse Pin',
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

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return
    let map = null
    try {
      map = L.map(mapElRef.current, {
        center: hasPin(value) ? [Number(value.latitude), Number(value.longitude)] : [...PH_CENTER],
        zoom: hasPin(value) ? PIN_ZOOM : PH_ZOOM,
      })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      const marker = L.marker(map.getCenter(), {
        icon: pinIcon(),
        draggable: true,
        autoPan: true,
      }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', () => {
        const ll = marker.getLatLng()
        movePin(ll.lat, ll.lng, { reverse: true })
      })
      map.on('click', (e) => movePin(e.latlng.lat, e.latlng.lng, { reverse: true }))
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

  return (
    <div>
      {!mapFailed && (
        <div style={{ position: 'relative' }}>
          <div ref={mapElRef} className="loc-map" style={{ height }} />
          <div className="loc-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search barangay, street, landmark..."
              aria-label="Search warehouse location"
            />
            {searching && <span className="loc-search-spin" />}
          </div>
          {suggestions.length > 0 && (
            <div className="loc-suggestions">
              {suggestions.map((s, i) => (
                <button key={`${s.latitude}-${s.longitude}-${i}`} type="button" onClick={() => pickSuggestion(s)}>
                  <MapPin size={13} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="loc-locate" onClick={useMyLocation} disabled={locating} title="Use my current location">
            <Crosshair size={15} /> {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
      )}

      <div className="loc-manual">
        <div className="loc-manual-row">
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
          Resolved address (auto-filled, editable)
          <input
            type="text" value={label} maxLength={500}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Valenzuela City, Metro Manila"
          />
        </label>
      </div>

      <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={handleConfirm}>
        <MapPin size={15} /> {confirmLabel}
      </button>
    </div>
  )
}

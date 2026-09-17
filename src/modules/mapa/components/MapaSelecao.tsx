'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css'
import 'leaflet-fullscreen/dist/Leaflet.fullscreen'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.js'

interface Props {
  initialLat?: number | null
  initialLng?: number | null
  onLocationSelect: (lat: number, lng: number) => void
  dark?: boolean
}

export default function MapaSelecao({ initialLat, initialLng, onLocationSelect, dark }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  )

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    onLocationSelect(lat, lng)
  }, [onLocationSelect])

  useEffect(() => {
    if (!mapRef.current) return

    if (mapInstance.current) {
      mapInstance.current.remove()
      mapInstance.current = null
    }

    const center: L.LatLngTuple = initialLat && initialLng
      ? [initialLat, initialLng]
      : [-15.7801, -47.9292]

    const tileLight = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    const tileDark = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    const tileSatellite = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

    const map = L.map(mapRef.current, {
      center,
      zoom: initialLat && initialLng ? 15 : 4,
      zoomControl: false,
      attributionControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: { position: 'topright' },
    })

    L.control.zoom({ position: 'topright' }).addTo(map)

    const baseLayers = {
      'Padrão': L.tileLayer(tileLight),
      'Escuro': L.tileLayer(tileDark),
      'Satélite': L.tileLayer(tileSatellite),
    }

    baseLayers[dark ? 'Escuro' : 'Padrão'].addTo(map)
    L.control.layers(baseLayers, undefined, { position: 'topright' }).addTo(map)

    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map)

    L.control.locate({
      position: 'topright',
      flyTo: true,
      keepCurrentZoomLevel: true,
      showCompass: true,
      showPopup: true,
      strings: {
        title: 'Minha localização',
        popup: 'Você está aqui',
      },
      locateOptions: {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    } as Record<string, unknown>).addTo(map)

    const createIcon = () => L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 24px;
        height: 24px;
        background: ${dark ? '#fafafa' : '#18181b'};
        border: 3px solid ${dark ? '#18181b' : '#ffffff'};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    if (initialLat && initialLng) {
      markerRef.current = L.marker([initialLat, initialLng], { icon: createIcon() })
        .addTo(map)
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      setPosition({ lat, lng })
      handleLocationSelect(lat, lng)

      if (markerRef.current) {
        map.removeLayer(markerRef.current)
      }

      markerRef.current = L.marker([lat, lng], { icon: createIcon() })
        .addTo(map)
        .bindPopup(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`)
        .openPopup()
    })

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [initialLat, initialLng, dark, handleLocationSelect])

  function useMyLocation() {
    if (!navigator.geolocation || !mapInstance.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        mapInstance.current!.flyTo([lat, lng], 15)
        setPosition({ lat, lng })
        handleLocationSelect(lat, lng)
        if (markerRef.current) {
          mapInstance.current!.removeLayer(markerRef.current)
        }
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 24px;
            height: 24px;
            background: ${dark ? '#fafafa' : '#18181b'};
            border: 3px solid ${dark ? '#18181b' : '#ffffff'};
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
        markerRef.current = L.marker([lat, lng], { icon })
          .addTo(mapInstance.current!)
          .bindPopup('Sua localização')
          .openPopup()
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={mapRef}
        className="w-full rounded-lg overflow-hidden cursor-crosshair"
        style={{ height: '300px', border: '1px solid var(--card-border)' }}
      />
      <button
        type="button"
        onClick={useMyLocation}
        className="text-sm rounded-lg px-3 py-2 transition-colors w-fit"
        style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
      >
        📍 Usar minha localização
      </button>
      {position && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Localização: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      )}
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        Clique no mapa para selecionar a localização
      </p>
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css'
import 'leaflet-fullscreen/dist/Leaflet.fullscreen'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.js'

interface Props {
  latitude: number
  longitude: number
  titulo: string
  dark?: boolean
}

export default function MapaPoste({ latitude, longitude, titulo, dark }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    if (mapInstance.current) {
      mapInstance.current.remove()
      mapInstance.current = null
    }

    const tileLight = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    const tileDark = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    const tileSatellite = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 15,
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

    const markerIcon = L.divIcon({
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

    L.marker([latitude, longitude], { icon: markerIcon })
      .addTo(map)
      .bindPopup(`<strong>${titulo}</strong>`)
      .openPopup()

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [latitude, longitude, titulo, dark])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height: '300px', border: '1px solid var(--card-border)' }}
    />
  )
}

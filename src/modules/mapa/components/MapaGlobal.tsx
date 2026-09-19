'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css'
import 'leaflet-fullscreen/dist/Leaflet.fullscreen'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css'
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.js'
import type { EventoMarker } from './MapaGlobalClient'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface Props {
  eventos: EventoMarker[]
  dark?: boolean
}

export default function MapaGlobal({ eventos, dark }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const [busca, setBusca] = useState<string>('')

  const eventosFiltrados = useMemo(() => eventos.filter(evento => {
    return !busca || evento.titulo.toLowerCase().includes(busca.toLowerCase())
  }), [eventos, busca])

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
      center: [-15.7801, -47.9292],
      zoom: 4,
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
        outsideMapBoundsMsg: 'Você está fora dos limites do mapa',
      },
      locateOptions: {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    } as Record<string, unknown>).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [dark])

  useEffect(() => {
    if (!markersLayerRef.current || !mapInstance.current) return

    markersLayerRef.current.clearLayers()

    const createIcon = (done: boolean) => L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 20px;
        height: 20px;
        background: ${done ? '#71717a' : dark ? '#f87171' : '#ef4444'};
        border: 3px solid ${dark ? '#18181b' : '#ffffff'};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        opacity: ${done ? 0.6 : 1};
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    eventosFiltrados.forEach(evento => {
      const data = new Date(evento.startsAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const marker = L.marker([evento.latitude, evento.longitude], { icon: createIcon(evento.done) })
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${escapeHtml(evento.titulo)}</strong>${evento.done ? ' <small style="color: #16a34a;">✓</small>' : ''}<br/>
            <small style="color: #71717a;">${escapeHtml(data)}</small><br/>
            <a href="/eventos/${evento.id}" style="color: #3b82f6; text-decoration: underline; font-size: 12px;">Ver evento</a>
          </div>
        `)
      markersLayerRef.current!.addLayer(marker)
    })

    if (eventosFiltrados.length > 0) {
      const bounds = L.latLngBounds(eventosFiltrados.map(e => [e.latitude, e.longitude]))
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [eventosFiltrados, dark])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Buscar por título</label>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite para buscar..."
          className="rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
          style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? 's' : ''} no mapa
        </p>
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Limpar filtro
          </button>
        )}
      </div>

      <div
        ref={mapRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ height: '500px', border: '1px solid var(--card-border)' }}
      />
    </div>
  )
}

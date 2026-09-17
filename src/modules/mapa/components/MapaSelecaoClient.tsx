'use client'

import dynamic from 'next/dynamic'
import { useTheme } from '@/lib/ThemeProvider'

const MapaSelecao = dynamic(() => import('./MapaSelecao'), { ssr: false })

interface Props {
  initialLat?: number | null
  initialLng?: number | null
  onLocationSelect: (lat: number, lng: number) => void
}

export default function MapaSelecaoClient({ initialLat, initialLng, onLocationSelect }: Props) {
  const { theme } = useTheme()
  return <MapaSelecao initialLat={initialLat} initialLng={initialLng} onLocationSelect={onLocationSelect} dark={theme === 'dark'} />
}

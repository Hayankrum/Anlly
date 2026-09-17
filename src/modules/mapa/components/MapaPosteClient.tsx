'use client'

import dynamic from 'next/dynamic'
import { useTheme } from '@/lib/ThemeProvider'

const MapaPoste = dynamic(() => import('./MapaPoste'), { ssr: false })

interface Props {
  latitude: number
  longitude: number
  titulo: string
}

export default function MapaPosteClient({ latitude, longitude, titulo }: Props) {
  const { theme } = useTheme()
  return <MapaPoste latitude={latitude} longitude={longitude} titulo={titulo} dark={theme === 'dark'} />
}

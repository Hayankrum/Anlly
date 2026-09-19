'use client'

import dynamic from 'next/dynamic'
import { useTheme } from '@/lib/ThemeProvider'

const MapaGlobal = dynamic(() => import('./MapaGlobal'), { ssr: false })

export interface EventoMarker {
  id: number
  titulo: string
  startsAt: string
  latitude: number
  longitude: number
  done: boolean
}

interface Props {
  eventos: EventoMarker[]
}

export default function MapaGlobalClient({ eventos }: Props) {
  const { theme } = useTheme()
  return <MapaGlobal eventos={eventos} dark={theme === 'dark'} />
}

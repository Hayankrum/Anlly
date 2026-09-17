'use client'

import dynamic from 'next/dynamic'
import { useTheme } from '@/lib/ThemeProvider'

const MapaGlobal = dynamic(() => import('./MapaGlobal'), { ssr: false })

interface PostMarker {
  id: number
  titulo: string
  latitude: number
  longitude: number
  autorNome: string
  criadoEm: string
}

interface Props {
  posts: PostMarker[]
}

export default function MapaGlobalClient({ posts }: Props) {
  const { theme } = useTheme()
  return <MapaGlobal posts={posts} dark={theme === 'dark'} />
}

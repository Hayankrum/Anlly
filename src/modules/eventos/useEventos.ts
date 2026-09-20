'use client'

import { useState, useEffect, useRef } from 'react'
import type { Evento } from './types'
import {
  cacheEventos,
  getCachedEventos,
  getCachedEvento,
  getCacheOwner,
  setCacheOwner,
} from '@/lib/db'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

interface EventosRange {
  from?: string
  to?: string
}

async function buscarEventos(range: EventosRange): Promise<Evento[]> {
  const params = new URLSearchParams()
  if (range.from) params.set('from', range.from)
  if (range.to) params.set('to', range.to)
  const qs = params.toString()
  const res = await fetch(`/api/eventos${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error('Falha ao carregar notas')
  const data = await res.json()
  return Array.isArray(data?.eventos) ? data.eventos : []
}

async function buscarUsuarioId(): Promise<number | null> {
  try {
    const res = await fetch('/api/me')
    const data = res.ok ? await res.json() : null
    const id = typeof data?.id === 'number' ? data.id : null
    await setCacheOwner(id)
    return id
  } catch {
    return await getCacheOwner()
  }
}

function useMounted() {
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  return mountedRef
}

function useUsuarioId() {
  const [usuarioId, setUsuarioId] = useState<number | null | undefined>(undefined)
  const mountedRef = useMounted()

  useEffect(() => {
    let cancelled = false
    buscarUsuarioId().then((id) => {
      if (!cancelled && mountedRef.current) setUsuarioId(id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return usuarioId
}

export function useEventos(range: EventosRange = {}, refreshKey = 0) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const mountedRef = useMounted()
  const isOnline = useOnlineStatus()
  const primeiraRenderizacao = useRef(true)
  const usuarioId = useUsuarioId()

  useEffect(() => {
    if (usuarioId === undefined) return
    const uid = usuarioId
    let cancelled = false

    async function run() {
      setLoading(true)
      try {
        const data = await buscarEventos(range)
        if (!cancelled && mountedRef.current) {
          setEventos(data)
          setFromCache(false)
          await cacheEventos(data, range)
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          const cached = await getCachedEventos(uid, range)
          setEventos(cached)
          setFromCache(true)
        }
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [usuarioId, range.from, range.to, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    if (!isOnline || usuarioId === undefined) return

    let cancelled = false
    async function revalidar() {
      try {
        const data = await buscarEventos(range)
        if (!cancelled && mountedRef.current) {
          setEventos(data)
          setFromCache(false)
          await cacheEventos(data, range)
        }
      } catch {
        /* mantém o cache */
      }
    }
    revalidar()
    return () => {
      cancelled = true
    }
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  return { eventos, loading, fromCache }
}

export function useEvento(id: number, refreshKey = 0) {
  const [evento, setEvento] = useState<Evento | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const mountedRef = useMounted()
  const usuarioId = useUsuarioId()

  useEffect(() => {
    if (!id || usuarioId === undefined) return
    const uid = usuarioId
    let cancelled = false

    async function run() {
      setLoading(true)
      try {
        const res = await fetch(`/api/eventos/${id}`)
        if (!res.ok) throw new Error('Falha ao carregar nota')
        const data = await res.json()
        if (!cancelled && mountedRef.current) {
          setEvento(data)
          setFromCache(false)
          await cacheEventos([data])
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          const cached = await getCachedEvento(uid, id)
          if (cached) {
            setEvento(cached)
            setFromCache(true)
          } else {
            setEvento(null)
          }
        }
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [id, usuarioId, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { evento, loading, fromCache }
}

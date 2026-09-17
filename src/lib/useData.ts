'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  cachePostsPage,
  getCachedPostsPage,
  getFirstCachedPostsPage,
  cachePostDetail,
  getCachedPostDetail,
  syncPendingMutations,
  addPendingMutation,
} from '@/lib/db'
import { useOnlineStatus } from './useOnlineStatus'

interface Post {
  id: number
  titulo: string
  conteudo: string
  latitude: number | null
  longitude: number | null
  criadoEm: string
  autorId: number
  autor: { id: number; nome: string; fotoUrl: string | null }
}

interface Comentario {
  id: number
  texto: string
  criadoEm: string
  postId: number
  autorId: number
  autor: { id: number; nome: string; fotoUrl: string | null }
}

interface PostCompleto extends Post {
  comentarios: Comentario[]
}

// ---------- usePosts (lista) ----------

export function usePosts(page = 1) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const [pagina, setPagina] = useState(page)
  const [totalPages, setTotalPages] = useState(1)
  const isOnline = useOnlineStatus()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch(`/api/posts?page=${page}&limit=20`)
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        const data: Post[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.posts)
            ? json.posts
            : []
        if (!cancelled && mountedRef.current) {
          const totalPages = json?.pagination?.totalPages ?? 1
          const total = json?.pagination?.total ?? data.length
          setPosts(data)
          setFromCache(false)
          setPagina(json?.pagination?.page ?? page)
          setTotalPages(totalPages)
          await cachePostsPage(page, data, totalPages, total)
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          const cached =
            (await getCachedPostsPage(page)) ?? (await getFirstCachedPostsPage())
          if (cached) {
            setPosts(cached.posts)
            setPagina(cached.page)
            setTotalPages(cached.totalPages)
          } else {
            setPagina(page)
          }
          setFromCache(true)
        }
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [page])

  useEffect(() => {
    if (!isOnline) return

    let cancelled = false
    async function sync() {
      await syncPendingMutations()
      if (cancelled) return
      try {
        const res = await fetch(`/api/posts?page=${page}&limit=20`)
        if (res.ok) {
          const json = await res.json()
          const data: Post[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.posts)
              ? json.posts
              : []
          if (!cancelled && mountedRef.current) {
            const totalPages = json?.pagination?.totalPages ?? 1
            const total = json?.pagination?.total ?? data.length
            setPosts(data)
            setFromCache(false)
            setPagina(json?.pagination?.page ?? page)
            setTotalPages(totalPages)
            await cachePostsPage(page, data, totalPages, total)
          }
        }
      } catch { /* ignore */ }
    }
    sync()
    return () => { cancelled = true }
  }, [isOnline, page])

  return { posts, loading, fromCache, pagina, totalPages }
}

// ---------- usePost (detalhe) ----------

export function usePost(id: number, refreshKey = 0) {
  const [post, setPost] = useState<PostCompleto | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const isOnline = useOnlineStatus()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch(`/api/posts/${id}`)
        if (!res.ok) throw new Error('Failed')
        const data: PostCompleto = await res.json()
        if (!cancelled && mountedRef.current) {
          setPost(data)
          setFromCache(false)
          await cachePostDetail(data)
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          const cached = await getCachedPostDetail(id)
          if (cached) {
            setPost(cached)
            setFromCache(true)
          }
        }
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [id, refreshKey])

  useEffect(() => {
    if (isOnline) syncPendingMutations()
  }, [isOnline])

  return { post, loading, fromCache }
}

// ---------- useUsuario ----------

export function useUsuario() {
  const [usuario, setUsuario] = useState<{ id: number; nome: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && mountedRef.current) setUsuario(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && mountedRef.current) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { usuario, loading }
}

// ---------- useOfflineMutation ----------

export function useOfflineMutation() {
  const isOnline = useOnlineStatus()

  const mutate = useCallback(
    async (url: string, method: string, body: unknown) => {
      if (isOnline) {
        return fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      await addPendingMutation({
        url,
        method,
        body: JSON.stringify(body),
        createdAt: Date.now(),
      })

      return new Response(JSON.stringify({ queued: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      })
    },
    [isOnline]
  )

  return { mutate, isOnline }
}

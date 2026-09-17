import { openDB, type IDBPDatabase } from 'idb'

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

interface PostCompleto extends Post {
  comentarios: {
    id: number
    texto: string
    criadoEm: string
    postId: number
    autorId: number
    autor: { id: number; nome: string; fotoUrl: string | null }
  }[]
}

interface Usuario {
  id: number
  nome: string
  email: string
  bio: string | null
  fotoUrl: string | null
}

interface PendingMutation {
  id?: number
  url: string
  method: string
  body: string
  createdAt: number
}

interface PostsPage {
  page: number
  posts: Post[]
  totalPages: number
  total: number
  cachedAt: number
}

const MAX_CACHED_PAGES = 30

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('meu-app-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('posts')) {
          db.createObjectStore('posts', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('postsPages')) {
          db.createObjectStore('postsPages', { keyPath: 'page' })
        }
        if (!db.objectStoreNames.contains('postsDetail')) {
          db.createObjectStore('postsDetail', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('usuario')) {
          db.createObjectStore('usuario', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('pendingMutations')) {
          const store = db.createObjectStore('pendingMutations', {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('createdAt', 'createdAt')
        }
      },
    })
  }
  return dbPromise
}

// ---------- Posts ----------

export async function cachePostsPage(
  page: number,
  posts: Post[],
  totalPages: number,
  total: number,
) {
  const db = await getDB()
  await db.put('postsPages', { page, posts, totalPages, total, cachedAt: Date.now() })

  const todas = await db.getAll('postsPages')
  if (todas.length > MAX_CACHED_PAGES) {
    const excedentes = todas
      .sort((a, b) => a.cachedAt - b.cachedAt)
      .slice(0, todas.length - MAX_CACHED_PAGES)
    await Promise.all(excedentes.map((p) => db.delete('postsPages', p.page)))
  }
}

export async function getCachedPostsPage(page: number): Promise<PostsPage | undefined> {
  const db = await getDB()
  return db.get('postsPages', page)
}

export async function getFirstCachedPostsPage(): Promise<PostsPage | undefined> {
  const db = await getDB()
  const todas = await db.getAll('postsPages')
  if (todas.length === 0) return undefined
  return todas.reduce((menor, p) => (p.page < menor.page ? p : menor), todas[0])
}

export async function cachePostDetail(post: PostCompleto) {
  const db = await getDB()
  await db.put('postsDetail', post)
}

export async function getCachedPostDetail(id: number): Promise<PostCompleto | undefined> {
  const db = await getDB()
  return db.get('postsDetail', id)
}

// ---------- Usuario ----------

export async function cacheUsuario(usuario: Usuario) {
  const db = await getDB()
  await db.put('usuario', usuario)
}

export async function getCachedUsuario(): Promise<Usuario | undefined> {
  const db = await getDB()
  const all = await db.getAll('usuario')
  return all[0]
}

// ---------- Pending Mutations (fila offline) ----------

export async function addPendingMutation(mutation: Omit<PendingMutation, 'id'>) {
  const db = await getDB()
  await db.add('pendingMutations', mutation)
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDB()
  return db.getAll('pendingMutations')
}

export async function clearPendingMutations() {
  const db = await getDB()
  await db.clear('pendingMutations')
}

export async function removePendingMutation(id: number) {
  const db = await getDB()
  await db.delete('pendingMutations', id)
}

// ---------- Sync ----------

export async function syncPendingMutations() {
  const mutations = await getPendingMutations()
  for (const m of mutations) {
    try {
      const response = await fetch(m.url, {
        method: m.method,
        headers: { 'Content-Type': 'application/json' },
        body: m.body,
      })
      if (response.ok && m.id) {
        await removePendingMutation(m.id)
      } else if (response.status < 500 && m.id) {
        // erro permanente (ex: validação) - não será resolvido com nova tentativa,
        // então remove da fila para não bloquear as demais
        await removePendingMutation(m.id)
      } else {
        break // erro do servidor (5xx): mantém na fila para tentar na próxima
      }
    } catch {
      break // fica offline, tenta na próxima
    }
  }
}

export async function syncAll() {
  await syncPendingMutations()
}

import { openDB, type IDBPDatabase } from 'idb'

export interface ReminderCache {
  id: number
  eventId: number
  offsetMinutes: number
  notifyAt: string
  sentAt: string | null
}

export interface EventoCache {
  id: number
  title: string
  description: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean
  dias: string[] | null
  locationText: string | null
  latitude: number | null
  longitude: number | null
  color: string
  done: boolean
  createdAt: string
  updatedAt: string
  usuarioId?: number | null
  reminders: ReminderCache[]
}

interface EventosRange {
  from?: string | null
  to?: string | null
}

const LEGACY_STORES = ['posts', 'postsPages', 'postsDetail', 'usuario', 'pendingMutations']

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('meu-app-db', 5, {
      upgrade(db) {
        for (const nome of LEGACY_STORES) {
          if (db.objectStoreNames.contains(nome)) {
            db.deleteObjectStore(nome)
          }
        }
        if (!db.objectStoreNames.contains('eventos')) {
          const store = db.createObjectStore('eventos', { keyPath: 'id' })
          store.createIndex('startsAt', 'startsAt')
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }
      },
    })
  }
  return dbPromise
}

// ---------- Escopo do cache (usuário dono) ----------

const CACHE_OWNER_KEY = 'eventosCacheOwner'

export async function setCacheOwner(usuarioId: number | null) {
  const db = await getDB()
  await db.put('meta', usuarioId, CACHE_OWNER_KEY)
}

export async function getCacheOwner(): Promise<number | null> {
  const db = await getDB()
  const value = await db.get('meta', CACHE_OWNER_KEY)
  return typeof value === 'number' ? value : null
}

// ---------- Eventos ----------

export async function cacheEventos(eventos: EventoCache[], range?: EventosRange) {
  const db = await getDB()
  const tx = db.transaction('eventos', 'readwrite')
  const store = tx.objectStore('eventos')

  if (range && (range.from || range.to)) {
    const from = range.from ? new Date(range.from).getTime() : -Infinity
    const to = range.to ? new Date(range.to).getTime() : Infinity
    const ids = new Set(eventos.map((e) => e.id))
    const todos: EventoCache[] = await store.getAll()
    for (const evento of todos) {
      const t = new Date(evento.startsAt).getTime()
      if (t >= from && t <= to && !ids.has(evento.id)) {
        await store.delete(evento.id)
      }
    }
  }

  for (const evento of eventos) {
    await store.put(evento)
  }

  await tx.done
}

export async function getCachedEventos(
  usuarioId: number | null,
  range: EventosRange = {}
): Promise<EventoCache[]> {
  const db = await getDB()
  const todos: EventoCache[] = await db.getAll('eventos')
  const from = range.from ? new Date(range.from).getTime() : -Infinity
  const to = range.to ? new Date(range.to).getTime() : Infinity

  return todos
    .filter((evento) => {
      if (evento.usuarioId !== usuarioId) return false
      const t = new Date(evento.startsAt).getTime()
      return t >= from && t <= to
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export async function getCachedEvento(
  usuarioId: number | null,
  id: number
): Promise<EventoCache | undefined> {
  const db = await getDB()
  const evento = await db.get('eventos', id)
  if (!evento || evento.usuarioId !== usuarioId) return undefined
  return evento
}

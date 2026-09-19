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
  locationText: string | null
  latitude: number | null
  longitude: number | null
  done: boolean
  createdAt: string
  updatedAt: string
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
    dbPromise = openDB('meu-app-db', 4, {
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
      },
    })
  }
  return dbPromise
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

export async function getCachedEventos(range: EventosRange = {}): Promise<EventoCache[]> {
  const db = await getDB()
  const todos: EventoCache[] = await db.getAll('eventos')
  const from = range.from ? new Date(range.from).getTime() : -Infinity
  const to = range.to ? new Date(range.to).getTime() : Infinity

  return todos
    .filter((evento) => {
      const t = new Date(evento.startsAt).getTime()
      return t >= from && t <= to
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export async function getCachedEvento(id: number): Promise<EventoCache | undefined> {
  const db = await getDB()
  return db.get('eventos', id)
}

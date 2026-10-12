import Dexie, { type EntityTable } from 'dexie'
import appConfig from '../app/app.config.json'
import type { EntradaConfig, EntradaOutbox, EstadoSync, Item } from './schema'

const db = new Dexie(appConfig.dbName) as Dexie & {
  items: EntityTable<Item, 'id'>
  config: EntityTable<EntradaConfig, 'chave'>
  outbox: EntityTable<EntradaOutbox, 'id'>
  syncState: EntityTable<EstadoSync, 'chave'>
}

db.version(1).stores({
  items: 'id, criadoEm, concluido, updatedAt, deletedAt, serverVersion',
  config: 'chave',
  outbox: 'id, tabela, registroId, criadoEm',
  syncState: 'chave',
})

// v2: agendamento de dia único (dataAgendamento) vira lista (diasAgendamento).
db.version(2).upgrade((transacao) =>
  transacao
    .table('items')
    .toCollection()
    .modify((item) => {
      const legado = (item as unknown as { dataAgendamento?: string }).dataAgendamento
      if (typeof legado === 'string' && legado !== '') {
        ;(item as unknown as { diasAgendamento?: string[] }).diasAgendamento = [legado]
      }
      delete (item as unknown as { dataAgendamento?: string }).dataAgendamento
    }),
)

export default db

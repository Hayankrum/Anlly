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

// v3: cronômetro do item (timerIniciadoEm + tempoDecorridoMs). Os campos são
// opcionais — itens legados simplesmente não os têm; só adiciona o índice.
db.version(3).stores({
  items: 'id, criadoEm, concluido, updatedAt, deletedAt, serverVersion, timerIniciadoEm',
  config: 'chave',
  outbox: 'id, tabela, registroId, criadoEm',
  syncState: 'chave',
})

// v4: quadro Kanban (tipo 'kanban' + coluna/ordem). Índice em tipo para o
// quadro listar só os cartões sem varrer a tabela inteira.
db.version(4).stores({
  items: 'id, criadoEm, concluido, updatedAt, deletedAt, serverVersion, timerIniciadoEm, tipo',
  config: 'chave',
  outbox: 'id, tabela, registroId, criadoEm',
  syncState: 'chave',
})

// v5: quadro embutido no projeto — cartão é item filho (parentId). Índice em
// parentId para o detalhe listar os cartões do projeto sem varrer a tabela.
db.version(5).stores({
  items:
    'id, criadoEm, concluido, updatedAt, deletedAt, serverVersion, timerIniciadoEm, tipo, parentId',
  config: 'chave',
  outbox: 'id, tabela, registroId, criadoEm',
  syncState: 'chave',
})

// v6: configuração de colunas do Kanban persistida no item do projeto.
db.version(6).stores({
  items:
    'id, criadoEm, concluido, updatedAt, deletedAt, serverVersion, timerIniciadoEm, tipo, parentId',
  config: 'chave',
  outbox: 'id, tabela, registroId, criadoEm',
  syncState: 'chave',
})

export default db

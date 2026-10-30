import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import appConfig from '../app/app.config.json'

describe('migração Dexie v8', () => {
  afterEach(async () => {
    await Dexie.delete(appConfig.dbName)
  })

  it('adiciona a tabela modelos sem alterar itens legados', async () => {
    const legado = new Dexie(appConfig.dbName)
    legado.version(7).stores({
      items:
        'id, criadoEm, concluido, updatedAt, deletedAt, serverVersion, timerIniciadoEm, tipo, parentId',
      config: 'chave',
      outbox: 'id, tabela, registroId, criadoEm',
      syncState: 'chave',
    })
    await legado.open()
    const itemAntigo = {
      id: 'item-legado',
      titulo: 'Continuar preservado',
      descricao: '',
      concluido: false,
      criadoEm: 1,
      updatedAt: 1,
    }
    await legado.table('items').put(itemAntigo)
    legado.close()

    const { default: banco } = await import('./database')
    await banco.open()
    expect(banco.verno).toBe(8)
    expect(banco.tables.map((tabela) => tabela.name)).toContain('modelos')
    expect(await banco.table('items').get('item-legado')).toEqual(itemAntigo)
    banco.close()
  })
})

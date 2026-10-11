import db from '../../db/database'
import { novaMutacao } from '../../db/outbox.repo'
import type { EntradaOutbox, FiltroItens, Item } from '../../db/schema'
import { executarComCota } from '../../shared/lib/cota'
import { gerarId } from '../../shared/lib/id'

const TABELA = 'items'

export interface OpcoesListagem {
  busca?: string
  filtro?: FiltroItens
}

export interface EntradaItem {
  titulo: string
  descricao: string
}

export async function listar({ busca = '', filtro = 'todos' }: OpcoesListagem = {}): Promise<Item[]> {
  const termo = busca.trim().toLowerCase()
  const itens = await db.items.orderBy('criadoEm').reverse().toArray()
  return itens.filter((item) => {
    if (item.deletedAt !== undefined) return false
    if (filtro === 'pendentes' && item.concluido) return false
    if (filtro === 'concluidos' && !item.concluido) return false
    if (termo === '') return true
    return `${item.titulo} ${item.descricao}`.toLowerCase().includes(termo)
  })
}

export async function obter(id: string): Promise<Item | undefined> {
  return db.items.get(id)
}

export async function listarParaBackup(): Promise<Item[]> {
  return db.items.orderBy('criadoEm').toArray()
}

export async function criar(entrada: EntradaItem): Promise<string> {
  const agora = Date.now()
  const id = gerarId()
  const item: Item = {
    id,
    titulo: entrada.titulo.trim(),
    descricao: entrada.descricao.trim(),
    concluido: false,
    criadoEm: agora,
    updatedAt: agora,
  }
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      await db.items.add(item)
      await db.outbox.add(novaMutacao(TABELA, item, 'upsert', agora))
    }),
  )
  return id
}

export async function atualizar(id: string, entrada: EntradaItem): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(id)
      if (atual === undefined) return
      const item: Item = {
        ...atual,
        titulo: entrada.titulo.trim(),
        descricao: entrada.descricao.trim(),
        updatedAt: agora,
      }
      await db.items.put(item)
      await db.outbox.add(novaMutacao(TABELA, item, 'upsert', agora))
    }),
  )
}

export async function alternarConcluido(item: Item): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(item.id)
      if (atual === undefined) return
      const atualizado: Item = { ...atual, concluido: !atual.concluido, updatedAt: agora }
      await db.items.put(atualizado)
      await db.outbox.add(novaMutacao(TABELA, atualizado, 'upsert', agora))
    }),
  )
}

export async function excluir(id: string): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(id)
      if (atual === undefined) return
      const item: Item = { ...atual, deletedAt: agora, updatedAt: agora }
      await db.items.put(item)
      await db.outbox.add(novaMutacao(TABELA, item, 'delete', agora))
    }),
  )
}

export async function limparTodos(): Promise<void> {
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      await db.items.clear()
      await db.outbox.clear()
    }),
  )
}

function operacaoDe(importado: Item): EntradaOutbox['operacao'] {
  return importado.deletedAt !== undefined ? 'delete' : 'upsert'
}

export async function substituirTodos(itens: Item[]): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const existentes = await db.items.toArray()
      const porId = new Map(existentes.map((item) => [item.id, item]))
      const idsImportados = new Set(itens.map((item) => item.id))
      const paraGravar: Item[] = []
      const mutacoes: EntradaOutbox[] = []

      for (const importado of itens) {
        const atual = porId.get(importado.id)
        const vencedor =
          atual === undefined || importado.updatedAt >= atual.updatedAt ? importado : atual
        paraGravar.push(vencedor)
        mutacoes.push(novaMutacao(TABELA, vencedor, operacaoDe(vencedor), agora))
      }

      for (const existente of existentes) {
        if (idsImportados.has(existente.id) || existente.deletedAt !== undefined) continue
        const removido: Item = { ...existente, deletedAt: agora, updatedAt: agora }
        paraGravar.push(removido)
        mutacoes.push(novaMutacao(TABELA, removido, 'delete', agora))
      }

      if (mutacoes.length > 0) {
        await db.items.bulkPut(paraGravar)
        await db.outbox.bulkAdd(mutacoes)
      }
    }),
  )
}

export async function mesclar(itens: Item[]): Promise<number> {
  const agora = Date.now()
  let gravados = 0
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const existentes = new Map((await db.items.toArray()).map((item) => [item.id, item]))
      const paraGravar: Item[] = []
      const mutacoes: EntradaOutbox[] = []
      for (const importado of itens) {
        const atual = existentes.get(importado.id)
        if (atual !== undefined && importado.updatedAt < atual.updatedAt) continue
        paraGravar.push(importado)
        mutacoes.push(novaMutacao(TABELA, importado, operacaoDe(importado), agora))
      }
      if (mutacoes.length > 0) {
        await db.items.bulkPut(paraGravar)
        await db.outbox.bulkAdd(mutacoes)
      }
      gravados = mutacoes.length
    }),
  )
  return gravados
}

export async function aplicarRemoto(registros: Item[]): Promise<number> {
  if (registros.length === 0) return 0
  let aplicados = 0
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const pendentes = new Set(
        (await db.outbox.toArray()).map((entrada) => `${entrada.tabela}:${entrada.registroId}`),
      )
      const paraGravar: Item[] = []
      for (const registro of registros) {
        if (pendentes.has(`${TABELA}:${registro.id}`)) continue
        const atual = await db.items.get(registro.id)
        if (atual !== undefined && atual.updatedAt > registro.updatedAt) continue
        paraGravar.push(registro)
      }
      if (paraGravar.length > 0) {
        await db.items.bulkPut(paraGravar)
        aplicados = paraGravar.length
      }
    }),
  )
  return aplicados
}

/**
 * Apaga tombstones cuja exclusão já foi confirmada pelo servidor (não há
 * mutação pendente na outbox). Seguro: o registro já não existe na nuvem e
 * o pull não o rebaixa.
 */
export async function removerTombstonesConfirmados(): Promise<number> {
  return executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const pendentes = new Set((await db.outbox.toArray()).map((entrada) => entrada.registroId))
      const tombstones = await db.items.where('deletedAt').above(0).toArray()
      const apagar = tombstones.filter((item) => !pendentes.has(item.id)).map((item) => item.id)
      if (apagar.length > 0) await db.items.bulkDelete(apagar)
      return apagar.length
    }),
  )
}

/**
 * Remove do aparelho itens já sincronizados (sem mutação pendente) mais
 * antigos que `dias`. Não há perda: o registro continua na conta e volta
 * pelo pull quando o cursor for zerado ("Baixar tudo de novo" em Ajustes).
 */
export async function removerSincronizadosAntigos(dias: number): Promise<number> {
  const limite = Date.now() - dias * 86_400_000
  return executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const pendentes = new Set((await db.outbox.toArray()).map((entrada) => entrada.registroId))
      const candidatos = await db.items.where('updatedAt').below(limite).toArray()
      const apagar = candidatos.filter((item) => !pendentes.has(item.id)).map((item) => item.id)
      if (apagar.length > 0) await db.items.bulkDelete(apagar)
      return apagar.length
    }),
  )
}

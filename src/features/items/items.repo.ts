import db from '../../db/database'
import { novaMutacao } from '../../db/outbox.repo'
import type { EntradaOutbox, Item, PeriodoItens } from '../../db/schema'
import {
  obterQuadroKanban,
  QUADRO_KANBAN_PADRAO,
  type ColunaKanban,
  type TipoItem,
} from '@shared/schemas/item'
import { executarComCota } from '../../shared/lib/cota'
import { gerarId } from '../../shared/lib/id'
import { todayStr, weekOf } from '../calendario/datas'

const TABELA = 'items'

export interface OpcoesListagem {
  busca?: string
  periodo?: PeriodoItens
}

/**
 * Item agendado para o dia, a semana (seg–dom) ou o mês de `hoje`.
 * Item sem nenhum dia agendado aparece em todos os períodos.
 */
function pertenceAoPeriodo(item: Item, periodo: PeriodoItens, hoje: string): boolean {
  const dias = item.diasAgendamento
  if (dias === undefined || dias.length === 0) return true
  if (periodo === 'dia') return dias.includes(hoje)
  if (periodo === 'mes') {
    const mes = hoje.slice(0, 7)
    return dias.some((dia) => dia.startsWith(mes))
  }
  const semana = new Set(weekOf(hoje))
  return dias.some((dia) => semana.has(dia))
}

export interface EntradaItem {
  titulo: string
  descricao: string
  /** Variante de conclusão. Ausente = `padrao` (segurar para concluir). */
  tipo?: TipoItem
  /** Dias escolhidos no calendário (YYYY-MM-DD, opcional). Um item pode marcar vários. */
  diasAgendamento?: string[]
  /** HH:mm escolhido no formulário (opcional) — mesmo horário em todos os dias. */
  horaAgendamento?: string
}

export async function listar({ busca = '', periodo }: OpcoesListagem = {}): Promise<Item[]> {
  const termo = busca.trim().toLowerCase()
  const hoje = periodo === undefined ? null : todayStr()
  const itens = await db.items.orderBy('criadoEm').reverse().toArray()
  return itens.filter((item) => {
    if (item.deletedAt !== undefined) return false
    // Cartão de quadro kanban só existe dentro do projeto — nunca nas listas
    // gerais (Itens, Home, agenda).
    if (item.parentId !== undefined) return false
    if (periodo !== undefined && hoje !== null && !pertenceAoPeriodo(item, periodo, hoje)) {
      return false
    }
    if (termo === '') return true
    return `${item.titulo} ${item.descricao}`.toLowerCase().includes(termo)
  })
}

export async function obter(id: string): Promise<Item | undefined> {
  return db.items.get(id)
}

/** Cartões do quadro de um projeto, ordenados por coluna e depois por `ordem`. */
export async function listarCartoes(projetoId: string): Promise<Item[]> {
  const projeto = await db.items.get(projetoId)
  const colunas = obterQuadroKanban(projeto?.quadroKanban).colunas
  const itens = await db.items.where('parentId').equals(projetoId).toArray()
  return itens
    .filter((item) => item.deletedAt === undefined)
    .sort((a, b) => {
      const colunaA = Math.max(0, colunas.findIndex((coluna) => coluna.id === a.coluna))
      const colunaB = Math.max(0, colunas.findIndex((coluna) => coluna.id === b.coluna))
      if (colunaA !== colunaB) return colunaA - colunaB
      return (a.ordem ?? 0) - (b.ordem ?? 0)
    })
}

/** Progresso dos projetos kanban: quantos cartões estão na coluna de conclusão. */
export async function progressoProjetos(
  ids: string[],
): Promise<Map<string, { total: number; feitos: number }>> {
  const mapa = new Map<string, { total: number; feitos: number }>()
  for (const id of ids) {
    const filhos = (await db.items.where('parentId').equals(id).toArray()).filter(
      (item) => item.deletedAt === undefined,
    )
    const projeto = await db.items.get(id)
    const colunaConclusao = obterQuadroKanban(projeto?.quadroKanban).colunaConclusao
    mapa.set(id, {
      total: filhos.length,
      feitos: filhos.filter((item) => item.coluna === colunaConclusao).length,
    })
  }
  return mapa
}

export async function listarParaBackup(): Promise<Item[]> {
  return db.items.orderBy('criadoEm').toArray()
}

/**
 * Próxima `ordem` livre na coluna do quadro de um projeto (cartões ordenados
 * por `ordem` crescente; o novo entra no fim). Chamada dentro da transação.
 */
async function proximaOrdem(coluna: string, projetoId: string): Promise<number> {
  const daColuna = await db.items.where('parentId').equals(projetoId).toArray()
  const ordens = daColuna
    .filter((item) => item.coluna === coluna && item.deletedAt === undefined)
    .map((item) => item.ordem ?? 0)
  return ordens.length === 0 ? 0 : Math.max(...ordens) + 1
}

/**
 * Recalcula a conclusão do projeto: concluído quando tem ao menos um cartão e
 * todos estão na coluna de conclusão. Projeto vazio nunca conclui.
 * Deve rodar dentro de uma transação (chamada por criar/mover/excluir cartão).
 */
async function recalcularConclusaoProjetoTx(projetoId: string, agora: number): Promise<void> {
  const projeto = await db.items.get(projetoId)
  if (projeto === undefined || projeto.deletedAt !== undefined) return
  const filhos = (await db.items.where('parentId').equals(projetoId).toArray()).filter(
    (item) => item.deletedAt === undefined,
  )
  const colunaConclusao = obterQuadroKanban(projeto.quadroKanban).colunaConclusao
  const concluido =
    filhos.length > 0 && filhos.every((item) => item.coluna === colunaConclusao)
  if (projeto.concluido === concluido) return
  const atualizado: Item = { ...projeto, concluido, updatedAt: agora }
  await db.items.put(atualizado)
  await db.outbox.add(novaMutacao(TABELA, atualizado, 'upsert', agora))
}

export async function criar(entrada: EntradaItem): Promise<string> {
  const agora = Date.now()
  const id = gerarId()
  const tipo = entrada.tipo ?? 'padrao'
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      // Projeto kanban não tem coluna/ordem — o quadro é dos cartões filhos.
      const item: Item = {
        id,
        titulo: entrada.titulo.trim(),
        descricao: entrada.descricao.trim(),
        concluido: false,
        tipo,
        criadoEm: agora,
        updatedAt: agora,
      }
      if (tipo === 'kanban') item.quadroKanban = QUADRO_KANBAN_PADRAO
      if (entrada.diasAgendamento && entrada.diasAgendamento.length > 0) {
        item.diasAgendamento = entrada.diasAgendamento
      }
      if (entrada.horaAgendamento) item.horaAgendamento = entrada.horaAgendamento
      await db.items.add(item)
      await db.outbox.add(novaMutacao(TABELA, item, 'upsert', agora))
    }),
  )
  return id
}

/** Cria um cartão no quadro do projeto, na coluna escolhida (fim da coluna). */
export async function criarCartao(
  projetoId: string,
  coluna: ColunaKanban,
  titulo: string,
  descricao = '',
): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const projeto = await db.items.get(projetoId)
      if (projeto === undefined || projeto.deletedAt !== undefined) return
      const quadro = obterQuadroKanban(projeto.quadroKanban)
      if (!quadro.colunas.some((itemColuna) => itemColuna.id === coluna)) {
        throw new Error('A coluna selecionada não existe neste quadro.')
      }
      const item: Item = {
        id: gerarId(),
        parentId: projetoId,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        concluido: coluna === quadro.colunaConclusao,
        coluna,
        ordem: await proximaOrdem(coluna, projetoId),
        criadoEm: agora,
        updatedAt: agora,
      }
      await db.items.add(item)
      await db.outbox.add(novaMutacao(TABELA, item, 'upsert', agora))
      await recalcularConclusaoProjetoTx(projetoId, agora)
    }),
  )
}

/** Edita título/descrição de um cartão (o modal do quadro). */
export async function atualizarCartao(
  id: string,
  titulo: string,
  descricao: string,
): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(id)
      if (atual === undefined || atual.parentId === undefined) return
      const item: Item = { ...atual, titulo: titulo.trim(), descricao: descricao.trim(), updatedAt: agora }
      await db.items.put(item)
      await db.outbox.add(novaMutacao(TABELA, item, 'upsert', agora))
    }),
  )
}

/** Reabre o quadro: cartões concluídos voltam à primeira coluna não concluída. */
export async function reabrirQuadro(projetoId: string): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const projeto = await db.items.get(projetoId)
      if (projeto === undefined || projeto.deletedAt !== undefined) return
      const quadro = obterQuadroKanban(projeto.quadroKanban)
      const destino = quadro.colunas.find(
        (coluna) => coluna.id !== quadro.colunaConclusao,
      )
      if (destino === undefined) throw new Error('O quadro precisa de uma coluna não concluída.')
      const emConclusao = (await db.items.where('parentId').equals(projetoId).toArray())
        .filter(
          (item) => item.deletedAt === undefined && item.coluna === quadro.colunaConclusao,
        )
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      const paraGravar: Item[] = emConclusao.map((item, posicao) => ({
        ...item,
        coluna: destino.id,
        ordem: posicao,
        concluido: false,
        updatedAt: agora,
      }))
      if (paraGravar.length > 0) {
        await db.items.bulkPut(paraGravar)
        for (const item of paraGravar) {
          await db.outbox.add(novaMutacao(TABELA, item, 'upsert', agora))
        }
      }
      await recalcularConclusaoProjetoTx(projetoId, agora)
    }),
  )
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
        tipo: entrada.tipo ?? atual.tipo ?? 'padrao',
        updatedAt: agora,
      }
      // Só um item que já era `cronometro` mantém o acumulado. Qualquer troca
      // de tipo limpa o cronômetro para não exibir tempo órfão em outro mecanismo.
      if (item.tipo !== 'cronometro' || atual.tipo !== 'cronometro') {
        delete item.timerIniciadoEm
        delete item.tempoDecorridoMs
      }
      // Cartão de quadro preserva coluna/ordem (editado só em título/descrição).
      if (atual.parentId === undefined) {
        // Projeto kanban não tem coluna/ordem próprias (o quadro é dos cartões).
        delete item.coluna
        delete item.ordem
        if (item.tipo === 'kanban') {
          item.quadroKanban = atual.quadroKanban ?? QUADRO_KANBAN_PADRAO
        } else {
          delete item.quadroKanban
        }
        // Trocar um projeto pra outro tipo mantém a conclusão automática dele
        // órfã; reabre para o novo mecanismo decidir.
        if (item.tipo !== 'kanban' && atual.tipo === 'kanban') {
          item.concluido = false
        }
      }
      // Campo opcional: presente grava, ausente apaga (limpar no formulário funciona).
      if (entrada.diasAgendamento && entrada.diasAgendamento.length > 0) {
        item.diasAgendamento = entrada.diasAgendamento
      } else {
        delete item.diasAgendamento
      }
      if (entrada.horaAgendamento) item.horaAgendamento = entrada.horaAgendamento
      else delete item.horaAgendamento
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
      // Projeto kanban conclui sozinho pelo quadro — o botão manual não muda nada.
      if (atual.tipo === 'kanban' && atual.parentId === undefined) return
      const atualizado: Item = { ...atual, concluido: !atual.concluido, updatedAt: agora }
      // Concluindo direto (sem passar pelo "Finalizar"), ainda assim encerra a
      // sessão em curso para o tempo não se perder.
      if (atualizado.concluido) encerrarSessao(atualizado, agora)
      // Cartão: a conclusão e a coluna de conclusão andam juntas.
      if (atualizado.parentId !== undefined) {
        const projeto = await db.items.get(atualizado.parentId)
        const quadro = obterQuadroKanban(projeto?.quadroKanban)
        const colunaInicial = quadro.colunas.find(
          (coluna) => coluna.id !== quadro.colunaConclusao,
        )
        if (colunaInicial === undefined) {
          throw new Error('O quadro precisa de uma coluna não concluída.')
        }
        if (atualizado.concluido) {
          atualizado.coluna = quadro.colunaConclusao
          atualizado.ordem = await proximaOrdem(quadro.colunaConclusao, atualizado.parentId)
        } else if (atualizado.coluna === quadro.colunaConclusao) {
          atualizado.coluna = colunaInicial.id
          atualizado.ordem = await proximaOrdem(colunaInicial.id, atualizado.parentId)
        }
        await db.items.put(atualizado)
        await db.outbox.add(novaMutacao(TABELA, atualizado, 'upsert', agora))
        await recalcularConclusaoProjetoTx(atualizado.parentId, agora)
        return
      }
      await db.items.put(atualizado)
      await db.outbox.add(novaMutacao(TABELA, atualizado, 'upsert', agora))
    }),
  )
}

/**
 * Move um cartão do quadro do projeto para `coluna` na posição `indice`
 * (0 = topo). Recalcula a `ordem` da coluna de destino, sincroniza o estado de
 * concluído e reavalia a conclusão do projeto dono.
 */
export async function moverParaColuna(
  id: string,
  coluna: ColunaKanban,
  indice: number,
): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(id)
      if (atual === undefined || atual.parentId === undefined) return
      const projetoId = atual.parentId
      const projeto = await db.items.get(projetoId)
      const quadro = obterQuadroKanban(projeto?.quadroKanban)
      if (!quadro.colunas.some((itemColuna) => itemColuna.id === coluna)) {
        throw new Error('A coluna de destino não existe neste quadro.')
      }

      const doProjeto = (await db.items.where('parentId').equals(projetoId).toArray()).filter(
        (item) => item.deletedAt === undefined,
      )
      const daColuna = doProjeto
        .filter((item) => item.coluna === coluna)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      // Remove o cartão da lista antiga antes de inserir no novo índice.
      const semORespetivo = daColuna.filter((item) => item.id !== id)
      const destino = Math.max(0, Math.min(indice, semORespetivo.length))
      const novaSequencia = [...semORespetivo.slice(0, destino), atual, ...semORespetivo.slice(destino)]

      const paraGravar: Item[] = []
      const idsAlterados = new Set<string>()
      novaSequencia.forEach((item, posicao) => {
        const mudou = item.coluna !== coluna || (item.ordem ?? 0) !== posicao
        const alterado: Item = {
          ...item,
          coluna,
          ordem: posicao,
          concluido: coluna === quadro.colunaConclusao,
        }
        // Só cartão que mudou de fato ganha novo `updatedAt` (e é sincronizado).
        if (mudou) {
          alterado.updatedAt = agora
          idsAlterados.add(item.id)
        }
        paraGravar.push(alterado)
      })

      await db.items.bulkPut(paraGravar)
      for (const item of paraGravar) {
        if (idsAlterados.has(item.id)) {
          await db.outbox.add(novaMutacao(TABELA, item, 'upsert', agora))
        }
      }
      // Mover cartão pode concluir/reabrir o projeto.
      await recalcularConclusaoProjetoTx(projetoId, agora)
    }),
  )
}

async function salvarQuadroProjetoTx(
  projeto: Item,
  quadro: NonNullable<Item['quadroKanban']>,
  cartoes: Item[],
  agora: number,
): Promise<void> {
  const concluido =
    cartoes.length > 0 &&
    cartoes.every((cartao) => cartao.coluna === quadro.colunaConclusao)
  const atualizado: Item = {
    ...projeto,
    quadroKanban: quadro,
    concluido,
    updatedAt: agora,
  }
  await db.items.put(atualizado)
  await db.outbox.add(novaMutacao(TABELA, atualizado, 'upsert', agora))
}

export async function adicionarColunaKanban(projetoId: string, titulo: string): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const projeto = await db.items.get(projetoId)
      if (projeto === undefined || projeto.deletedAt !== undefined || projeto.tipo !== 'kanban') {
        throw new Error('Projeto Kanban não encontrado.')
      }
      const quadro = obterQuadroKanban(projeto.quadroKanban)
      if (quadro.colunas.length >= 12) throw new Error('O quadro aceita no máximo 12 colunas.')
      const novaColuna = { id: gerarId(), titulo: titulo.trim() }
      const novoQuadro = { ...quadro, colunas: [...quadro.colunas, novaColuna] }
      const cartoes = (await db.items.where('parentId').equals(projetoId).toArray()).filter(
        (item) => item.deletedAt === undefined,
      )
      await salvarQuadroProjetoTx(projeto, novoQuadro, cartoes, agora)
    }),
  )
}

export async function marcarColunaConclusao(
  projetoId: string,
  colunaConclusao: ColunaKanban,
): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const projeto = await db.items.get(projetoId)
      if (projeto === undefined || projeto.deletedAt !== undefined || projeto.tipo !== 'kanban') {
        throw new Error('Projeto Kanban não encontrado.')
      }
      const quadro = obterQuadroKanban(projeto.quadroKanban)
      if (!quadro.colunas.some((coluna) => coluna.id === colunaConclusao)) {
        throw new Error('A coluna selecionada não existe neste quadro.')
      }
      if (quadro.colunaConclusao === colunaConclusao) return

      const novoQuadro = { ...quadro, colunaConclusao }
      const cartoes = (await db.items.where('parentId').equals(projetoId).toArray()).filter(
        (item) => item.deletedAt === undefined,
      )
      const atualizados = cartoes.map((cartao) => {
        const concluido = cartao.coluna === colunaConclusao
        if (cartao.concluido === concluido) return cartao
        const atualizado = { ...cartao, concluido, updatedAt: agora }
        return atualizado
      })
      const alterados = atualizados.filter((cartao, indice) => cartao !== cartoes[indice])
      if (alterados.length > 0) {
        await db.items.bulkPut(alterados)
        for (const cartao of alterados) {
          await db.outbox.add(novaMutacao(TABELA, cartao, 'upsert', agora))
        }
      }
      await salvarQuadroProjetoTx(projeto, novoQuadro, atualizados, agora)
    }),
  )
}

export async function removerColunaKanban(
  projetoId: string,
  colunaRemovida: ColunaKanban,
  colunaDestino: ColunaKanban,
): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const projeto = await db.items.get(projetoId)
      if (
        projeto === undefined ||
        projeto.deletedAt !== undefined ||
        projeto.tipo !== 'kanban'
      ) {
        throw new Error('Projeto Kanban não encontrado.')
      }
      const quadro = obterQuadroKanban(projeto.quadroKanban)
      if (quadro.colunas.length <= 2) {
        throw new Error('O quadro precisa manter pelo menos duas colunas.')
      }
      if (
        colunaRemovida === colunaDestino ||
        !quadro.colunas.some((coluna) => coluna.id === colunaRemovida) ||
        !quadro.colunas.some((coluna) => coluna.id === colunaDestino)
      ) {
        throw new Error('Escolha uma coluna de destino válida.')
      }

      const novoQuadro = {
        colunas: quadro.colunas.filter((coluna) => coluna.id !== colunaRemovida),
        colunaConclusao:
          quadro.colunaConclusao === colunaRemovida ? colunaDestino : quadro.colunaConclusao,
      }
      const cartoes = (await db.items.where('parentId').equals(projetoId).toArray()).filter(
        (item) => item.deletedAt === undefined,
      )
      const destinoOrdenado = cartoes
        .filter((cartao) => cartao.coluna === colunaDestino || cartao.coluna === colunaRemovida)
        .sort((a, b) => {
          if (a.coluna !== b.coluna) return a.coluna === colunaDestino ? -1 : 1
          return (a.ordem ?? 0) - (b.ordem ?? 0)
        })
      const ordemDestino = new Map(
        destinoOrdenado.map((cartao, indice) => [cartao.id, indice]),
      )
      const atualizados = cartoes.map((cartao) => {
        const coluna = cartao.coluna === colunaRemovida ? colunaDestino : cartao.coluna
        const ordem = ordemDestino.get(cartao.id) ?? cartao.ordem
        const concluido = coluna === novoQuadro.colunaConclusao
        if (
          coluna === cartao.coluna &&
          ordem === cartao.ordem &&
          concluido === cartao.concluido
        ) {
          return cartao
        }
        return { ...cartao, coluna, ordem, concluido, updatedAt: agora }
      })
      const alterados = atualizados.filter((cartao, indice) => cartao !== cartoes[indice])
      if (alterados.length > 0) {
        await db.items.bulkPut(alterados)
        for (const cartao of alterados) {
          await db.outbox.add(novaMutacao(TABELA, cartao, 'upsert', agora))
        }
      }
      await salvarQuadroProjetoTx(projeto, novoQuadro, atualizados, agora)
    }),
  )
}

/** Soma a sessão em curso em `tempoDecorridoMs` e limpa `timerIniciadoEm`. */
function encerrarSessao(item: Item, agora: number): void {
  if (item.timerIniciadoEm === undefined) return
  const sessao = Math.max(0, agora - item.timerIniciadoEm)
  item.tempoDecorridoMs = (item.tempoDecorridoMs ?? 0) + sessao
  delete item.timerIniciadoEm
}

/** Começa a cronometrar: só funciona em item pendente com o cronômetro parado. */
export async function iniciarTimer(id: string): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(id)
      if (atual === undefined || atual.concluido || atual.timerIniciadoEm !== undefined) return
      const atualizado: Item = { ...atual, timerIniciadoEm: agora, updatedAt: agora }
      await db.items.put(atualizado)
      await db.outbox.add(novaMutacao(TABELA, atualizado, 'upsert', agora))
    }),
  )
}

/** Para a sessão em curso somando o tempo, sem concluir o item. */
export async function pausarTimer(id: string): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(id)
      if (atual === undefined || atual.timerIniciadoEm === undefined) return
      const atualizado: Item = { ...atual, updatedAt: agora }
      encerrarSessao(atualizado, agora)
      await db.items.put(atualizado)
      await db.outbox.add(novaMutacao(TABELA, atualizado, 'upsert', agora))
    }),
  )
}

/** Encerra a sessão em curso somando o tempo e conclui o item. */
export async function finalizarTimer(id: string): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(id)
      if (atual === undefined) return
      const atualizado: Item = { ...atual, concluido: true, updatedAt: agora }
      encerrarSessao(atualizado, agora)
      await db.items.put(atualizado)
      await db.outbox.add(novaMutacao(TABELA, atualizado, 'upsert', agora))
    }),
  )
}

/** Zera o cronômetro: encerra a sessão em curso (se houver) e zera o acumulado. */
export async function resetarTimer(id: string): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.items, db.outbox, async () => {
      const atual = await db.items.get(id)
      if (atual === undefined || atual.concluido) return
      const atualizado: Item = { ...atual, updatedAt: agora }
      delete atualizado.timerIniciadoEm
      delete atualizado.tempoDecorridoMs
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
      const paraExcluir: Item[] = [{ ...atual, deletedAt: agora, updatedAt: agora }]
      // Excluir um projeto kanban leva os cartões do quadro junto.
      if (atual.tipo === 'kanban' && atual.parentId === undefined) {
        const filhos = await db.items.where('parentId').equals(id).toArray()
        for (const filho of filhos) {
          if (filho.deletedAt === undefined) {
            paraExcluir.push({ ...filho, deletedAt: agora, updatedAt: agora })
          }
        }
      }
      await db.items.bulkPut(paraExcluir)
      for (const item of paraExcluir) {
        await db.outbox.add(novaMutacao(TABELA, item, 'delete', agora))
      }
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

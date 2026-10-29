import appConfig from '../../app/app.config.json'
import { CHAVES, limparExceto, definir as definirConfig } from '../../db/config.repo'
import * as syncState from '../../db/sync-state.repo'
import { SCHEMA_VERSION, type Item } from '../../db/schema'
import {
  TIPOS_ITEM,
  colunaKanbanSchema,
  quadroKanbanSchema,
  type TipoItem,
} from '@shared/schemas/item'
import * as itemsRepo from '../../features/items/items.repo'

export interface ArquivoBackup {
  app: string
  schemaVersion: number
  exportadoEm: string
  dados: {
    itens: Item[]
  }
}

export type ModoImportacao = 'substituir' | 'mesclar'

export type ResultadoValidacao = { ok: true; backup: ArquivoBackup } | { ok: false; erro: string }

export type ResultadoImportacao = { ok: true; total: number } | { ok: false; erro: string }

function validarItem(bruto: unknown, indice: number): Item | { erro: string } {
  if (typeof bruto !== 'object' || bruto === null) {
    return { erro: `Item ${indice + 1} inválido.` }
  }
  const item = bruto as Partial<Item>
  if (typeof item.id !== 'string' || item.id === '') {
    return { erro: `Item ${indice + 1} sem id.` }
  }
  if (typeof item.titulo !== 'string') {
    return { erro: `Item ${indice + 1} sem título.` }
  }
  if (typeof item.criadoEm !== 'number' || typeof item.updatedAt !== 'number') {
    return { erro: `Item ${indice + 1} com datas inválidas.` }
  }
  if (typeof item.concluido !== 'boolean') {
    return { erro: `Item ${indice + 1} com campo "concluido" inválido.` }
  }
  const normalizado: Item = {
    id: item.id,
    titulo: item.titulo,
    descricao: typeof item.descricao === 'string' ? item.descricao : '',
    concluido: item.concluido,
    criadoEm: item.criadoEm,
    updatedAt: item.updatedAt,
  }
  normalizado.tipo = (TIPOS_ITEM as readonly string[]).includes(item.tipo as string)
    ? (item.tipo as TipoItem)
    : 'padrao'
  if (typeof item.deletedAt === 'number') normalizado.deletedAt = item.deletedAt
  // Dias: formato novo é array; backups antigos tinham um único "dataAgendamento".
  const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
  if (Array.isArray(item.diasAgendamento)) {
    const dias = item.diasAgendamento.filter(
      (dia): dia is string => typeof dia === 'string' && DATA_RE.test(dia),
    )
    if (dias.length > 0) normalizado.diasAgendamento = dias
  } else {
    const legado = (item as { dataAgendamento?: unknown }).dataAgendamento
    if (typeof legado === 'string' && DATA_RE.test(legado)) {
      normalizado.diasAgendamento = [legado]
    }
  }
  if (typeof item.horaAgendamento === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.horaAgendamento)) {
    normalizado.horaAgendamento = item.horaAgendamento
  }
  if (typeof item.timerIniciadoEm === 'number' && Number.isInteger(item.timerIniciadoEm) && item.timerIniciadoEm >= 0) {
    normalizado.timerIniciadoEm = item.timerIniciadoEm
  }
  if (typeof item.tempoDecorridoMs === 'number' && Number.isInteger(item.tempoDecorridoMs) && item.tempoDecorridoMs >= 0) {
    normalizado.tempoDecorridoMs = item.tempoDecorridoMs
  }
  // Cartão kanban: projeto dono. Sem ele o item volta pra lista geral.
  if (typeof item.parentId === 'string' && item.parentId !== '') {
    normalizado.parentId = item.parentId
  }
  const coluna = colunaKanbanSchema.safeParse(item.coluna)
  if (coluna.success) {
    normalizado.coluna = coluna.data
    if (typeof item.ordem === 'number' && Number.isFinite(item.ordem)) {
      normalizado.ordem = item.ordem
    }
  }
  const quadroKanban = quadroKanbanSchema.safeParse(item.quadroKanban)
  if (quadroKanban.success) normalizado.quadroKanban = quadroKanban.data
  return normalizado
}

export function criarBackup(itens: Item[]): ArquivoBackup {
  return {
    app: appConfig.id,
    schemaVersion: SCHEMA_VERSION,
    exportadoEm: new Date().toISOString(),
    dados: { itens },
  }
}

export function serializar(backup: ArquivoBackup): string {
  return JSON.stringify(backup, null, 2)
}

export function validarArquivo(bruto: unknown): ResultadoValidacao {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    return { ok: false, erro: 'O arquivo não contém um backup válido.' }
  }
  const objeto = bruto as Partial<ArquivoBackup>
  if (typeof objeto.app !== 'string' || objeto.app === '') {
    return { ok: false, erro: 'O arquivo não identifica o app de origem.' }
  }
  if (objeto.app !== appConfig.id) {
    return { ok: false, erro: `Backup de outro app ("${objeto.app}").` }
  }
  if (typeof objeto.schemaVersion !== 'number' || !Number.isInteger(objeto.schemaVersion)) {
    return { ok: false, erro: 'Versão do schema ausente ou inválida.' }
  }
  if (objeto.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      erro: `Este backup usa uma versão mais nova do schema (${objeto.schemaVersion}). Atualize o app.`,
    }
  }
  if (typeof objeto.exportadoEm !== 'string' || Number.isNaN(Date.parse(objeto.exportadoEm))) {
    return { ok: false, erro: 'Data de exportação inválida.' }
  }
  const dados = objeto.dados as Partial<ArquivoBackup['dados']> | undefined
  if (typeof dados !== 'object' || dados === null || !Array.isArray(dados.itens)) {
    return { ok: false, erro: 'O backup não contém a lista de itens.' }
  }
  const itens: Item[] = []
  for (let i = 0; i < dados.itens.length; i += 1) {
    const validado = validarItem(dados.itens[i], i)
    if ('erro' in validado) return { ok: false, erro: validado.erro }
    itens.push(validado)
  }
  return {
    ok: true,
    backup: {
      app: objeto.app,
      schemaVersion: objeto.schemaVersion,
      exportadoEm: objeto.exportadoEm,
      dados: { itens },
    },
  }
}

function nomeArquivo(exportadoEm: string): string {
  const data = exportadoEm.slice(0, 10)
  return `${appConfig.id}-backup-${data}.json`
}

function baixarArquivo(nome: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportar(): Promise<number> {
  const itens = await itemsRepo.listarParaBackup()
  const backup = criarBackup(itens)
  baixarArquivo(nomeArquivo(backup.exportadoEm), serializar(backup))
  await definirConfig(CHAVES.ultimoBackupEm, Date.now())
  return itens.length
}

export async function importar(file: File, modo: ModoImportacao): Promise<ResultadoImportacao> {
  let texto: string
  try {
    texto = await file.text()
  } catch {
    return { ok: false, erro: 'Não foi possível ler o arquivo.' }
  }
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    return { ok: false, erro: 'O arquivo não é um JSON válido.' }
  }
  const validacao = validarArquivo(bruto)
  if (!validacao.ok) return validacao
  const itens = validacao.backup.dados.itens
  if (modo === 'substituir') {
    await itemsRepo.substituirTodos(itens)
  } else {
    await itemsRepo.mesclar(itens)
  }
  return { ok: true, total: itens.length }
}

export async function lerInfoBackup(file: File): Promise<ResultadoValidacao> {
  let texto: string
  try {
    texto = await file.text()
  } catch {
    return { ok: false, erro: 'Não foi possível ler o arquivo.' }
  }
  try {
    return validarArquivo(JSON.parse(texto))
  } catch {
    return { ok: false, erro: 'O arquivo não é um JSON válido.' }
  }
}

export async function apagarTudo(): Promise<void> {
  await itemsRepo.limparTodos()
  // Sem o cursor zerado o pull não baixaria nada e a lista ficaria vazia.
  await syncState.definirCursor('0')
  // Mantém a conta dona dos dados locais: sem ela, uma importação posterior
  // seria aceita como "primeiro acesso" e enviada para qualquer conta.
  await limparExceto([CHAVES.ultimoUsuarioId])
}

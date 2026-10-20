import type { Item } from '@shared/schemas/item'
import type { Mutacao, OperacaoOutbox } from '@shared/schemas/outbox'
import type { SessaoLocal } from '@shared/schemas/usuario'

export type { Item, OperacaoOutbox, SessaoLocal }

export type ValorConfig = string | number | boolean | null

export interface EntradaConfig {
  chave: string
  valor: ValorConfig
}

export type EntradaOutbox = Mutacao & {
  criadoEm: number
  tentativas: number
}

export interface EstadoSync {
  chave: string
  cursor: string
  ultimaSincronizacao: number | null
  sessao: SessaoLocal | null
}

export type Tema = 'claro' | 'escuro' | 'sistema'

export type PeriodoItens = 'dia' | 'semana' | 'mes'

export const SCHEMA_VERSION = 3

export const CHAVE_SYNC_GLOBAL = 'global'

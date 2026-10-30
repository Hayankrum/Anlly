import { z } from 'zod'
import { itemSchema } from './item'
import { mutacaoSchema } from './outbox'
import { modeloSchema } from './modelo'

export const TABELA_ITEMS = 'items'
export const TABELA_MODELOS = 'modelos'

export const syncRegistroSchema = z.discriminatedUnion('tabela', [
  z.object({ tabela: z.literal(TABELA_ITEMS), registro: itemSchema }),
  z.object({ tabela: z.literal(TABELA_MODELOS), registro: modeloSchema }),
])
export type SyncRegistro = z.infer<typeof syncRegistroSchema>

export const LIMITE_MUTACOES = 500
export const LIMITE_PULL = 500
export const PADRAO_PULL = 100

export const pushRequestSchema = z.object({
  mutacoes: z.array(mutacaoSchema).min(1).max(LIMITE_MUTACOES),
})

export type PushRequest = z.infer<typeof pushRequestSchema>

export const statusMutacaoSchema = z.enum(['aplicada', 'ignorada', 'invalida'])

export type StatusMutacao = z.infer<typeof statusMutacaoSchema>

export const resultadoMutacaoSchema = z.object({
  mutacaoId: z.string().min(1),
  status: statusMutacaoSchema,
  serverVersion: z.number().int().positive().optional(),
  registro: syncRegistroSchema.optional(),
})

export type ResultadoMutacao = z.infer<typeof resultadoMutacaoSchema>

export const pushResponseSchema = z.object({
  resultados: z.array(resultadoMutacaoSchema),
  proximoCursor: z.string(),
})

export type PushResponse = z.infer<typeof pushResponseSchema>

export const pullQuerySchema = z.object({
  cursor: z.string().regex(/^\d+$/).default('0'),
  limit: z.coerce.number().int().min(1).max(LIMITE_PULL).default(PADRAO_PULL),
})

export type PullQuery = z.infer<typeof pullQuerySchema>

export const pullResponseSchema = z.object({
  registros: z.array(syncRegistroSchema),
  proximoCursor: z.string(),
  temMais: z.boolean(),
})

export type PullResponse = z.infer<typeof pullResponseSchema>

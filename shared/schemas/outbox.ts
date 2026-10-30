import { z } from 'zod'
import { itemSchema } from './item'
import { modeloSchema } from './modelo'

export const operacaoOutboxSchema = z.enum(['upsert', 'delete'])

export type OperacaoOutbox = z.infer<typeof operacaoOutboxSchema>

const mutacaoBase = {
  id: z.string().min(1),
  registroId: z.string().min(1),
  operacao: operacaoOutboxSchema,
}

export const mutacaoSchema = z.discriminatedUnion('tabela', [
  z.object({ ...mutacaoBase, tabela: z.literal('items'), payload: itemSchema }),
  z.object({ ...mutacaoBase, tabela: z.literal('modelos'), payload: modeloSchema }),
])

export type Mutacao = z.infer<typeof mutacaoSchema>

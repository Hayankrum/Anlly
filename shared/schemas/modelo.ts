import { z } from 'zod'
import {
  quadroKanbanSchema,
  repeticaoSchema,
  subitemSchema,
  tipoItemSchema,
} from './item'

export const agendaModeloSchema = z.discriminatedUnion('modo', [
  z.object({ modo: z.literal('hoje') }),
  z.object({ modo: z.literal('dias') }),
  z.object({ modo: z.literal('repetir'), regra: repeticaoSchema }),
])

export const modeloSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().trim().min(1).max(120),
  descricao: z.string().max(2000).optional(),
  tipo: tipoItemSchema,
  subitens: z.array(subitemSchema).max(100).optional(),
  modoTempo: z.enum(['livre', 'focoPausa']).optional(),
  minutosFoco: z.number().int().min(1).max(180).optional(),
  minutosPausa: z.number().int().min(1).max(60).optional(),
  quadroKanban: quadroKanbanSchema.optional(),
  agenda: agendaModeloSchema,
  horaAgendamento: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
  serverVersion: z.number().int().positive().optional(),
})

export type Modelo = z.infer<typeof modeloSchema>
export type AgendaModelo = z.infer<typeof agendaModeloSchema>
export type EntradaModelo = Omit<Modelo, 'id' | 'updatedAt' | 'serverVersion' | 'deletedAt'> & {
  id?: string
}

export function entradaModelo(modelo: Modelo) {
  return {
    titulo: modelo.titulo,
    descricao: modelo.descricao ?? '',
    tipo: modelo.tipo,
    ...(modelo.subitens === undefined ? {} : { subitens: modelo.subitens }),
    ...(modelo.modoTempo === undefined ? {} : { modoTempo: modelo.modoTempo }),
    ...(modelo.minutosFoco === undefined ? {} : { minutosFoco: modelo.minutosFoco }),
    ...(modelo.minutosPausa === undefined ? {} : { minutosPausa: modelo.minutosPausa }),
    ...(modelo.quadroKanban === undefined ? {} : { quadroKanban: modelo.quadroKanban }),
    ...(modelo.horaAgendamento === undefined
      ? {}
      : { horaAgendamento: modelo.horaAgendamento }),
  }
}

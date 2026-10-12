import { z } from 'zod'

/** YYYY-MM-DD — dias escolhidos no calendário do formulário. */
const DATA_AGENDAMENTO_RE = /^\d{4}-\d{2}-\d{2}$/
/** HH:mm — horário escolhido no formulário (vale para todos os dias). */
const HORA_AGENDAMENTO_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Limite prático: um ano cheio de dias agendados num único item. */
export const LIMITE_DIAS_AGENDAMENTO = 400

export const itemSchema = z.object({
  id: z.string().min(1),
  titulo: z.string(),
  descricao: z.string(),
  concluido: z.boolean(),
  /** Opcional: dias do agendamento (YYYY-MM-DD, sem fuso). Um item pode marcar vários. */
  diasAgendamento: z
    .array(z.string().regex(DATA_AGENDAMENTO_RE))
    .max(LIMITE_DIAS_AGENDAMENTO)
    .optional(),
  /** Opcional: horário do agendamento (HH:mm, 24h) — mesmo horário em todos os dias. */
  horaAgendamento: z.string().regex(HORA_AGENDAMENTO_RE).optional(),
  criadoEm: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
  serverVersion: z.number().int().positive().optional(),
})

export type Item = z.infer<typeof itemSchema>

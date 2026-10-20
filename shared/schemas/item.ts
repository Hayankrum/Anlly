import { z } from 'zod'

/** YYYY-MM-DD — dias escolhidos no calendário do formulário. */
const DATA_AGENDAMENTO_RE = /^\d{4}-\d{2}-\d{2}$/
/** HH:mm — horário escolhido no formulário (vale para todos os dias). */
const HORA_AGENDAMENTO_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Limite prático: um ano cheio de dias agendados num único item. */
export const LIMITE_DIAS_AGENDAMENTO = 400

/**
 * Tipo de conclusão do item:
 * - `padrao` (default): gesto "segure para concluir" — o mecanismo original.
 * - `cronometro`: cronômetro — Iniciar/Pausar/Finalizar, acumulando o tempo.
 * - `kanban`: projeto com quadro embutido no detalhe — conclui quando todos os
 *   seus cartões (itens com `parentId` deste item) estão na coluna "Feito".
 */
export const TIPOS_ITEM = ['padrao', 'cronometro', 'kanban'] as const
export const tipoItemSchema = z.enum(TIPOS_ITEM)
export type TipoItem = z.infer<typeof tipoItemSchema>

/** Colunas fixas do quadro Kanban, na ordem em que aparecem. */
export const COLUNAS_KANBAN = ['afazer', 'fazendo', 'feito'] as const
export const colunaKanbanSchema = z.enum(COLUNAS_KANBAN)
export type ColunaKanban = z.infer<typeof colunaKanbanSchema>

export const ROTULOS_COLUNA: Record<ColunaKanban, string> = {
  afazer: 'A Fazer',
  fazendo: 'Fazendo',
  feito: 'Feito',
}

export const itemSchema = z.object({
  id: z.string().min(1),
  titulo: z.string(),
  descricao: z.string(),
  concluido: z.boolean(),
  /** Variante de conclusão. Ausente em itens antigos = `padrao`. */
  tipo: tipoItemSchema.optional(),
  /**
   * Item é cartão de um projeto Kanban quando presente: id do projeto dono.
   * Cartões só existem dentro do quadro do projeto — nunca em listas gerais.
   */
  parentId: z.string().min(1).optional(),
  /** Kanban (cartão): coluna atual do quadro. Ausente = `afazer`. */
  coluna: colunaKanbanSchema.optional(),
  /** Kanban (cartão): posição dentro da coluna (menor = mais ao topo). */
  ordem: z.number().int().nonnegative().optional(),
  /** Opcional: dias do agendamento (YYYY-MM-DD, sem fuso). Um item pode marcar vários. */
  diasAgendamento: z
    .array(z.string().regex(DATA_AGENDAMENTO_RE))
    .max(LIMITE_DIAS_AGENDAMENTO)
    .optional(),
  /** Opcional: horário do agendamento (HH:mm, 24h) — mesmo horário em todos os dias. */
  horaAgendamento: z.string().regex(HORA_AGENDAMENTO_RE).optional(),
  /**
   * Cronômetro: epoch ms em que a última sessão foi iniciada. Presente = rodando.
   * Guardado no item (não em estado local) para sobreviver a reload/offline.
   */
  timerIniciadoEm: z.number().int().nonnegative().optional(),
  /** Cronômetro: soma das sessões já encerradas (pausadas ou concluídas), em ms. */
  tempoDecorridoMs: z.number().int().nonnegative().optional(),
  criadoEm: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
  serverVersion: z.number().int().positive().optional(),
})

export type Item = z.infer<typeof itemSchema>

/** Item é cartão do quadro de um projeto Kanban (tem projeto dono). */
export function ehCartao(item: Pick<Item, 'parentId'>): boolean {
  return item.parentId !== undefined
}

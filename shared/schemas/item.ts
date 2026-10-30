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
 *   seus cartões (itens com `parentId` deste item) estão na coluna de conclusão.
 */
export const TIPOS_ITEM = ['padrao', 'lista', 'cronometro', 'kanban'] as const
export const tipoItemSchema = z.enum(TIPOS_ITEM)
export type TipoItem = z.infer<typeof tipoItemSchema>

export const subitemSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().trim().min(1).max(120),
  concluido: z.boolean(),
})
export type Subitem = z.infer<typeof subitemSchema>

export const modoTempoSchema = z.enum(['livre', 'focoPausa'])
export type ModoTempo = z.infer<typeof modoTempoSchema>

export const faseTempoSchema = z.enum(['foco', 'pausa'])
export type FaseTempo = z.infer<typeof faseTempoSchema>

const DATA_REPETICAO_RE = /^\d{4}-\d{2}-\d{2}$/

export const repeticaoSchema = z
  .object({
    frequencia: z.enum(['diario', 'semanal', 'cadaN', 'mensal']),
    diasSemana: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    intervaloDias: z.number().int().min(1).max(365).optional(),
    diaMes: z.number().int().min(1).max(31).optional(),
    terminaEm: z.string().regex(DATA_REPETICAO_RE).optional(),
  })
  .superRefine((regra, contexto) => {
    if (regra.frequencia === 'semanal' && (regra.diasSemana?.length ?? 0) === 0) {
      contexto.addIssue({
        code: 'custom',
        path: ['diasSemana'],
        message: 'Escolha pelo menos um dia da semana.',
      })
    }
    if (regra.frequencia === 'cadaN' && regra.intervaloDias === undefined) {
      contexto.addIssue({
        code: 'custom',
        path: ['intervaloDias'],
        message: 'Informe o intervalo em dias.',
      })
    }
    if (regra.frequencia === 'mensal' && regra.diaMes === undefined) {
      contexto.addIssue({
        code: 'custom',
        path: ['diaMes'],
        message: 'Informe o dia do mês.',
      })
    }
  })
export type RegraRepeticao = z.infer<typeof repeticaoSchema>

/** Colunas iniciais do quadro novo e fallback para quadros antigos. */
export const COLUNAS_KANBAN = ['afazer', 'fazendo', 'feito'] as const
export const colunaKanbanSchema = z.string().min(1).max(80)
export type ColunaKanban = z.infer<typeof colunaKanbanSchema>

export const ROTULOS_COLUNA: Record<ColunaKanban, string> = {
  afazer: 'A Fazer',
  fazendo: 'Fazendo',
  feito: 'Feito',
}

export const colunaQuadroSchema = z.object({
  id: colunaKanbanSchema,
  titulo: z.string().trim().min(1).max(40),
})
export type ColunaKanbanDetalhe = z.infer<typeof colunaQuadroSchema>

export const quadroKanbanSchema = z
  .object({
    colunas: z.array(colunaQuadroSchema).min(2).max(12),
    colunaConclusao: colunaKanbanSchema,
  })
  .superRefine((quadro, contexto) => {
    const ids = quadro.colunas.map((coluna) => coluna.id)
    if (new Set(ids).size !== ids.length) {
      contexto.addIssue({
        code: 'custom',
        path: ['colunas'],
        message: 'Os identificadores das colunas devem ser únicos.',
      })
    }
    if (!ids.includes(quadro.colunaConclusao)) {
      contexto.addIssue({
        code: 'custom',
        path: ['colunaConclusao'],
        message: 'A coluna de conclusão deve existir no quadro.',
      })
    }
  })

export type QuadroKanban = z.infer<typeof quadroKanbanSchema>

export const QUADRO_KANBAN_PADRAO: QuadroKanban = {
  colunas: [
    { id: 'afazer', titulo: 'A Fazer' },
    { id: 'fazendo', titulo: 'Fazendo' },
    { id: 'feito', titulo: 'Feito' },
  ],
  colunaConclusao: 'feito',
}

export function obterQuadroKanban(quadro?: QuadroKanban): QuadroKanban {
  return quadro ?? QUADRO_KANBAN_PADRAO
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
  /** Kanban (projeto): colunas ordenadas e a coluna que conclui os cartões. */
  quadroKanban: quadroKanbanSchema.optional(),
  /** Lista: subitens e seu estado ficam no mesmo registro do item. */
  subitens: z.array(subitemSchema).max(100).optional(),
  /** Cronômetro: modalidade e duração de cada fase do ciclo. */
  modoTempo: modoTempoSchema.optional(),
  minutosFoco: z.number().int().min(1).max(180).optional(),
  minutosPausa: z.number().int().min(1).max(60).optional(),
  faseTempo: faseTempoSchema.optional(),
  ciclosConcluidos: z.number().int().nonnegative().optional(),
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

import { describe, it, expect } from 'vitest'
import { itemSchema, LIMITE_DIAS_AGENDAMENTO, COLUNAS_KANBAN } from './item'

function itemBase(overrides: Record<string, unknown> = {}) {
  return {
    id: 'abc123',
    titulo: 'Comprar pão',
    descricao: '',
    concluido: false,
    criadoEm: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('itemSchema', () => {
  it('aceita um item válido mínimo', () => {
    expect(itemSchema.safeParse(itemBase()).success).toBe(true)
  })

  it('aceita item com diasAgendamento e horaAgendamento', () => {
    const resultado = itemSchema.safeParse(
      itemBase({ diasAgendamento: ['2026-10-19', '2026-10-20'], horaAgendamento: '08:30' }),
    )
    expect(resultado.success).toBe(true)
  })

  it('rejeita id vazio', () => {
    expect(itemSchema.safeParse(itemBase({ id: '' })).success).toBe(false)
  })

  it('rejeita data fora do formato YYYY-MM-DD', () => {
    const resultado = itemSchema.safeParse(itemBase({ diasAgendamento: ['19/10/2026'] }))
    expect(resultado.success).toBe(false)
  })

  it('rejeita hora fora do formato HH:mm', () => {
    expect(itemSchema.safeParse(itemBase({ horaAgendamento: '8h30' })).success).toBe(false)
    expect(itemSchema.safeParse(itemBase({ horaAgendamento: '25:00' })).success).toBe(false)
  })

  it('aceita hora 00:00 e 23:59', () => {
    expect(itemSchema.safeParse(itemBase({ horaAgendamento: '00:00' })).success).toBe(true)
    expect(itemSchema.safeParse(itemBase({ horaAgendamento: '23:59' })).success).toBe(true)
  })

  it(`rejeita mais de ${LIMITE_DIAS_AGENDAMENTO} dias`, () => {
    const dias = Array.from({ length: LIMITE_DIAS_AGENDAMENTO + 1 }, (_, i) => {
      const d = new Date(2026, 0, 1)
      d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
    expect(itemSchema.safeParse(itemBase({ diasAgendamento: dias })).success).toBe(false)
  })

  it('aceita item com deletedAt (tombstone)', () => {
    expect(itemSchema.safeParse(itemBase({ deletedAt: Date.now() })).success).toBe(true)
  })

  it('aceita item com serverVersion', () => {
    expect(itemSchema.safeParse(itemBase({ serverVersion: 42 })).success).toBe(true)
  })

  it('rejeita serverVersion não inteiro', () => {
    expect(itemSchema.safeParse(itemBase({ serverVersion: 1.5 })).success).toBe(false)
  })

  it('aceita item com campos do cronômetro', () => {
    const resultado = itemSchema.safeParse(
      itemBase({ timerIniciadoEm: 1_700_000_000_000, tempoDecorridoMs: 90_000 }),
    )
    expect(resultado.success).toBe(true)
  })

  it('aceita cronômetro parado (só tempoDecorridoMs)', () => {
    expect(itemSchema.safeParse(itemBase({ tempoDecorridoMs: 5_000 })).success).toBe(true)
  })

  it('rejeita timerIniciadoEm negativo', () => {
    expect(itemSchema.safeParse(itemBase({ timerIniciadoEm: -1 })).success).toBe(false)
  })

  it('rejeita tempoDecorridoMs não inteiro', () => {
    expect(itemSchema.safeParse(itemBase({ tempoDecorridoMs: 1.5 })).success).toBe(false)
  })

  it('aceita tipo padrao, cronometro e kanban', () => {
    expect(itemSchema.safeParse(itemBase({ tipo: 'padrao' })).success).toBe(true)
    expect(itemSchema.safeParse(itemBase({ tipo: 'cronometro' })).success).toBe(true)
    expect(itemSchema.safeParse(itemBase({ tipo: 'kanban' })).success).toBe(true)
  })

  it('aceita item sem tipo (antigo = padrao)', () => {
    expect(itemSchema.safeParse(itemBase()).success).toBe(true)
  })

  it('rejeita tipo desconhecido', () => {
    expect(itemSchema.safeParse(itemBase({ tipo: 'quadro' })).success).toBe(false)
  })

  it('aceita as colunas do quadro (afazer, fazendo, feito)', () => {
    for (const coluna of COLUNAS_KANBAN) {
      expect(itemSchema.safeParse(itemBase({ tipo: 'kanban', coluna })).success).toBe(true)
    }
  })

  it('aceita coluna personalizada', () => {
    expect(
      itemSchema.safeParse(itemBase({ tipo: 'kanban', coluna: 'concluido' })).success,
    ).toBe(true)
  })

  it('aceita configuração de quadro com coluna de conclusão existente', () => {
    expect(
      itemSchema.safeParse(
        itemBase({
          tipo: 'kanban',
          quadroKanban: {
            colunas: [
              { id: 'todo', titulo: 'A fazer' },
              { id: 'review', titulo: 'Em revisão' },
            ],
            colunaConclusao: 'review',
          },
        }),
      ).success,
    ).toBe(true)
  })

  it('rejeita configuração de quadro sem coluna de conclusão válida', () => {
    expect(
      itemSchema.safeParse(
        itemBase({
          tipo: 'kanban',
          quadroKanban: {
            colunas: [{ id: 'todo', titulo: 'A fazer' }],
            colunaConclusao: 'feito',
          },
        }),
      ).success,
    ).toBe(false)
  })

  it('rejeita identificadores repetidos no quadro', () => {
    expect(
      itemSchema.safeParse(
        itemBase({
          tipo: 'kanban',
          quadroKanban: {
            colunas: [
              { id: 'todo', titulo: 'A fazer' },
              { id: 'todo', titulo: 'Em revisão' },
            ],
            colunaConclusao: 'todo',
          },
        }),
      ).success,
    ).toBe(false)
  })

  it('rejeita ordem não inteira ou negativa', () => {
    expect(itemSchema.safeParse(itemBase({ tipo: 'kanban', ordem: 1.5 })).success).toBe(false)
    expect(itemSchema.safeParse(itemBase({ tipo: 'kanban', ordem: -1 })).success).toBe(false)
  })

  it('aceita parentId (cartão de projeto kanban)', () => {
    const resultado = itemSchema.safeParse(itemBase({ parentId: 'projeto1', coluna: 'afazer' }))
    expect(resultado.success).toBe(true)
  })

  it('rejeita parentId vazio', () => {
    expect(itemSchema.safeParse(itemBase({ parentId: '' })).success).toBe(false)
  })
})

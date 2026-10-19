import { describe, it, expect } from 'vitest'
import { itemSchema, LIMITE_DIAS_AGENDAMENTO } from './item'

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
})

import { describe, expect, it } from 'vitest'
import type { Item } from '../../db/schema'
import { buildItemDia } from './itens-dia'

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    titulo: 'Estudar',
    descricao: '',
    concluido: false,
    criadoEm: new Date(2026, 9, 30, 18, 36).getTime(),
    updatedAt: 1,
    diasAgendamento: ['2026-10-30'],
    ...overrides,
  }
}

describe('buildItemDia', () => {
  it('usa o horário configurado quando existe', () => {
    expect(buildItemDia([item({ horaAgendamento: '09:15' })])[0].hora).toBe('09:15')
  })

  it('usa o horário local de criação como padrão quando não há horário', () => {
    expect(buildItemDia([item()])[0].hora).toBe('18:36')
  })

  it('também posiciona itens legados sem horário no mapa de horas', () => {
    const [linha] = buildItemDia([item({ horaAgendamento: undefined })])
    expect(linha.hora).toMatch(/^\d{2}:\d{2}$/)
  })
})

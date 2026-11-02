import { describe, expect, it } from 'vitest'
import { itemSchema } from '@shared/schemas/item'
import { diasConsecutivos, progressoDaSemana } from './progresso'

function item(diasConclusao: string[]) {
  return itemSchema.parse({
    id: 'item',
    titulo: 'Tarefa',
    descricao: '',
    concluido: false,
    criadoEm: 0,
    updatedAt: 0,
    diasConclusao,
  })
}

describe('progresso do dashboard', () => {
  it('conta a ofensiva desde hoje, ou desde ontem se hoje ainda não houve conclusão', () => {
    expect(diasConsecutivos([item(['2026-10-31', '2026-11-01', '2026-11-02'])], '2026-11-02')).toBe(3)
    expect(diasConsecutivos([item(['2026-10-31', '2026-11-01'])], '2026-11-02')).toBe(2)
    expect(diasConsecutivos([item(['2026-10-30'])], '2026-11-02')).toBe(0)
  })

  it('monta a semana de segunda a domingo com as conclusões por dia', () => {
    const semana = progressoDaSemana(
      [item(['2026-11-02', '2026-11-03', '2026-11-03'])],
      '2026-11-04',
    )

    expect(semana.map(({ data, concluidos }) => [data, concluidos])).toEqual([
      ['2026-11-02', 1],
      ['2026-11-03', 1],
      ['2026-11-04', 0],
      ['2026-11-05', 0],
      ['2026-11-06', 0],
      ['2026-11-07', 0],
      ['2026-11-08', 0],
    ])
    expect(semana[2].hoje).toBe(true)
  })
})

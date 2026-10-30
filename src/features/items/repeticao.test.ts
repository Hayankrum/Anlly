import { describe, expect, it } from 'vitest'
import { calcularProximasOcorrencias } from './repeticao'

describe('calcularProximasOcorrencias', () => {
  it('limita dia 31 ao último dia nos meses curtos', () => {
    expect(
      calcularProximasOcorrencias(
        { frequencia: 'mensal', diaMes: 31 },
        '2026-01-31',
        3,
      ),
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('calcula intervalos de N dias a partir do início', () => {
    expect(
      calcularProximasOcorrencias(
        { frequencia: 'cadaN', intervaloDias: 3 },
        '2026-10-30',
        3,
      ),
    ).toEqual(['2026-10-30', '2026-11-02', '2026-11-05'])
  })

  it('inclui a data final e não gera ocorrências depois dela', () => {
    expect(
      calcularProximasOcorrencias(
        { frequencia: 'diario', terminaEm: '2026-11-02' },
        '2026-10-31',
        10,
      ),
    ).toEqual(['2026-10-31', '2026-11-01', '2026-11-02'])
  })

  it('seleciona somente os dias da semana informados', () => {
    expect(
      calcularProximasOcorrencias(
        { frequencia: 'semanal', diasSemana: [1, 3] },
        '2026-10-30',
        3,
      ),
    ).toEqual(['2026-11-02', '2026-11-04', '2026-11-09'])
  })
})

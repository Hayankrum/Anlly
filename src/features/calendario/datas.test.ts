import { describe, it, expect } from 'vitest'
import { addDays, dayLabel, weekLabel, weekOf } from './datas'

describe('weekOf', () => {
  it('retorna a semana de segunda a domingo', () => {
    expect(weekOf('2026-10-23')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
  })

  it('trata a virada de mês', () => {
    expect(weekOf('2026-10-29')[0]).toBe('2026-10-26')
    expect(weekOf('2026-10-29')[6]).toBe('2026-11-01')
  })
})

describe('addDays', () => {
  it('avança e volta dias entre meses', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
  })
})

describe('dayLabel', () => {
  it('formata a data completa', () => {
    expect(dayLabel('2026-10-23')).toBe('23 de Outubro de 2026')
  })

  it('mantém a string original se inválida', () => {
    expect(dayLabel('invalida')).toBe('invalida')
  })
})

describe('weekLabel', () => {
  it('formata uma semana dentro do mesmo mês', () => {
    expect(weekLabel(weekOf('2026-10-23'))).toBe('19 – 25 de Outubro de 2026')
  })

  it('formata uma semana entre meses', () => {
    expect(weekLabel(weekOf('2026-10-29'))).toBe('26 Out – 1 Nov de 2026')
  })

  it('formata uma semana entre anos', () => {
    expect(weekLabel(weekOf('2026-12-31'))).toBe('28 Dez 2026 – 3 Jan 2027')
  })
})

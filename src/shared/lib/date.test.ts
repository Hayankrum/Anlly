import { describe, it, expect } from 'vitest'
import { formatarDataISO, formatarBytes, diasDesde, tempoRelativo } from './date'

describe('formatarDataISO', () => {
  it('converte YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatarDataISO('2026-10-19')).toBe('19/10/2026')
  })

  it('retorna a string original se inválida', () => {
    expect(formatarDataISO('abc')).toBe('abc')
    expect(formatarDataISO('')).toBe('')
  })
})

describe('formatarBytes', () => {
  it('formata 0', () => {
    expect(formatarBytes(0)).toBe('0 B')
  })

  it('formata bytes', () => {
    expect(formatarBytes(512)).toBe('512 B')
  })

  it('formata KB', () => {
    expect(formatarBytes(1024)).toBe('1 KB')
    expect(formatarBytes(1536)).toBe('1,5 KB')
  })

  it('formata MB', () => {
    expect(formatarBytes(1024 * 1024)).toBe('1 MB')
  })

  it('retorna 0 B para valores inválidos', () => {
    expect(formatarBytes(-1)).toBe('0 B')
    expect(formatarBytes(Number.NaN)).toBe('0 B')
  })
})

describe('diasDesde', () => {
  it('calcula dias desde um timestamp', () => {
    const agora = Date.now()
    const tresDiasAtras = agora - 3 * 86_400_000
    expect(diasDesde(tresDiasAtras)).toBe(3)
  })

  it('retorna 0 para agora', () => {
    expect(diasDesde(Date.now())).toBe(0)
  })
})

describe('tempoRelativo', () => {
  it('retorna string não vazia', () => {
    expect(tempoRelativo(Date.now())).toBeTruthy()
  })

  it('retorna texto para tempo futuro', () => {
    const resultado = tempoRelativo(Date.now() + 3_600_000)
    expect(resultado).toBeTruthy()
  })
})

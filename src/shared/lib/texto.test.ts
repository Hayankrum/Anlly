import { describe, it, expect } from 'vitest'
import { pluralizar } from './texto'

describe('pluralizar', () => {
  it('usa singular para 1', () => {
    expect(pluralizar(1, 'item pendente', 'itens pendentes')).toBe('1 item pendente')
  })

  it('usa plural para 0', () => {
    expect(pluralizar(0, 'item pendente', 'itens pendentes')).toBe('0 itens pendentes')
  })

  it('usa plural para números maiores que 1', () => {
    expect(pluralizar(5, 'item pendente', 'itens pendentes')).toBe('5 itens pendentes')
  })
})

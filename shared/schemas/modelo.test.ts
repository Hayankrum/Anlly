import { describe, expect, it } from 'vitest'
import { modeloSchema } from './modelo'

describe('modeloSchema', () => {
  const modeloBase = {
    id: 'modelo-1',
    titulo: 'Pagar energia',
    tipo: 'padrao',
    agenda: { modo: 'hoje' },
    updatedAt: 1,
  }

  it('aceita modelo mínimo com agenda de hoje', () => {
    expect(modeloSchema.safeParse(modeloBase).success).toBe(true)
  })

  it('aceita modelo de lista sem guardar dias concretos', () => {
    expect(
      modeloSchema.safeParse({
        ...modeloBase,
        tipo: 'lista',
        subitens: [{ id: 'sub-1', titulo: 'Pão', concluido: false }],
        agenda: { modo: 'dias' },
      }).success,
    ).toBe(true)
  })

  it('aceita regra de repetição e tombstone', () => {
    expect(
      modeloSchema.safeParse({
        ...modeloBase,
        agenda: { modo: 'repetir', regra: { frequencia: 'mensal', diaMes: 31 } },
        deletedAt: 2,
        serverVersion: 3,
      }).success,
    ).toBe(true)
  })

  it('rejeita modelo sem agenda válida', () => {
    expect(modeloSchema.safeParse({ ...modeloBase, agenda: { modo: 'indefinido' } }).success).toBe(
      false,
    )
  })
})

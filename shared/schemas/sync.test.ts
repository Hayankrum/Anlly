import { describe, it, expect } from 'vitest'
import { mutacaoSchema } from './outbox'
import { pushRequestSchema, pullQuerySchema, statusMutacaoSchema } from './sync'

function payload() {
  return {
    id: 'item1',
    titulo: 'Teste',
    descricao: '',
    concluido: false,
    criadoEm: 1,
    updatedAt: 2,
  }
}

describe('mutacaoSchema', () => {
  it('aceita upsert válido', () => {
    const resultado = mutacaoSchema.safeParse({
      id: 'mut1',
      tabela: 'items',
      registroId: 'item1',
      operacao: 'upsert',
      payload: payload(),
    })
    expect(resultado.success).toBe(true)
  })

  it('aceita configuração de colunas personalizadas no payload sincronizado', () => {
    const resultado = mutacaoSchema.safeParse({
      id: 'mut-colunas',
      tabela: 'items',
      registroId: 'item1',
      operacao: 'upsert',
      payload: {
        ...payload(),
        tipo: 'kanban',
        quadroKanban: {
          colunas: [
            { id: 'ideias', titulo: 'Ideias' },
            { id: 'concluido', titulo: 'Concluído' },
          ],
          colunaConclusao: 'concluido',
        },
      },
    })
    expect(resultado.success).toBe(true)
  })

  it('aceita delete válido', () => {
    const resultado = mutacaoSchema.safeParse({
      id: 'mut2',
      tabela: 'items',
      registroId: 'item1',
      operacao: 'delete',
      payload: { ...payload(), deletedAt: 3 },
    })
    expect(resultado.success).toBe(true)
  })

  it('rejeita operação desconhecida', () => {
    const resultado = mutacaoSchema.safeParse({
      id: 'mut3',
      tabela: 'items',
      registroId: 'item1',
      operacao: 'update',
      payload: payload(),
    })
    expect(resultado.success).toBe(false)
  })
})

describe('pushRequestSchema', () => {
  it('rejeita lista vazia', () => {
    expect(pushRequestSchema.safeParse({ mutacoes: [] }).success).toBe(false)
  })

  it('aceita uma mutação', () => {
    const resultado = pushRequestSchema.safeParse({
      mutacoes: [
        {
          id: 'm1',
          tabela: 'items',
          registroId: 'i1',
          operacao: 'upsert',
          payload: payload(),
        },
      ],
    })
    expect(resultado.success).toBe(true)
  })
})

describe('pullQuerySchema', () => {
  it('aplica defaults', () => {
    const resultado = pullQuerySchema.parse({})
    expect(resultado.cursor).toBe('0')
    expect(resultado.limit).toBe(100)
  })

  it('aceita limit como string numérica', () => {
    const resultado = pullQuerySchema.parse({ cursor: '5', limit: '50' })
    expect(resultado.cursor).toBe('5')
    expect(resultado.limit).toBe(50)
  })

  it('rejeita cursor não numérico', () => {
    expect(pullQuerySchema.safeParse({ cursor: 'abc' }).success).toBe(false)
  })

  it('rejeita limit acima do máximo', () => {
    expect(pullQuerySchema.safeParse({ limit: 501 }).success).toBe(false)
  })
})

describe('statusMutacaoSchema', () => {
  it('aceita os três status', () => {
    expect(statusMutacaoSchema.safeParse('aplicada').success).toBe(true)
    expect(statusMutacaoSchema.safeParse('ignorada').success).toBe(true)
    expect(statusMutacaoSchema.safeParse('invalida').success).toBe(true)
  })

  it('rejeita status desconhecido', () => {
    expect(statusMutacaoSchema.safeParse('erro').success).toBe(false)
  })
})

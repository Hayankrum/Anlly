import db from '../../db/database'
import { novaMutacao } from '../../db/outbox.repo'
import { executarComCota } from '../../shared/lib/cota'
import { modeloSchema, type EntradaModelo, type Modelo } from '@shared/schemas/modelo'
import { QUADRO_KANBAN_PADRAO } from '@shared/schemas/item'
import { gerarId } from '../../shared/lib/id'

const TABELA = 'modelos'
const CHAVE_SEMENTES = 'modelos-iniciais-v1'

function exemplos(usuarioId: string): Modelo[] {
  const agora = Date.now()
  return [
    modeloSchema.parse({
      id: `${usuarioId}:modelo-inicial:pagar-energia`,
      titulo: 'Pagar energia',
      tipo: 'padrao',
      agenda: { modo: 'repetir', regra: { frequencia: 'mensal', diaMes: 10 } },
      horaAgendamento: '09:00',
      updatedAt: agora,
    }),
    modeloSchema.parse({
      id: `${usuarioId}:modelo-inicial:estudar-foco`,
      titulo: 'Estudar foco 50/10',
      tipo: 'cronometro',
      modoTempo: 'focoPausa',
      minutosFoco: 50,
      minutosPausa: 10,
      agenda: { modo: 'hoje' },
      updatedAt: agora,
    }),
    modeloSchema.parse({
      id: `${usuarioId}:modelo-inicial:compras`,
      titulo: 'Compras da semana',
      tipo: 'lista',
      subitens: [
        { id: 'modelo-compra-frutas', titulo: 'Frutas', concluido: false },
        { id: 'modelo-compra-pao', titulo: 'Pão', concluido: false },
        { id: 'modelo-compra-cafe', titulo: 'Café', concluido: false },
      ],
      agenda: { modo: 'dias' },
      updatedAt: agora,
    }),
    modeloSchema.parse({
      id: `${usuarioId}:modelo-inicial:reforma`,
      titulo: 'Reforma',
      tipo: 'kanban',
      quadroKanban: QUADRO_KANBAN_PADRAO,
      agenda: { modo: 'hoje' },
      updatedAt: agora,
    }),
  ]
}

export async function garantirExemplosIniciais(usuarioId: string): Promise<void> {
  const chaveSementes = `${CHAVE_SEMENTES}:${usuarioId}`
  await executarComCota(() =>
    db.transaction('rw', db.modelos, db.outbox, db.config, async () => {
      if ((await db.config.get(chaveSementes)) !== undefined) return
      const agora = Date.now()
      const existentes = await db.modelos.toArray()
      const lista = exemplos(usuarioId).filter(
        (exemplo) =>
          !existentes.some(
            (existente) =>
              existente.id === exemplo.id ||
              (existente.deletedAt === undefined &&
                existente.tipo === exemplo.tipo &&
                existente.titulo === exemplo.titulo),
          ),
      )
      await db.modelos.bulkPut(lista)
      if (lista.length > 0) {
        await db.outbox.bulkAdd(
          lista.map((modelo) => novaMutacao(TABELA, modelo, 'upsert', agora)),
        )
      }
      await db.config.add({ chave: chaveSementes, valor: true })
    }),
  )
}

export async function listar(): Promise<Modelo[]> {
  return (await db.modelos.orderBy('updatedAt').reverse().toArray()).filter(
    (modelo) => modelo.deletedAt === undefined,
  )
}

export async function salvar(entrada: EntradaModelo): Promise<string> {
  const agora = Date.now()
  const modelo = modeloSchema.parse({
    ...entrada,
    id: entrada.id ?? gerarId(),
    updatedAt: agora,
  })
  await executarComCota(() =>
    db.transaction('rw', db.modelos, db.outbox, async () => {
      await db.modelos.put(modelo)
      await db.outbox.add(novaMutacao(TABELA, modelo, 'upsert', agora))
    }),
  )
  return modelo.id
}

export async function excluir(id: string): Promise<void> {
  const agora = Date.now()
  await executarComCota(() =>
    db.transaction('rw', db.modelos, db.outbox, async () => {
      const atual = await db.modelos.get(id)
      if (atual === undefined || atual.deletedAt !== undefined) return
      const modelo = modeloSchema.parse({ ...atual, deletedAt: agora, updatedAt: agora })
      await db.modelos.put(modelo)
      await db.outbox.add(novaMutacao(TABELA, modelo, 'delete', agora))
    }),
  )
}

export async function aplicarRemoto(registros: Modelo[]): Promise<number> {
  if (registros.length === 0) return 0
  let aplicados = 0
  await executarComCota(() =>
    db.transaction('rw', db.modelos, db.outbox, async () => {
      const pendentes = new Set(
        (await db.outbox.toArray())
          .filter((entrada) => entrada.tabela === TABELA)
          .map((entrada) => entrada.registroId),
      )
      const paraGravar: Modelo[] = []
      for (const registro of registros) {
        if (pendentes.has(registro.id)) continue
        const atual = await db.modelos.get(registro.id)
        if (atual !== undefined && atual.updatedAt > registro.updatedAt) continue
        paraGravar.push(modeloSchema.parse(registro))
      }
      if (paraGravar.length > 0) {
        await db.modelos.bulkPut(paraGravar)
        aplicados = paraGravar.length
      }
    }),
  )
  return aplicados
}

export function modeloDoItem(
  item: import('@shared/schemas/item').Item,
): Omit<Modelo, 'id' | 'updatedAt' | 'serverVersion' | 'deletedAt'> {
  return {
    titulo: item.titulo,
    descricao: item.descricao,
    tipo: item.tipo ?? 'padrao',
    ...(item.subitens === undefined
      ? {}
      : { subitens: item.subitens.map((subitem) => ({ ...subitem, concluido: false })) }),
    ...(item.modoTempo === undefined ? {} : { modoTempo: item.modoTempo }),
    ...(item.minutosFoco === undefined ? {} : { minutosFoco: item.minutosFoco }),
    ...(item.minutosPausa === undefined ? {} : { minutosPausa: item.minutosPausa }),
    ...(item.quadroKanban === undefined ? {} : { quadroKanban: item.quadroKanban }),
    agenda: { modo: 'hoje' },
    ...(item.horaAgendamento === undefined ? {} : { horaAgendamento: item.horaAgendamento }),
  }
}

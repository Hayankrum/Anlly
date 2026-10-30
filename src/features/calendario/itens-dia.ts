import type { Item } from '../../db/schema'

/** Uma linha do calendário: um item em um de seus dias agendados. */
export interface ItemDia {
  /** única na lista: `${itemId}:${data}` */
  id: string
  /** id do item atrás da linha */
  itemId: string
  /** YYYY-MM-DD */
  data: string
  /** HH:mm configurado ou, na ausência, horário local em que o item foi criado. */
  hora: string
  titulo: string
  descricao: string
  concluido: boolean
}

/** Achata os itens agendados em uma linha por (item, dia). */
export function buildItemDia(itens: Item[]): ItemDia[] {
  const linhas: ItemDia[] = []
  for (const item of itens) {
    if (item.deletedAt !== undefined) continue
    if (!item.diasAgendamento) continue
    const dataCriacao = new Date(item.criadoEm)
    const hora =
      item.horaAgendamento ??
      `${String(dataCriacao.getHours()).padStart(2, '0')}:${String(dataCriacao.getMinutes()).padStart(2, '0')}`
    for (const data of item.diasAgendamento) {
      linhas.push({
        id: `${item.id}:${data}`,
        itemId: item.id,
        data,
        hora,
        titulo: item.titulo,
        descricao: item.descricao,
        concluido: item.concluido,
      })
    }
  }
  return linhas
}

/** Cronológico, estável por id. */
export function compareItemDia(a: ItemDia, b: ItemDia): number {
  const horaA = a.hora ?? ''
  const horaB = b.hora ?? ''
  if (horaA !== horaB) return horaA < horaB ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

import type { Item } from '../../db/schema'

export interface DiaProgresso {
  data: string
  rotulo: string
  dia: string
  hoje: boolean
  concluidos: number
}

function dataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function deslocarDia(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  return dataISO(new Date(ano, mes - 1, dia + dias, 12))
}

export function diasConsecutivos(itens: Item[], hoje: string): number {
  const diasAtivos = new Set(itens.flatMap((item) => item.diasConclusao ?? []))
  const inicio =
    diasAtivos.has(hoje) ? hoje : deslocarDia(hoje, -1)
  if (!diasAtivos.has(inicio)) return 0

  let sequencia = 0
  let data = inicio
  while (diasAtivos.has(data)) {
    sequencia += 1
    data = deslocarDia(data, -1)
  }
  return sequencia
}

export function progressoDaSemana(itens: Item[], hoje: string): DiaProgresso[] {
  const [ano, mes, dia] = hoje.split('-').map(Number)
  const dataHoje = new Date(ano, mes - 1, dia, 12)
  const diasDesdeSegunda = (dataHoje.getDay() + 6) % 7
  const segunda = deslocarDia(hoje, -diasDesdeSegunda)
  const rotulos = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  return rotulos.map((rotulo, indice) => {
    const data = deslocarDia(segunda, indice)
    return {
      data,
      rotulo,
      dia: String(Number(data.slice(-2))),
      hoje: data === hoje,
      concluidos: itens.filter((item) => item.diasConclusao?.includes(data)).length,
    }
  })
}

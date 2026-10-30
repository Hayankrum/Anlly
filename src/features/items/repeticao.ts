import { addDays, getDaysInMonth, parseDate, todayStr } from '../calendario/datas'
import { repeticaoSchema, type RegraRepeticao } from '@shared/schemas/item'

function diaDaSemana(data: string): number {
  const partes = parseDate(data)
  if (!partes) return -1
  return new Date(Date.UTC(partes.year, partes.month - 1, partes.day)).getUTCDay()
}

function corresponde(data: string, inicio: string, regra: RegraRepeticao): boolean {
  const partes = parseDate(data)
  if (!partes) return false
  if (regra.frequencia === 'diario') return true
  if (regra.frequencia === 'semanal') {
    return regra.diasSemana?.includes(diaDaSemana(data)) ?? false
  }
  if (regra.frequencia === 'cadaN') {
    const inicioPartes = parseDate(inicio)
    if (!inicioPartes || regra.intervaloDias === undefined) return false
    const diferenca =
      (Date.UTC(partes.year, partes.month - 1, partes.day) -
        Date.UTC(inicioPartes.year, inicioPartes.month - 1, inicioPartes.day)) /
      86_400_000
    return diferenca % regra.intervaloDias === 0
  }
  const dia = regra.diaMes
  if (dia === undefined) return false
  return partes.day === Math.min(dia, getDaysInMonth(partes.year, partes.month))
}

/** Calcula as próximas datas civis sem depender do fuso horário do aparelho. */
export function calcularProximasOcorrencias(
  entrada: RegraRepeticao,
  inicio: string = todayStr(),
  quantidade = 3,
): string[] {
  const regra = repeticaoSchema.parse(entrada)
  if (!parseDate(inicio) || quantidade <= 0) return []

  const datas: string[] = []
  for (let deslocamento = 0; deslocamento <= 366 * 2 && datas.length < quantidade; deslocamento += 1) {
    const data = addDays(inicio, deslocamento)
    if (regra.terminaEm !== undefined && data > regra.terminaEm) break
    if (corresponde(data, inicio, regra)) datas.push(data)
  }
  return datas
}

export function rotuloRegraRepeticao(regra: RegraRepeticao): string {
  if (regra.frequencia === 'diario') return 'Todo dia'
  if (regra.frequencia === 'semanal') {
    const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
    return `Toda ${regra.diasSemana?.map((dia) => dias[dia]).join(', ') ?? ''}`
  }
  if (regra.frequencia === 'cadaN') return `A cada ${regra.intervaloDias} dias`
  return `Todo mês, dia ${regra.diaMes}`
}

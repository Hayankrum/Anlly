export function parseDateLocal(value: string): Date | null {
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

export function dataParaInputDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

export function dataParaInputTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export function inicioDoDiaLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function ehMesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function somarDias(d: Date, dias: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + dias)
  return r
}

export function inicioDoMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function somarMeses(d: Date, meses: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + meses, 1)
}

export function diasNoMes(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function mesParaParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function paramParaMes(valor: string | null | undefined): Date | null {
  if (!valor || !/^\d{4}-\d{2}$/.test(valor)) return null
  const [ano, mes] = valor.split('-').map(Number)
  if (mes < 1 || mes > 12) return null
  return new Date(ano, mes - 1, 1)
}

export function diasDeCalendarioAte(data: Date, hoje: Date): number {
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const alvo = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate())
  return Math.round((alvo - base) / 86400000)
}

export function formatarDataCurta(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

export function formatarDataLonga(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatarDataHoraLonga(d: Date): string {
  return d.toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatarHora(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatarQuandoEvento(
  startsAt: Date,
  endsAt: Date | null,
  allDay: boolean,
  dias: string[] | null
): string {
  const marcados = diasDoEvento(startsAt, allDay ? endsAt : null, dias)
  if (marcados.length > 1) {
    const rotuloDias =
      marcados.length > 5
        ? `${marcados.length} dias`
        : marcados
            .slice()
            .sort((a, b) => a.getTime() - b.getTime())
            .map(formatarDataCurta)
            .join(' · ')
    if (allDay) return rotuloDias
    return `${formatarHora(startsAt)} · ${rotuloDias}`
  }
  if (allDay) return formatarDataLonga(startsAt)
  if (endsAt) {
    if (!ehMesmoDia(startsAt, endsAt)) {
      return `${formatarDataHoraCurta(startsAt)} às ${formatarDataHoraCurta(endsAt)}`
    }
    return `${formatarDataHoraCurta(startsAt)} às ${formatarHora(endsAt)}`
  }
  return formatarDataHoraCurta(startsAt)
}

export function diasDoIntervalo(inicio: Date, fim: Date): Date[] {
  const dias: Date[] = []
  const atual = inicioDoDiaLocal(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()))
  const alvo = inicioDoDiaLocal(new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()))
  while (atual.getTime() <= alvo.getTime()) {
    dias.push(new Date(atual))
    atual.setDate(atual.getDate() + 1)
  }
  return dias
}

export function diaPorChave(chave: string): Date {
  return new Date(`${chave}T12:00`)
}

export function diasDoEvento(inicio: Date, fim: Date | null, dias: string[] | null): Date[] {
  if (dias && dias.length > 0) return dias.map((c) => diaPorChave(c))
  if (fim && !ehMesmoDia(inicio, fim)) return diasDoIntervalo(inicio, fim)
  return [inicio]
}

export function formatarDataHoraCurta(d: Date): string {
  return d.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function nomeDoMes(mes: number): string {
  const nomes = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  return nomes[mes]
}

export function nomeDiaSemanaCurto(dia: number): string {
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
  return nomes[dia]
}
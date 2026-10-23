export type DateStr = string

const MONTH_NAMES = [
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

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Data civil local em YYYY-MM-DD. */
export function todayStr(now: Date = new Date()): DateStr {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** month é 1-based (1 = Janeiro). */
export function makeDate(year: number, month: number, day: number): DateStr {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function parseDate(date: string): { year: number; month: number; day: number } | null {
  const m = DATE_RE.exec(date)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > getDaysInMonth(year, month)) return null
  return { year, month, day }
}

/** "Outubro 2026" */
export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

/** "12 de Outubro" */
export function formatDateLong(date: DateStr): string {
  const p = parseDate(date)
  if (!p) return date
  return `${p.day} de ${MONTH_NAMES[p.month - 1]}`
}

/** "12 de Outubro de 2026" */
export function dayLabel(date: DateStr): string {
  const p = parseDate(date)
  if (!p) return date
  return `${p.day} de ${MONTH_NAMES[p.month - 1]} de ${p.year}`
}

/** "12 – 18 de Outubro de 2026" (ou com meses/anos diferentes). */
export function weekLabel(dates: DateStr[]): string {
  const start = dates.length > 0 ? parseDate(dates[0]) : null
  const end = dates.length > 1 ? parseDate(dates[dates.length - 1]) : null
  if (!start || !end) return ''
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} – ${end.day} de ${MONTH_NAMES[start.month - 1]} de ${start.year}`
  }
  if (start.year === end.year) {
    const inicio = `${start.day} ${MONTH_NAMES_SHORT[start.month - 1]}`
    const fim = `${end.day} ${MONTH_NAMES_SHORT[end.month - 1]}`
    return `${inicio} – ${fim} de ${start.year}`
  }
  const inicio = `${start.day} ${MONTH_NAMES_SHORT[start.month - 1]} ${start.year}`
  const fim = `${end.day} ${MONTH_NAMES_SHORT[end.month - 1]} ${end.year}`
  return `${inicio} – ${fim}`
}

/** Weekday index, 0 = Monday ... 6 = Sunday. */
function weekdayIndex(date: DateStr): number {
  const p = parseDate(date)
  if (!p) return 0
  const utcDay = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()
  return (utcDay + 6) % 7
}

/** Offset de `date` a partir da primeira coluna da grade (0..6, segunda-first). */
function weekOffset(date: DateStr): number {
  return weekdayIndex(date)
}

/** Rótulos dos dias na ordem das colunas da grade (segunda-first). */
export function calendarWeekdayLabels(): string[] {
  return [...WEEKDAY_LABELS]
}

/** Move o mês, tratando dezembro → janeiro e vice-versa. */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

/** Aritmética de dias no calendário civil (sem matemática de fuso). */
export function addDays(date: DateStr, delta: number): DateStr {
  const p = parseDate(date)
  if (!p) return date
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + delta))
  return makeDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

/** Os 7 dias da semana que contêm `date`, começando na segunda. */
export function weekOf(date: DateStr): DateStr[] {
  const start = addDays(date, -weekOffset(date))
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Células vazias antes do dia 1 na grade 6x7 (segunda-first). */
export function monthLeadingBlanks(year: number, month: number): number {
  return weekOffset(makeDate(year, month, 1))
}

/** Grade do mês: 6 linhas x 7 colunas. Dias fora do mês são null. */
export function monthGrid(year: number, month: number): (DateStr | null)[] {
  const cells: (DateStr | null)[] = []
  const firstWeekday = monthLeadingBlanks(year, month)
  const daysInMonth = getDaysInMonth(year, month)
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(makeDate(year, month, day))
  while (cells.length % 7 !== 0 || cells.length < 42) cells.push(null)
  return cells
}

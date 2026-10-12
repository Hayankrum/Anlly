import { useCallback, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  calendarWeekdayLabels,
  formatWeekRange,
  getDaysInMonth,
  makeDate,
  monthLabel,
  parseDate,
  todayStr,
  weekOf,
} from './datas'
import { compareItemDia, type ItemDia } from './itens-dia'

interface UseCalendarResult {
  year: number
  month: number
  label: string
  selectedDate: string
  today: string
  /** true = a data tem pelo menos um item agendado */
  diasComItens: Set<string>
  /** itens do dia selecionado, ordenados para exibição */
  dayItems: ItemDia[]
  /** segunda..domingo (ou domingo..sábado) da semana do dia selecionado */
  weekDays: string[]
  /** rótulos dos dias na ordem das colunas */
  weekdayLabels: string[]
  /** "21 – 27 de Setembro" */
  weekLabel: string
  selectDate: (date: string) => void
  goToPrevMonth: () => void
  goToNextMonth: () => void
  goToPrevYear: () => void
  goToNextYear: () => void
  goToPrevWeek: () => void
  goToNextWeek: () => void
  goToPrevDay: () => void
  goToNextDay: () => void
  goToToday: () => void
  /** seleciona a data e move a vista do mês para ela */
  goTo: (date: string) => void
}

interface UseCalendarOptions {
  /** YYYY-MM-DD de abertura (padrão: hoje) */
  initialDate?: string
}

export function useCalendar(
  itens: ItemDia[],
  options: UseCalendarOptions = {},
): UseCalendarResult {
  const weekdayLabels = useMemo(() => calendarWeekdayLabels(), [])
  const today = todayStr()
  const initial = options.initialDate && parseDate(options.initialDate) ? options.initialDate : today
  const initialParts = parseDate(initial) ?? parseDate(today) ?? { year: 2026, month: 1, day: 1 }

  const [view, setView] = useState(() => ({ year: initialParts.year, month: initialParts.month }))
  const [selectedDate, setSelectedDate] = useState(initial)

  const sorted = useMemo(() => [...itens].sort(compareItemDia), [itens])

  const diasComItens = useMemo(() => {
    const set = new Set<string>()
    for (const item of sorted) set.add(item.data)
    return set
  }, [sorted])

  const dayItems = useMemo(
    () => sorted.filter((item) => item.data === selectedDate),
    [sorted, selectedDate],
  )

  const weekDays = useMemo(() => weekOf(selectedDate), [selectedDate])
  const weekLabel = useMemo(() => formatWeekRange(weekDays[0], weekDays[6]), [weekDays])

  /** Move a vista e mantém o dia selecionado, ajustado ao novo mês. */
  const moveMonth = useCallback(
    (delta: number) => {
      const parts = parseDate(selectedDate) ?? parseDate(todayStr())
      if (!parts) return
      const target = addMonths(parts.year, parts.month, delta)
      const day = Math.min(parts.day, getDaysInMonth(target.year, target.month))
      setView(target)
      setSelectedDate(makeDate(target.year, target.month, day))
    },
    [selectedDate],
  )

  const goToPrevMonth = () => moveMonth(-1)
  const goToNextMonth = () => moveMonth(1)
  const goToPrevYear = () => moveMonth(-12)
  const goToNextYear = () => moveMonth(12)
  const goToToday = () => {
    const t = todayStr()
    const parts = parseDate(t)
    if (parts) setView({ year: parts.year, month: parts.month })
    setSelectedDate(t)
  }
  const goTo = useCallback((date: string) => {
    const parts = parseDate(date)
    if (parts) setView({ year: parts.year, month: parts.month })
    setSelectedDate(date)
  }, [])

  const goToPrevWeek = () => goTo(addDays(selectedDate, -7))
  const goToNextWeek = () => goTo(addDays(selectedDate, 7))
  const goToPrevDay = () => goTo(addDays(selectedDate, -1))
  const goToNextDay = () => goTo(addDays(selectedDate, 1))

  return {
    year: view.year,
    month: view.month,
    label: monthLabel(view.year, view.month),
    selectedDate,
    today,
    diasComItens,
    dayItems,
    weekDays,
    weekdayLabels,
    weekLabel,
    selectDate: setSelectedDate,
    goToPrevMonth,
    goToNextMonth,
    goToPrevYear,
    goToNextYear,
    goToPrevWeek,
    goToNextWeek,
    goToPrevDay,
    goToNextDay,
    goToToday,
    goTo,
  }
}

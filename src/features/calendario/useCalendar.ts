import { useCallback, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  calendarWeekdayLabels,
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
  /** itens da semana selecionada */
  weekItems: ItemDia[]
  /** itens do mês em exibição */
  monthItems: ItemDia[]
  /** os 7 dias da semana selecionada */
  weekDates: string[]
  /** rótulos dos dias na ordem das colunas */
  weekdayLabels: string[]
  selectDate: (date: string) => void
  goToPrevDay: () => void
  goToNextDay: () => void
  goToPrevWeek: () => void
  goToNextWeek: () => void
  goToPrevMonth: () => void
  goToNextMonth: () => void
  goToPrevYear: () => void
  goToNextYear: () => void
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

  const weekDates = useMemo(() => weekOf(selectedDate), [selectedDate])

  const weekItems = useMemo(() => {
    const set = new Set(weekDates)
    return sorted.filter((item) => set.has(item.data))
  }, [sorted, weekDates])

  const monthItems = useMemo(() => {
    const prefix = `${view.year}-${String(view.month).padStart(2, '0')}`
    return sorted.filter((item) => item.data.startsWith(prefix))
  }, [sorted, view.year, view.month])

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
  const goTo = useCallback((date: string) => {
    const parts = parseDate(date)
    if (parts) setView({ year: parts.year, month: parts.month })
    setSelectedDate(date)
  }, [])

  const goToPrevDay = useCallback(() => goTo(addDays(selectedDate, -1)), [goTo, selectedDate])
  const goToNextDay = useCallback(() => goTo(addDays(selectedDate, 1)), [goTo, selectedDate])
  const goToPrevWeek = useCallback(() => goTo(addDays(selectedDate, -7)), [goTo, selectedDate])
  const goToNextWeek = useCallback(() => goTo(addDays(selectedDate, 7)), [goTo, selectedDate])

  return {
    year: view.year,
    month: view.month,
    label: monthLabel(view.year, view.month),
    selectedDate,
    today,
    diasComItens,
    dayItems,
    weekItems,
    monthItems,
    weekDates,
    weekdayLabels,
    selectDate: setSelectedDate,
    goToPrevDay,
    goToNextDay,
    goToPrevWeek,
    goToNextWeek,
    goToPrevMonth,
    goToNextMonth,
    goToPrevYear,
    goToNextYear,
    goTo,
  }
}

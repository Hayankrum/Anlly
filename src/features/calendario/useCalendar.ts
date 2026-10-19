import { useCallback, useMemo, useState } from 'react'
import {
  addMonths,
  calendarWeekdayLabels,
  getDaysInMonth,
  makeDate,
  monthLabel,
  parseDate,
  todayStr,
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
  /** rótulos dos dias na ordem das colunas */
  weekdayLabels: string[]
  selectDate: (date: string) => void
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

  return {
    year: view.year,
    month: view.month,
    label: monthLabel(view.year, view.month),
    selectedDate,
    today,
    diasComItens,
    dayItems,
    weekdayLabels,
    selectDate: setSelectedDate,
    goToPrevMonth,
    goToNextMonth,
    goToPrevYear,
    goToNextYear,
    goTo,
  }
}

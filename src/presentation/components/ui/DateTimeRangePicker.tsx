'use client'

import { useEffect, useMemo, useState } from 'react'
import { MdAccessTime, MdCalendarToday, MdClose } from 'react-icons/md'

export type DateTimeRangeValue = {
  dataInicial: Date | null
  dataFinal: Date | null
}

interface DateTimeRangePickerProps {
  /** Controle externo (útil quando usado em popover/modal). */
  open: boolean
  /** Valor inicial para preencher os inputs ao abrir/reabrir. */
  value?: Partial<DateTimeRangeValue>
  /** Fecha sem confirmar (o componente reseta internamente para `value`). */
  onClose: () => void
  /** Confirma e devolve Date(s) com hora aplicada conforme regras. */
  onConfirm: (value: DateTimeRangeValue) => void
  /** Título exibido no header (default: "Escolha as Datas"). */
  title?: string
  /** Texto do botão de confirmação (default: "Filtrar"). */
  confirmText?: string
}

/**
 * Formata Date para string no formato YYYY-MM-DD (formato do input date)
 */
function formatDateForInput(date: Date | null | undefined): string {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formata Date para string no formato HH:mm (formato do input time)
 */
function formatTimeForInput(date: Date | null | undefined): string {
  if (!date) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Converte string YYYY-MM-DD para Date.
 * Usa componentes locais para evitar problemas de timezone.
 */
function parseDateFromInput(dateString: string): Date | null {
  if (!dateString) return null
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

/**
 * Converte string HH:mm para objeto { hours, minutes }
 */
function parseTimeFromInput(timeString: string): { hours: number; minutes: number } | null {
  if (!timeString) return null
  const [hours, minutes] = timeString.split(':').map(Number)
  return { hours, minutes }
}

/**
 * Combina uma data com hora.
 */
function combineDateAndTime(
  date: Date | null,
  time: { hours: number; minutes: number } | null
): Date | null {
  if (!date) return null
  if (!time) return date
  const combined = new Date(date)
  combined.setHours(time.hours, time.minutes, 0, 0)
  return combined
}

export function DateTimeRangePicker({
  open,
  value,
  onClose,
  onConfirm,
  title = 'Escolha as Datas',
  confirmText = 'Filtrar',
}: DateTimeRangePickerProps) {
  const initialDataInicial = value?.dataInicial ?? null
  const initialDataFinal = value?.dataFinal ?? null

  const [dataInicialStr, setDataInicialStr] = useState<string>(formatDateForInput(initialDataInicial))
  const [horaInicialStr, setHoraInicialStr] = useState<string>(formatTimeForInput(initialDataInicial))
  const [dataFinalStr, setDataFinalStr] = useState<string>(formatDateForInput(initialDataFinal))
  const [horaFinalStr, setHoraFinalStr] = useState<string>(formatTimeForInput(initialDataFinal))

  useEffect(() => {
    setDataInicialStr(formatDateForInput(initialDataInicial))
    setHoraInicialStr(formatTimeForInput(initialDataInicial))
    setDataFinalStr(formatDateForInput(initialDataFinal))
    setHoraFinalStr(formatTimeForInput(initialDataFinal))
  }, [initialDataInicial, initialDataFinal, open])

  const minDataFinal = useMemo(() => dataInicialStr || undefined, [dataInicialStr])

  const handleConfirm = () => {
    const dataInicialDate = parseDateFromInput(dataInicialStr)
    const dataFinalDate = parseDateFromInput(dataFinalStr)

    const horaInicial = parseTimeFromInput(horaInicialStr)
    const horaFinal = parseTimeFromInput(horaFinalStr)

    let dataInicial = combineDateAndTime(dataInicialDate, horaInicial)
    let dataFinal = combineDateAndTime(dataFinalDate, horaFinal)

    // Se data final foi selecionada mas não tem hora, ajustar para o final do dia (23:59:59)
    if (dataFinal && !horaFinalStr) {
      dataFinal.setHours(23, 59, 59, 999)
    }
    // Se data inicial foi selecionada mas não tem hora, ajustar para o início do dia (00:00:00)
    if (dataInicial && !horaInicialStr) {
      dataInicial.setHours(0, 0, 0, 0)
    }

    onConfirm({ dataInicial, dataFinal })
    onClose()
  }

  const handleClose = () => {
    // Resetar para valores iniciais ao fechar sem confirmar
    setDataInicialStr(formatDateForInput(initialDataInicial))
    setHoraInicialStr(formatTimeForInput(initialDataInicial))
    setDataFinalStr(formatDateForInput(initialDataFinal))
    setHoraFinalStr(formatTimeForInput(initialDataFinal))
    onClose()
  }

  if (!open) return null

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-white px-4 py-3">
        <h2 className="font-exo text-lg font-semibold text-primary-text">{title}</h2>
        <button
          type="button"
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-gray-100"
          aria-label="Fechar"
        >
          <MdClose size={20} />
        </button>
      </div>

      <div className="bg-white px-4 py-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="font-nunito text-sm text-primary-text">Data Inicial</label>
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="relative flex-1">
                <MdCalendarToday
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
                  size={20}
                />
                <input
                  type="date"
                  value={dataInicialStr}
                  onChange={e => setDataInicialStr(e.target.value)}
                  placeholder="Escolha..."
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 font-nunito text-sm text-primary-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="relative flex-1">
                <MdAccessTime
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
                  size={20}
                />
                <input
                  type="time"
                  value={horaInicialStr}
                  onChange={e => setHoraInicialStr(e.target.value)}
                  placeholder="HH:mm"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 font-nunito text-sm text-primary-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-nunito text-sm text-primary-text">Data Final</label>
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="relative flex-1">
                <MdCalendarToday
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
                  size={20}
                />
                <input
                  type="date"
                  value={dataFinalStr}
                  onChange={e => setDataFinalStr(e.target.value)}
                  min={minDataFinal}
                  placeholder="Escolha..."
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 font-nunito text-sm text-primary-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="relative flex-1">
                <MdAccessTime
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
                  size={20}
                />
                <input
                  type="time"
                  value={horaFinalStr}
                  onChange={e => setHoraFinalStr(e.target.value)}
                  placeholder="HH:mm"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 font-nunito text-sm text-primary-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-b-lg border-t border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={handleConfirm}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-primary font-nunito text-sm text-white transition-colors hover:bg-primary/90"
        >
          {confirmText}
        </button>
      </div>
    </div>
  )
}


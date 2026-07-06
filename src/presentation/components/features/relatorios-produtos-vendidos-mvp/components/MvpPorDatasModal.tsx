'use client'

import { useCallback, useEffect, useState } from 'react'
import { startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { combinarIntervaloCalendarParaDatas } from '@/src/shared/utils/intervaloCalendarioComHoras'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { formatarHoraParaInputCalendar } from '../utils/mvpFormatDataHora'

export type MvpPorDatasModalProps = {
  open: boolean
  onClose: () => void
  timezoneAgregacao: string
  periodoInicio: Date | null
  periodoFim: Date | null
  onConfirmar: (inicio: Date, fim: Date) => void
}

export function MvpPorDatasModal({
  open,
  onClose,
  timezoneAgregacao,
  periodoInicio,
  periodoFim,
  onConfirmar,
}: MvpPorDatasModalProps) {
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>()
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')
  const [mesCalendario, setMesCalendario] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )

  useEffect(() => {
    if (!open) return
    if (periodoInicio && periodoFim) {
      setRascunhoIntervaloRange({
        from: startOfDay(periodoInicio),
        to: startOfDay(periodoFim),
      })
      setRascunhoHoraInicio(formatarHoraParaInputCalendar(periodoInicio))
      setRascunhoHoraFim(formatarHoraParaInputCalendar(periodoFim))
      setMesCalendario(primeiroMesQuadroDuploCalendario(startOfDay(periodoFim)))
    } else {
      const hoje = startOfDay(new Date())
      setRascunhoIntervaloRange({ from: hoje, to: hoje })
      setRascunhoHoraInicio('00:00')
      setRascunhoHoraFim('23:59')
      setMesCalendario(primeiroMesQuadroDuploCalendario(hoje))
    }
  }, [open, periodoInicio, periodoFim])

  const handleRascunhoIntervaloRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoIntervaloRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
  }, [])

  const handleAplicar = useCallback(() => {
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      rascunhoIntervaloRange,
      rascunhoHoraInicio,
      rascunhoHoraFim
    )
    if (!dataInicial || !dataFinal) return
    onConfirmar(dataInicial, dataFinal)
    onClose()
  }, [rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim, onConfirmar, onClose])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Escolha o período"
      panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
      scrollableBody={false}
      footerSlot={
        <button
          type="button"
          disabled={!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to}
          onClick={handleAplicar}
          className="rounded-b-l-lg font-nunito flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Aplicar
        </button>
      }
    >
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-x-auto overflow-y-auto py-2">
        <FaturamentoRangeCalendar
          embutidoNoModal
          embutidoFundoClaro
          range={rascunhoIntervaloRange}
          onRangeChange={handleRascunhoIntervaloRangeChange}
          month={mesCalendario}
          onMonthChange={setMesCalendario}
          timeZoneEmpresa={timezoneAgregacao}
          horaInicio={rascunhoHoraInicio}
          horaFim={rascunhoHoraFim}
          onHorariosChange={(hi, hf) => {
            setRascunhoHoraInicio(hi)
            setRascunhoHoraFim(hf)
          }}
        />
      </div>
    </JiffySidePanelModal>
  )
}

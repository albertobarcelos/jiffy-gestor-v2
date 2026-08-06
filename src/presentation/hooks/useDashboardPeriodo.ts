import { useState, useCallback, useMemo } from 'react'
import { startOfDay, startOfMonth } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { formatarHoraParaInputCalendar } from '@/src/presentation/components/features/dashboard/dashboardTextHelpers'
import {
  combinarIntervaloCalendarParaDatas,
  intervaloPersonalizadoEhValido,
} from '@/src/shared/utils/intervaloCalendarioComHoras'

function rascunhoPadraoHoje(): {
  range: DateRange
  mes: Date
  horaInicio: string
  horaFim: string
} {
  const hoje = startOfDay(new Date())
  return {
    range: { from: hoje, to: hoje },
    /** Modal abre em visualização de um mês por padrão. */
    mes: startOfMonth(hoje),
    horaInicio: '00:00',
    horaFim: '23:59',
  }
}

/**
 * Estado e orquestração do filtro de período do dashboard V2
 * (presets + modal “Por datas”).
 */
export function useDashboardPeriodo() {
  const [periodoData, setPeriodoData] = useState('hoje')
  const [periodoPersonalizadoInicio, setPeriodoPersonalizadoInicio] = useState<Date | null>(null)
  const [periodoPersonalizadoFim, setPeriodoPersonalizadoFim] = useState<Date | null>(null)

  const [modalIntervaloPersonalizadoAberto, setModalIntervaloPersonalizadoAberto] = useState(false)
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(
    undefined
  )
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    startOfMonth(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')

  /** Sincroniza rascunho com o filtro aplicado (ou hoje) e abre o modal. */
  const abrirModalPeriodoPersonalizado = useCallback(() => {
    if (periodoPersonalizadoInicio && periodoPersonalizadoFim) {
      const fim = startOfDay(periodoPersonalizadoFim)
      setRascunhoIntervaloRange({
        from: startOfDay(periodoPersonalizadoInicio),
        to: fim,
      })
      setMesCalendarioIntervalo(startOfMonth(fim))
      setRascunhoHoraInicio(formatarHoraParaInputCalendar(periodoPersonalizadoInicio))
      setRascunhoHoraFim(formatarHoraParaInputCalendar(periodoPersonalizadoFim))
    } else {
      const padrao = rascunhoPadraoHoje()
      setRascunhoIntervaloRange(padrao.range)
      setMesCalendarioIntervalo(padrao.mes)
      setRascunhoHoraInicio(padrao.horaInicio)
      setRascunhoHoraFim(padrao.horaFim)
    }
    setModalIntervaloPersonalizadoAberto(true)
  }, [periodoPersonalizadoInicio, periodoPersonalizadoFim])

  const handleLimparFiltroPeriodo = useCallback(() => {
    const padrao = rascunhoPadraoHoje()
    setPeriodoData('hoje')
    setPeriodoPersonalizadoInicio(null)
    setPeriodoPersonalizadoFim(null)
    setModalIntervaloPersonalizadoAberto(false)
    setRascunhoIntervaloRange(padrao.range)
    setMesCalendarioIntervalo(padrao.mes)
    setRascunhoHoraInicio(padrao.horaInicio)
    setRascunhoHoraFim(padrao.horaFim)
  }, [])

  const handlePeriodoDataChange = useCallback(
    (v: string) => {
      if (v === 'personalizado') {
        abrirModalPeriodoPersonalizado()
        return
      }
      setPeriodoData(v)
      setPeriodoPersonalizadoInicio(null)
      setPeriodoPersonalizadoFim(null)
    },
    [abrirModalPeriodoPersonalizado]
  )

  const handleConfirmarIntervaloPersonalizado = useCallback(
    (v: { dataInicial: Date | null; dataFinal: Date | null }) => {
      let ini = v.dataInicial
      let fim = v.dataFinal
      if (!ini || !fim) return
      if (ini.getTime() > fim.getTime()) {
        const t = ini
        ini = fim
        fim = t
      }
      setPeriodoPersonalizadoInicio(ini)
      setPeriodoPersonalizadoFim(fim)
      setPeriodoData('personalizado')
    },
    []
  )

  const handleRascunhoIntervaloRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoIntervaloRange(next)
      return
    }
    const padrao = rascunhoPadraoHoje()
    setRascunhoIntervaloRange(padrao.range)
  }, [])

  const rascunhoIntervaloValido = useMemo(
    () =>
      intervaloPersonalizadoEhValido(rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim),
    [rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim]
  )

  const handleAplicarIntervaloPersonalizadoModal = useCallback(() => {
    if (
      !intervaloPersonalizadoEhValido(rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim)
    ) {
      return
    }
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      rascunhoIntervaloRange,
      rascunhoHoraInicio,
      rascunhoHoraFim
    )
    if (!dataInicial || !dataFinal) return
    handleConfirmarIntervaloPersonalizado({ dataInicial, dataFinal })
    setModalIntervaloPersonalizadoAberto(false)
  }, [
    rascunhoIntervaloRange,
    rascunhoHoraInicio,
    rascunhoHoraFim,
    handleConfirmarIntervaloPersonalizado,
  ])

  return {
    periodoData,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    modalIntervaloPersonalizadoAberto,
    setModalIntervaloPersonalizadoAberto,
    rascunhoIntervaloRange,
    mesCalendarioIntervalo,
    setMesCalendarioIntervalo,
    rascunhoHoraInicio,
    setRascunhoHoraInicio,
    rascunhoHoraFim,
    setRascunhoHoraFim,
    rascunhoIntervaloValido,
    handleLimparFiltroPeriodo,
    handlePeriodoDataChange,
    abrirModalPeriodoPersonalizado,
    handleRascunhoIntervaloRangeChange,
    handleAplicarIntervaloPersonalizadoModal,
  }
}

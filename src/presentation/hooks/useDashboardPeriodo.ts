import { useState, useCallback } from 'react'
import { startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { formatarHoraParaInputCalendar } from '@/src/presentation/components/features/dashboard/dashboardTextHelpers'
import { combinarIntervaloCalendarParaDatas } from '@/src/shared/utils/intervaloCalendarioComHoras'

export function useDashboardPeriodo() {
  const [periodoData, setPeriodoData] = useState('hoje')
  const [periodoPersonalizadoInicio, setPeriodoPersonalizadoInicio] = useState<Date | null>(null)
  const [periodoPersonalizadoFim, setPeriodoPersonalizadoFim] = useState<Date | null>(null)
  
  const [modalIntervaloPersonalizadoAberto, setModalIntervaloPersonalizadoAberto] = useState(false)
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(undefined)
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')

  const handleLimparFiltroPeriodo = useCallback(() => {
    const hoje = startOfDay(new Date())
    setPeriodoData('hoje')
    setPeriodoPersonalizadoInicio(null)
    setPeriodoPersonalizadoFim(null)
    setModalIntervaloPersonalizadoAberto(false)
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
    setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(hoje))
    setRascunhoHoraInicio('00:00')
    setRascunhoHoraFim('23:59')
  }, [])

  const handlePeriodoDataChange = useCallback(
    (v: string) => {
      if (v === 'personalizado') {
        if (periodoPersonalizadoInicio && periodoPersonalizadoFim) {
          const fim = startOfDay(periodoPersonalizadoFim)
          setRascunhoIntervaloRange({
            from: startOfDay(periodoPersonalizadoInicio),
            to: fim,
          })
          setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(fim))
          setRascunhoHoraInicio(formatarHoraParaInputCalendar(periodoPersonalizadoInicio))
          setRascunhoHoraFim(formatarHoraParaInputCalendar(periodoPersonalizadoFim))
        } else {
          const hoje = startOfDay(new Date())
          setRascunhoIntervaloRange({ from: hoje, to: hoje })
          setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(hoje))
          setRascunhoHoraInicio('00:00')
          setRascunhoHoraFim('23:59')
        }
        setModalIntervaloPersonalizadoAberto(true)
        return
      }
      setPeriodoData(v)
      setPeriodoPersonalizadoInicio(null)
      setPeriodoPersonalizadoFim(null)
    },
    [periodoPersonalizadoInicio, periodoPersonalizadoFim]
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
    const hoje = startOfDay(new Date())
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
  }, [])

  const handleAplicarIntervaloPersonalizadoModal = useCallback(() => {
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
    handleLimparFiltroPeriodo,
    handlePeriodoDataChange,
    handleRascunhoIntervaloRangeChange,
    handleAplicarIntervaloPersonalizadoModal,
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { formatarHoraParaInputCalendar } from '@/src/presentation/components/features/dashboard/dashboardTextHelpers'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { combinarIntervaloCalendarParaDatas } from '@/src/shared/utils/intervaloCalendarioComHoras'
import type { OrigemFiltro } from './types'

function criarIntervaloHoje() {
  const hoje = new Date()
  return {
    inicio: startOfDay(hoje),
    fim: endOfDay(hoje),
  }
}

export function useFiscalKanbanFilters() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const intervaloCriacaoPadrao = useMemo(() => criarIntervaloHoje(), [])
  const [dataCriacaoInicio, setDataCriacaoInicio] = useState<Date | null>(null)
  const [dataCriacaoFim, setDataCriacaoFim] = useState<Date | null>(null)
  const [dataFinalizacaoInicio, setDataFinalizacaoInicio] = useState<Date | null>(null)
  const [dataFinalizacaoFim, setDataFinalizacaoFim] = useState<Date | null>(null)
  const [origemFilter, setOrigemFilter] = useState<OrigemFiltro>('')
  const [filtrosVisiveisMobile, setFiltrosVisiveisMobile] = useState(false)
  const [modalCriacaoDatasAberto, setModalCriacaoDatasAberto] = useState(false)
  const [rascunhoCriacaoRange, setRascunhoCriacaoRange] = useState<DateRange | undefined>(
    undefined
  )
  const [mesCalendarioCriacao, setMesCalendarioCriacao] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraCriacaoInicio, setRascunhoHoraCriacaoInicio] = useState('00:00')
  const [rascunhoHoraCriacaoFim, setRascunhoHoraCriacaoFim] = useState('23:59')
  const [modalFinalizacaoDatasAberto, setModalFinalizacaoDatasAberto] = useState(false)
  const [rascunhoFinalizacaoRange, setRascunhoFinalizacaoRange] = useState<
    DateRange | undefined
  >(undefined)
  const [mesCalendarioFinalizacao, setMesCalendarioFinalizacao] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraFinalizacaoInicio, setRascunhoHoraFinalizacaoInicio] = useState('00:00')
  const [rascunhoHoraFinalizacaoFim, setRascunhoHoraFinalizacaoFim] = useState('23:59')
  const debounceSearchRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current)
    debounceSearchRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, 400)
    return () => {
      if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current)
    }
  }, [searchInput])

  const deveUsarCriacaoPadrao =
    !dataCriacaoInicio && !dataCriacaoFim && !dataFinalizacaoInicio && !dataFinalizacaoFim
  const dataCriacaoInicioConsulta =
    dataCriacaoInicio ?? (deveUsarCriacaoPadrao ? intervaloCriacaoPadrao.inicio : null)
  const dataCriacaoFimConsulta =
    dataCriacaoFim ?? (deveUsarCriacaoPadrao ? intervaloCriacaoPadrao.fim : null)
  const dataCriacaoInicioISO = dataCriacaoInicioConsulta?.toISOString() ?? undefined
  const dataCriacaoFimISO = dataCriacaoFimConsulta?.toISOString() ?? undefined
  const dataFinalizacaoInicioISO = dataFinalizacaoInicio?.toISOString() ?? undefined
  const dataFinalizacaoFimISO = dataFinalizacaoFim?.toISOString() ?? undefined

  const vendasUnificadasQueryParams = useMemo(
    () => ({
      q: searchQuery || undefined,
      origem: origemFilter || undefined,
      dataCriacaoInicial: dataCriacaoInicioISO,
      dataCriacaoFinal: dataCriacaoFimISO,
      dataFinalizacaoInicio: dataFinalizacaoInicioISO,
      dataFinalizacaoFim: dataFinalizacaoFimISO,
    }),
    [
      searchQuery,
      origemFilter,
      dataCriacaoInicioISO,
      dataCriacaoFimISO,
      dataFinalizacaoInicioISO,
      dataFinalizacaoFimISO,
    ]
  )

  const vendasUnificadasQueryKeyFingerprint = JSON.stringify(vendasUnificadasQueryParams)

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setSearchQuery('')
    const periodoHoje = criarIntervaloHoje()
    setDataCriacaoInicio(null)
    setDataCriacaoFim(null)
    setDataFinalizacaoInicio(null)
    setDataFinalizacaoFim(null)
    setOrigemFilter('')
    const hoje = periodoHoje.inicio
    setRascunhoCriacaoRange({ from: hoje, to: hoje })
    setMesCalendarioCriacao(primeiroMesQuadroDuploCalendario(hoje))
    setRascunhoHoraCriacaoInicio('00:00')
    setRascunhoHoraCriacaoFim('23:59')
    setRascunhoFinalizacaoRange({ from: hoje, to: hoje })
    setMesCalendarioFinalizacao(primeiroMesQuadroDuploCalendario(hoje))
    setRascunhoHoraFinalizacaoInicio('00:00')
    setRascunhoHoraFinalizacaoFim('23:59')
  }, [])

  const abrirModalCriacaoDatas = useCallback(() => {
    if (dataCriacaoInicio && dataCriacaoFim) {
      const fim = startOfDay(dataCriacaoFim)
      setRascunhoCriacaoRange({
        from: startOfDay(dataCriacaoInicio),
        to: fim,
      })
      setMesCalendarioCriacao(primeiroMesQuadroDuploCalendario(fim))
      setRascunhoHoraCriacaoInicio(formatarHoraParaInputCalendar(dataCriacaoInicio))
      setRascunhoHoraCriacaoFim(formatarHoraParaInputCalendar(dataCriacaoFim))
    } else {
      const hoje = startOfDay(new Date())
      setRascunhoCriacaoRange({ from: hoje, to: hoje })
      setMesCalendarioCriacao(primeiroMesQuadroDuploCalendario(hoje))
      setRascunhoHoraCriacaoInicio('00:00')
      setRascunhoHoraCriacaoFim('23:59')
    }
    setModalCriacaoDatasAberto(true)
  }, [dataCriacaoInicio, dataCriacaoFim])

  const handleRascunhoCriacaoRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoCriacaoRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoCriacaoRange({ from: hoje, to: hoje })
  }, [])

  const aplicarCriacaoDatas = useCallback(() => {
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      rascunhoCriacaoRange,
      rascunhoHoraCriacaoInicio,
      rascunhoHoraCriacaoFim
    )
    if (!dataInicial || !dataFinal) return
    if (dataInicial.getTime() > dataFinal.getTime()) {
      setDataCriacaoInicio(dataFinal)
      setDataCriacaoFim(dataInicial)
    } else {
      setDataCriacaoInicio(dataInicial)
      setDataCriacaoFim(dataFinal)
    }
    setDataFinalizacaoInicio(null)
    setDataFinalizacaoFim(null)
    setModalCriacaoDatasAberto(false)
  }, [rascunhoCriacaoRange, rascunhoHoraCriacaoInicio, rascunhoHoraCriacaoFim])

  const abrirModalFinalizacaoDatas = useCallback(() => {
    if (dataFinalizacaoInicio && dataFinalizacaoFim) {
      const fim = startOfDay(dataFinalizacaoFim)
      setRascunhoFinalizacaoRange({
        from: startOfDay(dataFinalizacaoInicio),
        to: fim,
      })
      setMesCalendarioFinalizacao(primeiroMesQuadroDuploCalendario(fim))
      setRascunhoHoraFinalizacaoInicio(formatarHoraParaInputCalendar(dataFinalizacaoInicio))
      setRascunhoHoraFinalizacaoFim(formatarHoraParaInputCalendar(dataFinalizacaoFim))
    } else {
      const hoje = startOfDay(new Date())
      setRascunhoFinalizacaoRange({ from: hoje, to: hoje })
      setMesCalendarioFinalizacao(primeiroMesQuadroDuploCalendario(hoje))
      setRascunhoHoraFinalizacaoInicio('00:00')
      setRascunhoHoraFinalizacaoFim('23:59')
    }
    setModalFinalizacaoDatasAberto(true)
  }, [dataFinalizacaoInicio, dataFinalizacaoFim])

  const handleRascunhoFinalizacaoRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoFinalizacaoRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoFinalizacaoRange({ from: hoje, to: hoje })
  }, [])

  const aplicarFinalizacaoDatas = useCallback(() => {
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      rascunhoFinalizacaoRange,
      rascunhoHoraFinalizacaoInicio,
      rascunhoHoraFinalizacaoFim
    )
    if (!dataInicial || !dataFinal) return
    if (dataInicial.getTime() > dataFinal.getTime()) {
      setDataFinalizacaoInicio(dataFinal)
      setDataFinalizacaoFim(dataInicial)
    } else {
      setDataFinalizacaoInicio(dataInicial)
      setDataFinalizacaoFim(dataFinal)
    }
    setDataCriacaoInicio(null)
    setDataCriacaoFim(null)
    setModalFinalizacaoDatasAberto(false)
  }, [rascunhoFinalizacaoRange, rascunhoHoraFinalizacaoInicio, rascunhoHoraFinalizacaoFim])

  return {
    searchInput,
    setSearchInput,
    searchQuery,
    dataCriacaoInicio,
    dataCriacaoFim,
    dataFinalizacaoInicio,
    dataFinalizacaoFim,
    origemFilter,
    setOrigemFilter,
    filtrosVisiveisMobile,
    setFiltrosVisiveisMobile,
    modalCriacaoDatasAberto,
    setModalCriacaoDatasAberto,
    rascunhoCriacaoRange,
    mesCalendarioCriacao,
    setMesCalendarioCriacao,
    rascunhoHoraCriacaoInicio,
    setRascunhoHoraCriacaoInicio,
    rascunhoHoraCriacaoFim,
    setRascunhoHoraCriacaoFim,
    modalFinalizacaoDatasAberto,
    setModalFinalizacaoDatasAberto,
    rascunhoFinalizacaoRange,
    mesCalendarioFinalizacao,
    setMesCalendarioFinalizacao,
    rascunhoHoraFinalizacaoInicio,
    setRascunhoHoraFinalizacaoInicio,
    rascunhoHoraFinalizacaoFim,
    setRascunhoHoraFinalizacaoFim,
    vendasUnificadasQueryParams,
    vendasUnificadasQueryKeyFingerprint,
    handleClearFilters,
    abrirModalCriacaoDatas,
    handleRascunhoCriacaoRangeChange,
    aplicarCriacaoDatas,
    abrirModalFinalizacaoDatas,
    handleRascunhoFinalizacaoRangeChange,
    aplicarFinalizacaoDatas,
  }
}

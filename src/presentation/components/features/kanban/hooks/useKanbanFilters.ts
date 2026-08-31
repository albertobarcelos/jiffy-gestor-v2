import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { formatarHoraParaInputCalendar } from '@/src/presentation/components/features/dashboard/dashboardTextHelpers'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { combinarIntervaloCalendarParaDatas } from '@/src/shared/utils/intervaloCalendarioComHoras'
import type { OrigemFiltro, TipoEntregaFiltro, ColunaKanbanFiltroExtra } from '../types'
import {
  type KanbanFiltroDataPreset,
  intervaloPresetKanbanFiltroData,
} from '../utils/kanbanFiltroDataPresets'
import {
  gravarFiltroColunaKanbanNoStorage,
  gravarFiltrosToolbarKanbanNoStorage,
  lerFiltroColunaKanbanDoStorage,
  lerFiltrosToolbarKanbanDoStorage,
  mesclarPendenciaFiltrosToolbarKanban,
} from '../rules/vendasKanban.storage'
import { lerPendenciaQuadroFlow } from '@/src/presentation/gestor-pedidos/quadro/filtroPendenteQuadroFlow'
import { termoBuscaKanbanParaApi } from '../rules/vendasKanban.rules'

/** `periodo`: filtro por intervalo (default hoje quando sem datas explícitas). `todos`: sem filtro de data. */
export type FiltroDataKanbanModo = 'periodo' | 'todos'

function criarIntervaloHoje() {
  const hoje = new Date()
  return {
    inicio: startOfDay(hoje),
    fim: endOfDay(hoje),
  }
}

export function useKanbanFilters(
  timeZoneEmpresa?: string,
  opcoes?: { diaOperacionalFlow?: boolean }
) {
  const diaOperacionalFlow = Boolean(opcoes?.diaOperacionalFlow)
  const tzEmpresa = timeZoneEmpresa ?? ''

  const [filtrosIniciais] = useState(() =>
    mesclarPendenciaFiltrosToolbarKanban(
      lerFiltrosToolbarKanbanDoStorage(),
      lerPendenciaQuadroFlow()
    )
  )
  const [searchInput, setSearchInput] = useState(filtrosIniciais.searchInput)
  const [searchQuery, setSearchQuery] = useState(filtrosIniciais.searchInput.trim())
  const intervaloCivilHoje = useMemo(() => criarIntervaloHoje(), [])
  const intervaloPeriodoPadrao = diaOperacionalFlow
    ? intervaloPresetKanbanFiltroData('hoje', tzEmpresa, { diaOperacionalFlow: true }) ??
      intervaloCivilHoje
    : intervaloCivilHoje
  const [periodoInicio, setPeriodoInicio] = useState<Date | null>(() => {
    if (!filtrosIniciais.periodoInicioISO) return null
    const d = new Date(filtrosIniciais.periodoInicioISO)
    return Number.isFinite(d.getTime()) ? d : null
  })
  const [periodoFim, setPeriodoFim] = useState<Date | null>(() => {
    if (!filtrosIniciais.periodoFimISO) return null
    const d = new Date(filtrosIniciais.periodoFimISO)
    return Number.isFinite(d.getTime()) ? d : null
  })
  const [periodoDataModo, setPeriodoDataModo] = useState<FiltroDataKanbanModo>(
    filtrosIniciais.periodoDataModo
  )
  const [periodoPreset, setPeriodoPreset] = useState<KanbanFiltroDataPreset>(
    filtrosIniciais.periodoPreset
  )
  const [origemFilter, setOrigemFilter] = useState<OrigemFiltro>(filtrosIniciais.origemFilter)
  const [tipoEntregaFilter, setTipoEntregaFilter] = useState<TipoEntregaFiltro>(
    filtrosIniciais.tipoEntregaFilter
  )
  const [colunaKanbanFiltro, setColunaKanbanFiltroState] =
    useState<ColunaKanbanFiltroExtra>(lerFiltroColunaKanbanDoStorage)

  const setColunaKanbanFiltro = useCallback((value: ColunaKanbanFiltroExtra) => {
    setColunaKanbanFiltroState(value)
    gravarFiltroColunaKanbanNoStorage(value)
  }, [])
  const [filtrosVisiveisMobile, setFiltrosVisiveisMobile] = useState(false)
  const [modalPeriodoDatasAberto, setModalPeriodoDatasAberto] = useState(false)
  const [rascunhoPeriodoRange, setRascunhoPeriodoRange] = useState<DateRange | undefined>(
    undefined
  )
  const [mesCalendarioPeriodo, setMesCalendarioPeriodo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraPeriodoInicio, setRascunhoHoraPeriodoInicio] = useState('00:00')
  const [rascunhoHoraPeriodoFim, setRascunhoHoraPeriodoFim] = useState('23:59')
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

  useEffect(() => {
    gravarFiltrosToolbarKanbanNoStorage({
      searchInput,
      origemFilter,
      tipoEntregaFilter,
      periodoPreset,
      periodoDataModo,
      periodoInicioISO: periodoInicio?.toISOString() ?? null,
      periodoFimISO: periodoFim?.toISOString() ?? null,
    })
  }, [
    searchInput,
    origemFilter,
    tipoEntregaFilter,
    periodoPreset,
    periodoDataModo,
    periodoInicio,
    periodoFim,
  ])

  const deveUsarPeriodoPadrao =
    periodoDataModo === 'periodo' && !periodoInicio && !periodoFim
  const intervaloLiveFlow =
    diaOperacionalFlow && (periodoPreset === 'hoje' || periodoPreset === 'ontem')
      ? intervaloPresetKanbanFiltroData(periodoPreset, tzEmpresa, { diaOperacionalFlow: true })
      : null
  const periodoInicioConsulta = intervaloLiveFlow
    ? intervaloLiveFlow.inicio
    : periodoInicio ?? (deveUsarPeriodoPadrao ? intervaloPeriodoPadrao.inicio : null)
  const periodoFimConsulta = intervaloLiveFlow
    ? intervaloLiveFlow.fim
    : periodoFim ?? (deveUsarPeriodoPadrao ? intervaloPeriodoPadrao.fim : null)
  const periodoAtivoNaConsulta =
    periodoDataModo === 'periodo' && periodoInicioConsulta != null && periodoFimConsulta != null
  const periodoInicioISO = periodoAtivoNaConsulta
    ? periodoInicioConsulta.toISOString()
    : undefined
  const periodoFimISO = periodoAtivoNaConsulta ? periodoFimConsulta.toISOString() : undefined

  /** Mesmo intervalo para criação (colunas operacionais) e finalização (colunas fiscais). */
  const vendasUnificadasQueryParams = useMemo(() => {
    const qNormalizado = termoBuscaKanbanParaApi(searchQuery)
    return {
      q: qNormalizado || undefined,
      origem: origemFilter || undefined,
      tipoEntrega: tipoEntregaFilter || undefined,
      // Filtro Pendente/Rejeitadas controla quais colunas montam query — não envia statusFiscal.
      dataCriacaoInicial: periodoInicioISO,
      dataCriacaoFinal: periodoFimISO,
      dataFinalizacaoInicio: periodoInicioISO,
      dataFinalizacaoFim: periodoFimISO,
    }
  }, [
    searchQuery,
    origemFilter,
    tipoEntregaFilter,
    periodoInicioISO,
    periodoFimISO,
  ])

  const vendasUnificadasQueryKeyFingerprint = JSON.stringify(vendasUnificadasQueryParams)

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setSearchQuery('')
    const periodoHoje = criarIntervaloHoje()
    setPeriodoDataModo('periodo')
    setPeriodoPreset('hoje')
    setPeriodoInicio(null)
    setPeriodoFim(null)
    setOrigemFilter('')
    setTipoEntregaFilter('')
    setColunaKanbanFiltro('TODAS')
    const hoje = periodoHoje.inicio
    setRascunhoPeriodoRange({ from: hoje, to: hoje })
    setMesCalendarioPeriodo(primeiroMesQuadroDuploCalendario(hoje))
    setRascunhoHoraPeriodoInicio('00:00')
    setRascunhoHoraPeriodoFim('23:59')
  }, [setColunaKanbanFiltro])

  const abrirModalPeriodoDatas = useCallback(() => {
    if (periodoInicio && periodoFim) {
      const fim = startOfDay(periodoFim)
      setRascunhoPeriodoRange({
        from: startOfDay(periodoInicio),
        to: fim,
      })
      setMesCalendarioPeriodo(primeiroMesQuadroDuploCalendario(fim))
      setRascunhoHoraPeriodoInicio(formatarHoraParaInputCalendar(periodoInicio))
      setRascunhoHoraPeriodoFim(formatarHoraParaInputCalendar(periodoFim))
    } else {
      const hoje = startOfDay(new Date())
      setRascunhoPeriodoRange({ from: hoje, to: hoje })
      setMesCalendarioPeriodo(primeiroMesQuadroDuploCalendario(hoje))
      setRascunhoHoraPeriodoInicio('00:00')
      setRascunhoHoraPeriodoFim('23:59')
    }
    setModalPeriodoDatasAberto(true)
  }, [periodoInicio, periodoFim])

  const handleRascunhoPeriodoRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoPeriodoRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoPeriodoRange({ from: hoje, to: hoje })
  }, [])

  const aplicarPeriodoDatas = useCallback(() => {
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      rascunhoPeriodoRange,
      rascunhoHoraPeriodoInicio,
      rascunhoHoraPeriodoFim
    )
    if (!dataInicial || !dataFinal) return
    setPeriodoDataModo('periodo')
    if (dataInicial.getTime() > dataFinal.getTime()) {
      setPeriodoInicio(dataFinal)
      setPeriodoFim(dataInicial)
    } else {
      setPeriodoInicio(dataInicial)
      setPeriodoFim(dataFinal)
    }
    setPeriodoPreset('por_data')
    setModalPeriodoDatasAberto(false)
  }, [rascunhoPeriodoRange, rascunhoHoraPeriodoInicio, rascunhoHoraPeriodoFim])

  const aplicarPeriodoTodos = useCallback(() => {
    setPeriodoDataModo('todos')
    setPeriodoPreset('todos')
    setPeriodoInicio(null)
    setPeriodoFim(null)
  }, [])

  const aplicarPeriodoPreset = useCallback(
    (preset: KanbanFiltroDataPreset) => {
      if (preset === 'todos') {
        aplicarPeriodoTodos()
        return
      }
      if (preset === 'por_data') {
        abrirModalPeriodoDatas()
        return
      }
      const intervalo = intervaloPresetKanbanFiltroData(preset, tzEmpresa, {
        diaOperacionalFlow,
      })
      if (!intervalo) return
      setPeriodoDataModo('periodo')
      setPeriodoPreset(preset)
      if (diaOperacionalFlow && (preset === 'hoje' || preset === 'ontem')) {
        setPeriodoInicio(null)
        setPeriodoFim(null)
        return
      }
      setPeriodoInicio(intervalo.inicio)
      setPeriodoFim(intervalo.fim)
    },
    [aplicarPeriodoTodos, abrirModalPeriodoDatas, diaOperacionalFlow, tzEmpresa]
  )

  return {
    searchInput,
    setSearchInput,
    searchQuery,
    periodoDataModo,
    periodoPreset,
    periodoInicio,
    periodoFim,
    periodoInicioConsulta,
    periodoFimConsulta,
    periodoAtivoNaConsulta,
    origemFilter,
    setOrigemFilter,
    tipoEntregaFilter,
    setTipoEntregaFilter,
    colunaKanbanFiltro,
    setColunaKanbanFiltro,
    filtrosVisiveisMobile,
    setFiltrosVisiveisMobile,
    modalPeriodoDatasAberto,
    setModalPeriodoDatasAberto,
    rascunhoPeriodoRange,
    mesCalendarioPeriodo,
    setMesCalendarioPeriodo,
    rascunhoHoraPeriodoInicio,
    setRascunhoHoraPeriodoInicio,
    rascunhoHoraPeriodoFim,
    setRascunhoHoraPeriodoFim,
    vendasUnificadasQueryParams,
    vendasUnificadasQueryKeyFingerprint,
    handleClearFilters,
    abrirModalPeriodoDatas,
    handleRascunhoPeriodoRangeChange,
    aplicarPeriodoDatas,
    aplicarPeriodoTodos,
    aplicarPeriodoPreset,
  }
}

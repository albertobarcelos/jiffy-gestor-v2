import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters'
import type { OrigemFiltro, PeriodoOpcao } from './types'

export function useFiscalKanbanFilters() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [periodo, setPeriodo] = useState<PeriodoOpcao>('Todos')
  const [periodoInicial, setPeriodoInicial] = useState<Date | null>(null)
  const [periodoFinal, setPeriodoFinal] = useState<Date | null>(null)
  const [dataFinalizacaoPeriodo, setDataFinalizacaoPeriodo] = useState<PeriodoOpcao>('Todos')
  const [dataFinalizacaoInicio, setDataFinalizacaoInicio] = useState<Date | null>(null)
  const [dataFinalizacaoFim, setDataFinalizacaoFim] = useState<Date | null>(null)
  const [origemFilter, setOrigemFilter] = useState<OrigemFiltro>('')
  const [statusFiscalFilter, setStatusFiscalFilter] = useState<string>('')
  const [filtrosVisiveisMobile, setFiltrosVisiveisMobile] = useState(false)
  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false)
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
    if (periodo === 'Datas Personalizadas') return
    if (periodo === 'Todos') {
      setPeriodoInicial(null)
      setPeriodoFinal(null)
    } else {
      const { inicio, fim } = calculatePeriodo(periodo)
      setPeriodoInicial(inicio)
      setPeriodoFinal(fim)
    }
  }, [periodo])

  useEffect(() => {
    if (dataFinalizacaoPeriodo === 'Todos' || dataFinalizacaoPeriodo === 'Datas Personalizadas') {
      setDataFinalizacaoInicio(null)
      setDataFinalizacaoFim(null)
    } else {
      const { inicio, fim } = calculatePeriodo(dataFinalizacaoPeriodo)
      setDataFinalizacaoInicio(inicio)
      setDataFinalizacaoFim(fim)
    }
  }, [dataFinalizacaoPeriodo])

  const periodoInicialISO = periodoInicial?.toISOString() ?? undefined
  const periodoFinalISO = periodoFinal
    ? new Date(
        periodoFinal.getFullYear(),
        periodoFinal.getMonth(),
        periodoFinal.getDate(),
        23,
        59,
        59,
        999
      ).toISOString()
    : undefined
  const dataFinalizacaoInicioISO = dataFinalizacaoInicio?.toISOString() ?? undefined
  const dataFinalizacaoFimISO = dataFinalizacaoFim
    ? new Date(
        dataFinalizacaoFim.getFullYear(),
        dataFinalizacaoFim.getMonth(),
        dataFinalizacaoFim.getDate(),
        23,
        59,
        59,
        999
      ).toISOString()
    : undefined

  const vendasUnificadasQueryParams = useMemo(
    () => ({
      q: searchQuery || undefined,
      origem: origemFilter || undefined,
      statusFiscal: statusFiscalFilter || undefined,
      dataCriacaoInicial: periodoInicialISO,
      dataCriacaoFinal: periodoFinalISO,
      dataFinalizacaoInicio: dataFinalizacaoInicioISO,
      dataFinalizacaoFim: dataFinalizacaoFimISO,
    }),
    [
      searchQuery,
      origemFilter,
      statusFiscalFilter,
      periodoInicialISO,
      periodoFinalISO,
      dataFinalizacaoInicioISO,
      dataFinalizacaoFimISO,
    ]
  )

  const vendasUnificadasQueryKeyFingerprint = JSON.stringify(vendasUnificadasQueryParams)

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setSearchQuery('')
    setPeriodo('Todos')
    setPeriodoInicial(null)
    setPeriodoFinal(null)
    setDataFinalizacaoPeriodo('Todos')
    setDataFinalizacaoInicio(null)
    setDataFinalizacaoFim(null)
    setOrigemFilter('')
    setStatusFiscalFilter('')
  }, [])

  const handleConfirmDatas = useCallback((dataInicial: Date | null, dataFinal: Date | null) => {
    setPeriodoInicial(dataInicial)
    setPeriodoFinal(dataFinal)
    setPeriodo(dataInicial || dataFinal ? 'Datas Personalizadas' : 'Todos')
    setIsDatasModalOpen(false)
  }, [])

  return {
    searchInput,
    setSearchInput,
    searchQuery,
    periodo,
    setPeriodo,
    periodoInicial,
    periodoFinal,
    dataFinalizacaoPeriodo,
    setDataFinalizacaoPeriodo,
    origemFilter,
    setOrigemFilter,
    statusFiscalFilter,
    setStatusFiscalFilter,
    filtrosVisiveisMobile,
    setFiltrosVisiveisMobile,
    isDatasModalOpen,
    setIsDatasModalOpen,
    vendasUnificadasQueryParams,
    vendasUnificadasQueryKeyFingerprint,
    handleClearFilters,
    handleConfirmDatas,
  }
}

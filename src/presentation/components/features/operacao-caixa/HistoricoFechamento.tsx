'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdSearch, MdCalendarToday, MdFilterAltOff, MdClose } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import {
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import { EscolheDatasModal } from '../vendas/EscolheDatasModal'
import { DetalhesFechamento } from './DetalhesFechamento'

// Tipos
interface OperacaoCaixa {
  id: string
  status: 'aberto' | 'fechado'
  empresaId?: string
  abertoPorId?: string
  terminalId?: string
  codigoTerminal?: string
  nomeTerminal?: string
  dataAbertura: string
  fechadoPorId?: string
  nomeResponsavelFechamento?: string
  dataFechamento?: string
  fieldValues?: Record<string, any>
}

interface Terminal {
  id: string
  codigoInterno: string
  nome?: string
}

/**
 * Componente de histórico de fechamento de caixa
 * Implementa scroll infinito, filtros avançados e exibição em tabela
 */
export function HistoricoFechamento() {
  const { auth } = useAuthStore()

  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [periodo, setPeriodo] = useState<string>('Todos')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [terminalFilter, setTerminalFilter] = useState<string | null>(null)
  const [periodoInicial, setPeriodoInicial] = useState<Date | null>(null)
  const [periodoFinal, setPeriodoFinal] = useState<Date | null>(null)
  const [dataAberturaFilter, setDataAberturaFilter] = useState<Date | null>(null)
  const [dataAberturaInputValue, setDataAberturaInputValue] = useState<string>('')
  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false)
  const previousDateValueRef = useRef<string>('')

  // Estados de dados
  const [operacoesCaixa, setOperacoesCaixa] = useState<OperacaoCaixa[]>([])
  const [terminais, setTerminais] = useState<Terminal[]>([])

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [canLoadMore, setCanLoadMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoadingTerminais, setIsLoadingTerminais] = useState(false)
  const [selectedOperacaoId, setSelectedOperacaoId] = useState<string | null>(null)
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false)

  const pageSize = 10
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const filtersRef = useRef({
    searchQuery,
    periodo,
    statusFilter,
    terminalFilter,
    periodoInicial,
    periodoFinal,
    dataAberturaFilter,
  })

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    filtersRef.current = {
      searchQuery,
      periodo,
      statusFilter,
      terminalFilter,
      periodoInicial,
      periodoFinal,
      dataAberturaFilter,
    }
  }, [searchQuery, periodo, statusFilter, terminalFilter, periodoInicial, periodoFinal, dataAberturaFilter])

  /**
   * Formata data para exibição na lista
   */
  const formatDateList = (dateString: string): { date: string; time: string } => {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return { date: dateStr, time: timeStr }
  }

  /**
   * Calcula período baseado na opção selecionada
   */
  const calculatePeriodo = (opcao: string): { inicio: Date | null; fim: Date | null } => {
    const hoje = new Date()
    hoje.setHours(23, 59, 59, 999)

    switch (opcao) {
      case 'Hoje': {
        const inicio = new Date()
        inicio.setHours(0, 0, 0, 0)
        return { inicio, fim: hoje }
      }
      case 'Ontem': {
        const inicio = new Date(hoje)
        inicio.setDate(inicio.getDate() - 1)
        inicio.setHours(0, 0, 0, 0)
        const fim = new Date(hoje)
        fim.setDate(fim.getDate() - 1)
        fim.setHours(23, 59, 59, 999)
        return { inicio, fim }
      }
      case 'Últimos 7 Dias': {
        const inicio = new Date(hoje)
        inicio.setDate(inicio.getDate() - 6)
        inicio.setHours(0, 0, 0, 0)
        return { inicio, fim: hoje }
      }
      case 'Mês Atual': {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        inicio.setHours(0, 0, 0, 0)
        return { inicio, fim: hoje }
      }
      case 'Mês Passado': {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        inicio.setHours(0, 0, 0, 0)
        const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
        fim.setHours(23, 59, 59, 999)
        return { inicio, fim }
      }
      case 'Últimos 30 Dias': {
        const inicio = new Date(hoje)
        inicio.setDate(inicio.getDate() - 29)
        inicio.setHours(0, 0, 0, 0)
        return { inicio, fim: hoje }
      }
      case 'Últimos 60 Dias': {
        const inicio = new Date(hoje)
        inicio.setDate(inicio.getDate() - 59)
        inicio.setHours(0, 0, 0, 0)
        return { inicio, fim: hoje }
      }
      case 'Últimos 90 Dias': {
        const inicio = new Date(hoje)
        inicio.setDate(inicio.getDate() - 89)
        inicio.setHours(0, 0, 0, 0)
        return { inicio, fim: hoje }
      }
      case 'Todos':
      default:
        return { inicio: null, fim: null }
    }
  }

  /**
   * Calcula período aberto (diferença entre abertura e fechamento)
   */
  const calcularPeriodoAberto = (dataAbertura: string, dataFechamento?: string): string => {
    if (!dataAbertura) return 'N/A'

    const inicio = new Date(dataAbertura)
    const fim = dataFechamento ? new Date(dataFechamento) : new Date()
    const diff = fim.getTime() - inicio.getTime()

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  /**
   * Busca todas as operações de caixa
   */
  const fetchOperacoesCaixa = useCallback(
    async (resetPage = false) => {
      const token = auth?.getAccessToken()
      if (!token) return

      if (resetPage) {
        setIsLoading(true)
        setCurrentPage(0)
        setOperacoesCaixa([])
        setCanLoadMore(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const page = resetPage ? 0 : currentPage
        const params = new URLSearchParams({
          limit: pageSize.toString(),
          offset: (page * pageSize).toString(),
        })

        const filters = filtersRef.current

        if (filters.searchQuery.trim()) {
          params.append('q', filters.searchQuery.trim())
        }

        // Calcular datas - prioriza filtro de data de abertura individual sobre outros
        let dataInicio: string | null = null
        let dataFim: string | null = null

        // Filtro de data de abertura individual tem prioridade máxima
        if (filters.dataAberturaFilter) {
          const inicio = new Date(filters.dataAberturaFilter)
          inicio.setHours(0, 0, 0, 0)
          dataInicio = inicio.toISOString()
          const fim = new Date(filters.dataAberturaFilter)
          fim.setHours(23, 59, 59, 999)
          dataFim = fim.toISOString()
        } else if (filters.periodoInicial || filters.periodoFinal) {
          // Prioriza filtro manual do modal "Por datas"
          if (filters.periodoInicial) {
            const inicio = new Date(filters.periodoInicial)
            inicio.setHours(0, 0, 0, 0)
            dataInicio = inicio.toISOString()
          }
          if (filters.periodoFinal) {
            const fim = new Date(filters.periodoFinal)
            fim.setHours(23, 59, 59, 999)
            dataFim = fim.toISOString()
          } else if (filters.periodoInicial) {
            // Se só inicial, usa mesma data até 23:59:59
            const fim = new Date(filters.periodoInicial)
            fim.setHours(23, 59, 59, 999)
            dataFim = fim.toISOString()
          }
        } else if (filters.periodo !== 'Todos') {
          // Usa filtro pré-definido (Hoje, Ontem, etc.)
          const { inicio, fim } = calculatePeriodo(filters.periodo)
          if (inicio) {
            dataInicio = inicio.toISOString()
          }
          if (fim) {
            dataFim = fim.toISOString()
          }
        }

        if (dataInicio) {
          params.append('dataAberturaInicio', dataInicio)
        }
        if (dataFim) {
          params.append('dataAberturaFim', dataFim)
        }

        if (filters.terminalFilter) {
          params.append('terminalId', filters.terminalFilter)
        }

        if (filters.statusFilter && filters.statusFilter.trim() !== '') {
          params.append('status', filters.statusFilter.trim().toLowerCase())
        }

        const response = await fetch(`/api/caixa/operacao-caixa-terminal?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao buscar operações de caixa')
        }

        const data = await response.json()

        if (data.items && Array.isArray(data.items)) {
          const newItems = data.items

          if (resetPage) {
            setOperacoesCaixa(newItems)
            // Após reset, a próxima página será 1
            setCurrentPage(1)
          } else {
            setOperacoesCaixa((prev) => [...prev, ...newItems])
            // Incrementa a página para a próxima busca
            setCurrentPage((prev) => prev + 1)
          }

          // Verifica se há mais itens para carregar
          // Se retornou menos itens que o pageSize, não há mais páginas
          // Se retornou exatamente pageSize itens, pode haver mais páginas
          const hasMore = newItems.length === pageSize
          setCanLoadMore(hasMore)
        } else {
          if (resetPage) {
            setOperacoesCaixa([])
            setCurrentPage(0)
          }
          setCanLoadMore(false)
        }
      } catch (error) {
        console.error('Erro ao buscar operações de caixa:', error)
        showToast.error('Erro ao buscar operações de caixa')
        if (resetPage) {
          setOperacoesCaixa([])
        }
        setCanLoadMore(false)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [auth, currentPage, pageSize]
  )

  /**
   * Busca todos os terminais
   */
  const loadAllTerminais = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingTerminais(true)

    try {
      const allTerminals: Terminal[] = []
      let hasMore = true
      let currentOffset = 0
      const limit = 50

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/terminais?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          hasMore = false
          break
        }

        const data = await response.json()

        if (data.items && Array.isArray(data.items)) {
          const mappedTerminals = data.items.map((t: any) => ({
            id: t.id || t._id || '',
            codigoInterno: t.codigoInterno || t.codigo_interno || t.nome || t.name || '',
            nome: t.nome || t.name || '',
          })).filter((t: Terminal) => t.id && t.codigoInterno)
          
          allTerminals.push(...mappedTerminals)
          hasMore = data.hasNextPage !== false && data.items.length === limit
          currentOffset += limit
        } else {
          hasMore = false
        }
      }

      setTerminais(allTerminals)
    } catch (error) {
      console.error('Erro ao carregar terminais:', error)
    } finally {
      setIsLoadingTerminais(false)
    }
  }, [auth])

  // Debounce para busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchOperacoesCaixa(true)
    }, 1000)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, statusFilter, terminalFilter, periodo, periodoInicial, periodoFinal, dataAberturaFilter])

  // Scroll infinito
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

      if (isNearBottom && canLoadMore && !isLoadingMore && !isLoading) {
        fetchOperacoesCaixa(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [canLoadMore, isLoadingMore, isLoading, fetchOperacoesCaixa])

  // Carrega mais itens automaticamente se a lista inicial não preencher a tela
  useEffect(() => {
    if (!isLoading && !isLoadingMore && canLoadMore && operacoesCaixa.length > 0) {
      const container = scrollContainerRef.current
      if (container) {
        const { scrollHeight, clientHeight } = container
        // Se não há scroll (conteúdo cabe na tela), carrega mais itens
        if (scrollHeight <= clientHeight) {
          // Usa um pequeno delay para evitar múltiplas chamadas
          const timeoutId = setTimeout(() => {
            if (canLoadMore && !isLoadingMore && !isLoading) {
              fetchOperacoesCaixa(false)
            }
          }, 300)
          return () => clearTimeout(timeoutId)
        }
      }
    }
  }, [isLoading, isLoadingMore, canLoadMore, operacoesCaixa.length, fetchOperacoesCaixa])

  // Atualiza período quando muda
  useEffect(() => {
    // Cancela o debounce anterior para evitar conflitos
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (periodo !== 'Todos') {
      // Sempre recalcula o período quando muda, independente de valores anteriores
      const { inicio, fim } = calculatePeriodo(periodo)
      setPeriodoInicial(inicio)
      setPeriodoFinal(fim)
      // Limpa o filtro de data de abertura individual quando usa período pré-definido
      setDataAberturaFilter(null)
      setDataAberturaInputValue('')
      previousDateValueRef.current = ''
      
      // Atualiza os refs manualmente
      filtersRef.current = {
        ...filtersRef.current,
        periodo,
        periodoInicial: inicio,
        periodoFinal: fim,
        dataAberturaFilter: null,
      }
      
      // Dispara a busca imediatamente com reset da página (sem debounce)
      fetchOperacoesCaixa(true)
    } else if (periodo === 'Todos') {
      // Limpa os filtros de período
      setPeriodoInicial(null)
      setPeriodoFinal(null)
      
      // Atualiza os refs manualmente
      filtersRef.current = {
        ...filtersRef.current,
        periodo: 'Todos',
        periodoInicial: null,
        periodoFinal: null,
      }
      
      // Dispara a busca imediatamente com reset da página (sem debounce)
      fetchOperacoesCaixa(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  // Sincroniza o valor do input com o filtro de data de abertura quando limpo externamente
  useEffect(() => {
    if (!dataAberturaFilter && dataAberturaInputValue) {
      // Se o filtro foi limpo externamente (ex: botão limpar filtros), limpa o input também
      setDataAberturaInputValue('')
    }
  }, [dataAberturaFilter])

  // Carrega dados iniciais
  useEffect(() => {
    loadAllTerminais()
    fetchOperacoesCaixa(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Limpa todos os filtros
   */
  const handleClearFilters = () => {
    // Cancela o debounce anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Limpa todos os estados
    setSearchQuery('')
    setPeriodo('Todos')
    setStatusFilter(null)
    setTerminalFilter(null)
    setPeriodoInicial(null)
    setPeriodoFinal(null)
    setDataAberturaFilter(null)
    setDataAberturaInputValue('')
    previousDateValueRef.current = ''

    // Atualiza os refs manualmente para garantir que estão sincronizados
    filtersRef.current = {
      searchQuery: '',
      periodo: 'Todos',
      statusFilter: null,
      terminalFilter: null,
      periodoInicial: null,
      periodoFinal: null,
      dataAberturaFilter: null,
    }

    // Dispara a busca imediatamente sem debounce
    fetchOperacoesCaixa(true)
  }

  /**
   * Confirma seleção de datas e aplica filtro
   */
  const handleConfirmDatas = (dataInicial: Date | null, dataFinal: Date | null) => {
    // Cancela o debounce anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setPeriodoInicial(dataInicial)
    setPeriodoFinal(dataFinal)
    if (dataInicial || dataFinal) {
      setPeriodo('Todos')
    }

    // Atualiza os refs manualmente para garantir que estão sincronizados
    filtersRef.current = {
      ...filtersRef.current,
      periodoInicial: dataInicial,
      periodoFinal: dataFinal,
      periodo: dataInicial || dataFinal ? 'Todos' : filtersRef.current.periodo,
    }

    // Dispara a busca imediatamente sem debounce
    fetchOperacoesCaixa(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Container principal */}
      <div className="bg-primary-background rounded-t-lg rounded-b-lg px-2">
        {/* Título */}
        <div className="px-4 pt-1">
          <h1 className="text-xl font-exo font-semibold text-primary">Histórico de Fechamento de Caixa</h1>
        </div>
        {/* Filtros Avançados */}
        <div className="bg-custom-2 rounded-t-lg px-2 pt-1 pb-2 flex flex-wrap items-end gap-x-2 gap-y-4">
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Status</label>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                displayEmpty
                sx={{
                  height: '32px',
                  backgroundColor: 'var(--color-info)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                <MenuItem value="aberto">Aberto</MenuItem>
                <MenuItem value="fechado">Fechado</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Terminal */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Terminal</label>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={terminalFilter || ''}
                onChange={(e) => setTerminalFilter(e.target.value || null)}
                disabled={isLoadingTerminais}
                displayEmpty
                sx={{
                  height: '32px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {terminais.map((terminal) => (
                  <MenuItem key={terminal.id} value={terminal.id}>
                    {terminal.codigoInterno}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Data Abertura */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Data Abertura</label>
            <div className="relative">
              <MdCalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none" size={18} />
              <input
                type="date"
                value={dataAberturaInputValue}
                onChange={(e) => {
                  const value = e.target.value
                  // Atualiza o valor do input visualmente
                  setDataAberturaInputValue(value)
                  
                  // Detecta quando uma data completa foi selecionada (clicada)
                  // Compara com o valor anterior para garantir que é uma seleção real, não apenas navegação
                  if (value && value.length === 10) {
                    const previousValue = previousDateValueRef.current
                    
                    // Se não havia valor anterior, é a primeira vez que o calendário abre
                    // Neste caso, não aplica o filtro (evita usar o dia pré-selecionado)
                    if (!previousValue) {
                      // Apenas armazena o valor para comparação futura, mas não aplica o filtro
                      previousDateValueRef.current = value
                      return
                    }
                    
                    // Se o valor mudou, verifica se foi uma seleção real ou apenas navegação
                    if (value !== previousValue) {
                      // Extrai dia, mês e ano de ambos os valores
                      const [year, month, day] = value.split('-').map(Number)
                      const [prevYear, prevMonth, prevDay] = previousValue.split('-').map(Number)
                      
                      // Se apenas o mês mudou mas o dia permaneceu o mesmo, é navegação no calendário
                      // Não aplica o filtro neste caso
                      if (day === prevDay && month !== prevMonth) {
                        // Apenas atualiza a referência, mas não aplica o filtro
                        previousDateValueRef.current = value
                        return
                      }
                      
                      // Se o dia mudou, é uma seleção real do usuário
                      // Cria data no timezone local para evitar problemas de UTC
                      const date = new Date(year, month - 1, day)
                      // Verifica se a data é válida
                      if (!isNaN(date.getTime())) {
                        // Compara com a data atual do filtro para evitar atualizações desnecessárias
                        const currentDateStr = dataAberturaFilter 
                          ? dataAberturaFilter.toISOString().split('T')[0] 
                          : null
                        if (value !== currentDateStr) {
                          setDataAberturaFilter(date)
                          previousDateValueRef.current = value
                        }
                      }
                    }
                  } else if (!value) {
                    // Se o campo foi limpo, remove o filtro
                    setDataAberturaFilter(null)
                    previousDateValueRef.current = ''
                  }
                }}
                onBlur={(e) => {
                  // Fallback: se o usuário fechar o calendário, aplica o valor apenas se for uma seleção válida
                  const value = e.target.value
                  if (value && value.length === 10) {
                    const previousValue = previousDateValueRef.current
                    
                    // Se não havia valor anterior ou o valor mudou significativamente, aplica
                    if (!previousValue || value !== previousValue) {
                      const [year, month, day] = value.split('-').map(Number)
                      const date = new Date(year, month - 1, day)
                      if (!isNaN(date.getTime())) {
                        const currentDateStr = dataAberturaFilter 
                          ? dataAberturaFilter.toISOString().split('T')[0] 
                          : null
                        // Só aplica se for diferente da data atual do filtro
                        if (value !== currentDateStr) {
                          setDataAberturaFilter(date)
                          previousDateValueRef.current = value
                        }
                      }
                    }
                  }
                }}
                className="w-[180px] h-8 pl-10 pr-8 rounded-lg bg-white border border-gray-300 text-sm font-nunito text-primary-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {dataAberturaFilter && (
                <button
                  onClick={() => {
                    setDataAberturaFilter(null)
                    setDataAberturaInputValue('')
                    previousDateValueRef.current = ''
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text"
                >
                  <MdClose size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
          {/* Label Período */}
          <span className="text-primary text-xs font-exo">Período:</span>

          {/* Dropdown Período */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              sx={{
                height: '32px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                fontSize: '13px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--color-primary)',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
            >
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="Hoje">Hoje</MenuItem>
              <MenuItem value="Ontem">Ontem</MenuItem>
              <MenuItem value="Últimos 7 Dias">Últimos 7 Dias</MenuItem>
              <MenuItem value="Mês Atual">Mês Atual</MenuItem>
              <MenuItem value="Mês Passado">Mês Passado</MenuItem>
              <MenuItem value="Últimos 30 Dias">Últimos 30 Dias</MenuItem>
              <MenuItem value="Últimos 60 Dias">Últimos 60 Dias</MenuItem>
              <MenuItem value="Últimos 90 Dias">Últimos 90 Dias</MenuItem>
            </Select>
          </FormControl>
          </div>

          {/* Botão Por Datas */}
          <button
            onClick={() => setIsDatasModalOpen(true)}
            className="h-8 px-4 bg-primary text-white rounded-lg flex items-center gap-2 text-sm font-nunito hover:bg-primary/90 transition-colors"
          >
            <MdCalendarToday size={18} />
            Por datas
          </button>

          {/* Botão Limpar Filtros */}
          <button
            onClick={handleClearFilters}
            className="h-8 px-4 bg-primary text-white rounded-lg flex items-center gap-2 text-sm font-nunito hover:bg-primary/90 transition-colors mt-6"
          >
            <MdFilterAltOff size={18} />
            Limpar Filtros
          </button>
        </div>
         {/* Filtros Superiores */}
         <div className="flex items-center h-10 py-1">
          <span className="text-primary text-xs font-exo pr-2.5">Pesquisar por Código ou Nome do Terminal: </span>
          {/* Campo de Pesquisa */}
          <div className="flex-1 relative max-w-[300px]">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-10 pr-4 rounded-lg bg-info border shadow-sm text-sm font-nunito"
            />
          </div>
        </div>

        {/* Cabeçalho da Tabela */}
        <div className="bg-primary px-3 py-2 flex items-center text-info text-sm font-nunito font-semibold">
          <div className="flex-1">Cód. Terminal</div>
          <div className="flex-1">Terminal</div>
          <div className="flex-1">Fechado por</div>
          <div className="flex-1">Data Abertura</div>
          <div className="flex-1">Data Fechamento</div>
          <div className="flex-1 text-center">Período Aberto</div>
          <div className="flex-1 text-center">Status</div>
        </div>

        {/* Lista de Operações */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-primary-background"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          {isLoading && operacoesCaixa.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <CircularProgress />
            </div>
          ) : operacoesCaixa.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <p className="text-secondary-text">Nenhuma operação de caixa encontrada.</p>
            </div>
          ) : (
            <>
              {operacoesCaixa.map((operacao) => {
                const dataAbertura = formatDateList(operacao.dataAbertura)
                const dataFechamento = operacao.dataFechamento ? formatDateList(operacao.dataFechamento) : null
                const periodoAberto = calcularPeriodoAberto(operacao.dataAbertura, operacao.dataFechamento)

                return (
                  <div
                    key={operacao.id}
                    onClick={() => {
                      setSelectedOperacaoId(operacao.id)
                      setIsDetalhesModalOpen(true)
                    }}
                    className="mx-2 my-1 px-3 py-2 rounded-lg bg-info cursor-pointer transition-all hover:bg-primary-background hover:shadow-md"
                  >
                    <div className="flex items-center text-sm font-nunito text-primary-text">
                      <div className="flex-1">{operacao.codigoTerminal || '-'}</div>
                      <div className="flex-1">{operacao.nomeTerminal || '-'}</div>
                      <div className="flex-1">{operacao.nomeResponsavelFechamento || '-'}</div>
                      <div className="flex-1">
                        {dataAbertura.date}, {dataAbertura.time}
                      </div>
                      <div className="flex-1">
                        {dataFechamento ? `${dataFechamento.date}, ${dataFechamento.time}` : '-'}
                      </div>
                      <div className="flex-1 text-center">{periodoAberto}</div>
                      <div className="flex-1 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            operacao.status === 'aberto'
                              ? 'bg-warning text-white'
                              : 'bg-success text-white'
                          }`}
                        >
                          {operacao.status === 'aberto' ? 'Aberto' : 'Fechado'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {isLoadingMore && (
                <div className="flex justify-center items-center py-4">
                  <CircularProgress size={24} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Seleção de Datas */}
      <EscolheDatasModal
        open={isDatasModalOpen}
        onClose={() => setIsDatasModalOpen(false)}
        onConfirm={handleConfirmDatas}
        dataInicial={periodoInicial}
        dataFinal={periodoFinal}
      />

      {/* Modal de Detalhes do Fechamento */}
      {selectedOperacaoId && (
        <DetalhesFechamento
          idOperacaoCaixa={selectedOperacaoId}
          open={isDetalhesModalOpen}
          onClose={() => {
            setIsDetalhesModalOpen(false)
            setSelectedOperacaoId(null)
          }}
        />
      )}
    </div>
  )
}


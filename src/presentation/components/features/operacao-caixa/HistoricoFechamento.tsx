'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdSearch, MdCalendarToday, MdFilterAltOff, MdFilterList, MdClose } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  CircularProgress,
} from '@mui/material'
import { sxEntradaCompactaProdutoSelect } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { useDashboardFaturamentoPorDiaQuery } from '@/src/presentation/hooks/useDashboardFaturamentoPorDiaQuery'
import {
  primeiroMesQuadroDuploCalendario,
  periodoFetchFaturamentoCalendarioDoisMeses,
} from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { combinarIntervaloCalendarParaDatas } from '@/src/shared/utils/intervaloCalendarioComHoras'
import { startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
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

/** Meses curtos — exibição do intervalo "Por datas" (alinhado a `VendasList`). */
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const

function formatarDataHoraFiltroCurta(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = MESES_ABREV[date.getMonth()]
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dia}-${mes} ${h}:${min}`
}

/** HH:mm a partir de Date — mesmo contrato do `VendasList` / calendário de intervalo. */
function formatarHoraParaInputCalendar(d: Date | null | undefined): string {
  if (!d) return '00:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Mantém só dígitos e aplica máscara dd/mm/aaaa durante a digitação (sem calendário nativo). */
function aplicarMascaraDataDigitos(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** Interpreta string dd/mm/aaaa completa no fuso local; retorna null se inválida. */
function parseDataDDMMAAAA(texto: string): Date | null {
  const m = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const dia = Number(m[1])
  const mes = Number(m[2])
  const ano = Number(m[3])
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  const data = new Date(ano, mes - 1, dia)
  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null
  }
  return data
}

/** Borda do Select outlined — mesmo critério que `VendasList`. */
const sxHistoricoFiltroOutlinedInputRoot = {
  backgroundColor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
    borderWidth: 1,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: 1,
    borderColor: 'var(--color-primary)',
  },
} as const

const sxHistoricoFiltroLabel = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
    fontSize: '0.975rem',
    fontFamily: '"Nunito", sans-serif',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
  },
} as const

/** Selects de filtro: label na borda (outlined), alinhado a `VendasList`. */
const sxHistoricoFiltroSelectBase = {
  ...sxEntradaCompactaProdutoSelect,
  minWidth: 200,
  ...sxHistoricoFiltroLabel,
  '& .MuiOutlinedInput-root': {
    ...sxHistoricoFiltroOutlinedInputRoot,
    height: 35,
    minHeight: 35,
    padding: '4px 2px 4px 0',
  },
} as const

const sxHistoricoFiltroSelectStatus = {
  ...sxHistoricoFiltroSelectBase,
  '& .MuiOutlinedInput-root': {
    ...sxHistoricoFiltroOutlinedInputRoot,
    backgroundColor: 'var(--color-info)',
    height: 35,
    minHeight: 35,
    padding: '4px 2px 4px 0',
  },
} as const

/** Campo data: mesma tipografia de label/borda dos selects. */
const sxHistoricoFiltroTextFieldDate = {
  minWidth: 200,
  marginTop: 0,
  marginBottom: 0,
  ...sxHistoricoFiltroLabel,
  '& .MuiOutlinedInput-root': {
    ...sxHistoricoFiltroOutlinedInputRoot,
    backgroundColor: '#fff',
    fontFamily: '"Nunito", sans-serif',
    height: 35,
    minHeight: 35,
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
    lineHeight: 1,
    padding: '6px 4px',
    fontFamily: '"Nunito", sans-serif',
  },
  '& .MuiInputAdornment-root': {
    height: 35,
    maxHeight: 35,
    marginRight: 0,
  },
} as const

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
  /** Texto mascarado dd/mm/aaaa — não usa `<input type="date">` para não abrir o calendário nativo. */
  const [dataAberturaInputValue, setDataAberturaInputValue] = useState<string>('')
  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false)
  /** Rascunho do painel lateral (calendário duplo + horas) — mesmo fluxo que `VendasList`. */
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(undefined)
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')
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
  const [filtrosVisiveis, setFiltrosVisiveis] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 768 // md breakpoint
  })

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

  const periodoFaturamentoCalendarioModal = useMemo(
    () => periodoFetchFaturamentoCalendarioDoisMeses(mesCalendarioIntervalo),
    [mesCalendarioIntervalo]
  )

  const {
    data: faturamentoPorDiaCalendario,
    isPending: faturamentoCalendarioPending,
    isFetching: faturamentoCalendarioFetching,
  } = useDashboardFaturamentoPorDiaQuery({
    periodoInicial: periodoFaturamentoCalendarioModal.inicio,
    periodoFinal: periodoFaturamentoCalendarioModal.fim,
    enabled: isDatasModalOpen,
  })

  // Ao abrir o painel, sincroniza rascunho com o filtro "Por datas" ou padrão (hoje)
  useEffect(() => {
    if (!isDatasModalOpen) return
    if (periodoInicial && periodoFinal) {
      setRascunhoIntervaloRange({
        from: startOfDay(periodoInicial),
        to: startOfDay(periodoFinal),
      })
      setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(startOfDay(periodoFinal)))
      setRascunhoHoraInicio(formatarHoraParaInputCalendar(periodoInicial))
      setRascunhoHoraFim(formatarHoraParaInputCalendar(periodoFinal))
    } else {
      const hoje = startOfDay(new Date())
      setRascunhoIntervaloRange({ from: hoje, to: hoje })
      setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(hoje))
      setRascunhoHoraInicio('00:00')
      setRascunhoHoraFim('23:59')
    }
  }, [isDatasModalOpen, periodoInicial, periodoFinal])

  /** Se o DayPicker enviar intervalo vazio, volta ao padrão de um dia (hoje). */
  const handleRascunhoIntervaloRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoIntervaloRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
  }, [])

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
   * Confirma seleção de datas e aplica filtro (chamado após "Aplicar" no painel do calendário).
   */
  const handleConfirmDatas = useCallback(
    (dataInicial: Date | null, dataFinal: Date | null) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      setPeriodoInicial(dataInicial)
      setPeriodoFinal(dataFinal)
      if (dataInicial || dataFinal) {
        setPeriodo('Todos')
      }

      filtersRef.current = {
        ...filtersRef.current,
        periodoInicial: dataInicial,
        periodoFinal: dataFinal,
        periodo: dataInicial || dataFinal ? 'Todos' : filtersRef.current.periodo,
      }

      fetchOperacoesCaixa(true)
    },
    [fetchOperacoesCaixa]
  )

  const handleAplicarIntervaloHistorico = useCallback(() => {
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      rascunhoIntervaloRange,
      rascunhoHoraInicio,
      rascunhoHoraFim
    )
    if (!dataInicial || !dataFinal) return
    handleConfirmDatas(dataInicial, dataFinal)
    setIsDatasModalOpen(false)
  }, [rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim, handleConfirmDatas])

  return (
    <div className="flex flex-col h-full">
      {/* Container principal */}
      <div className="bg-primary-background rounded-t-lg rounded-b-lg">
        {/* Título */}
        <div className="md:px-[30px] py-1 flex flex-col md:flex-row items-center justify-between">
          <h1 className="text-lg font-exo font-semibold text-primary">Histórico - Fechamento de Caixa</h1>
          <div className="flex w-full md:w-auto flex-row items-end justify-end gap-2">
          <button
            type="button"
            onClick={() => setFiltrosVisiveis((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1 rounded-md bg-primary text-white text-xs md:text-sm font-nunito shadow-sm"
            aria-expanded={filtrosVisiveis}
          >
            {filtrosVisiveis ? <MdFilterAltOff size={18} /> : <MdFilterList size={18} />}
            <span>{filtrosVisiveis ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>
          </div>
        </div>
        <div className="h-[1px] border-t-2 border-primary/70 flex-shrink-0"></div>
        {/* Filtros Avançados */}
        <div className={`bg-custom-2 mt-1 pt-3 rounded-t-lg px-2 pb-1 flex flex-wrap justify-center items-end md:justify-start gap-2 ${filtrosVisiveis ? 'flex' : 'hidden'}`}>
        <div className="flex-1 relative w-full md:max-w-[350px]">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
            <input
              type="text"
              placeholder="Digite o Código ou Terminal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-lg bg-info border shadow-sm text-sm font-nunito"
            />
          </div>
          {/* Status — outlined, rótulo na borda (padrão VendasList) */}
          <FormControl size="small" variant="outlined" sx={sxHistoricoFiltroSelectStatus}>
            <InputLabel id="hf-filtro-status-label" shrink>
              Status
            </InputLabel>
            <Select
              labelId="hf-filtro-status-label"
              label="Status"
              value={statusFilter || ''}
              onChange={e => setStatusFilter(e.target.value || null)}
              displayEmpty
              className="font-nunito"
            >
              <MenuItem value="">
                <span className="text-secondary-text">Selecione...</span>
              </MenuItem>
              <MenuItem value="aberto">Aberto</MenuItem>
              <MenuItem value="fechado">Fechado</MenuItem>
            </Select>
          </FormControl>

          {/* Terminal */}
          <FormControl size="small" variant="outlined" sx={sxHistoricoFiltroSelectBase}>
            <InputLabel id="hf-filtro-terminal-label" shrink>
              Terminal
            </InputLabel>
            <Select
              labelId="hf-filtro-terminal-label"
              label="Terminal"
              value={terminalFilter || ''}
              onChange={e => setTerminalFilter(e.target.value || null)}
              disabled={isLoadingTerminais}
              displayEmpty
              className="font-nunito"
            >
              <MenuItem value="">
                <span className="text-secondary-text">Selecione...</span>
              </MenuItem>
              {terminais.map(terminal => (
                <MenuItem key={terminal.id} value={terminal.id}>
                  {terminal.codigoInterno}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Data Abertura — texto com máscara dd/mm/aaaa; filtro só após data completa e válida */}
          <TextField
            type="text"
            size="small"
            variant="outlined"
            label="Data Abertura"
            placeholder="dd/mm/aaaa"
            value={dataAberturaInputValue}
            onChange={e => {
              const masked = aplicarMascaraDataDigitos(e.target.value)
              setDataAberturaInputValue(masked)

              const digitos = masked.replace(/\D/g, '')
              if (digitos.length === 8) {
                const parsed = parseDataDDMMAAAA(masked)
                setDataAberturaFilter(parsed)
              } else {
                setDataAberturaFilter(null)
              }
            }}
            autoComplete="off"
            inputProps={{ inputMode: 'numeric', maxLength: 10 }}
            InputLabelProps={{ shrink: true }}
            sx={sxHistoricoFiltroTextFieldDate}
            InputProps={{
              endAdornment:
                dataAberturaFilter || dataAberturaInputValue ? (
                  <InputAdornment position="end">
                    <button
                      type="button"
                      onClick={() => {
                        setDataAberturaFilter(null)
                        setDataAberturaInputValue('')
                      }}
                      className="flex text-secondary-text hover:text-primary-text"
                      aria-label="Limpar data"
                    >
                      <MdClose size={16} />
                    </button>
                  </InputAdornment>
                ) : undefined,
            }}
          />
          {/* Dropdown Período */}
          <div className="flex flex-row flex-wrap items-center gap-3">
          <span className="text-primary text-sm font-exo">Período:</span>
          <FormControl size="small" sx={{ minWidth: 120 }}>
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
              <MenuItem value="Mês Atual">Mês Atual</MenuItem>
              <MenuItem value="Últimos 7 Dias">Últimos 7 Dias</MenuItem>
              <MenuItem value="Últimos 30 Dias">Últimos 30 Dias</MenuItem>
              <MenuItem value="Últimos 60 Dias">Últimos 60 Dias</MenuItem>
              <MenuItem value="Últimos 90 Dias">Últimos 90 Dias</MenuItem>
            </Select>
          </FormControl>
          

          {/* Botão Por Datas */}
          <button
            type="button"
            onClick={() => setIsDatasModalOpen(true)}
            className="font-nunito flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
          >
            <MdCalendarToday size={18} />
            Por datas
          </button>
          {periodoInicial && periodoFinal ? (
            <div className="flex shrink-0 flex-col gap-0 text-[11px] leading-snug text-primary/85 sm:text-xs">
              <span className="whitespace-nowrap">
                Dt. Ini.: {formatarDataHoraFiltroCurta(periodoInicial)}
              </span>
              <span className="whitespace-nowrap">
                Dt. Fim: {formatarDataHoraFiltroCurta(periodoFinal)}
              </span>
            </div>
          ) : null}
          
          </div>
          {/* Botão Limpar Filtros */}
          <button
            onClick={handleClearFilters}
            className="h-8 px-4 bg-primary text-white rounded-lg flex items-center gap-2 text-sm font-nunito hover:bg-primary/90 transition-colors"
          >
            <MdFilterAltOff size={18} />
            Limpar Filtros
          </button>
        </div>
        

        {/* Cabeçalho da Tabela */}
        <div className="bg-custom-2 mt-2 px-3 py-2 flex items-center text-primary-text text-sm font-nunito font-semibold">
          <div className="flex-1 hidden md:flex">Cód. Terminal</div>
          <div className="flex-[1.5] text-[11px] md:text-sm">Terminal</div>
          <div className="flex-[2] hidden md:block">Fechado por</div>
          <div className="flex-1 text-[11px] md:text-sm">Dt. Aberto</div>
          <div className="flex-1 text-[11px] md:text-sm">Dt. Fechado</div>
          <div className="flex-1 text-center hidden md:block">Período Aberto</div>
          <div className="flex-1 md:text-center text-right text-[11px] md:text-sm">Status</div>
        </div>

        {/* Lista de Operações */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-primary-background scrollbar-hide"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          {isLoading && operacoesCaixa.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <JiffyLoading />
            </div>
          ) : operacoesCaixa.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <p className="text-secondary-text">Nenhuma operação de caixa encontrada.</p>
            </div>
          ) : (
            <>
              {operacoesCaixa.map((operacao, index) => {
                const dataAbertura = formatDateList(operacao.dataAbertura)
                const dataFechamento = operacao.dataFechamento ? formatDateList(operacao.dataFechamento) : null
                const periodoAberto = calcularPeriodoAberto(operacao.dataAbertura, operacao.dataFechamento)
                const isZebraEven = index % 2 === 0

                return (
                  <div
                    key={operacao.id}
                    onClick={() => {
                      setSelectedOperacaoId(operacao.id)
                      setIsDetalhesModalOpen(true)
                    }}
                    className={`md:mx-2 md:p-3 p-2 rounded-lg cursor-pointer transition-all ${isZebraEven ? 'bg-white hover:bg-primary/10' : 'bg-gray-50 hover:bg-primary/10'}`}
                  >
                    <div className="flex items-center text-sm font-nunito text-primary-text">
                      <div className="flex-1 hidden md:block">{operacao.codigoTerminal || '-'}</div>
                      <div className="flex-[1.5] text-[11px] md:text-sm">{operacao.nomeTerminal || '-'}</div>
                      <div className="flex-[2] hidden md:block">{operacao.nomeResponsavelFechamento || '-'}</div>
                      <div className="flex-1 flex flex-col items-center md:items-start text-[11px] md:text-sm text-center md:text-left">
                        <span className="">{dataAbertura.date}</span>
                        <span className="">{dataAbertura.time}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center md:items-start text-[11px] md:text-sm text-center md:text-left">
                        <span className="">{dataFechamento ? dataFechamento.date : '-'}</span>
                        <span className="">{dataFechamento ? dataFechamento.time : ''}</span>
                      </div>
                      <div className="flex-1 text-center hidden md:block">{periodoAberto}</div>
                      <div className="flex-1 flex items-end md:justify-center justify-end">
                        <span
                          className={`md:px-3 px-1 py-1 rounded md:text-xs text-[10px] md:font-semibold ${
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

      {/* Painel lateral: calendário de intervalo + horas (igual `VendasList`) */}
      <JiffySidePanelModal
        open={isDatasModalOpen}
        onClose={() => setIsDatasModalOpen(false)}
        title="Escolha o período"
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to}
            onClick={handleAplicarIntervaloHistorico}
            className="flex h-full w-full items-center justify-center rounded-b-l-lg bg-primary font-nunito text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
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
            month={mesCalendarioIntervalo}
            onMonthChange={setMesCalendarioIntervalo}
            faturamentoPorDia={faturamentoPorDiaCalendario ?? {}}
            faturamentoCarregando={faturamentoCalendarioPending || faturamentoCalendarioFetching}
            horaInicio={rascunhoHoraInicio}
            horaFim={rascunhoHoraFim}
            onHorariosChange={(hi, hf) => {
              setRascunhoHoraInicio(hi)
              setRascunhoHoraFim(hf)
            }}
          />
        </div>
      </JiffySidePanelModal>

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


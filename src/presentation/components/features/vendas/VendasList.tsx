'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdSearch, MdAttachMoney, MdCalendarToday, MdFilterAltOff } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { DetalhesVendas } from './DetalhesVendas'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'

// Tipos
interface Venda {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: 'balcao' | 'mesa'
  abertoPorId: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataCancelamento?: string
  dataFinalizacao?: string
  metodoPagamento?: string
  status?: string
}

interface MetricasVendas {
  totalFaturado: number
  countVendasEfetivadas: number
  countVendasCanceladas: number
  countProdutosVendidos: number
}

interface UsuarioPDV {
  id: string
  nome: string
}

interface MeioPagamento {
  id: string
  nome: string
}

interface Terminal {
  id: string
  nome: string
}

/**
 * Componente de listagem de vendas
 * Implementa scroll infinito, filtros avançados e cards de métricas
 */
export function VendasList() {
  const { auth } = useAuthStore()

  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [valorMinimo, setValorMinimo] = useState('')
  const [valorMaximo, setValorMaximo] = useState('')
  const [periodo, setPeriodo] = useState<string>('Todos')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [tipoVendaFilter, setTipoVendaFilter] = useState<string | null>(null)
  const [meioPagamentoFilter, setMeioPagamentoFilter] = useState<string>('')
  const [usuarioAbertoPorFilter, setUsuarioAbertoPorFilter] = useState<string>('')
  const [terminalFilter, setTerminalFilter] = useState<string>('')
  const [usuarioCancelouFilter, setUsuarioCancelouFilter] = useState<string>('')
  const [periodoInicial, setPeriodoInicial] = useState<Date | null>(null)
  const [periodoFinal, setPeriodoFinal] = useState<Date | null>(null)

  // Estados de dados
  const [vendas, setVendas] = useState<Venda[]>([])
  const [metricas, setMetricas] = useState<MetricasVendas | null>(null)
  const [usuariosPDV, setUsuariosPDV] = useState<UsuarioPDV[]>([])
  const [meiosPagamento, setMeiosPagamento] = useState<MeioPagamento[]>([])
  const [terminais, setTerminais] = useState<Terminal[]>([])

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [canLoadMore, setCanLoadMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [isLoadingMeiosPagamento, setIsLoadingMeiosPagamento] = useState(false)
  const [isLoadingTerminais, setIsLoadingTerminais] = useState(false)

  const pageSize = 10
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const filtersRef = useRef({
    searchQuery,
    valorMinimo,
    valorMaximo,
    periodo,
    statusFilter,
    tipoVendaFilter,
    meioPagamentoFilter,
    usuarioAbertoPorFilter,
    terminalFilter,
    usuarioCancelouFilter,
    periodoInicial,
    periodoFinal,
  })

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    filtersRef.current = {
      searchQuery,
      valorMinimo,
      valorMaximo,
      periodo,
      statusFilter,
      tipoVendaFilter,
      meioPagamentoFilter,
      usuarioAbertoPorFilter,
      terminalFilter,
      usuarioCancelouFilter,
      periodoInicial,
      periodoFinal,
    }
  }, [
    searchQuery,
    valorMinimo,
    valorMaximo,
    periodo,
    statusFilter,
    tipoVendaFilter,
    meioPagamentoFilter,
    usuarioAbertoPorFilter,
    terminalFilter,
    usuarioCancelouFilter,
    periodoInicial,
    periodoFinal,
  ])

  /**
   * Formata valor como moeda brasileira
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  /**
   * Normaliza valor de moeda para número
   */
  const normalizeCurrency = (value: string): number | null => {
    if (!value) return null
    const clean = value.replace(/[^\d,]/g, '')
    const withoutThousands = clean.replace(/\./g, '')
    const withDot = withoutThousands.replace(',', '.')
    return parseFloat(withDot) || null
  }

  /**
   * Formata input de moeda em tempo real
   */
  const formatCurrencyInput = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, '')
    if (!numbers) return ''
    const num = parseFloat(numbers) / 100
    return formatCurrency(num)
  }

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
        const fim = new Date(inicio)
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
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        fim.setHours(23, 59, 59, 999)
        return { inicio, fim }
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
      default:
        return { inicio: null, fim: null }
    }
  }

  /**
   * Carrega todos os usuários PDV
   */
  const loadAllUsuariosPDV = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    try {
      const allUsuarios: UsuarioPDV[] = []
      let currentOffset = 0
      let hasMore = true
      const limit = 100

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
          ativo: 'true',
        })

        const response = await fetch(`/api/usuarios?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) break

        const data = await response.json()
        const newUsuarios = (data.items || []).map((u: any) => ({
          id: u.id,
          nome: u.nome || u.name || 'Sem nome',
        }))

        allUsuarios.push(...newUsuarios)
        hasMore = newUsuarios.length === limit
        currentOffset += newUsuarios.length
      }

      setUsuariosPDV(allUsuarios)
    } catch (error) {
      console.error('Erro ao carregar usuários PDV:', error)
    }
  }, [auth])

  /**
   * Carrega todos os meios de pagamento
   */
  const loadAllMeiosPagamento = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingMeiosPagamento(true)

    try {
      const allMeios: MeioPagamento[] = []
      let currentOffset = 0
      let hasMore = true
      const limit = 100

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
          ativo: 'true',
        })

        const response = await fetch(`/api/meios-pagamentos?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) break

        const data = await response.json()
        const newMeios = (data.items || []).map((m: any) => ({
          id: m.id,
          nome: m.nome || m.name || 'Sem nome',
        }))

        allMeios.push(...newMeios)
        hasMore = newMeios.length === limit
        currentOffset += newMeios.length
      }

      setMeiosPagamento(allMeios)
    } catch (error) {
      console.error('Erro ao carregar meios de pagamento:', error)
    } finally {
      setIsLoadingMeiosPagamento(false)
    }
  }, [auth])

  /**
   * Carrega todos os terminais
   */
  const loadAllTerminais = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingTerminais(true)

    try {
      const allTerminais: Terminal[] = []
      let currentOffset = 0
      let hasMore = true
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

        if (!response.ok) break

        const data = await response.json()
        const newTerminais = (data.items || []).map((t: any) => ({
          id: t.id,
          nome: t.nome || t.name || t.codigoInterno || 'Sem nome',
        }))

        allTerminais.push(...newTerminais)
        hasMore = newTerminais.length === limit
        currentOffset += newTerminais.length
      }

      setTerminais(allTerminais)
    } catch (error) {
      console.error('Erro ao carregar terminais:', error)
    } finally {
      setIsLoadingTerminais(false)
    }
  }, [auth])

  /**
   * Busca vendas com filtros
   */
  const fetchVendas = useCallback(
    async (resetPage = false) => {
      const token = auth?.getAccessToken()
      if (!token) return

      if (resetPage) {
        setIsLoading(true)
        setCurrentPage(0)
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

        if (filters.searchQuery) {
          params.append('q', filters.searchQuery)
        }

        if (filters.tipoVendaFilter) {
          params.append('tipoVenda', filters.tipoVendaFilter.toLowerCase())
        }

        // Status: se null, envia FINALIZADA e CANCELADA
        if (filters.statusFilter) {
          params.append('status', filters.statusFilter.toUpperCase())
        } else {
          params.append('status', 'FINALIZADA')
          params.append('status', 'CANCELADA')
        }

        if (filters.usuarioAbertoPorFilter) {
          params.append('abertoPorId', filters.usuarioAbertoPorFilter)
        }

        if (filters.usuarioCancelouFilter) {
          params.append('canceladoPorId', filters.usuarioCancelouFilter)
        }

        const valorMin = normalizeCurrency(filters.valorMinimo)
        if (valorMin !== null) {
          params.append('valorFinalMinimo', valorMin.toString())
        }

        const valorMax = normalizeCurrency(filters.valorMaximo)
        if (valorMax !== null) {
          params.append('valorFinalMaximo', valorMax.toString())
        }

        if (filters.meioPagamentoFilter) {
          params.append('meioPagamentoId', filters.meioPagamentoFilter)
        }

        if (filters.terminalFilter) {
          params.append('terminalId', filters.terminalFilter)
        }

        if (filters.periodoInicial) {
          params.append('periodoInicial', filters.periodoInicial.toISOString())
        }

        if (filters.periodoFinal) {
          params.append('periodoFinal', filters.periodoFinal.toISOString())
        }

        const response = await fetch(`/api/vendas?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao buscar vendas')
        }

        const data = await response.json()

        if (resetPage) {
          setVendas(data.items || [])
          setCurrentPage(1)
        } else {
          setVendas((prev) => [...prev, ...(data.items || [])])
          setCurrentPage((prev) => prev + 1)
        }

        setMetricas(data.metricas || null)
        setCanLoadMore(data.hasNext || false)
      } catch (error) {
        console.error('Erro ao buscar vendas:', error)
        showToast.error('Erro ao buscar vendas')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [auth, currentPage]
  )

  // Debounce para busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchVendas(true)
    }, 1000)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, statusFilter, tipoVendaFilter, meioPagamentoFilter, usuarioAbertoPorFilter, terminalFilter, usuarioCancelouFilter, periodo])

  // Scroll infinito
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

      if (isNearBottom && canLoadMore && !isLoadingMore && !isLoading) {
        fetchVendas(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [canLoadMore, isLoadingMore, isLoading, fetchVendas])

  // Carrega dados iniciais
  useEffect(() => {
    loadAllUsuariosPDV()
    loadAllMeiosPagamento()
    loadAllTerminais()
    fetchVendas(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atualiza período quando muda
  useEffect(() => {
    const { inicio, fim } = calculatePeriodo(periodo)
    setPeriodoInicial(inicio)
    setPeriodoFinal(fim)
    if (periodo !== 'Todos') {
      fetchVendas(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  /**
   * Limpa todos os filtros
   */
  const handleClearFilters = () => {
    setSearchQuery('')
    setValorMinimo('')
    setValorMaximo('')
    setPeriodo('Todos')
    setStatusFilter(null)
    setTipoVendaFilter(null)
    setMeioPagamentoFilter('')
    setUsuarioAbertoPorFilter('')
    setTerminalFilter('')
    setUsuarioCancelouFilter('')
    setPeriodoInicial(null)
    setPeriodoFinal(null)
    fetchVendas(true)
  }

  /**
   * Handle Enter nos campos de valor
   */
  const handleValorKeyPress = (e: React.KeyboardEvent, field: 'min' | 'max') => {
    if (e.key === 'Enter') {
      fetchVendas(true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Container principal */}
      <div className="bg-primary-background rounded-t-[20px] rounded-b-[10px] px-[18px] pt-[18px] pb-2">
        {/* Título */}
        <h1 className="text-primary text-lg font-exo mb-2">Histórico de Vendas</h1>

        {/* Filtros Superiores */}
        <div className="flex items-center gap-3 mb-3">
          {/* Campo de Pesquisa */}
          <div className="flex-[2] relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por Código ou Identificação da Venda"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchVendas(true)
                }
              }}
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-info border-none shadow-sm text-sm font-nunito"
            />
          </div>

          {/* Valor Mínimo */}
          <div className="relative">
            <MdAttachMoney className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
            <input
              type="text"
              placeholder="Valor Mínimo"
              value={valorMinimo}
              onChange={(e) => {
                const formatted = formatCurrencyInput(e.target.value)
                setValorMinimo(formatted)
              }}
              onKeyPress={(e) => handleValorKeyPress(e, 'min')}
              className="w-32 h-9 pl-10 pr-4 rounded-xl bg-info border-none shadow-sm text-sm font-nunito"
            />
          </div>

          {/* Valor Máximo */}
          <div className="relative">
            <MdAttachMoney className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
            <input
              type="text"
              placeholder="Valor Máximo"
              value={valorMaximo}
              onChange={(e) => {
                const formatted = formatCurrencyInput(e.target.value)
                setValorMaximo(formatted)
              }}
              onKeyPress={(e) => handleValorKeyPress(e, 'max')}
              className="w-32 h-9 pl-10 pr-4 rounded-xl bg-info border-none shadow-sm text-sm font-nunito"
            />
          </div>

          {/* Label Período */}
          <span className="text-primary text-sm font-exo">Período:</span>

          {/* Dropdown Período */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              sx={{
                height: '36px',
                backgroundColor: '#003366',
                color: 'white',
                fontSize: '13px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#003366',
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

          {/* Botão Por Datas */}
          <button
            className="h-9 px-4 bg-primary text-white rounded-lg flex items-center gap-2 text-sm font-nunito hover:bg-primary/90 transition-colors"
          >
            <MdCalendarToday size={18} />
            Por datas
          </button>
        </div>

        {/* Filtros Avançados */}
        <div className="bg-[#18003366] rounded-t-[20px] px-2 pt-1.5 pb-2 mb-4 flex flex-wrap gap-x-1.5 gap-y-4">
          {/* Status da Venda */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Status da Venda</label>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                displayEmpty
                sx={{
                  height: '36px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                <MenuItem value="Aberta">Aberta</MenuItem>
                <MenuItem value="Finalizada">Finalizada</MenuItem>
                <MenuItem value="Cancelada">Cancelada</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Tipo de Venda */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Tipo de Venda</label>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={tipoVendaFilter || ''}
                onChange={(e) => setTipoVendaFilter(e.target.value || null)}
                displayEmpty
                sx={{
                  height: '36px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                <MenuItem value="balcao">Balcão</MenuItem>
                <MenuItem value="mesa">Mesa</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Meio de Pagamento */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Meio de Pagamento</label>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={meioPagamentoFilter}
                onChange={(e) => setMeioPagamentoFilter(e.target.value)}
                disabled={isLoadingMeiosPagamento}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: '400px',
                    },
                  },
                }}
                sx={{
                  height: '36px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {meiosPagamento.map((meio) => (
                  <MenuItem key={meio.id} value={meio.id}>
                    {meio.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Vendas por Usuário */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Vendas por Usuário</label>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={usuarioAbertoPorFilter}
                onChange={(e) => setUsuarioAbertoPorFilter(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: '400px',
                    },
                  },
                }}
                sx={{
                  height: '36px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {usuariosPDV.map((usuario) => (
                  <MenuItem key={usuario.id} value={usuario.id}>
                    {usuario.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Terminal */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Terminal</label>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={terminalFilter}
                onChange={(e) => setTerminalFilter(e.target.value)}
                disabled={isLoadingTerminais}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: '400px',
                    },
                  },
                }}
                sx={{
                  height: '36px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {terminais.map((terminal) => (
                  <MenuItem key={terminal.id} value={terminal.id}>
                    {terminal.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Usuário Cancelou */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Usuário Cancelou</label>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={usuarioCancelouFilter}
                onChange={(e) => setUsuarioCancelouFilter(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: '400px',
                    },
                  },
                }}
                sx={{
                  height: '36px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {usuariosPDV.map((usuario) => (
                  <MenuItem key={usuario.id} value={usuario.id}>
                    {usuario.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Botão Limpar Filtros */}
          <button
            onClick={handleClearFilters}
            className="h-[46px] px-4 bg-alternate text-white rounded-lg flex items-center gap-2 text-sm font-nunito hover:bg-alternate/90 transition-colors"
          >
            <MdFilterAltOff size={18} />
            Limpar Filtros
          </button>
        </div>

        {/* Cards de Métricas */}
        <div className="flex gap-[30px] mb-4">
          {/* Vendas Finalizadas/Em Aberto */}
          <div className="flex-1 h-20 bg-info rounded-[10px] p-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-alternate flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl">🛒</span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">
                {statusFilter === 'Aberta' ? 'Vendas em Aberto' : 'Vendas Finalizadas'}
              </span>
              <span className="text-[22px] text-primary font-exo">
                {metricas?.countVendasEfetivadas || 0}
              </span>
            </div>
          </div>

          {/* Vendas Canceladas */}
          <div className="flex-1 h-20 bg-info rounded-[10px] p-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-error flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl">✕</span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">Vendas Canceladas</span>
              <span className="text-[22px] text-primary font-exo">
                {metricas?.countVendasCanceladas || 0}
              </span>
            </div>
          </div>

          {/* Total de Produtos Vendidos */}
          <div className="flex-1 h-20 bg-info rounded-[10px] p-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl">🍽️</span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">Total de Produtos Vendidos</span>
              <span className="text-[22px] text-primary font-exo">
                {metricas?.countProdutosVendidos || 0}
              </span>
            </div>
          </div>

          {/* Total Faturado */}
          <div className="flex-1 h-20 bg-info rounded-[10px] p-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent1 flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl">💰</span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">Total Faturado</span>
              <span className="text-[22px] text-primary font-exo">
                {metricas?.totalFaturado ? formatCurrency(metricas.totalFaturado) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Vendas */}
        <div className="bg-info rounded-[10px] overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-primary px-3 py-1 flex items-center gap-[10px]">
            <div className="flex-1 font-nunito font-semibold text-xs text-white uppercase">
              Código Venda
            </div>
            <div className="flex-1 text-center font-nunito font-semibold text-xs text-white uppercase">
              Data/Hora
            </div>
            <div className="flex-1 text-center font-nunito font-semibold text-xs text-white uppercase">
              Tipo Venda
            </div>
            <div className="flex-1 text-center font-nunito font-semibold text-xs text-white uppercase">
              Cód. Terminal
            </div>
            <div className="flex-[2] text-center font-nunito font-semibold text-xs text-white uppercase">
              Usuário PDV
            </div>
            <div className="flex-1 font-nunito font-semibold text-xs text-white uppercase">
              Valor Final
            </div>
            <div className="flex-1 flex justify-end font-nunito font-semibold text-xs text-white uppercase">
              Cupom
            </div>
          </div>

          {/* Lista com scroll */}
          <div
            ref={scrollContainerRef}
            className="max-h-[calc(100vh-500px)] overflow-y-auto px-3 py-2"
          >
            {vendas.length === 0 && !isLoading && (
              <div className="flex items-center justify-center py-12">
                <p className="text-secondary-text">Nenhuma venda encontrada.</p>
              </div>
            )}

            {vendas.map((venda) => {
              const { date, time } = formatDateList(venda.dataCriacao)
              const usuarioNome =
                usuariosPDV.find((u) => u.id === venda.abertoPorId)?.nome || venda.abertoPorId

              return (
                <div
                  key={venda.id}
                  className="h-[54px] px-[10px] py-2 mb-2 bg-info rounded-[10px] flex items-center gap-[10px] hover:bg-primary-background hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-primary-text font-nunito">
                      #{venda.codigoVenda}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-sm text-primary-text font-nunito">{date}</span>
                    <span className="text-sm text-primary-text font-nunito">{time}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    {venda.tipoVenda === 'mesa' ? (
                      <>
                        <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">🍽️</span>
                        </div>
                        <span className="text-xs text-primary-text">{venda.numeroMesa}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">🍺</span>
                        <span className="text-xs text-primary-text">Balcão</span>
                      </>
                    )}
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-sm text-primary-text font-nunito">
                      #{venda.codigoTerminal}
                    </span>
                  </div>
                  <div className="flex-[2] text-center">
                    <span className="text-sm text-primary-text font-nunito">{usuarioNome}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-primary-text font-nunito">
                      {formatCurrency(venda.valorFinal)}
                    </span>
                  </div>
                  <div className="flex-1 flex justify-end">
                    <button
                      onClick={() => setSelectedVendaId(venda.id)}
                      className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Comprovante de Venda"
                    >
                      📄
                    </button>
                  </div>
                </div>
              )
            })}

            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <CircularProgress size={24} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedVendaId && (
        <DetalhesVendas
          vendaId={selectedVendaId}
          open={!!selectedVendaId}
          onClose={() => setSelectedVendaId(null)}
        />
      )}
    </div>
  )
}


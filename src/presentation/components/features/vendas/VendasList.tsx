'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation' // Importar useRouter e usePathname
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdSearch, MdAttachMoney, MdCalendarToday, MdFilterAltOff, MdRestaurant, MdPrint, MdFilterList } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { DetalhesVendas } from './DetalhesVendas'
import { EscolheDatasModal } from './EscolheDatasModal'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import { TipoVendaIcon } from './TipoVendaIcon'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters' // Importar calculatePeriodo
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
  dataUltimoProdutoLancado?: string
  dataUltimaMovimentacao?: string
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

interface VendasListProps {
  initialPeriodo?: string; // Período inicial vindo da URL (ex: "Hoje", "Últimos 7 Dias")
  initialStatus?: string | null; // Status inicial vindo da URL
}

/**
 * Componente de listagem de vendas
 * Implementa scroll infinito, filtros avançados e cards de métricas
 */
export function VendasList({ initialPeriodo, initialStatus }: VendasListProps) {
  const { auth } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  // Calculamos as datas iniciais com base no initialPeriodo logo no início
  const initialPeriodoValue = initialPeriodo || 'Todos'
  const initialDates = calculatePeriodo(initialPeriodoValue)

  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [valorMinimo, setValorMinimo] = useState('')
  const [valorMaximo, setValorMaximo] = useState('')
  const [periodo, setPeriodo] = useState<string>(initialPeriodoValue)
  const [statusFilter, setStatusFilter] = useState<string | null>(
    initialStatus?.toLowerCase() === 'aberta' ? null : initialStatus || null
  )
  // Se período inicial for "Todos", garante que as datas sejam null
  const [periodoInicial, setPeriodoInicial] = useState<Date | null>(
    initialPeriodoValue === 'Todos' ? null : initialDates.inicio
  )
  const [periodoFinal, setPeriodoFinal] = useState<Date | null>(
    initialPeriodoValue === 'Todos' ? null : initialDates.fim
  )
  const [tipoVendaFilter, setTipoVendaFilter] = useState<string | null>(null);
  const [meioPagamentoFilter, setMeioPagamentoFilter] = useState<string>('');
  const [usuarioAbertoPorFilter, setUsuarioAbertoPorFilter] = useState<string>('');
  const [terminalFilter, setTerminalFilter] = useState<string>('');
  const [usuarioCancelouFilter, setUsuarioCancelouFilter] = useState<string>('');
  const [vendas, setVendas] = useState<Venda[]>([])
  const [metricas, setMetricas] = useState<MetricasVendas | null>(null)
  const [usuariosPDV, setUsuariosPDV] = useState<UsuarioPDV[]>([])
  const [meiosPagamento, setMeiosPagamento] = useState<MeioPagamento[]>([])
  const [terminais, setTerminais] = useState<Terminal[]>([])

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [isLoadingMeiosPagamento, setIsLoadingMeiosPagamento] = useState(false)
  const [isLoadingTerminais, setIsLoadingTerminais] = useState(false)
  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false)
  const [filtrosVisiveisMobile, setFiltrosVisiveisMobile] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const pageSize = 100 // Aumentado para buscar mais itens por página
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

  // Detecta viewport mobile para ajustes responsivos (ex: tamanho do ícone)
  useEffect(() => {
    const updateViewport = () => {
      if (typeof window !== 'undefined') {
        setIsMobileViewport(window.innerWidth < 640)
      }
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

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
    if (!value || value.trim() === '') return null
    
    // Remove todos os caracteres não numéricos exceto vírgula e ponto
    let clean = value.replace(/[^\d,.]/g, '').trim()
    
    if (!clean) return null
    
    // Se tem vírgula, assume formato brasileiro (50,00)
    if (clean.includes(',')) {
      // Remove pontos (separadores de milhar) e substitui vírgula por ponto
      clean = clean.replace(/\./g, '').replace(',', '.')
    }
    // Se só tem ponto, pode ser formato internacional (50.00) ou separador de milhar
    else if (clean.includes('.')) {
      // Se tem mais de um ponto, é separador de milhar, remove todos
      if ((clean.match(/\./g) || []).length > 1) {
        clean = clean.replace(/\./g, '')
      }
      // Se tem só um ponto, pode ser decimal ou milhar
      // Se tem 3 dígitos após o ponto, é milhar, senão é decimal
      const parts = clean.split('.')
      if (parts.length === 2 && parts[1].length === 3) {
        // É milhar, remove o ponto
        clean = clean.replace('.', '')
      }
      // Senão mantém como está (formato internacional)
    }
    
    const num = parseFloat(clean)
    return isNaN(num) ? null : num
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
   * Converte a data UTC do banco para o fuso horário local do navegador
   */
  const formatDateList = (dateString: string): { date: string; time: string } => {
    const date = new Date(dateString)
    
    // Usa métodos locais para converter UTC para o fuso horário do navegador
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleDateString('pt-BR', { month: 'short' })
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    const dateStr = `${day} ${month}`
    const timeStr = `${hours}:${minutes}`
    
    return { date: dateStr, time: timeStr }
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
   * Busca TODAS as vendas com filtros (carrega todas as páginas automaticamente)
   */
  const fetchVendas = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)
    setVendas([]) // Limpa a lista antes de buscar

    try {
      const filters = filtersRef.current

      // Monta os parâmetros base (sem paginação inicial)
      const baseParams = new URLSearchParams()

      if (filters.searchQuery) {
        baseParams.append('q', filters.searchQuery)
      }

      if (filters.tipoVendaFilter) {
        baseParams.append('tipoVenda', filters.tipoVendaFilter.toLowerCase())
      }

      // Status: se null, envia FINALIZADA e CANCELADA
      const normalizedStatus = filters.statusFilter?.toUpperCase()
      if (normalizedStatus && normalizedStatus !== 'ABERTA') {
        baseParams.append('status', normalizedStatus)
      } else {
        baseParams.append('status', 'FINALIZADA')
        baseParams.append('status', 'CANCELADA')
      }

      if (filters.usuarioAbertoPorFilter) {
        baseParams.append('abertoPorId', filters.usuarioAbertoPorFilter)
      }

      if (filters.usuarioCancelouFilter) {
        baseParams.append('canceladoPorId', filters.usuarioCancelouFilter)
      }

      const valorMin = normalizeCurrency(filters.valorMinimo)
      if (valorMin !== null && valorMin > 0) {
        baseParams.append('valorFinalMinimo', valorMin.toString())
      }

      const valorMax = normalizeCurrency(filters.valorMaximo)
      if (valorMax !== null && valorMax > 0) {
        baseParams.append('valorFinalMaximo', valorMax.toString())
      }

      if (filters.meioPagamentoFilter) {
        baseParams.append('meioPagamentoId', filters.meioPagamentoFilter)
      }

      if (filters.terminalFilter) {
        baseParams.append('terminalId', filters.terminalFilter)
      }

      // Só envia parâmetros de período se o período não for "Todos" e as datas estiverem definidas
      if (filters.periodo !== 'Todos' && filters.periodo !== 'Datas Personalizadas') {
        if (filters.periodoInicial) {
          baseParams.append('periodoInicial', filters.periodoInicial.toISOString())
        }
        if (filters.periodoFinal) {
          baseParams.append('periodoFinal', filters.periodoFinal.toISOString())
        }
      } else if (filters.periodo === 'Datas Personalizadas') {
        // Para datas personalizadas, envia as datas que estiverem definidas
        if (filters.periodoInicial) {
          baseParams.append('periodoInicial', filters.periodoInicial.toISOString())
        }
        if (filters.periodoFinal) {
          baseParams.append('periodoFinal', filters.periodoFinal.toISOString())
        }
      }

      // Busca todas as páginas automaticamente
      let allItems: Venda[] = []
      let currentPage = 0
      let totalPages = 1
      let metricasData: MetricasVendas | null = null

      while (currentPage < totalPages) {
        const params = new URLSearchParams(baseParams.toString())
        params.append('limit', pageSize.toString())
        params.append('offset', (currentPage * pageSize).toString())

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

        // Salva as métricas apenas da primeira página
        if (currentPage === 0) {
          metricasData = data.metricas || null
          // Calcula total de páginas
          if (data.totalPages) {
            totalPages = data.totalPages
          } else if (data.count && data.limit) {
            totalPages = Math.ceil(data.count / data.limit)
          } else if ((data.items || []).length < pageSize) {
            totalPages = 1
          }
        }

        // Filtra os itens respeitando o status selecionado
        const filteredItems = (data.items || []).filter((v: Venda) => {
          const normalizedStatus = filters.statusFilter?.toUpperCase()
          
          // Se não há filtro de status ou é "Aberta", mostra todas (finalizadas e canceladas)
          if (!normalizedStatus || normalizedStatus === 'ABERTA') {
            // Se for "Aberta", mostra apenas vendas sem finalização e sem cancelamento
            if (normalizedStatus === 'ABERTA') {
              return !v.dataCancelamento && !v.dataFinalizacao
            }
            // Se não há filtro, mostra finalizadas e canceladas
            return v.dataCancelamento || v.dataFinalizacao
          }
          
          // Se filtro é "CANCELADA", mostra apenas vendas canceladas
          if (normalizedStatus === 'CANCELADA') {
            return !!v.dataCancelamento
          }
          
          // Se filtro é "FINALIZADA", mostra apenas vendas finalizadas
          if (normalizedStatus === 'FINALIZADA') {
            return !!v.dataFinalizacao && !v.dataCancelamento
          }
          
          // Fallback: mostra todas
          return v.dataCancelamento || v.dataFinalizacao
        })

        allItems = [...allItems, ...filteredItems]
        currentPage++

        console.log(`📄 [VendasList] Página ${currentPage}/${totalPages} carregada - ${filteredItems.length} itens filtrados (Total acumulado: ${allItems.length})`)
      }

      // Log detalhado dos filtros e contagem final
      console.log('📊 [VendasList] Filtros aplicados:', {
        periodo: filters.periodo,
        statusFilter: filters.statusFilter || 'Todos (FINALIZADA + CANCELADA)',
        periodoInicial: filters.periodoInicial?.toISOString() || 'Não definido',
        periodoFinal: filters.periodoFinal?.toISOString() || 'Não definido',
        tipoVenda: filters.tipoVendaFilter || 'Todos',
        meioPagamento: filters.meioPagamentoFilter || 'Todos',
        terminal: filters.terminalFilter || 'Todos',
        usuarioAbertoPor: filters.usuarioAbertoPorFilter || 'Todos',
        usuarioCancelou: filters.usuarioCancelouFilter || 'Todos',
        valorMinimo: filters.valorMinimo || 'Não definido',
        valorMaximo: filters.valorMaximo || 'Não definido',
        searchQuery: filters.searchQuery || 'Não definido',
      })
      console.log('📦 [VendasList] Dados recebidos da API:', {
        totalPages: totalPages,
        metricas: metricasData,
      })
      console.log('✅ [VendasList] Total de itens carregados na lista:', {
        totalItemsFiltrados: allItems.length,
        totalPagesCarregadas: currentPage,
      })

      setVendas(allItems)
      setMetricas(metricasData)
    } catch (error) {
      console.error('Erro ao buscar vendas:', error)
      showToast.error('Erro ao buscar vendas')
    } finally {
      setIsLoading(false)
    }
  }, [auth, pageSize])

  // Debounce para busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Para datas personalizadas, busca imediatamente sem debounce
    const isDatasPersonalizadas = periodo === 'Datas Personalizadas'
    const delay = isDatasPersonalizadas ? 100 : 1000

    debounceTimerRef.current = setTimeout(() => {
      fetchVendas()
    }, delay)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, valorMinimo, valorMaximo, statusFilter, tipoVendaFilter, meioPagamentoFilter, usuarioAbertoPorFilter, terminalFilter, usuarioCancelouFilter, periodo, periodoInicial, periodoFinal, fetchVendas])

  // Efeito para carregar dados auxiliares e iniciar a busca de vendas
  useEffect(() => {
    loadAllUsuariosPDV();
    loadAllMeiosPagamento();
    loadAllTerminais();
    // Aciona a busca inicial de vendas com os filtros já configurados
    fetchVendas();
  }, [fetchVendas]); // Dependência apenas do fetchVendas

  // Atualiza período quando muda (apenas se período não for "Datas Personalizadas")
  useEffect(() => {
    if (periodo === 'Datas Personalizadas') {
      return;
    }

    const { inicio, fim } = calculatePeriodo(periodo)
    // Quando período for "Todos", garante que as datas sejam null
    if (periodo === 'Todos') {
      setPeriodoInicial(null)
      setPeriodoFinal(null)
    } else {
      setPeriodoInicial(inicio)
      setPeriodoFinal(fim)
    }
  }, [periodo])

  /**
   * Limpa todos os filtros
   */
  const handleClearFilters = useCallback(() => {
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

    // Remove todos os parâmetros de filtro da URL
    // Verifica se estamos no cliente antes de usar window
    if (typeof window !== 'undefined') {
      const currentSearchParams = new URLSearchParams(window.location.search)
      currentSearchParams.delete('periodo')
      currentSearchParams.delete('status')
      currentSearchParams.delete('q')
      currentSearchParams.delete('valorFinalMinimo')
      currentSearchParams.delete('valorFinalMaximo')
      currentSearchParams.delete('tipoVenda')
      currentSearchParams.delete('meioPagamentoId')
      currentSearchParams.delete('abertoPorId')
      currentSearchParams.delete('terminalId')
      currentSearchParams.delete('canceladoPorId')
      currentSearchParams.delete('periodoInicial')
      currentSearchParams.delete('periodoFinal')

      router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    } else {
      // Se não estiver no cliente, apenas navega sem parâmetros
      router.replace(pathname, { scroll: false })
    }
    router.refresh() // Força a revalidação da rota para recarregar com os filtros limpos
  }, [router, pathname])

  /**
   * Handle Enter nos campos de valor
   */
  const handleValorKeyPress = (e: React.KeyboardEvent, field: 'min' | 'max') => {
    if (e.key === 'Enter') {
      fetchVendas()
    }
  }

  /**
   * Confirma seleção de datas e aplica filtro
   */
  const handleConfirmDatas = (dataInicial: Date | null, dataFinal: Date | null) => {
    // Atualiza o filtersRef imediatamente para garantir que fetchVendas use os valores corretos
    // Isso evita problemas de race condition com o useEffect
    const novoPeriodo = (dataInicial || dataFinal) ? 'Datas Personalizadas' : 'Todos'
    
    filtersRef.current.periodoInicial = dataInicial
    filtersRef.current.periodoFinal = dataFinal
    filtersRef.current.periodo = novoPeriodo
    
    // Atualiza os estados (isso vai disparar o useEffect, mas o filtersRef já está atualizado)
    setPeriodoInicial(dataInicial)
    setPeriodoFinal(dataFinal)
    setPeriodo(novoPeriodo)
    
    // O useEffect com debounce vai disparar automaticamente e buscar as vendas
    // O filtersRef já está atualizado, então fetchVendas() vai usar os valores corretos
  }

  return (
    <div className="flex flex-col h-full">
      {/* Container principal */}
      <div className="bg-primary-background rounded-t-lg rounded-b-lg md:px-2">
       
        {/* Toggle de filtros no mobile */}
        <div className="sm:hidden flex justify-end py-2">
          <button
            type="button"
            onClick={() => setFiltrosVisiveisMobile((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1 rounded-md bg-primary text-white text-sm font-nunito shadow-sm"
            aria-expanded={filtrosVisiveisMobile}
          >
            {filtrosVisiveisMobile ? <MdFilterAltOff size={18} /> : <MdFilterList size={18} />}
            <span>{filtrosVisiveisMobile ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>
        </div>

        {/* Filtros Superiores */}
        <div className={`flex flex-col sm:flex-row items-center gap-3 py-2 ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}>
          {/* Campo de Pesquisa */}
          <div className="flex-[2] w-full px-4 relative">
            <MdSearch className="absolute left-8 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por Código ou Identificação da Venda"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchVendas()
                }
              }}
              className="w-full h-8 pl-10 pr-4 rounded-lg bg-info border shadow-sm text-sm font-nunito"
            />
          </div>

          {/* Valor Mínimo */}
          <div className="flex flex-row items-center gap-3">
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
              className="w-32 h-8 pl-10 pr-4 rounded-lg bg-info border shadow-sm text-sm font-nunito"
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
              className="w-32 h-8 pl-10 pr-4 rounded-lg bg-info border shadow-sm text-sm font-nunito"
            />
          </div>
          </div>
          
          {/* Label Período */}
          <span className="text-primary text-sm font-exo">Período:</span>
          <div className="flex flex-row items-center gap-3">
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
              <MenuItem value="Datas Personalizadas">Datas Personalizadas</MenuItem>
            </Select>
          </FormControl>

          {/* Botão Por Datas */}
          <button
            onClick={() => setIsDatasModalOpen(true)}
            className="h-8 px-4 bg-primary text-white rounded-lg flex items-center gap-2 text-sm font-nunito hover:bg-primary/90 transition-colors"
          >
            <MdCalendarToday size={18} />
            Por datas
          </button>
        </div>
        </div>
        {/* Filtros Avançados */}
        <div className={`bg-custom-2 rounded-t-lg px-2 pt-1.5 pb-2 justify-center md:justify-start flex flex-wrap items-end gap-x-2 gap-y-4 ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}>
          {/* Status da Venda */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Status da Venda</label>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                displayEmpty
                sx={{
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-info)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="">Selecione...</MenuItem>
                <MenuItem value="Finalizada">Finalizada</MenuItem>
                <MenuItem value="Cancelada">Cancelada</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Tipo de Venda */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Tipo de Venda</label>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={tipoVendaFilter || ''}
                onChange={(e) => setTipoVendaFilter(e.target.value || null)}
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
                <MenuItem value="balcao">Balcão</MenuItem>
                <MenuItem value="mesa">Mesa</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Meio de Pagamento */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Meio de Pagamento</label>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={meioPagamentoFilter}
                onChange={(e) => setMeioPagamentoFilter(e.target.value)}
                disabled={isLoadingMeiosPagamento}
                displayEmpty
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: '400px',
                    },
                  },
                }}
                sx={{
                  height: '32px',
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
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={usuarioAbertoPorFilter}
                onChange={(e) => setUsuarioAbertoPorFilter(e.target.value)}
                displayEmpty
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: '400px',
                    },
                  },
                }}
                sx={{
                  height: '32px',
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
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={terminalFilter}
                onChange={(e) => setTerminalFilter(e.target.value)}
                disabled={isLoadingTerminais}
                displayEmpty
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: '400px',
                    },
                  },
                }}
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
                    {terminal.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Usuário Cancelou */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary-text font-nunito">Usuário Cancelou</label>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={usuarioCancelouFilter}
                onChange={(e) => setUsuarioCancelouFilter(e.target.value)}
                displayEmpty
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: '400px',
                    },
                  },
                }}
                sx={{
                  height: '32px',
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
            className="h-8 px-4 bg-primary text-white rounded-lg flex items-center justify-center gap-2 text-sm font-nunito hover:bg-primary/90 transition-colors"
          >
            <MdFilterAltOff size={18} />
            Limpar Filtros
          </button>
        </div>

        {/* Cards de Métricas */}
        <div className="flex gap-2 m-1 overflow-x-auto pb-2 scrollbar-thin">
          {/* Vendas Finalizadas/Em Aberto */}
          <div className="flex-1 border-2 rounded-lg p-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-alternate flex items-center justify-center flex-shrink-0">
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
          <div className="flex-1 rounded-lg border-2 p-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error flex items-center justify-center flex-shrink-0">
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
          <div className="flex-1 rounded-lg border-2 p-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl"><MdRestaurant /></span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">Produtos Vendidos</span>
              <span className="text-[22px] text-primary font-exo">
                {metricas?.countProdutosVendidos || 0}
              </span>
            </div>
          </div>

          {/* Total Cancelado */}
          <div className="flex-1 rounded-lg border-2 p-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error/80 flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl"><MdAttachMoney /></span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">Total Cancelado</span>
              <span className="text-[22px] text-primary font-exo">
                {formatCurrency(
                  vendas
                    .filter((v) => v.dataCancelamento)
                    .reduce((total, v) => total + (v.valorFinal || 0), 0)
                )}
              </span>
            </div>
          </div>

          {/* Total Faturado */}
          <div className="flex-1 rounded-lg border-2 p-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent1 flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl"><MdAttachMoney /></span>
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
        <div className="bg-info rounded-lg overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-custom-2 text-primary-text text-sm font-semibold font-nunito rounded-t-lg md:px-3 py-2 flex items-center gap-2">
            <div className="flex-1 uppercase hidden md:flex">
              Código Venda
            </div>
            <div className="flex-1 text-xs md:text-sm text-center uppercase">
              Data/ Hora
            </div>
            <div className="flex-1 text-xs md:text-sm text-center uppercase">
              Tipo Venda
            </div>
            <div className="flex-1 justify-center uppercase hidden md:flex">
              Cód. Terminal
            </div>
            <div className="flex-[2] text-xs md:text-sm text-center uppercase">
              Usuário PDV
            </div>
            <div className="flex-1 text-xs md:text-sm text-right uppercase">
              VL. Faturado
            </div>
            <div className="flex-1 text-xs md:text-sm justify-end uppercase hidden md:flex">
              VL. Cancelado
            </div>
            <div className="flex-1 justify-end  uppercase hidden md:flex">
              Cupom
            </div>
          </div>

          {/* Lista com scroll */}
          <div
            ref={scrollContainerRef}
            className="max-h-[calc(100vh-350px)] overflow-y-auto px-1 py-2 scrollbar-hide"
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <img
                  src="/images/jiffy-loading.gif"
                  alt="Carregando"
                  className="w-20 object-contain"
                />
                <span className="text-sm font-medium font-nunito text-primary-text">Carregando...</span>
              </div>
            )}

            {vendas.length === 0 && !isLoading && (
              <div className="flex items-center justify-center py-12">
                <p className="text-secondary-text">Nenhuma venda encontrada.</p>
              </div>
            )}

            {vendas.map((venda, index) => {
              const { date, time } = formatDateList(venda.dataCriacao)
              const usuarioNome =
                usuariosPDV.find((u) => u.id === venda.abertoPorId)?.nome || venda.abertoPorId
              const isZebraEven = index % 2 === 0

              return (
                <div
                  key={venda.id}
                  onClick={() => setSelectedVendaId(venda.id)} // Adicionado onClick para abrir detalhes
                  className={`cursor-pointer md:px-2 py-1 rounded-lg flex items-center  hover:bg-primary/10 transition-all ${(() => {
                    let baseClasses = ''
                    if (venda.dataCancelamento) {
                      baseClasses = 'bg-red-100 hover:bg-red-200'
                    } else if (!venda.dataCancelamento && !venda.dataFinalizacao) {
                      baseClasses = 'bg-yellow-100 hover:bg-yellow-200'
                    } else {
                      baseClasses = isZebraEven
                        ? 'bg-white hover:bg-gray-100'
                        : 'bg-gray-50 hover:bg-gray-200'
                    }
                    return baseClasses
                  })()}`}>
                
                  <div className="flex-1 hidden md:block">
                    <span className="text-sm font-semibold text-primary-text font-nunito">
                      #{venda.codigoVenda}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-xs md:text-sm text-primary-text font-nunito">{date}</span>
                    <span className="text-xs md:text-sm text-primary-text font-nunito">{time}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                  <TipoVendaIcon
                    tipoVenda={venda.tipoVenda}
                    numeroMesa={venda.numeroMesa}
                    corTexto="var(--color-info)" // Garante que o número da mesa seja visível
                    containerScale={0.90}
                    size={isMobileViewport ? 45 : 60}
                  />
                  </div>
                  <div className="flex-1 text-center hidden md:block">
                    <span className="text-sm text-primary-text font-nunito">
                      #{venda.codigoTerminal}
                    </span>
                  </div>
                  <div className="flex-[2] text-center">
                    <span className="text-xs md:text-sm text-primary-text font-nunito">{usuarioNome}</span>
                  </div>
                  <div className="flex-1 text-end">
                    <span className="text-xs md:text-sm text-primary-text font-nunito">
                      {venda.dataCancelamento ? '-' : formatCurrency(venda.valorFinal)}
                    </span>
                  </div>
                  <div className="flex-1 hidden md:block text-right">
                    <span className="text-xs md:text-sm text-primary-text font-nunito">
                      {venda.dataCancelamento ? formatCurrency(venda.valorFinal) : '-'}
                    </span>
                  </div>
                  <div className="flex-1 justify-end hidden md:flex">
                    <button
                      onClick={(e) => {
                        e.stopPropagation() // Impede que o clique no botão acione o clique da linha
                        setSelectedVendaId(venda.id)
                      }}
                      className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Comprovante de Venda"
                    >
                      <MdPrint size={20}/>
                    </button>
                  </div>
                </div>
              )
            })}

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

      {/* Modal de Seleção de Datas */}
      <EscolheDatasModal
        open={isDatasModalOpen}
        onClose={() => setIsDatasModalOpen(false)}
        onConfirm={handleConfirmDatas}
        dataInicial={periodoInicial}
        dataFinal={periodoFinal}
      />
    </div>
  )
}


'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation' // Importar useRouter e usePathname
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  MdSearch,
  MdAttachMoney,
  MdCalendarToday,
  MdFilterAltOff,
  MdRestaurant,
  MdPrint,
  MdFilterList,
  MdReceiptLong,
} from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { DetalhesVendas } from './DetalhesVendas'
import { GraficoVendasPorUsuarioModal } from './GraficoVendasPorUsuarioModal'
import { FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import { sxEntradaCompactaProdutoSelect } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { TipoVendaIcon } from './TipoVendaIcon'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters' // Importar calculatePeriodo
import { startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import {
  abrirDocumentoFiscalPdf,
  tipoDocFiscalFromModelo,
} from '@/src/presentation/utils/abrirDocumentoFiscalPdf'
import {
  primeiroMesQuadroDuploCalendario,
  periodoFetchFaturamentoCalendarioDoisMeses,
} from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { combinarIntervaloCalendarParaDatas } from '@/src/shared/utils/intervaloCalendarioComHoras'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { useDashboardFaturamentoPorDiaQuery } from '@/src/presentation/hooks/useDashboardFaturamentoPorDiaQuery'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
// Tipos
interface Venda {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: 'balcao' | 'mesa' | 'gestor'
  abertoPorId: string
  canceladoPorId?: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataUltimoProdutoLancado?: string
  dataUltimaMovimentacao?: string
  dataCancelamento?: string
  dataFinalizacao?: string
  metodoPagamento?: string
  status?: string
  totalValorProdutosRemovidos?: number
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
  initialPeriodo?: string // Período inicial vindo da URL (ex: "Hoje", "Últimos 7 Dias")
  initialStatus?: string | null // Status inicial vindo da URL
}

type ResumoFiscalMin = {
  documentoFiscalId?: string | null
  modelo?: number | null
  status?: string | null
}

function normalizarResumoFiscalMin(raw: unknown): ResumoFiscalMin | null {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    const primeiro = raw.find(item => item != null && typeof item === 'object')
    return primeiro ? normalizarResumoFiscalMin(primeiro) : null
  }
  if (typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    documentoFiscalId:
      (r.documentoFiscalId as string | null | undefined) ??
      (r.DocumentoFiscalId as string | null | undefined) ??
      null,
    modelo:
      (typeof r.modelo === 'number' ? r.modelo : r.Modelo != null ? Number(r.Modelo) : null) ?? null,
    status: (r.status as string | null | undefined) ?? (r.Status as string | null | undefined) ?? null,
  }
}

function statusFiscalEhEmitida(resumoStatus: string | null | undefined, statusVenda: string | null | undefined): boolean {
  const r = resumoStatus != null ? String(resumoStatus).trim() : ''
  const u = statusVenda != null ? String(statusVenda).trim() : ''
  const s = (r !== '' ? r : u).toUpperCase()
  return s === 'EMITIDA'
}

/** Mesmas opções do dropdown do dashboard (sem "Datas Personalizadas"). */
const PERIODOS_SELECT_VALIDOS = [
  'Todos',
  'Hoje',
  'Mês Atual',
  'Últimos 7 Dias',
  'Últimos 30 Dias',
  'Últimos 60 Dias',
  'Últimos 90 Dias',
] as const

function normalizarPeriodoSelect(v: string | undefined): string {
  if (v && (PERIODOS_SELECT_VALIDOS as readonly string[]).includes(v)) return v
  return 'Todos'
}

/** Meses curtos para exibir o intervalo de "Por datas" (igual ao dashboard). */
const MESES_ABREV = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const

function formatarDataHoraFiltroCurta(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = MESES_ABREV[date.getMonth()]
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dia}-${mes} ${h}:${min}`
}

/** HH:mm a partir de Date — mesmo contrato do dashboardV2 (intervalo personalizado). */
function formatarHoraParaInputCalendar(d: Date | null | undefined): string {
  if (!d) return '00:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  const year = Number(map.year)
  const month = Number(map.month)
  const day = Number(map.day)
  let hour = Number(map.hour)
  const minute = Number(map.minute)
  const second = Number(map.second)
  if (hour === 24) hour = 0
  const asUTC = Date.UTC(year, month - 1, day, hour, minute, second)
  return Math.round((asUTC - date.getTime()) / 60000)
}

function zonedLocalPartsToUtcDate(
  dateParts: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
    millisecond: number
  },
  timeZone: string
): Date {
  const { year, month, day, hour, minute, second, millisecond } = dateParts
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  const off1 = getTimeZoneOffsetMinutes(new Date(guess), timeZone)
  const utc1 = guess - off1 * 60_000
  const off2 = getTimeZoneOffsetMinutes(new Date(utc1), timeZone)
  const utc2 = guess - off2 * 60_000
  return new Date(utc2)
}

function toISOStringNoFusoEmpresa(date: Date, timeZoneEmpresa: string): string {
  const tz = timeZoneEmpresa.trim()
  if (!tz) return date.toISOString()
  return zonedLocalPartsToUtcDate(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      millisecond: date.getMilliseconds(),
    },
    tz
  ).toISOString()
}

/** Snapshot dos filtros para montar a query da listagem (GET /api/vendas). */
interface VendasFiltrosQuerySnapshot {
  searchQuery: string
  valorMinimo: string
  valorMaximo: string
  periodo: string
  statusFilter: string | null
  tipoVendaFilter: string | null
  meioPagamentoFilter: string
  usuarioAbertoPorFilter: string
  terminalFilter: string
  usuarioCancelouFilter: string
  periodoInicial: Date | null
  periodoFinal: Date | null
}

/** Normaliza string de moeda do filtro para número (mesma regra do input de valor). */
function normalizarMoedaFiltroVLista(value: string): number | null {
  if (!value || value.trim() === '') return null

  let clean = value.replace(/[^\d,.]/g, '').trim()

  if (!clean) return null

  if (clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes('.')) {
    if ((clean.match(/\./g) || []).length > 1) {
      clean = clean.replace(/\./g, '')
    }
    const parts = clean.split('.')
    if (parts.length === 2 && parts[1].length === 3) {
      clean = clean.replace('.', '')
    }
  }

  const num = parseFloat(clean)
  return isNaN(num) ? null : num
}

/** Monta query string da listagem (sem limit/offset). */
function buildVendasListQueryParams(
  filters: VendasFiltrosQuerySnapshot,
  args?: { timeZoneEmpresa?: string }
): URLSearchParams {
  const baseParams = new URLSearchParams()

  if (filters.searchQuery) {
    baseParams.append('q', filters.searchQuery)
  }

  if (filters.tipoVendaFilter) {
    baseParams.append('tipoVenda', filters.tipoVendaFilter.toLowerCase())
  }

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

  const valorMin = normalizarMoedaFiltroVLista(filters.valorMinimo)
  if (valorMin !== null && valorMin > 0) {
    baseParams.append('valorFinalMinimo', valorMin.toString())
  }

  const valorMax = normalizarMoedaFiltroVLista(filters.valorMaximo)
  if (valorMax !== null && valorMax > 0) {
    baseParams.append('valorFinalMaximo', valorMax.toString())
  }

  if (filters.meioPagamentoFilter) {
    baseParams.append('meioPagamentoId', filters.meioPagamentoFilter)
  }

  if (filters.terminalFilter) {
    baseParams.append('terminalId', filters.terminalFilter)
  }

  let inicioFiltro: Date | null = null
  let fimFiltro: Date | null = null
  if (filters.periodoInicial && filters.periodoFinal) {
    inicioFiltro = filters.periodoInicial
    fimFiltro = filters.periodoFinal
  } else if (filters.periodo !== 'Todos') {
    const { inicio, fim } = calculatePeriodo(filters.periodo)
    inicioFiltro = inicio
    fimFiltro = fim
  }
  /**
   * Backend: período por data de finalização (`dataFinalizacaoInicial`/`dataFinalizacaoFinal`).
   * Com status apenas ABERTA não é permitido filtrar por finalização — usa-se data de criação.
   */
  const usarDatasCriacao = normalizedStatus === 'ABERTA'
  const tzEmpresa = args?.timeZoneEmpresa?.trim() || ''
  if (inicioFiltro) {
    baseParams.append(
      usarDatasCriacao ? 'dataCriacaoInicial' : 'dataFinalizacaoInicial',
      usarDatasCriacao || !tzEmpresa ? inicioFiltro.toISOString() : toISOStringNoFusoEmpresa(inicioFiltro, tzEmpresa)
    )
  }
  if (fimFiltro) {
    baseParams.append(
      usarDatasCriacao ? 'dataCriacaoFinal' : 'dataFinalizacaoFinal',
      usarDatasCriacao || !tzEmpresa ? fimFiltro.toISOString() : toISOStringNoFusoEmpresa(fimFiltro, tzEmpresa)
    )
  }

  return baseParams
}

/** Mapeia linha da API para o tipo usado na lista. */
function mapearVendaApiRow(item: any): Venda {
  return {
    ...item,
    totalValorProdutosRemovidos:
      item.totalValorProdutosRemovidos ||
      item.totalValorProdutosRemovido ||
      item.valorProdutosRemovidos ||
      item.valorProdutosRemovido ||
      0,
  }
}

/**
 * Refina por status usando datas (quando a API retorna mistura ou caso "Aberta").
 */
function filtrarVendasPorStatusCliente(itens: Venda[], statusFilter: string | null): Venda[] {
  return itens.filter((v: Venda) => {
    const normalizedStatus = statusFilter?.toUpperCase()

    if (!normalizedStatus || normalizedStatus === 'ABERTA') {
      if (normalizedStatus === 'ABERTA') {
        return !v.dataCancelamento && !v.dataFinalizacao
      }
      return !!(v.dataCancelamento || v.dataFinalizacao)
    }

    if (normalizedStatus === 'CANCELADA') {
      return !!v.dataCancelamento
    }

    if (normalizedStatus === 'FINALIZADA') {
      return !!v.dataFinalizacao && !v.dataCancelamento
    }

    return !!(v.dataCancelamento || v.dataFinalizacao)
  })
}

/** Borda do `Select` outlined sempre visível (o MUI deixa o repouso tão claro que parece sumir). */
const sxVendasFiltroOutlinedInputRoot = {
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

/**
 * Selects de filtro: label na borda (outlined), alinhado a NovoProduto / NovoComplemento.
 * Classes Tailwind no `InputLabel` não vencem o `color`/`fontWeight` injetados pelo `sx` herdado
 * de `sxEntradaCompactaProdutoSelect` — tipografia do label fica aqui no `sx` do `FormControl`.
 */
const sxVendasFiltroSelectBase = {
  ...sxEntradaCompactaProdutoSelect,
  minWidth: 180,
  '& .MuiOutlinedInput-root': {
    ...sxVendasFiltroOutlinedInputRoot,
    height: 35,
    minHeight: 35,
    padding: '4px 2px 4px 0',
  },
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

const sxVendasFiltroSelectStatus = {
  ...sxVendasFiltroSelectBase,
  '& .MuiOutlinedInput-root': {
    ...sxVendasFiltroOutlinedInputRoot,
    backgroundColor: 'var(--color-info)',
    height: 35,
    minHeight: 35,
    padding: '4px 2px 4px 0',
  },
} as const

const menuPropsVendasFiltroListaLonga = {
  PaperProps: {
    sx: {
      maxHeight: '400px',
    },
  },
} as const

/**
 * TextField de valor (moeda): label/borda/fundo iguais aos filtros outlined.
 * Altura alinhada ao `Select size="small"` (~40px) — sem “caixa” alta com área vazia.
 */
const sxVendasFiltroTextFieldMoeda = {
  width: '8.5rem',
  marginTop: 0,
  marginBottom: 0,
  '& .MuiOutlinedInput-root': {
    ...sxVendasFiltroOutlinedInputRoot,
    backgroundColor: 'var(--color-info)',
    fontFamily: '"Nunito", sans-serif',
    height: 30,
    minHeight: 30,
    paddingLeft: 2,
    paddingRight: 2,
    alignItems: 'center',
    boxSizing: 'border-box',
  },
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
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
    lineHeight: 1,
    padding: '4px 2px 4px 0',
    height: 30,
    minHeight: 30,
  },
  '& .MuiInputAdornment-root': {
    height: 30,
    maxHeight: 30,
    marginRight: 0,
  },
} as const

/**
 * Componente de listagem de vendas
 * Implementa scroll infinito, filtros avançados e cards de métricas
 */
export function VendasList({ initialPeriodo, initialStatus }: VendasListProps) {
  const { auth } = useAuthStore()
  const { timezoneAgregacao } = useEmpresaMe()
  const router = useRouter()
  const pathname = usePathname()

  const initialPeriodoValue = normalizarPeriodoSelect(initialPeriodo)

  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [valorMinimo, setValorMinimo] = useState('')
  const [valorMaximo, setValorMaximo] = useState('')
  const [periodo, setPeriodo] = useState<string>(initialPeriodoValue)
  const [statusFilter, setStatusFilter] = useState<string | null>(
    initialStatus?.toLowerCase() === 'aberta' ? null : initialStatus || null
  )
  // Intervalo explícito só via "Por datas" (preset do Select não grava datas aqui — igual ao dashboard)
  const [periodoInicial, setPeriodoInicial] = useState<Date | null>(null)
  const [periodoFinal, setPeriodoFinal] = useState<Date | null>(null)
  const [tipoVendaFilter, setTipoVendaFilter] = useState<string | null>(null)
  const [meioPagamentoFilter, setMeioPagamentoFilter] = useState<string>('')
  const [usuarioAbertoPorFilter, setUsuarioAbertoPorFilter] = useState<string>('')
  const [terminalFilter, setTerminalFilter] = useState<string>('')
  const [usuarioCancelouFilter, setUsuarioCancelouFilter] = useState<string>('')
  const [vendas, setVendas] = useState<Venda[]>([])
  const [metricas, setMetricas] = useState<MetricasVendas | null>(null)
  const [usuariosPDV, setUsuariosPDV] = useState<UsuarioPDV[]>([])
  const [meiosPagamento, setMeiosPagamento] = useState<MeioPagamento[]>([])
  const [terminais, setTerminais] = useState<Terminal[]>([])

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  /** `open` do painel de detalhes — separado do id para permitir animação de saída antes de limpar a venda. */
  const [detalhesVendaAberta, setDetalhesVendaAberta] = useState(false)
  const [isLoadingMeiosPagamento, setIsLoadingMeiosPagamento] = useState(false)
  const [isLoadingTerminais, setIsLoadingTerminais] = useState(false)
  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false)
  /** Rascunho do painel lateral (calendário duplo + horas) — alinhado ao dashboardV2. */
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(
    undefined
  )
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')
  const [filtrosVisiveisMobile, setFiltrosVisiveisMobile] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isGraficoVendasPorUsuarioOpen, setIsGraficoVendasPorUsuarioOpen] = useState(false)
  const [isGraficoVendasCanceladasOpen, setIsGraficoVendasCanceladasOpen] = useState(false)
  const [isAbrindoNfce, setIsAbrindoNfce] = useState<Record<string, boolean>>({})
  /** Há mais páginas na API para os filtros atuais (scroll / “Carregar mais”). */
  const [hasMoreVendas, setHasMoreVendas] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  /** Total de registros no backend para os filtros atuais (quando a API envia `count`). */
  const [totalListaCount, setTotalListaCount] = useState<number | null>(null)

  const pageSize = 100 // Itens por requisição (paginação na API)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  /** Próximo `offset` da API (sempre múltiplos do tamanho bruto da última página retornada). */
  const nextApiOffsetRef = useRef(0)
  /** Incrementado a cada reset de lista — descarta respostas atrasadas após troca de filtro. */
  const vendasFetchSeqRef = useRef(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasMoreVendasRef = useRef(false)
  const isLoadingMoreRef = useRef(false)
  const isLoadingRef = useRef(false)
  const primeiraMontagemListaRef = useRef(true)
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

  useEffect(() => {
    hasMoreVendasRef.current = hasMoreVendas
  }, [hasMoreVendas])
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore
  }, [isLoadingMore])
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

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
    timeZoneEmpresa: timezoneAgregacao,
  })

  // Ao abrir o painel lateral, sincroniza rascunho com o filtro "Por datas" ou padrão (hoje)
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
   * Indica se a API provavelmente tem próxima página (com base em count/totalPages ou página cheia).
   */
  const inferirHasMoreApi = useCallback(
    (
      rawLength: number,
      offset: number,
      data: {
        count?: number
        totalPages?: number
        limit?: number
      }
    ): boolean => {
      if (rawLength === 0) return false
      if (rawLength < pageSize) return false
      const lim = typeof data.limit === 'number' && data.limit > 0 ? data.limit : pageSize
      if (typeof data.count === 'number' && data.count >= 0) {
        return offset + rawLength < data.count
      }
      if (typeof data.totalPages === 'number' && data.totalPages > 0) {
        const idx = Math.floor(offset / lim)
        return idx + 1 < data.totalPages
      }
      return rawLength === pageSize
    },
    [pageSize]
  )

  /**
   * Busca uma página na API (filtros atuais em `filtersRef`).
   */
  const buscarPaginaVendas = useCallback(
    async (offset: number, filters: VendasFiltrosQuerySnapshot, token: string) => {
      const baseParams = buildVendasListQueryParams(filters, { timeZoneEmpresa: timezoneAgregacao })
      const params = new URLSearchParams(baseParams.toString())
      params.append('limit', String(pageSize))
      params.append('offset', String(offset))

      const response = await fetch(`/api/vendas?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { error?: string }).error || 'Erro ao buscar vendas')
      }

      const data = await response.json()
      const rawItems: unknown[] = data.items || []
      const mappedItems = rawItems.map((item: any) => mapearVendaApiRow(item))
      const filteredItems = filtrarVendasPorStatusCliente(mappedItems, filters.statusFilter)

      return {
        filteredItems,
        rawLength: rawItems.length,
        metricas: (data.metricas || null) as MetricasVendas | null,
        count: typeof data.count === 'number' ? data.count : undefined,
        totalPages: typeof data.totalPages === 'number' ? data.totalPages : undefined,
        limit: typeof data.limit === 'number' ? data.limit : undefined,
      }
    },
    [pageSize, timezoneAgregacao]
  )

  /**
   * Primeira página: reseta lista, métricas e offset; filtros vão na query (backend).
   */
  const fetchVendas = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    const seq = ++vendasFetchSeqRef.current
    setIsLoading(true)
    setIsLoadingMore(false)
    setVendas([])
    setHasMoreVendas(false)
    setTotalListaCount(null)
    nextApiOffsetRef.current = 0

    try {
      const filters = filtersRef.current as VendasFiltrosQuerySnapshot
      const offset = 0
      const page = await buscarPaginaVendas(offset, filters, token)

      if (vendasFetchSeqRef.current !== seq) return

      setVendas(page.filteredItems)
      setMetricas(page.metricas)
      if (page.count !== undefined) {
        setTotalListaCount(page.count)
      } else {
        setTotalListaCount(null)
      }

      nextApiOffsetRef.current = offset + page.rawLength
      setHasMoreVendas(inferirHasMoreApi(page.rawLength, offset, page))
    } catch (error) {
      console.error('Erro ao buscar vendas:', error)
      showToast.error('Erro ao buscar vendas')
    } finally {
      if (vendasFetchSeqRef.current === seq) {
        setIsLoading(false)
      }
    }
  }, [auth, buscarPaginaVendas, inferirHasMoreApi])

  /**
   * Próximas páginas (scroll infinito / botão).
   */
  const loadMoreVendas = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return
    if (!hasMoreVendasRef.current || isLoadingRef.current || isLoadingMoreRef.current) return

    const seq = vendasFetchSeqRef.current
    setIsLoadingMore(true)

    try {
      const filters = filtersRef.current as VendasFiltrosQuerySnapshot
      const offset = nextApiOffsetRef.current
      const page = await buscarPaginaVendas(offset, filters, token)

      if (vendasFetchSeqRef.current !== seq) return

      setVendas(prev => [...prev, ...page.filteredItems])
      nextApiOffsetRef.current = offset + page.rawLength
      setHasMoreVendas(inferirHasMoreApi(page.rawLength, offset, page))
    } catch (error) {
      console.error('Erro ao carregar mais vendas:', error)
      showToast.error('Erro ao carregar mais vendas')
    } finally {
      // Sempre encerra: um reset de filtros pode invalidar `seq` e outra busca já zerou o estado
      setIsLoadingMore(false)
    }
  }, [auth, buscarPaginaVendas, inferirHasMoreApi])

  /** Soma “Total cancelado” apenas sobre as vendas já carregadas na lista (métricas globais vêm de `metricas`). */
  const totalCanceladoSomenteLista = useMemo(() => {
    return vendas.reduce((total, v) => {
      const totalRemovidos = Number(v.totalValorProdutosRemovidos) || 0
      const valorFinal = Number(v.valorFinal) || 0

      if (v.dataCancelamento) {
        return total + totalRemovidos + valorFinal
      }

      if (v.dataFinalizacao && !v.dataCancelamento && totalRemovidos > 0) {
        return total + totalRemovidos
      }

      return total
    }, 0)
  }, [vendas])

  const avisoGraficoListaParcial =
    hasMoreVendas && totalListaCount != null && vendas.length < totalListaCount
      ? 'Gráfico baseado apenas nas vendas já carregadas na lista. Role a lista ou use “Carregar mais” para aproximar o total.'
      : hasMoreVendas && totalListaCount == null
        ? 'Podem existir mais vendas: carregue o restante da lista para o gráfico refletir todos os registros.'
        : undefined

  // Debounce para busca / troca de filtros (primeira execução sem espera)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const delay = primeiraMontagemListaRef.current ? 0 : periodoInicial && periodoFinal ? 100 : 500
    primeiraMontagemListaRef.current = false

    debounceTimerRef.current = setTimeout(() => {
      fetchVendas()
    }, delay)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [
    searchQuery,
    valorMinimo,
    valorMaximo,
    statusFilter,
    tipoVendaFilter,
    meioPagamentoFilter,
    usuarioAbertoPorFilter,
    terminalFilter,
    usuarioCancelouFilter,
    periodo,
    periodoInicial,
    periodoFinal,
    fetchVendas,
  ])

  // Dados auxiliares (usuários, meios, terminais) — sem duplicar fetch da lista aqui
  useEffect(() => {
    loadAllUsuariosPDV()
    loadAllMeiosPagamento()
    loadAllTerminais()
  }, [loadAllUsuariosPDV, loadAllMeiosPagamento, loadAllTerminais])

  // Scroll infinito: próxima página ao chegar perto do fim da lista
  const handleScrollListaVendas = useCallback(() => {
    if (scrollTimeoutRef.current) return

    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) {
        scrollTimeoutRef.current = null
        return
      }
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      if (distanceFromBottom < 400) {
        if (hasMoreVendasRef.current && !isLoadingMoreRef.current && !isLoadingRef.current) {
          void loadMoreVendas()
        }
      }
      scrollTimeoutRef.current = null
    }, 100)
  }, [loadMoreVendas])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScrollListaVendas, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScrollListaVendas)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }
    }
  }, [handleScrollListaVendas])

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
      currentSearchParams.delete('dataCriacaoInicial')
      currentSearchParams.delete('dataCriacaoFinal')
      currentSearchParams.delete('dataFinalizacaoInicial')
      currentSearchParams.delete('dataFinalizacaoFinal')
      currentSearchParams.delete('dataCriacaoInicial')
      currentSearchParams.delete('dataCriacaoFinal')

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
   * O valor do Select (Período) não muda — igual ao dashboard
   */
  const handleConfirmDatas = useCallback((dataInicial: Date | null, dataFinal: Date | null) => {
    filtersRef.current.periodoInicial = dataInicial
    filtersRef.current.periodoFinal = dataFinal
    setPeriodoInicial(dataInicial)
    setPeriodoFinal(dataFinal)
  }, [])

  /** Se o DayPicker enviar intervalo vazio, volta ao padrão de um dia (hoje). */
  const handleRascunhoIntervaloRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoIntervaloRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
  }, [])

  const handleAplicarIntervaloDatasVendas = useCallback(() => {
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      rascunhoIntervaloRange,
      rascunhoHoraInicio,
      rascunhoHoraFim
    )
    if (!dataInicial || !dataFinal) return
    handleConfirmDatas(dataInicial, dataFinal)
    setIsDatasModalOpen(false)
  }, [rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim, handleConfirmDatas])

  /** Ao trocar o preset, remove o intervalo definido em "Por datas". */
  const handlePeriodoSelectChange = (novoPeriodo: string) => {
    setPeriodo(novoPeriodo)
    setPeriodoInicial(null)
    setPeriodoFinal(null)
    filtersRef.current.periodo = novoPeriodo
    filtersRef.current.periodoInicial = null
    filtersRef.current.periodoFinal = null
  }

  const handleVerNfce = useCallback(
    async (vendaId: string) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setIsAbrindoNfce(prev => ({ ...prev, [vendaId]: true }))
      try {
        const queryFiscal = new URLSearchParams({ incluirFiscal: 'true' }).toString()
        const response = await fetch(`/api/vendas/${encodeURIComponent(vendaId)}?${queryFiscal}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error((errorData as { error?: string }).error || 'Erro ao buscar fiscal da venda')
        }

        const data = (await response.json()) as Record<string, unknown>
        const resumo = normalizarResumoFiscalMin(data.resumoFiscal ?? data.ResumoFiscal ?? data.resumo_fiscal)
        const statusVenda = (data.statusFiscal as string | null | undefined) ?? null

        const documentoFiscalId = resumo?.documentoFiscalId ? String(resumo.documentoFiscalId).trim() : ''
        if (!documentoFiscalId) {
          showToast.error('Documento fiscal não encontrado para esta venda.')
          return
        }

        if (!statusFiscalEhEmitida(resumo?.status, statusVenda)) {
          showToast.error('Documento fiscal ainda não está emitido.')
          return
        }

        await abrirDocumentoFiscalPdf(documentoFiscalId, tipoDocFiscalFromModelo(resumo?.modelo ?? null))
      } catch (error: unknown) {
        console.error('Erro ao abrir NFCe:', error)
        const msg = error instanceof Error ? error.message : 'Erro ao abrir NFCe'
        showToast.error(msg)
      } finally {
        setIsAbrindoNfce(prev => {
          const { [vendaId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex w-full flex-col py-1">
        <p className="px-[30px] text-lg font-semibold text-primary">Todas as Vendas do PDV</p>
      </div>
      <div className="h-[1px] flex-shrink-0 border-t-2 border-primary/70"></div>
      {/* Container principal */}
      <div className="bg-primary-background rounded-b-lg rounded-t-lg">
        {/* Toggle de filtros no mobile */}
        <div className="flex justify-end py-2 sm:hidden">
          <button
            type="button"
            onClick={() => setFiltrosVisiveisMobile(prev => !prev)}
            className="font-nunito flex items-center gap-2 rounded-md bg-primary px-3 py-1 text-sm text-white shadow-sm"
            aria-expanded={filtrosVisiveisMobile}
          >
            {filtrosVisiveisMobile ? <MdFilterAltOff size={18} /> : <MdFilterList size={18} />}
            <span>{filtrosVisiveisMobile ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>
        </div>

        {/* Filtros Superiores */}
        <div
          className={`flex flex-col items-center gap-3 py-2 sm:flex-row ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}
        >
          {/* Campo de Pesquisa */}
          <div className="relative w-full flex-[2]">
            <MdSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
              size={20}
            />
            <input
              type="text"
              placeholder="Pesquisar por Código ou Identificação da Venda"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  fetchVendas()
                }
              }}
              className="font-nunito h-8 w-full rounded-lg border bg-info pl-10 pr-4 text-sm shadow-sm"
            />
          </div>

          {/* Valor Mínimo / Máximo — label na borda (igual aos filtros avançados) */}
          <div className="flex flex-row items-end gap-3">
            <TextField
              size="small"
              variant="outlined"
              margin="none"
              label="Valor Mínimo"
              value={valorMinimo}
              onChange={e => {
                const formatted = formatCurrencyInput(e.target.value)
                setValorMinimo(formatted)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleValorKeyPress(e, 'min')
              }}
              sx={sxVendasFiltroTextFieldMoeda}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              variant="outlined"
              margin="none"
              label="Valor Máximo"
              value={valorMaximo}
              onChange={e => {
                const formatted = formatCurrencyInput(e.target.value)
                setValorMaximo(formatted)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleValorKeyPress(e, 'max')
              }}
              sx={sxVendasFiltroTextFieldMoeda}
              InputLabelProps={{ shrink: true }}
            />
          </div>

          {/* Label Período */}
          <span className="font-exo text-sm text-primary">Período:</span>
          <div className="flex flex-row items-center gap-3">
            {/* Dropdown Período */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={periodo}
                onChange={e => handlePeriodoSelectChange(e.target.value)}
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
        </div>
        {/* Filtros Avançados */}
        <div
          className={`flex flex-wrap items-end justify-center gap-x-2 gap-y-3 rounded-t-lg bg-custom-2 px-2 pb-2 pt-3 md:justify-start ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}
        >
          {/* Status da Venda — label na borda (outlined) */}
          <FormControl size="small" variant="outlined" sx={sxVendasFiltroSelectStatus}>
            <InputLabel id="vl-filtro-status-label" shrink>
              Status da Venda
            </InputLabel>
            <Select
              labelId="vl-filtro-status-label"
              label="Status da Venda"
              value={statusFilter || ''}
              onChange={e => setStatusFilter(e.target.value || null)}
              displayEmpty
              className="font-nunito"
            >
              <MenuItem value="">
                <span className="text-secondary-text">Selecione...</span>
              </MenuItem>
              <MenuItem value="Finalizada">Finalizada</MenuItem>
              <MenuItem value="Cancelada">Cancelada</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" variant="outlined" sx={sxVendasFiltroSelectBase}>
            <InputLabel id="vl-filtro-tipo-venda-label" shrink>
              Tipo de Venda
            </InputLabel>
            <Select
              labelId="vl-filtro-tipo-venda-label"
              label="Tipo de Venda"
              value={tipoVendaFilter || ''}
              onChange={e => setTipoVendaFilter(e.target.value || null)}
              displayEmpty
              className="font-nunito"
            >
              <MenuItem value="">
                <span className="text-secondary-text">Selecione...</span>
              </MenuItem>
              <MenuItem value="balcao">Balcão</MenuItem>
              <MenuItem value="mesa">Mesa</MenuItem>
              <MenuItem value="gestor">Gestor</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" variant="outlined" sx={sxVendasFiltroSelectBase}>
            <InputLabel id="vl-filtro-meio-pagamento-label" shrink>
              Meio de Pagamento
            </InputLabel>
            <Select
              labelId="vl-filtro-meio-pagamento-label"
              label="Meio de Pagamento"
              value={meioPagamentoFilter}
              onChange={e => setMeioPagamentoFilter(e.target.value)}
              disabled={isLoadingMeiosPagamento}
              displayEmpty
              MenuProps={menuPropsVendasFiltroListaLonga}
              className="font-nunito"
            >
              <MenuItem value="">
                <span className="text-secondary-text">Selecione...</span>
              </MenuItem>
              {meiosPagamento.map(meio => (
                <MenuItem key={meio.id} value={meio.id}>
                  {meio.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" variant="outlined" sx={sxVendasFiltroSelectBase}>
            <InputLabel id="vl-filtro-usuario-aberto-label" shrink>
              Vendas por Usuário
            </InputLabel>
            <Select
              labelId="vl-filtro-usuario-aberto-label"
              label="Vendas por Usuário"
              value={usuarioAbertoPorFilter}
              onChange={e => setUsuarioAbertoPorFilter(e.target.value)}
              displayEmpty
              MenuProps={menuPropsVendasFiltroListaLonga}
              className="font-nunito"
            >
              <MenuItem value="">
                <span className="text-secondary-text">Selecione...</span>
              </MenuItem>
              {usuariosPDV.map(usuario => (
                <MenuItem key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" variant="outlined" sx={sxVendasFiltroSelectBase}>
            <InputLabel id="vl-filtro-terminal-label" shrink>
              Terminal
            </InputLabel>
            <Select
              labelId="vl-filtro-terminal-label"
              label="Terminal"
              value={terminalFilter}
              onChange={e => setTerminalFilter(e.target.value)}
              disabled={isLoadingTerminais}
              displayEmpty
              MenuProps={menuPropsVendasFiltroListaLonga}
              className="font-nunito"
            >
              <MenuItem value="">
                <span className="text-secondary-text">Selecione...</span>
              </MenuItem>
              {terminais.map(terminal => (
                <MenuItem key={terminal.id} value={terminal.id}>
                  {terminal.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" variant="outlined" sx={sxVendasFiltroSelectBase}>
            <InputLabel id="vl-filtro-usuario-cancelou-label" shrink>
              Usuário Cancelou
            </InputLabel>
            <Select
              labelId="vl-filtro-usuario-cancelou-label"
              label="Usuário Cancelou"
              value={usuarioCancelouFilter}
              onChange={e => setUsuarioCancelouFilter(e.target.value)}
              displayEmpty
              MenuProps={menuPropsVendasFiltroListaLonga}
              className="font-nunito"
            >
              <MenuItem value="">
                <span className="text-secondary-text">Selecione...</span>
              </MenuItem>
              {usuariosPDV.map(usuario => (
                <MenuItem key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Botão Limpar Filtros */}
          <button
            onClick={handleClearFilters}
            className="font-nunito flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
          >
            <MdFilterAltOff size={18} />
            Limpar Filtros
          </button>
        </div>

        {/* Cards de Métricas */}
        <div className="scrollbar-thin m-1 flex gap-2 overflow-x-auto pb-2">
          {/* Vendas Finalizadas/Em Aberto */}
          <div
            className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-1 transition-colors hover:bg-primary/5"
            onClick={() => setIsGraficoVendasPorUsuarioOpen(true)}
            title="Clique para ver gráfico de vendas por usuário"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-alternate">
              <span className="text-xl text-info">🛒</span>
            </div>
            <div className="flex flex-1 flex-col items-end">
              <span className="font-nunito text-xs text-secondary-text">
                {statusFilter === 'Aberta' ? 'Vendas em Aberto' : 'Vendas Finalizadas'}
              </span>
              <span className="font-exo text-[22px] text-primary">
                {metricas?.countVendasEfetivadas || 0}
              </span>
            </div>
          </div>

          {/* Vendas Canceladas */}
          <div
            className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-1 transition-colors hover:bg-primary/5"
            onClick={() => setIsGraficoVendasCanceladasOpen(true)}
            title="Clique para ver gráfico de vendas canceladas por usuário"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-error">
              <span className="text-xl text-info">✕</span>
            </div>
            <div className="flex flex-1 flex-col items-end">
              <span className="font-nunito text-xs text-secondary-text">Vendas Canceladas</span>
              <span className="font-exo text-[22px] text-primary">
                {metricas?.countVendasCanceladas || 0}
              </span>
            </div>
          </div>

          {/* Total de Produtos Vendidos */}
          <div className="flex flex-1 items-center gap-3 rounded-lg border-2 p-1">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-warning">
              <span className="text-xl text-info">
                <MdRestaurant />
              </span>
            </div>
            <div className="flex flex-1 flex-col items-end">
              <span className="font-nunito text-xs text-secondary-text">Produtos Vendidos</span>
              <span className="font-exo text-[22px] text-primary">
                {metricas?.countProdutosVendidos || 0}
              </span>
            </div>
          </div>

          {/* Total Cancelado */}
          <div className="flex flex-1 items-center gap-3 rounded-lg border-2 p-1">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-error/80">
              <span className="text-xl text-info">
                <MdAttachMoney />
              </span>
            </div>
            <div className="flex flex-1 flex-col items-end">
              <span className="font-nunito text-xs text-secondary-text">Total Cancelado</span>
              <span className="font-exo text-[22px] text-primary">
                {formatCurrency(totalCanceladoSomenteLista)}
              </span>
              {hasMoreVendas ? (
                <span className="font-nunito max-w-[10rem] text-right text-[10px] leading-tight text-secondary-text">
                  Parcial: Vendas carregadas na lista.
                </span>
              ) : null}
            </div>
          </div>

          {/* Total Faturado */}
          <div className="flex flex-1 items-center gap-3 rounded-lg border-2 p-1">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent1">
              <span className="text-xl text-info">
                <MdAttachMoney />
              </span>
            </div>
            <div className="flex flex-1 flex-col items-end">
              <span className="font-nunito text-xs text-secondary-text">Total Faturado</span>
              <span className="font-exo text-[22px] text-primary">
                {metricas?.totalFaturado ? formatCurrency(metricas.totalFaturado) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Vendas */}
        <div className="overflow-hidden rounded-lg bg-info">
          {/* Cabeçalho */}
          <div className="font-nunito flex items-center gap-2 rounded-t-lg bg-custom-2 py-2 text-sm font-semibold text-primary-text md:px-3">
            <div className="hidden flex-1 md:flex">Código Venda</div>
            <div className="flex-1 text-center text-xs md:text-sm">Data Abertura</div>
            <div className="hidden flex-1 text-center text-xs md:flex md:text-sm">
              Data Finalização
            </div>
            <div className="flex-1 text-center text-xs md:text-sm">Tipo Venda</div>
            <div className="hidden flex-1 justify-center md:flex">Cód. Terminal</div>
            <div className="flex-[2] text-center text-xs md:text-sm">Usuário PDV</div>
            <div className="hidden flex-1 justify-end text-xs md:flex md:text-sm">
              VL. Cancelado
            </div>
            <div className="flex-1 text-right text-xs md:text-sm">VL. Faturado</div>
            <div className="hidden flex-1 justify-end md:flex">Comprovante</div>
          </div>

          {/* Lista com scroll */}
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide max-h-[calc(100vh-350px)] overflow-y-auto px-1 py-2"
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <JiffyLoading />
              </div>
            )}

            {vendas.length === 0 && !isLoading && (
              <div className="flex items-center justify-center py-12">
                <p className="text-secondary-text">Nenhuma venda encontrada.</p>
              </div>
            )}

            {vendas.map((venda, index) => {
              const { date: dateAbertura, time: timeAbertura } = formatDateList(venda.dataCriacao)
              const { date: dateFinalizacao, time: timeFinalizacao } = formatDateList(
                venda.dataFinalizacao || venda.dataCriacao
              )
              const usuarioNome =
                usuariosPDV.find(u => u.id === venda.abertoPorId)?.nome || venda.abertoPorId
              const isZebraEven = index % 2 === 0

              return (
                <div
                  key={venda.id}
                  onClick={() => {
                    setSelectedVendaId(venda.id)
                    setDetalhesVendaAberta(true)
                  }}
                  className={`flex cursor-pointer items-center rounded-lg py-1 transition-all hover:bg-primary/10 md:px-2 ${(() => {
                    let baseClasses = ''
                    if (venda.dataCancelamento) {
                      baseClasses = 'bg-red-100 hover:bg-red-200'
                    } else if (
                      venda.dataFinalizacao &&
                      !venda.dataCancelamento &&
                      (venda.totalValorProdutosRemovidos || 0) > 0
                    ) {
                      // Venda FINALIZADA com produtos removidos: mesma cor vermelha de cancelada
                      baseClasses = 'bg-red-50 hover:bg-red-200'
                    } else if (!venda.dataCancelamento && !venda.dataFinalizacao) {
                      baseClasses = 'bg-yellow-100 hover:bg-yellow-200'
                    } else {
                      baseClasses = isZebraEven
                        ? 'bg-white hover:bg-gray-100'
                        : 'bg-gray-50 hover:bg-gray-200'
                    }
                    return baseClasses
                  })()}`}
                >
                  <div className="hidden flex-1 md:block">
                    <span className="text-sm font-normal text-primary-text">
                      #{venda.codigoVenda}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col items-center">
                    <span className="text-xs text-primary-text md:text-sm">{dateAbertura}</span>
                    <span className="text-xs text-primary-text md:text-sm">{timeAbertura}</span>
                  </div>
                  <div className="hidden flex-1 flex-col items-center justify-center md:flex">
                    <span className="text-xs text-primary-text md:text-sm">{dateFinalizacao}</span>
                    <span className="text-xs text-primary-text md:text-sm">{timeFinalizacao}</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center">
                    <TipoVendaIcon
                      tipoVenda={venda.tipoVenda}
                      numeroMesa={venda.numeroMesa}
                      corTexto="var(--color-info)" // Garante que o número da mesa seja visível
                      containerScale={0.9}
                      size={isMobileViewport ? 45 : 55}
                    />
                  </div>
                  <div className="hidden flex-1 text-center md:block">
                    <span className="text-sm text-primary-text">#{venda.codigoTerminal}</span>
                  </div>
                  <div className="flex-[2] text-center">
                    <span className="text-xs text-primary-text md:text-sm">{usuarioNome}</span>
                  </div>
                  <div className="hidden flex-1 text-right md:block">
                    <span className="text-xs text-primary-text md:text-sm">
                      {(() => {
                        // Se venda está CANCELADA: soma totalValorProdutosRemovidos + valorFinal
                        if (venda.dataCancelamento) {
                          const totalRemovidos = venda.totalValorProdutosRemovidos || 0
                          return formatCurrency(totalRemovidos + (venda.valorFinal || 0))
                        }
                        // Se venda está FINALIZADA: exibe apenas totalValorProdutosRemovidos
                        if (venda.dataFinalizacao && !venda.dataCancelamento) {
                          const totalRemovidos = venda.totalValorProdutosRemovidos || 0
                          return totalRemovidos > 0 ? formatCurrency(totalRemovidos) : '-'
                        }
                        // Caso contrário (venda aberta): não exibe nada
                        return '-'
                      })()}
                    </span>
                  </div>
                  <div className="flex-1 text-end">
                    <span className="text-xs text-primary-text md:text-sm">
                      {venda.dataCancelamento ? '-' : formatCurrency(venda.valorFinal)}
                    </span>
                  </div>
                  <div className="hidden flex-1 justify-end md:flex">
                    <button
                      onClick={e => {
                        e.stopPropagation() // Impede que o clique no botão acione o clique da linha
                        void handleVerNfce(venda.id)
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded text-primary transition-colors hover:bg-primary/10"
                      title="Ver NFCe"
                      disabled={!!isAbrindoNfce[venda.id]}
                    >
                      <MdReceiptLong size={25} />
                    </button>
                  </div>
                </div>
              )
            })}

            {isLoadingMore ? (
              <div className="flex justify-center py-3" aria-busy="true">
                <JiffyLoading />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedVendaId ? (
        <DetalhesVendas
          vendaId={selectedVendaId}
          open={detalhesVendaAberta}
          onClose={() => setDetalhesVendaAberta(false)}
          onAfterClose={() => setSelectedVendaId(null)}
        />
      ) : null}

      {/* Painel lateral: mesmo calendário de intervalo + horas do dashboardV2 */}
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
            onClick={handleAplicarIntervaloDatasVendas}
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
            month={mesCalendarioIntervalo}
            onMonthChange={setMesCalendarioIntervalo}
            faturamentoPorDia={faturamentoPorDiaCalendario ?? {}}
            faturamentoCarregando={faturamentoCalendarioPending || faturamentoCalendarioFetching}
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

      {/* Modal de Gráfico de Vendas por Usuário */}
      <GraficoVendasPorUsuarioModal
        open={isGraficoVendasPorUsuarioOpen}
        onClose={() => setIsGraficoVendasPorUsuarioOpen(false)}
        vendas={vendas}
        usuariosPDV={usuariosPDV}
        tipo="finalizadas"
        avisoListaParcial={avisoGraficoListaParcial}
      />

      {/* Modal de Gráfico de Vendas Canceladas por Usuário */}
      <GraficoVendasPorUsuarioModal
        open={isGraficoVendasCanceladasOpen}
        onClose={() => setIsGraficoVendasCanceladasOpen(false)}
        vendas={vendas}
        usuariosPDV={usuariosPDV}
        tipo="canceladas"
        avisoListaParcial={avisoGraficoListaParcial}
      />
    </div>
  )
}

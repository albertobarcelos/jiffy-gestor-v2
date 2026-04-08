'use client'

import { Exo_2 } from 'next/font/google'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useDashboardResumoQuery } from '@/src/presentation/hooks/useDashboardResumoQuery'
import {
  calculatePeriodo,
  calculatePeriodoAnteriorParaComparacao,
} from '@/src/shared/utils/dateFilters'
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  DollarSign,
  CreditCard,
  FileX2,
  Receipt,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { MdOutlineMonetizationOn, MdReceiptLong, MdRestaurantMenu, MdAdd  } from "react-icons/md";
import { TbReceiptFilled } from "react-icons/tb";
import { IoReceipt } from "react-icons/io5";
import { Tooltip as MuiTooltip } from '@mui/material'


/** Exo 2 (Google) — o token Tailwind `font-exo` aponta para General Sans; aqui usamos a família real */
const exo2CabecalhoFaturamento = Exo_2({
  subsets: ['latin', 'latin-ext'],
  weight: '600',
  display: 'swap',
})

const MOCK_VENDAS_HORA = [
  { hora: '8h', hoje: 400, ontem: 520 },
  { hora: '9h', hoje: 890, ontem: 1100 },
  { hora: '10h', hoje: 1200, ontem: 980 },
  { hora: '11h', hoje: 2100, ontem: 2400 },
  { hora: '12h', hoje: 3500, ontem: 3200 },
  { hora: '13h', hoje: 2480, ontem: 2930 },
  { hora: '14h', hoje: 2680, ontem: 2100 },
  { hora: '15h', hoje: 1800, ontem: 1950 },
  { hora: '16h', hoje: 2200, ontem: 2000 },
  { hora: '17h', hoje: 2800, ontem: 2600 },
  { hora: '18h', hoje: 3200, ontem: 3000 },
  { hora: '19h', hoje: 2900, ontem: 3100 },
  { hora: '20h', hoje: 2400, ontem: 2500 },
  { hora: '21h', hoje: 1600, ontem: 1800 },
  { hora: '22h', hoje: 900, ontem: 1100 },
]

const FORMAS_PAGAMENTO = [
  { id: 'dinheiro', label: 'DINHEIRO', principal: '#22C55E', secundaria: '#F472B6', pct: 81 },
  { id: 'credito', label: 'CRÉDITO', principal: '#1E3A8A', secundaria: '#F472B6', pct: 81 },
  { id: 'pix', label: 'PIX', principal: '#B4DD2B', secundaria: '#F472B6', pct: 81 },
  { id: 'debito', label: 'DÉBITO', principal: '#3B82F6', secundaria: '#F472B6', pct: 81 },
]

/** Mock — integrar API depois */
const MOCK_TOP_PRODUTOS = [
  { id: '1', nome: 'COCA COLA 350ML', qtd: 24, pct: 20, valor: 500 },
  { id: '2', nome: 'ÁGUA MINERAL 500ML', qtd: 18, pct: 16, valor: 180 },
  { id: '3', nome: 'HAMBÚRGUER ARTESANAL', qtd: 14, pct: 14, valor: 420 },
  { id: '4', nome: 'BATATA FRITA 400G', qtd: 12, pct: 12, valor: 240 },
  { id: '5', nome: 'SUCO NATURAL LARANJA', qtd: 10, pct: 10, valor: 150 },
]

const MOCK_TOP_GARCONS = [
  { id: '1', nome: 'Alberto Barcelos', qtd: 24, mesas: 30, valor: 35000 },
  { id: '2', nome: 'Maria Fernandes', qtd: 20, mesas: 26, valor: 28900 },
  { id: '3', nome: 'João Pedro Silva', qtd: 18, mesas: 22, valor: 22100 },
  { id: '4', nome: 'Ana Carolina Souza', qtd: 15, mesas: 19, valor: 19800 },
  { id: '5', nome: 'Lucas Oliveira', qtd: 12, mesas: 15, valor: 15400 },
]

const LINHA_HOJE = '#530CA3'
const LINHA_ONTEM = '#D1D5DB'

/** Trigger do select de empresa (alinhado ao SelectTrigger Radix) */
const CLASSES_SELECT_EMPRESA =
  'h-auto min-h-[42px] w-full rounded-lg bg-primary/5 py-2 pl-4 pr-3 text-sm font-medium text-primary shadow-none ring-offset-0 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 data-[state=open]:border-primary [&>svg]:text-primary'

function formatarMoeda(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Contagem inteira com separador de milhar (pt-BR) */
function formatarContagemPedidos(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

type OpcoesBadgeVariacao = { menorMelhor?: boolean }

/**
 * Variação percentual atual vs referência (contagem, ticket médio, etc.).
 * Com `menorMelhor`, queda ou estabilidade vira badge verde (ex.: cancelamentos).
 */
function badgeVariacaoPercentual(
  atual: number,
  referencia: number,
  opcoes?: OpcoesBadgeVariacao
): { texto: string; positivo: boolean } {
  const menorMelhor = opcoes?.menorMelhor === true
  if (referencia <= 0 && atual <= 0) return { texto: '0%', positivo: true }
  if (referencia <= 0 && atual > 0) return { texto: 'Novo', positivo: !menorMelhor }
  const pct = Math.round(((atual - referencia) / referencia) * 100)
  const texto = `${pct > 0 ? '+' : ''}${pct}%`
  if (menorMelhor) return { texto, positivo: pct <= 0 }
  return { texto, positivo: pct >= 0 }
}

/**
 * Badge do card Cancelamentos: % + "Alto" (vermelho) se subiu vs período anterior, senão + "Baixo" (verde).
 */
function badgeTextoCancelamentos(atual: number, anterior: number): { texto: string; positivo: boolean } {
  if (anterior <= 0 && atual <= 0) {
    return { texto: '0% Baixo', positivo: true }
  }
  if (anterior <= 0 && atual > 0) {
    return { texto: 'Novo +Alto', positivo: false }
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  const pctStr = `${pct > 0 ? '+' : ''}${pct}%`
  if (atual > anterior) {
    return { texto: `${pctStr} +Alto`, positivo: false }
  }
  return { texto: `${pctStr} +Baixo`, positivo: true }
}

/** Ticket médio = faturamento ÷ vendas efetivadas (0 se não houver vendas). */
function ticketMedioResumo(totalFaturado: number, countVendasEfetivadas: number): number {
  if (countVendasEfetivadas <= 0) return 0
  return totalFaturado / countVendasEfetivadas
}

/** Itens por pedido = produtos vendidos ÷ vendas efetivadas (0 se não houver vendas). */
function itensPorPedidoResumo(countProdutosVendidos: number, countVendasEfetivadas: number): number {
  if (countVendasEfetivadas <= 0) return 0
  return countProdutosVendidos / countVendasEfetivadas
}

/** Número pt-BR com vírgula decimal (1–2 casas), p.ex. 1,2 */
function formatarItensPorPedido(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
}

function labelDataHoje() {
  const d = new Date()
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Valores do Select de período (V2) → rótulos esperados por `calculatePeriodo`
 * (mesmo contrato do dashboard em `MetricCards` + `page.tsx`).
 */
function periodoSelectV2ParaOpcaoCalculatePeriodo(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Hoje'
    case 'ontem':
      return 'Ontem'
    case 'semana':
      return 'Últimos 7 Dias'
    case '30dias':
      return 'Últimos 30 Dias'
    default:
      return 'Hoje'
  }
}

/**
 * Preset do filtro V2 → valor de `periodo` na URL de `/relatorios` (VendasList).
 * `null` quando não há opção equivalente no select de relatórios (ex.: Ontem).
 */
function periodoV2ParaQueryRelatorios(periodoData: string): string | null {
  switch (periodoData) {
    case 'hoje':
      return 'Hoje'
    case 'semana':
      return 'Últimos 7 Dias'
    case '30dias':
      return 'Últimos 30 Dias'
    default:
      return null
  }
}

/** Título da faixa de faturamento conforme o filtro global */
function tituloFaturamentoBanner(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Hoje você faturou'
    case 'ontem':
      return 'Ontem você faturou'
    case 'semana':
      return 'Nos últimos 7 dias você faturou'
    case '30dias':
      return 'Nos últimos 30 dias você faturou'
    default:
      return 'Você faturou'
  }
}

/** Rótulo do rodapé dos 4 cards (valor do período anterior equivalente) */
function rotuloRodapeComparacaoCards(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Ontem'
    case 'ontem':
      return 'Ante-ontem'
    case 'semana':
      return '7 dias anteriores'
    case '30dias':
      return '30 dias anteriores'
    default:
      return 'Período anterior'
  }
}

/** Parte do título do card após " - " (fonte menor, font-regular) */
function rotuloPeriodoTituloCard(periodoData: string): string | null {
  switch (periodoData) {
    case 'hoje':
      return 'hoje'
    case 'ontem':
      return 'ontem'
    case 'semana':
      return '7 dias'
    case '30dias':
      return '30 dias'
    default:
      return null
  }
}

/** Comparação do período selecionado com o bloco anterior equivalente (API) */
type ComparacaoComPeriodoAnterior =
  | { status: 'carregando' }
  | { status: 'erro' }
  | { status: 'semBase'; atual: number }
  | { status: 'ok'; pct: number; atual: number; anterior: number }

/** Textos da comparação com o período anterior equivalente (gramática pt-BR) */
function textosComparacaoPeriodoAnterior(periodoData: string): {
  sufixoVs: string
  acimaResto: string
  abaixoResto: string
  alinhadoCom: string
} {
  switch (periodoData) {
    case 'hoje':
      return {
        sufixoVs: 'ontem',
        acimaResto: 'de ontem',
        abaixoResto: 'de ontem',
        alinhadoCom: 'ontem',
      }
    case 'ontem':
      return {
        sufixoVs: 'no ante-ontem',
        acimaResto: 'de ante-ontem',
        abaixoResto: 'de ante-ontem',
        alinhadoCom: 'ante-ontem',
      }
    case 'semana':
      return {
        sufixoVs: 'nos 7 dias anteriores',
        acimaResto: 'dos 7 dias anteriores',
        abaixoResto: 'dos 7 dias anteriores',
        alinhadoCom: 'os 7 dias anteriores',
      }
    case '30dias':
      return {
        sufixoVs: 'nos 30 dias anteriores',
        acimaResto: 'dos 30 dias anteriores',
        abaixoResto: 'dos 30 dias anteriores',
        alinhadoCom: 'os 30 dias anteriores',
      }
    default:
      return {
        sufixoVs: 'no período anterior',
        acimaResto: 'do período anterior',
        abaixoResto: 'do período anterior',
        alinhadoCom: 'o período anterior',
      }
  }
}

/** Início da frase quando a base de comparação veio zerada */
function prefixoSemFaturamentoNaBase(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Ontem não houve faturamento'
    case 'ontem':
      return 'Ante-ontem não houve faturamento'
    case 'semana':
      return 'Nos 7 dias anteriores não houve faturamento'
    case '30dias':
      return 'Nos 30 dias anteriores não houve faturamento'
    default:
      return 'No período de comparação não houve faturamento'
  }
}

/**
 * Rótulo "Atualizado …" em português a partir do timestamp da última carga dos dados.
 * Com React Query, use o mesmo instante que `dataUpdatedAt` (ou `Date.now()` após fetch ok).
 */
function textoUltimaAtualizacao(ultimaAtualizacaoMs: number): string {
  const diffMs = Math.max(0, Date.now() - ultimaAtualizacaoMs)
  const segundos = Math.floor(diffMs / 1000)
  if (segundos < 45) return 'Atualizado agora há pouco'
  if (segundos < 90) return 'Atualizado há 1 minuto'
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) {
    return minutos === 1 ? 'Atualizado há 1 minuto' : `Atualizado há ${minutos} minutos`
  }
  const horas = Math.floor(minutos / 60)
  if (horas < 24) {
    return horas === 1 ? 'Atualizado há 1 hora' : `Atualizado há ${horas} horas`
  }
  const dias = Math.floor(horas / 24)
  if (dias < 7) {
    return dias === 1 ? 'Atualizado há 1 dia' : `Atualizado há ${dias} dias`
  }
  const d = new Date(ultimaAtualizacaoMs)
  return `Atualizado em ${d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
}

/** Mini donut para cada forma de pagamento (layout Figma 2x2) */
function DonutFormaPagamento({
  principal,
  secundaria,
  pct,
  label,
}: {
  principal: string
  secundaria: string
  pct: number
  label: string
}) {
  const data = [
    { name: 'principal', value: pct, fill: principal },
    { name: 'resto', value: 100 - pct, fill: secundaria },
  ]
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-primary-text md:text-xs">
        {label}
      </p>
      <div className="relative h-[100px] w-[100px] md:h-[120px] md:w-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="54%"
              outerRadius="100%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold text-primary-text md:text-xl">
          {pct}%
        </span>
      </div>
    </div>
  )
}

/**
 * Nova visão geral do dashboard (layout Figma).
 * Conteúdo abaixo do TopNav — navegação global fica no layout `app/dashboard/layout.tsx`.
 */
export default function DashboardV2() {
  const router = useRouter()
  const { empresa: empresaLogada, isLoading: carregandoEmpresa, error: erroEmpresa, refetch: refetchEmpresa } =
    useEmpresaMe()
  const [lojaId, setLojaId] = useState('')
  const [periodoData, setPeriodoData] = useState('hoje')
  const [granularidade, setGranularidade] = useState('hora')
  const [modoTopProduto, setModoTopProduto] = useState<'porcentagem' | 'valor'>('porcentagem')
  const [filtroTopProduto, setFiltroTopProduto] = useState('hoje')
  const [filtroTopGarcom, setFiltroTopGarcom] = useState('hoje')

  /** Momento em que os dados do dashboard foram considerados atualizados (mock: montagem; com API: após fetch bem-sucedido) */
  const [dadosAtualizadosEm, setDadosAtualizadosEm] = useState(() => Date.now())
  const [, setTickRelogio] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTickRelogio(n => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const aoVisibilidade = () => {
      if (document.visibilityState === 'visible') setTickRelogio(n => n + 1)
    }
    document.addEventListener('visibilitychange', aoVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoVisibilidade)
  }, [])

  const maxValorProduto = useMemo(
    () => Math.max(...MOCK_TOP_PRODUTOS.map(p => p.valor), 1),
    []
  )

  const opcaoCalculatePeriodo = useMemo(
    () => periodoSelectV2ParaOpcaoCalculatePeriodo(periodoData),
    [periodoData]
  )

  const { inicio: inicioResumo, fim: fimResumo } = useMemo(() => {
    return calculatePeriodo(opcaoCalculatePeriodo)
  }, [opcaoCalculatePeriodo, dadosAtualizadosEm])

  const { inicio: inicioAnterior, fim: fimAnterior } = useMemo(() => {
    const r = calculatePeriodoAnteriorParaComparacao(opcaoCalculatePeriodo)
    if (!r) return { inicio: null, fim: null }
    return r
  }, [opcaoCalculatePeriodo, dadosAtualizadosEm])

  const {
    data: dadosResumo,
    isLoading: carregandoResumo,
    isError: erroResumo,
    refetch: refetchResumo,
  } = useDashboardResumoQuery({
    periodoInicial: inicioResumo,
    periodoFinal: fimResumo,
  })

  const {
    data: dadosResumoAnterior,
    isLoading: carregandoResumoAnterior,
    isError: erroResumoAnterior,
    refetch: refetchResumoAnterior,
  } = useDashboardResumoQuery({
    periodoInicial: inicioAnterior,
    periodoFinal: fimAnterior,
    enabled: inicioAnterior != null && fimAnterior != null,
  })

  const rotuloRodapeCards = rotuloRodapeComparacaoCards(periodoData)

  const cardPedidosHojeProps = useMemo(() => {
    const carregando =
      (carregandoResumo && dadosResumo == null) ||
      (carregandoResumoAnterior && dadosResumoAnterior == null)
    if (erroResumo || erroResumoAnterior) {
      return {
        valor: '—',
        badge: '—',
        rodape: 'Erro ao carregar vendas',
        badgePositivo: false,
      }
    }
    if (carregando) {
      return {
        valor: '…',
        badge: '…',
        rodape: `${rotuloRodapeCards}: …`,
        badgePositivo: true,
      }
    }
    const atual = dadosResumo?.metricas?.total?.countVendasEfetivadas ?? 0
    const anterior = dadosResumoAnterior?.metricas?.total?.countVendasEfetivadas ?? 0
    const { texto, positivo } = badgeVariacaoPercentual(atual, anterior)
    return {
      valor: formatarContagemPedidos(atual),
      badge: texto,
      rodape: `${rotuloRodapeCards}: ${formatarContagemPedidos(anterior)}`,
      badgePositivo: positivo,
    }
  }, [
    rotuloRodapeCards,
    carregandoResumo,
    carregandoResumoAnterior,
    dadosResumo,
    dadosResumoAnterior,
    erroResumo,
    erroResumoAnterior,
  ])

  const cardTicketMedioProps = useMemo(() => {
    const carregando =
      (carregandoResumo && dadosResumo == null) ||
      (carregandoResumoAnterior && dadosResumoAnterior == null)
    if (erroResumo || erroResumoAnterior) {
      return {
        valor: '—',
        badge: '—',
        rodape: 'Erro ao carregar ticket médio',
        badgePositivo: false,
      }
    }
    if (carregando) {
      return {
        valor: '…',
        badge: '…',
        rodape: `${rotuloRodapeCards}: …`,
        badgePositivo: true,
      }
    }
    const mA = dadosResumo?.metricas?.total
    const mRef = dadosResumoAnterior?.metricas?.total
    const ticketAtual = ticketMedioResumo(
      mA?.totalFaturado ?? 0,
      mA?.countVendasEfetivadas ?? 0
    )
    const ticketAnterior = ticketMedioResumo(
      mRef?.totalFaturado ?? 0,
      mRef?.countVendasEfetivadas ?? 0
    )
    const { texto, positivo } = badgeVariacaoPercentual(ticketAtual, ticketAnterior)
    return {
      valor: formatarMoeda(ticketAtual),
      badge: texto,
      rodape: `${rotuloRodapeCards}: ${formatarMoeda(ticketAnterior)}`,
      badgePositivo: positivo,
    }
  }, [
    rotuloRodapeCards,
    carregandoResumo,
    carregandoResumoAnterior,
    dadosResumo,
    dadosResumoAnterior,
    erroResumo,
    erroResumoAnterior,
  ])

  const cardItensPorPedidoProps = useMemo(() => {
    const carregando =
      (carregandoResumo && dadosResumo == null) ||
      (carregandoResumoAnterior && dadosResumoAnterior == null)
    if (erroResumo || erroResumoAnterior) {
      return {
        valor: '—',
        badge: '—',
        rodape: 'Erro ao carregar itens por pedido',
        badgePositivo: false,
      }
    }
    if (carregando) {
      return {
        valor: '…',
        badge: '…',
        rodape: `${rotuloRodapeCards}: …`,
        badgePositivo: true,
      }
    }
    const mA = dadosResumo?.metricas?.total
    const mRef = dadosResumoAnterior?.metricas?.total
    const itensAtual = itensPorPedidoResumo(
      mA?.countProdutosVendidos ?? 0,
      mA?.countVendasEfetivadas ?? 0
    )
    const itensAnterior = itensPorPedidoResumo(
      mRef?.countProdutosVendidos ?? 0,
      mRef?.countVendasEfetivadas ?? 0
    )
    const { texto, positivo } = badgeVariacaoPercentual(itensAtual, itensAnterior)
    return {
      valor: formatarItensPorPedido(itensAtual),
      badge: texto,
      rodape: `${rotuloRodapeCards}: ${formatarItensPorPedido(itensAnterior)}`,
      badgePositivo: positivo,
    }
  }, [
    rotuloRodapeCards,
    carregandoResumo,
    carregandoResumoAnterior,
    dadosResumo,
    dadosResumoAnterior,
    erroResumo,
    erroResumoAnterior,
  ])

  const cardCancelamentosProps = useMemo(() => {
    const carregando =
      (carregandoResumo && dadosResumo == null) ||
      (carregandoResumoAnterior && dadosResumoAnterior == null)
    if (erroResumo || erroResumoAnterior) {
      return {
        valor: '—',
        badge: '—',
        rodape: 'Erro ao carregar cancelamentos',
        badgePositivo: false,
      }
    }
    if (carregando) {
      return {
        valor: '…',
        badge: '…',
        rodape: `${rotuloRodapeCards}: …`,
        badgePositivo: true,
      }
    }
    const atual =
      dadosResumo?.metricas?.canceladas?.countVendasCanceladas ?? 0
    const anterior =
      dadosResumoAnterior?.metricas?.canceladas?.countVendasCanceladas ?? 0
    const { texto, positivo } = badgeTextoCancelamentos(atual, anterior)
    return {
      valor: formatarContagemPedidos(atual),
      badge: texto,
      rodape: `${rotuloRodapeCards}: ${formatarContagemPedidos(anterior)}`,
      badgePositivo: positivo,
    }
  }, [
    rotuloRodapeCards,
    carregandoResumo,
    carregandoResumoAnterior,
    dadosResumo,
    dadosResumoAnterior,
    erroResumo,
    erroResumoAnterior,
  ])

  const totalFaturadoPeriodo = dadosResumo?.metricas?.total?.totalFaturado ?? 0

  const comparacaoPeriodoAnterior = useMemo((): ComparacaoComPeriodoAnterior => {
    if (erroResumo || erroResumoAnterior) return { status: 'erro' }
    if (dadosResumo == null || dadosResumoAnterior == null) return { status: 'carregando' }
    const atual = dadosResumo.metricas?.total?.totalFaturado ?? 0
    const anterior = dadosResumoAnterior.metricas?.total?.totalFaturado ?? 0
    if (anterior <= 0 && atual > 0) return { status: 'semBase', atual }
    if (anterior <= 0 && atual <= 0) return { status: 'ok', pct: 0, atual, anterior }
    const pct = Math.round(((atual - anterior) / anterior) * 100)
    return { status: 'ok', pct, atual, anterior }
  }, [erroResumo, erroResumoAnterior, dadosResumo, dadosResumoAnterior])

  const subtituloAtualizacao = textoUltimaAtualizacao(dadosAtualizadosEm)

  /** Com uma única empresa, o id vem do `/me`; com várias no futuro, prevalece o escolhido em `lojaId` */
  const valorEmpresaSelect = lojaId || empresaLogada?.id || ''

  const handleAtualizarDashboard = () => {
    void Promise.all([refetchEmpresa(), refetchResumo(), refetchResumoAnterior()]).then(() => {
      setDadosAtualizadosEm(Date.now())
      setTickRelogio(n => n + 1)
    })
  }

  const copyComparacao = textosComparacaoPeriodoAnterior(periodoData)

  const irParaRelatoriosVendas = () => {
    const preset = periodoV2ParaQueryRelatorios(periodoData)
    if (preset) {
      router.push(`/relatorios?${new URLSearchParams({ periodo: preset }).toString()}`)
    } else {
      router.push('/relatorios')
    }
  }

  return (
    <div className="min-h-0 w-full bg-gray-50 pb-8 pt-2 font-nunito">
      {/* Cabeçalho + filtros */}
      <div className="mb-2 flex flex-col px-2 md:flex-row md:items-end md:px-4">
        <div>
          <h1 className="font-exo text-xl font-semibold text-primary-text md:text-xl">Visão Geral</h1>
          <p className="mt-1 flex flex-wrap items-center font-regular gap-2 text-sm text-primary-text">
            {subtituloAtualizacao}
          </p>
        </div>
        <MuiTooltip
          title="Atualizar dados"
          placement="bottom"
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: '#ffffff',
                color: '#111827',
                border: '1px solid #e5e7eb',
                boxShadow: 2,
                fontSize: '0.8125rem',
              },
            },
          }}
        >
          <span className="ml-2 mr-8 inline-flex shrink-0">
            <button
              type="button"
              onClick={handleAtualizarDashboard}
              disabled={carregandoEmpresa}
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-primary/20 bg-white text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Atualizar dados do dashboard"
            >
              <RefreshCw
                className={`h-5 w-5 ${carregandoEmpresa ? 'animate-spin' : ''}`}
                aria-hidden
              />
            </button>
          </span>
        </MuiTooltip>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2">
           
            <span className="inline-flex h-2 w-2 rounded-full bg-secondary" aria-hidden />
            <div className="relative min-w-[200px] flex-1">
            <label htmlFor="dashboard-empresa" className="sr-only">
              Empresa
            </label>
            {carregandoEmpresa ? (
              <div
                className={`${CLASSES_SELECT_EMPRESA} flex cursor-wait items-center text-primary/70`}
                aria-busy="true"
              >
                Carregando empresa…
              </div>
            ) : erroEmpresa || !empresaLogada ? (
              <div
                className={`${CLASSES_SELECT_EMPRESA} flex flex-col gap-1 border border-red-200 bg-red-50/80 py-2 text-xs text-red-800`}
                role="alert"
              >
                <span>{erroEmpresa ?? 'Empresa não disponível'}</span>
                <button
                  type="button"
                  onClick={() => void refetchEmpresa()}
                  className="self-start text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <Select value={valorEmpresaSelect} onValueChange={setLojaId}>
                <SelectTrigger id="dashboard-empresa" className={CLASSES_SELECT_EMPRESA}>
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-gray-200 bg-white">
                  <SelectItem
                    value={empresaLogada.id}
                    className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:!bg-primary data-[highlighted]:!text-white data-[highlighted]:rounded-lg data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:rounded-lg"
                  >
                    {empresaLogada.nomeExibicao}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            </div>
          </div>
          <span className="inline-flex h-2 w-2 rounded-full bg-secondary" aria-hidden />
          <div className="relative min-w-[200px]">
            <label htmlFor="dashboard-periodo-data" className="sr-only">
              Período
            </label>
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
            <Select value={periodoData} onValueChange={setPeriodoData}>
              <SelectTrigger
                id="dashboard-periodo-data"
                className="h-auto min-h-[42px] w-full rounded-lg bg-primary/5 py-2 pl-10 pr-3 text-sm font-medium text-primary shadow-none ring-offset-0 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 data-[state=open]:border-primary [&>svg]:text-primary"
              >
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-gray-200 bg-white">
                <SelectItem
                  value="hoje"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:!bg-primary data-[highlighted]:!text-white data-[highlighted]:rounded-lg data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:rounded-lg"
                >
                  <span className="inline-flex flex-wrap items-baseline gap-x-1">
                    <span className="text-sm font-semibold">Hoje</span>
                    <span className="text-[10px] font-normal opacity-90">· {labelDataHoje()}</span>
                  </span>
                </SelectItem>
                <SelectItem
                  value="ontem"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:!bg-primary data-[highlighted]:!text-white data-[highlighted]:rounded-lg data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:rounded-lg"
                >
                  Ontem
                </SelectItem>
                <SelectItem
                  value="semana"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:!bg-primary data-[highlighted]:!text-white data-[highlighted]:rounded-lg data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:rounded-lg"
                >
                  Últimos 7 dias
                </SelectItem>
                <SelectItem
                  value="30dias"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:!bg-primary data-[highlighted]:!text-white data-[highlighted]:rounded-lg data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:rounded-lg"
                >
                  Últimos 30 dias
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Faixa roxa: altura só do grid de 2 colunas; mascote em absolute (não entra no fluxo) */}
      <div className="relative z-0 mx-2 mb-2 overflow-visible md:mx-4">
        <div className="relative overflow-visible rounded-2xl bg-gradient-to-br from-secondary via-[#6B21C7] to-[#8338EC] px-3 py-2 pr-24 sm:pr-28 md:px-5 md:py-4 md:pr-32 lg:pr-[min(300px,32vw)]">
          {/* Duas colunas — definem a altura da faixa */}
          <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-3 lg:gap-8">
            <div>
              <div className="mb-2 flex items-center gap-1 text-white/90">
                <MdOutlineMonetizationOn
                className="h-8 w-8 text-[#F59E0B]" size={30} />
                <span className={`${exo2CabecalhoFaturamento.className} text-lg`}>
                  {tituloFaturamentoBanner(periodoData)}
                </span>
              </div>
              <p
                className={`font-exo text-2xl font-semibold text-white md:text-[40px] ${
                  carregandoResumo ? 'animate-pulse opacity-80' : ''
                }`}
              >
                {erroResumo
                  ? '—'
                  : carregandoResumo && dadosResumo == null
                    ? '…'
                    : formatarMoeda(totalFaturadoPeriodo)}
              </p>
              <div className="mt-3 inline-flex flex-wrap items-center gap-1 py-1 text-base font-regular text-white/90">
                {comparacaoPeriodoAnterior.status === 'carregando' ? (
                  <span className="text-sm opacity-80">Carregando comparação…</span>
                ) : comparacaoPeriodoAnterior.status === 'erro' ? (
                  <span className="text-sm opacity-90">
                    Não foi possível carregar o período de comparação
                  </span>
                ) : comparacaoPeriodoAnterior.status === 'semBase' ? (
                  <span className="text-base font-regular">
                    vs. {formatarMoeda(0)} {copyComparacao.sufixoVs}
                  </span>
                ) : comparacaoPeriodoAnterior.status === 'ok' ? (
                  <>
                    <span
                      className={`rounded-lg px-3 py-0.5 text-sm font-semibold ${
                        comparacaoPeriodoAnterior.pct > 0
                          ? 'bg-[#00B074]'
                          : comparacaoPeriodoAnterior.pct < 0
                            ? 'bg-red-600'
                            : 'bg-white/25'
                      }`}
                    >
                      {comparacaoPeriodoAnterior.pct > 0 ? '+' : ''}
                      {comparacaoPeriodoAnterior.pct}%
                    </span>
                    <span className="text-base font-regular">
                      vs. {formatarMoeda(comparacaoPeriodoAnterior.anterior)}{' '}
                      {copyComparacao.sufixoVs}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="col-span-2 flex flex-col items-start gap-4 text-white/90 lg:items-center lg:text-center">
              {comparacaoPeriodoAnterior.status === 'carregando' ? (
                <span className="text-lg font-semibold tracking-wide opacity-80">…</span>
              ) : comparacaoPeriodoAnterior.status === 'erro' ? (
                <span className="text-lg font-semibold tracking-wide opacity-90">
                  Atualize a página ou tente novamente em instantes
                </span>
              ) : comparacaoPeriodoAnterior.status === 'semBase' ? (
                <span className="text-lg font-semibold tracking-wide">
                  {prefixoSemFaturamentoNaBase(periodoData)}
                </span>
              ) : comparacaoPeriodoAnterior.status === 'ok' ? (
                comparacaoPeriodoAnterior.pct > 0 ? (
                  <span className="text-lg font-semibold tracking-wide">
                    Suas vendas estão{' '}
                    <span className="text-xl font-bold text-[#00B074]">
                      {comparacaoPeriodoAnterior.pct}%
                    </span>{' '}
                    acima {copyComparacao.acimaResto}
                  </span>
                ) : comparacaoPeriodoAnterior.pct < 0 ? (
                  <span className="text-lg font-semibold tracking-wide">
                    Suas vendas estão{' '}
                    <span className="text-xl font-bold">
                      {Math.abs(comparacaoPeriodoAnterior.pct)}%
                    </span>{' '}
                    abaixo {copyComparacao.abaixoResto}
                  </span>
                ) : (
                  <span className="text-lg font-semibold tracking-wide">
                    Faturamento alinhado com {copyComparacao.alinhadoCom} (
                    {formatarMoeda(comparacaoPeriodoAnterior.anterior)})
                  </span>
                )
              ) : null}
              <button
                type="button"
                onClick={irParaRelatoriosVendas}
                className="inline-flex items-center text-lg gap-2 rounded-full bg-accent1 px-8 py-2 font-semibold text-white shadow-md transition hover:brightness-95"
              >
                Veja suas vendas em tempo real
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mascote fora do grid: absolute em relação à faixa; não influencia altura */}
          <div
            className="pointer-events-none absolute bottom-0 right-0 z-20 h-[200px] w-[160px] translate-x-2 translate-y-2 sm:h-[230px] sm:w-[200px] sm:translate-x-4 sm:translate-y-3 md:h-[180px] md:w-[180px] md:translate-x-6 lg:h-[240px] lg:w-[200px] lg:translate-x-8 lg:translate-y-4 xl:h-[240px] xl:w-[220px] xl:translate-x-12"
            aria-hidden
          >
            <div className="relative h-full w-full">
              <Image
                src="/images/jiffy-acenando.png"
                alt=""
                fill
                className="object-contain object-bottom-right drop-shadow-xl"
                sizes="(max-width: 768px) 220px, (max-width: 1024px) 260px, 320px"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 cards de métricas */}
      <div className="mx-2 mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 md:mx-4">
        <MetricCard
          tituloBase="Pedidos"
          tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
          icon={
            <div className="relative flex h-8 w-8 items-center justify-center">
              <MdReceiptLong className="text-[#1E3A8A]" size={30} aria-hidden />
              <span
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center"
              >
                <MdAdd  className="text-[#00B074] font-bold" size={34} />
              </span>
            </div>
          }
          valor={cardPedidosHojeProps.valor}
          badge={cardPedidosHojeProps.badge}
          rodape={cardPedidosHojeProps.rodape}
          badgePositivo={cardPedidosHojeProps.badgePositivo}
        />
        <MetricCard
          tituloBase="Ticket médio"
          tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
          icon={<TbReceiptFilled size={32} />}
          valor={cardTicketMedioProps.valor}
          badge={cardTicketMedioProps.badge}
          rodape={cardTicketMedioProps.rodape}
          badgePositivo={cardTicketMedioProps.badgePositivo}
        />
        <MetricCard
          tituloBase="Itens por pedido"
          tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
          icon={<MdRestaurantMenu size={32} />}
          valor={cardItensPorPedidoProps.valor}
          badge={cardItensPorPedidoProps.badge}
          rodape={cardItensPorPedidoProps.rodape}
          badgePositivo={cardItensPorPedidoProps.badgePositivo}
        />
        <MetricCard
          tituloBase="Cancelamentos"
          tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
          icon={
            <div className="relative flex h-8 w-8 items-center justify-center">
              <IoReceipt className="text-[#1E3A8A]" size={30} aria-hidden />
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-violet-100"
                aria-hidden
              >
                <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              </span>
            </div>
          }
          valor={cardCancelamentosProps.valor}
          badge={cardCancelamentosProps.badge}
          rodape={cardCancelamentosProps.rodape}
          badgePositivo={cardCancelamentosProps.badgePositivo}
        />
      </div>

      {/* Gráfico + formas de pagamento */}
      <div className="mx-2 grid grid-cols-1 gap-2 lg:grid-cols-12 md:mx-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-exo text-lg font-semibold text-primary-text md:text-xl">Vendas hoje vs. ontem</h2>
            <div className="relative min-w-[140px]">
              <select
                value={granularidade}
                onChange={e => setGranularidade(e.target.value)}
                className="focus:border-secondary w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-semibold text-primary-text"
              >
                <option value="hora">Por hora</option>
                <option value="dia">Por dia</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-text" />
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-6 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 rounded bg-secondary" />
              Hoje
            </span>
            <span className="inline-flex items-center gap-2 text-secondary-text">
              <span className="h-0.5 w-6 rounded bg-gray-300" />
              Ontem
            </span>
          </div>
          <div className="h-[280px] w-full md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_VENDAS_HORA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} />
                <YAxis
                  tickFormatter={v => `R$ ${v >= 1000 ? `${v / 1000}k` : v}`}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const h = payload.find(p => p.dataKey === 'hoje')
                    const o = payload.find(p => p.dataKey === 'ontem')
                    return (
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
                        <p className="mb-1 text-xs font-semibold text-secondary-text">{label}</p>
                        {h != null && (
                          <p className="text-sm font-semibold" style={{ color: LINHA_HOJE }}>
                            Hoje: {formatarMoeda(Number(h.value))}
                          </p>
                        )}
                        {o != null && (
                          <p className="text-sm text-gray-500">
                            Ontem: {formatarMoeda(Number(o.value))}
                          </p>
                        )}
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ontem"
                  stroke={LINHA_ONTEM}
                  strokeWidth={2}
                  dot={false}
                  name="Ontem"
                />
                <Line
                  type="monotone"
                  dataKey="hoje"
                  stroke={LINHA_HOJE}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: LINHA_HOJE, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  name="Hoje"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-4">
          <h2 className="font-exo mb-4 text-lg font-semibold text-primary-text md:text-xl">Formas de Pagamento</h2>
          <div className="grid flex-1 grid-cols-2 gap-4">
            {FORMAS_PAGAMENTO.map(fp => (
              <DonutFormaPagamento
                key={fp.id}
                label={fp.label}
                principal={fp.principal}
                secundaria={fp.secundaria}
                pct={fp.pct}
              />
            ))}
          </div>
          <button
            type="button"
            className="text-secondary hover:text-secondary/85 mt-6 inline-flex items-center justify-center gap-1 text-sm font-semibold transition"
          >
            Ver todos os pagamentos
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      </div>

      {/* Top produtos + Top garçons — duas colunas; listas com flex (sem tabela) */}
      <div className="mx-2 mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2 md:mx-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
            <h2 className="font-exo shrink-0 text-lg font-semibold text-primary-text md:text-xl">Top produtos</h2>
            <div className="flex flex-1 flex-wrap items-center justify-center gap-2 xl:justify-center">
              <div className="inline-flex rounded-lg bg-violet-100/90 p-0.5">
                <button
                  type="button"
                  onClick={() => setModoTopProduto('porcentagem')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition md:px-4 md:text-sm ${
                    modoTopProduto === 'porcentagem'
                      ? 'bg-secondary text-white shadow-sm'
                      : 'text-primary-text hover:bg-white/60'
                  }`}
                >
                  Porcentagem
                </button>
                <button
                  type="button"
                  onClick={() => setModoTopProduto('valor')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition md:px-4 md:text-sm ${
                    modoTopProduto === 'valor'
                      ? 'bg-secondary text-white shadow-sm'
                      : 'text-primary-text hover:bg-white/60'
                  }`}
                >
                  Valor Total
                </button>
              </div>
            </div>
            <div className="relative min-w-[120px] shrink-0 self-end xl:self-auto">
              <select
                value={filtroTopProduto}
                onChange={e => setFiltroTopProduto(e.target.value)}
                className="focus:border-secondary w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-medium text-primary-text"
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Últimos 7 dias</option>
                <option value="mes">Mês</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-text" />
            </div>
          </div>

          {/* Cabeçalho das colunas */}
          <div className="mb-2 flex gap-2 border-b border-gray-200 pb-2 text-[11px] font-medium uppercase tracking-wide text-primary-text md:text-xs">
            <div className="flex-[1.4] md:flex-[1.6]">Produto</div>
            <div className="flex-1 text-center">Quantidade</div>
            <div className="flex-1 text-center">
              {modoTopProduto === 'porcentagem' ? 'Porcentagem' : 'Valor (vs. maior)'}
            </div>
            <div className="flex-1 text-right">Valor Total</div>
          </div>

          <div className="flex flex-col">
            {MOCK_TOP_PRODUTOS.map((p, idx) => {
              const larguraBarra =
                modoTopProduto === 'porcentagem'
                  ? p.pct
                  : Math.round((p.valor / maxValorProduto) * 100)
              const rotuloMeio =
                modoTopProduto === 'porcentagem' ? `${p.pct}%` : formatarMoeda(p.valor)
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 py-3 text-sm md:gap-3 ${
                    idx > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-[1.4] items-center gap-2 md:flex-[1.6]">
                    <span className="text-sm font-regular text-primary-text">{p.nome}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-center text-sm font-regular text-primary-text">
                    {p.qtd} <span className="text-xs">un</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Barra em camadas: trilho + preenchimento + rótulo centralizado por cima */}
                    <div className="relative h-7 min-w-0 overflow-hidden rounded-lg bg-gray-200">
                      <div
                        className="absolute left-0 top-0 z-0 h-full rounded-lg bg-secondary transition-all"
                        style={{ width: `${Math.min(100, larguraBarra)}%` }}
                      />
                      <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs font-regular tabular-nums text-primary-text">
                        {rotuloMeio}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-right text-sm font-regular text-primary-text">
                    {formatarMoeda(p.valor)}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="text-secondary hover:text-secondary/85 mt-4 inline-flex items-center gap-1 text-sm font-semibold transition"
          >
            Ver todos os produtos
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-exo text-lg font-semibold text-primary-text md:text-xl">Top Garçons</h2>
            <div className="relative min-w-[120px] self-end sm:self-auto">
              <select
                value={filtroTopGarcom}
                onChange={e => setFiltroTopGarcom(e.target.value)}
                className="focus:border-secondary w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-medium text-primary-text"
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Últimos 7 dias</option>
                <option value="mes">Mês</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-text" />
            </div>
          </div>

          <div className="mb-2 flex gap-2 border-b border-gray-200 pb-2 text-[11px] font-medium uppercase tracking-wide text-primary-text md:text-xs">
            <div className="min-w-0 flex-1">Nome</div>
            <div className="min-w-0 flex-1 text-center">Quantidade</div>
            <div className="min-w-0 flex-1 text-center">Mesas Aten.</div>
            <div className="min-w-0 flex-1 text-right">Valor Total</div>
          </div>

          <div className="flex flex-col">
            {MOCK_TOP_GARCONS.map((g, idx) => (
              <div
                key={g.id}
                className={`flex items-center gap-2 py-3 text-sm md:gap-3 ${
                  idx > 0 ? 'border-t border-gray-100' : ''
                }`}
              >
                <div className="min-w-0 flex-1 truncate font-regular text-primary-text">{g.nome}</div>
                <div className="min-w-0 flex-1 text-center text-sm font-regular text-primary-text">{g.qtd}</div>
                <div className="min-w-0 flex-1 text-center text-sm font-regular text-primary-text">{g.mesas}</div>
                <div className="min-w-0 flex-1 text-right text-sm font-regular text-primary-text">
                  {formatarMoeda(g.valor)}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="text-secondary hover:text-secondary/85 mt-4 inline-flex items-center gap-1 text-sm font-semibold transition"
          >
            Ver todos os usuários
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      </div>
    </div>
  )
}

function MetricCard({
  tituloBase,
  tituloPeriodo,
  icon,
  valor,
  badge,
  rodape,
  badgePositivo,
}: {
  tituloBase: string
  /** Ex.: "7 dias"; null = só o título base */
  tituloPeriodo: string | null
  icon: ReactNode
  valor: string
  badge: string
  rodape: string
  badgePositivo: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-2">
      <div className="flex items-center gap-4">
        {/* Ícone à esquerda — círculo lavanda (modelo Figma) */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100/90 text-primary md:h-14 md:w-14">
          {icon}
        </div>
        {/* Título, valor + badge e rodapé à direita */}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-primary-text">
            {tituloBase}
            {tituloPeriodo ? (
              <span className="text-sm font-normal text-primary-text/90"> ({tituloPeriodo})</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-primary-text md:text-[32px]">
              {valor}
            </span>
            <span
              className={`rounded-md mr-4 px-2 py-0.5 text-sm font-medium text-white ${
                badgePositivo ? 'bg-[#00B074]' : 'bg-red-500'
              }`}
            >
              {badge}
            </span>
          </div>
          <p className="text-xs mt-1 leading-snug text-[#006699] md:text-sm">{rodape}</p>
        </div>
      </div>
    </div>
  )
}

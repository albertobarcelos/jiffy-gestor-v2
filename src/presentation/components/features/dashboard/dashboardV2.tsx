'use client'

import { Exo_2 } from 'next/font/google'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { startOfDay } from 'date-fns'
import {
  primeiroMesQuadroDuploCalendario,
  periodoFetchFaturamentoCalendarioDoisMeses,
} from '@/src/shared/utils/calendarioIntervaloFaturamento'
import {
  combinarIntervaloCalendarParaDatas,
  formatarDataHoraIntervaloCurta,
} from '@/src/shared/utils/intervaloCalendarioComHoras'
import type { DateRange } from 'react-day-picker'
import { useQueryClient } from '@tanstack/react-query'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useDashboardResumoQuery } from '@/src/presentation/hooks/useDashboardResumoQuery'
import { useDashboardEvolucaoQuery } from '@/src/presentation/hooks/useDashboardEvolucaoQuery'
import { useDashboardMetodosPagamentoDetalhadoQuery } from '@/src/presentation/hooks/useDashboardMetodosPagamentoDetalhadoQuery'
import { useDashboardTopProdutosQuery } from '@/src/presentation/hooks/useDashboardTopProdutosQuery'
import { useDashboardTopGarconsQuery } from '@/src/presentation/hooks/useDashboardTopGarconsQuery'
import { useDashboardFaturamentoPorDiaQuery } from '@/src/presentation/hooks/useDashboardFaturamentoPorDiaQuery'
import {
  mergePontosEvolucaoComparacao,
  type MetricaEvolucaoComparativo,
} from '@/src/presentation/components/features/dashboard/dashboardV2ComparacaoChart'
import {
  calculatePeriodo,
  calculatePeriodoAnteriorParaComparacao,
  permiteOpcoesIntervaloPorHora,
  deslocarPeriodoEmDiasCorridos,
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
  FilterX,
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
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { MdOutlineMonetizationOn, MdReceiptLong, MdRestaurantMenu, MdAdd } from 'react-icons/md'
import { TbReceiptFilled } from 'react-icons/tb'
import { IoReceipt } from 'react-icons/io5'
import { Tooltip as MuiTooltip } from '@mui/material'
import { FaMedal, FaTrophy } from 'react-icons/fa'

/** Exo 2 (Google) — o token Tailwind `font-exo` aponta para General Sans; aqui usamos a família real */
const exo2CabecalhoFaturamento = Exo_2({
  subsets: ['latin', 'latin-ext'],
  weight: '600',
  display: 'swap',
})

/** Arco “restante” dos mini-donuts de formas de pagamento; cor principal vem da paleta por índice. */
const COR_ARCO_RESTO_FORMAS_PAGAMENTO = '#EDE9FE'

/** Limite ao expandir “Ver todos os produtos” no card Top produtos V2 (API faz slice após agregar). */
const LIMITE_TOP_PRODUTOS_V2_COMPLETO = 500
/** No resumo pedimos 11 itens, exibimos 10; o 11º indica que existe lista maior (habilita o botão). */
const LIMITE_TOP_PRODUTOS_V2_RESUMO = 10
const LIMITE_TOP_PRODUTOS_V2_RESUMO_FETCH = LIMITE_TOP_PRODUTOS_V2_RESUMO + 1
/** Ranking fixo de garçons no card Top Garçons V2 (resumo: 10 linhas). */
const LIMITE_TOP_GARCONS_V2 = 10
/** Após “Ver todos os usuários”, lista completa (API limita após agregar). */
const LIMITE_TOP_GARCONS_V2_COMPLETO = 500

/**
 * Comparativo do período personalizado: mesma janela deslocada N dias corridos para trás
 * (início e fim, preservando horário).
 */
const DIAS_COMPARACAO_PERIODO_PERSONALIZADO = 30

/** Paleta cíclica para N métodos distintos (mesma ideia do modal de métodos). */
const PALETA_PRINCIPAL_FORMAS_PAGAMENTO = [
  '#00B074',
  '#003366',
  '#B4DD2B',
  '#006699',
  '#530CA3',
  '#FF9800',
  '#9C27B0',
  '#00BCD4',
  '#E91E63',
  '#530CA3',
  '#14B8A6',
]

/** Linha do período atual (filtro) e do período anterior — gráfico comparativo V2 */
const LINHA_PERIODO_ATUAL = '#530CA3'
const LINHA_PERIODO_ANTERIOR = '#E1D8EE'
/** Mesmas séries em modo canceladas (vermelho) */
const LINHA_CANCEL_ATUAL = '#DC2626'
const LINHA_CANCEL_ANTERIOR = '#FCA5A5'

/** Agregação do gráfico: 7/30 dias = por dia; hoje/ontem = buckets horários (minutos). */
type AgregacaoGraficoV2 = 'dia' | 'intervalo_60' | 'intervalo_30' | 'intervalo_15'

/** Minutos enviados à API `/dashboard/evolucao` conforme a opção do select. */
function intervaloMinutosAgregacaoGraficoV2(g: AgregacaoGraficoV2): number | undefined {
  switch (g) {
    case 'intervalo_60':
      return 60
    case 'intervalo_30':
      return 30
    case 'intervalo_15':
      return 15
    default:
      return undefined
  }
}

/** Trigger do select de empresa (alinhado ao SelectTrigger Radix) */
const CLASSES_SELECT_EMPRESA =
  'h-auto min-h-[42px] w-full rounded-lg bg-primary/5 py-2 pl-4 pr-3 text-sm font-medium text-primary shadow-none ring-offset-0 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 data-[state=open]:border-primary [&>svg]:text-primary'

function formatarMoeda(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** HH:mm a partir de Date (período personalizado). */
function formatarHoraParaInputCalendar(d: Date | null | undefined): string {
  if (!d) return '00:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Rótulos do eixo Y do comparativo (compacto em k acima de 1000). */
function formatarTickEixoYReais(v: number): string {
  const arred = Math.round(v)
  if (arred >= 1000) {
    const k = arred / 1000
    if (Math.abs(k - Math.round(k)) < 1e-6) return `R$ ${Math.round(k)}k`
    return `R$ ${k.toFixed(2).replace('.', ',')}k`
  }
  return `R$ ${arred.toLocaleString('pt-BR')}`
}

/**
 * Domínio e ticks do eixo Y com intervalos mais finos (~250–400 em faixas de milhares),
 * limitando a quantidade de marcas para leitura (evita passos de R$ 750 do padrão).
 */
function calcularTicksEDominioYComparativo(
  pontos: Array<{ periodoAtual: number; periodoAnterior: number }>
): { domain: [number, number]; ticks: number[] } {
  let maxVal = 0
  for (const p of pontos) {
    maxVal = Math.max(maxVal, Number(p.periodoAtual), Number(p.periodoAnterior))
  }
  const topoBruto = maxVal > 0 ? maxVal * 1.08 : 100

  const PASSOS = [
    10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000,
    2500, 3000, 4000, 5000, 7500, 10000,
  ]
  const MAX_MARCAS = 14
  const MIN_MARCAS = 4

  for (const step of PASSOS) {
    const topo = Math.ceil(topoBruto / step) * step
    const nMarcas = Math.floor(topo / step) + 1
    if (topo + 1e-9 < topoBruto) continue
    if (nMarcas > MAX_MARCAS) continue
    if (nMarcas < MIN_MARCAS) continue
    const ticks: number[] = []
    for (let x = 0; x <= topo + 1e-9; x += step) {
      ticks.push(Math.round(x * 100) / 100)
    }
    return { domain: [0, topo], ticks }
  }

  const stepFallback = Math.max(100, Math.ceil(topoBruto / 8 / 100) * 100)
  const topoFb = Math.ceil(topoBruto / stepFallback) * stepFallback
  const ticksFb: number[] = []
  for (let x = 0; x <= topoFb + 1e-9; x += stepFallback) {
    ticksFb.push(x)
  }
  return { domain: [0, topoFb], ticks: ticksFb }
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
function badgeTextoCancelamentos(
  atual: number,
  anterior: number
): { texto: string; positivo: boolean } {
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
function itensPorPedidoResumo(
  countProdutosVendidos: number,
  countVendasEfetivadas: number
): number {
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
    case 'personalizado':
      return 'Hoje'
    default:
      return 'Hoje'
  }
}

/** Valores do `<select>` de período em Top produtos / Top garçons (espelham o filtro global quando sincronizados). */
type FiltroPeriodoTopTabelasV2 =
  | 'hoje'
  | 'ontem'
  | 'semana'
  | '30dias'
  | 'mes'
  | 'personalizado'

/** Filtro global do topo → valor inicial/alinhado dos selects das tabelas inferiores. */
function periodoTopoV2ParaFiltroTabelas(periodoData: string): FiltroPeriodoTopTabelasV2 {
  switch (periodoData) {
    case 'hoje':
      return 'hoje'
    case 'ontem':
      return 'ontem'
    case 'semana':
      return 'semana'
    case '30dias':
      return '30dias'
    case 'personalizado':
      return 'personalizado'
    default:
      return 'hoje'
  }
}

/** Select local do card Top produtos (V2) → rótulo de `calculatePeriodo` (datas na API). */
function filtroTopProdutoV2ParaOpcaoCalculatePeriodo(filtro: string): string {
  switch (filtro) {
    case 'hoje':
      return 'Hoje'
    case 'ontem':
      return 'Ontem'
    case 'semana':
      return 'Últimos 7 Dias'
    case '30dias':
      return 'Últimos 30 Dias'
    case 'mes':
      return 'Mês Atual'
    case 'personalizado':
      return 'Hoje'
    default:
      return 'Hoje'
  }
}

/** Mesmo contrato de `mapPeriodoToUseCaseFormat` em `TabelaTopProdutos` / API top-produtos. */
function filtroTopProdutoV2ParaApiPeriodo(filtro: string): string {
  switch (filtro) {
    case 'hoje':
      return 'hoje'
    case 'ontem':
      return 'ontem'
    case 'semana':
      return 'semana'
    case '30dias':
      return '30dias'
    case 'mes':
      return 'mes'
    case 'personalizado':
      return 'personalizado'
    default:
      return 'hoje'
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

/** Título do bloco do gráfico de linhas comparativo (V2). */
function tituloGraficoComparativoV2(): string {
  return 'Comparativo de vendas'
}

/** Legenda — período do filtro (linha destacada). */
function rotuloLinhaGraficoPeriodoAtual(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Hoje'
    case 'ontem':
      return 'Ontem'
    case 'semana':
      return 'Últimos 7 dias'
    case '30dias':
      return 'Últimos 30 dias'
    case 'personalizado':
      return 'Período escolhido'
    default:
      return 'Período atual'
  }
}

/** Legenda — período de comparação (bloco anterior equivalente). */
function rotuloLinhaGraficoPeriodoAnterior(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Ontem'
    case 'ontem':
      return 'Ante-ontem'
    case 'semana':
      return '7 dias anteriores'
    case '30dias':
      return '30 dias anteriores'
    case 'personalizado':
      return `${DIAS_COMPARACAO_PERIODO_PERSONALIZADO} dias antes (mesmo intervalo)`
    default:
      return 'Período anterior'
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
    case 'personalizado':
      return 'No período escolhido você faturou'
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
    case 'personalizado':
      return `${DIAS_COMPARACAO_PERIODO_PERSONALIZADO} dias antes`
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
    case 'personalizado':
      return 'período escolhido'
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
    case 'personalizado':
      return {
        sufixoVs: `na janela ${DIAS_COMPARACAO_PERIODO_PERSONALIZADO} dias antes`,
        acimaResto: `da janela ${DIAS_COMPARACAO_PERIODO_PERSONALIZADO} dias antes`,
        abaixoResto: `da janela ${DIAS_COMPARACAO_PERIODO_PERSONALIZADO} dias antes`,
        alinhadoCom: `a janela ${DIAS_COMPARACAO_PERIODO_PERSONALIZADO} dias antes`,
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
    case 'personalizado':
      return `Na janela ${DIAS_COMPARACAO_PERIODO_PERSONALIZADO} dias antes não houve faturamento`
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

/** Exibe % no centro do mini-donut (inteiro se próximo, senão 1 casa decimal). */
function formatarPercentualMiniDonut(p: number): string {
  const x = Math.min(100, Math.max(0, p))
  if (Math.abs(x - Math.round(x)) < 0.01) return `${Math.round(x)}%`
  return `${x.toFixed(1)}%`
}

/** 1º–3º: troféu/medalhas; 4º em diante: número da posição. */
function IconeColocacaoTopGarcom({ rank }: { rank: number }) {
  const tamanho = 'h-[18px] w-[18px] md:h-5 md:w-5'
  if (rank === 1) {
    return (
      <span className="flex items-center justify-center" title="1º lugar">
        <FaTrophy className={`${tamanho} shrink-0 text-amber-500`} aria-hidden />
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="flex items-center justify-center" title="2º lugar">
        <FaMedal className={`${tamanho} shrink-0 text-slate-400`} aria-hidden />
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="flex items-center justify-center" title="3º lugar">
        <FaMedal className={`${tamanho} shrink-0 text-[#B87333]`} aria-hidden />
      </span>
    )
  }
  return <span className="tabular-nums text-secondary-text">{rank}</span>
}

/** Mini donut para cada forma de pagamento (layout Figma: um gráfico por método) */
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
  const fatiaPrincipal = Math.min(100, Math.max(0, pct))
  const data = [
    { name: 'principal', value: fatiaPrincipal, fill: principal },
    { name: 'resto', value: Math.max(0, 100 - fatiaPrincipal), fill: secundaria },
  ]
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[120px] w-[120px] md:h-[144px] md:w-[144px]">
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
              /* Padrão Recharts: 0° = direita, ângulos crescem no anti-horário. Topo = 90°; endAngle menor que startAngle percorre o círculo no horário. */
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-medium text-primary-text md:text-lg">
          {formatarPercentualMiniDonut(pct)}
        </span>
      </div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-primary-text md:text-xs">
        {label}
      </p>
    </div>
  )
}

/**
 * Nova visão geral do dashboard (layout Figma).
 * Conteúdo abaixo do TopNav — navegação global fica no layout `app/dashboard/layout.tsx`.
 */
export default function DashboardV2() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    empresa: empresaLogada,
    isLoading: carregandoEmpresa,
    error: erroEmpresa,
    refetch: refetchEmpresa,
  } = useEmpresaMe()
  const [lojaId, setLojaId] = useState('')
  const [periodoData, setPeriodoData] = useState('hoje')
  const [granularidade, setGranularidade] = useState<AgregacaoGraficoV2>('intervalo_30')
  /** Comparativo do gráfico: uma métrica por vez (API busca só o status escolhido). */
  const [metricaGraficoComparativo, setMetricaGraficoComparativo] =
    useState<MetricaEvolucaoComparativo>('FINALIZADA')
  const [modoTopProduto, setModoTopProduto] = useState<'porcentagem' | 'valor'>('porcentagem')
  const [filtroTopProduto, setFiltroTopProduto] = useState<FiltroPeriodoTopTabelasV2>('hoje')
  /** Após clicar em “Ver todos”, busca com limite alto; volta ao resumo ao mudar o filtro de período. */
  const [topProdutosListaCompleta, setTopProdutosListaCompleta] = useState(false)
  const [filtroTopGarcom, setFiltroTopGarcom] = useState<FiltroPeriodoTopTabelasV2>('hoje')
  /** Lista expandida com todos os garçons do ranking (quando > 10 usuários com venda). */
  const [topGarconsListaCompleta, setTopGarconsListaCompleta] = useState(false)

  const [periodoPersonalizadoInicio, setPeriodoPersonalizadoInicio] = useState<Date | null>(null)
  const [periodoPersonalizadoFim, setPeriodoPersonalizadoFim] = useState<Date | null>(null)
  const [modalIntervaloPersonalizadoAberto, setModalIntervaloPersonalizadoAberto] = useState(false)
  /** Rascunho do modal de intervalo (calendário + horas) antes de aplicar. */
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(undefined)
  /** Primeiro mês visível no DayPicker (painel esquerdo), alinhado ao fetch de faturamento por dia. */
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')

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
    enabled: modalIntervaloPersonalizadoAberto,
  })

  const corComparativoLinhaAtual =
    metricaGraficoComparativo === 'CANCELADA' ? LINHA_CANCEL_ATUAL : LINHA_PERIODO_ATUAL
  const corComparativoLinhaAnterior =
    metricaGraficoComparativo === 'CANCELADA' ? LINHA_CANCEL_ANTERIOR : LINHA_PERIODO_ANTERIOR

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

  useEffect(() => {
    setTopProdutosListaCompleta(false)
  }, [filtroTopProduto])

  useEffect(() => {
    setTopGarconsListaCompleta(false)
  }, [filtroTopGarcom])

  // Espelha o período do topo nas duas tabelas; cada uma mantém o próprio `<select>` para ajuste fino.
  useEffect(() => {
    const alvo = periodoTopoV2ParaFiltroTabelas(periodoData)
    setFiltroTopProduto(alvo)
    setFiltroTopGarcom(alvo)
  }, [periodoData, periodoPersonalizadoInicio, periodoPersonalizadoFim])

  const opcaoPeriodoTopProduto = useMemo(
    () => filtroTopProdutoV2ParaOpcaoCalculatePeriodo(filtroTopProduto),
    [filtroTopProduto]
  )

  const { inicio: inicioTopProduto, fim: fimTopProduto } = useMemo(() => {
    if (
      filtroTopProduto === 'personalizado' &&
      periodoPersonalizadoInicio &&
      periodoPersonalizadoFim
    ) {
      return { inicio: periodoPersonalizadoInicio, fim: periodoPersonalizadoFim }
    }
    return calculatePeriodo(opcaoPeriodoTopProduto)
  }, [
    filtroTopProduto,
    opcaoPeriodoTopProduto,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    dadosAtualizadosEm,
  ])

  const periodoApiTopProduto = useMemo(
    () => filtroTopProdutoV2ParaApiPeriodo(filtroTopProduto),
    [filtroTopProduto]
  )

  const {
    data: dadosTopProdutos,
    isLoading: carregandoTopProdutos,
    isError: erroTopProdutos,
  } = useDashboardTopProdutosQuery({
    periodo: periodoApiTopProduto,
    limit: topProdutosListaCompleta
      ? LIMITE_TOP_PRODUTOS_V2_COMPLETO
      : LIMITE_TOP_PRODUTOS_V2_RESUMO_FETCH,
    periodoInicial: inicioTopProduto,
    periodoFinal: fimTopProduto,
    enabled: inicioTopProduto != null && fimTopProduto != null,
  })

  const quantidadeTopProdutosRetornada = dadosTopProdutos?.length ?? 0
  /**
   * Resumo: API pode trazer até 11 linhas; com ≤10 não há 11º produto → desativa.
   * Lista completa: botão permanece desativado.
   */
  const verTodosProdutosDesabilitado =
    carregandoTopProdutos ||
    erroTopProdutos ||
    topProdutosListaCompleta ||
    quantidadeTopProdutosRetornada <= LIMITE_TOP_PRODUTOS_V2_RESUMO

  /** Linhas do card: participação em % = fatia do valor total entre os itens exibidos (no resumo, só as 10 primeiras). */
  const linhasTopProdutosV2 = useMemo(() => {
    const lista = dadosTopProdutos ?? []
    const visivel = topProdutosListaCompleta ? lista : lista.slice(0, LIMITE_TOP_PRODUTOS_V2_RESUMO)
    const somaValor = visivel.reduce((acc, p) => acc + p.getValorTotal(), 0)
    return visivel.map((p, i) => {
      const valor = p.getValorTotal()
      const pct = somaValor > 0 ? Math.round((valor / somaValor) * 100) : 0
      return {
        id: `${p.getRank()}-${i}-${p.getProduto()}`,
        nome: p.getProduto(),
        qtd: p.getQuantidade(),
        valor,
        pct,
      }
    })
  }, [dadosTopProdutos, topProdutosListaCompleta])

  const maxValorProduto = useMemo(
    () => Math.max(...linhasTopProdutosV2.map(p => p.valor), 1),
    [linhasTopProdutosV2]
  )

  /** Soma valor e quantidade só dos itens exibidos (base do modo % na barra). */
  const totaisListaTopProdutosV2 = useMemo(() => {
    return linhasTopProdutosV2.reduce(
      (acc, p) => ({
        somaValor: acc.somaValor + p.valor,
        somaQtd: acc.somaQtd + p.qtd,
      }),
      { somaValor: 0, somaQtd: 0 }
    )
  }, [linhasTopProdutosV2])

  const opcaoPeriodoTopGarcom = useMemo(
    () => filtroTopProdutoV2ParaOpcaoCalculatePeriodo(filtroTopGarcom),
    [filtroTopGarcom]
  )

  const { inicio: inicioTopGarcom, fim: fimTopGarcom } = useMemo(() => {
    if (
      filtroTopGarcom === 'personalizado' &&
      periodoPersonalizadoInicio &&
      periodoPersonalizadoFim
    ) {
      return { inicio: periodoPersonalizadoInicio, fim: periodoPersonalizadoFim }
    }
    return calculatePeriodo(opcaoPeriodoTopGarcom)
  }, [
    filtroTopGarcom,
    opcaoPeriodoTopGarcom,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    dadosAtualizadosEm,
  ])

  const periodoApiTopGarcom = useMemo(
    () => filtroTopProdutoV2ParaApiPeriodo(filtroTopGarcom),
    [filtroTopGarcom]
  )

  const {
    data: dadosTopGarconsQuery,
    isLoading: carregandoTopGarcons,
    isError: erroTopGarcons,
  } = useDashboardTopGarconsQuery({
    periodo: periodoApiTopGarcom,
    limit: topGarconsListaCompleta ? LIMITE_TOP_GARCONS_V2_COMPLETO : LIMITE_TOP_GARCONS_V2,
    periodoInicial: inicioTopGarcom,
    periodoFinal: fimTopGarcom,
    enabled: inicioTopGarcom != null && fimTopGarcom != null,
  })

  const dadosTopGarcons = dadosTopGarconsQuery?.garcons ?? []
  const totalUsuariosComVendasTopGarcons = dadosTopGarconsQuery?.totalUsuariosComVendas ?? 0

  /** Botão “Ver todos” só se houver mais de 10 usuários com venda no período (amostra da API). */
  const verTodosGarconsDesabilitado =
    carregandoTopGarcons ||
    erroTopGarcons ||
    topGarconsListaCompleta ||
    totalUsuariosComVendasTopGarcons <= LIMITE_TOP_GARCONS_V2

  /**
   * Resumo: 10 linhas fixas (com traços). Lista completa: todas as linhas retornadas, com rolagem se necessário.
   */
  const linhasTopGarconsV2 = useMemo(() => {
    const lista = dadosTopGarcons
    if (topGarconsListaCompleta) {
      return lista.map((g, i) => ({
        key: `garcom-rank-${i + 1}-${g.getNome()}`,
        rank: i + 1,
        vazio: false as const,
        nome: g.getNome(),
        qtdProdutos: g.getQtdProdutos(),
        qtdVendas: g.getQtdVendas(),
        valorTotal: g.getValorTotal(),
      }))
    }
    return Array.from({ length: LIMITE_TOP_GARCONS_V2 }, (_, i) => {
      const g = lista[i]
      if (!g) {
        return {
          key: `garcom-rank-${i + 1}-vazio`,
          rank: i + 1,
          vazio: true as const,
        }
      }
      return {
        key: `garcom-rank-${i + 1}-${g.getNome()}`,
        rank: i + 1,
        vazio: false as const,
        nome: g.getNome(),
        qtdProdutos: g.getQtdProdutos(),
        qtdVendas: g.getQtdVendas(),
        valorTotal: g.getValorTotal(),
      }
    })
  }, [dadosTopGarcons, topGarconsListaCompleta])

  /** Totais apenas dos garçons presentes no ranking (até 10), no período filtrado. */
  const totaisTopGarconsV2 = useMemo(() => {
    const lista = dadosTopGarcons ?? []
    return lista.reduce(
      (acc, g) => ({
        somaQtdProd: acc.somaQtdProd + g.getQtdProdutos(),
        somaQtdVendas: acc.somaQtdVendas + g.getQtdVendas(),
        somaValor: acc.somaValor + g.getValorTotal(),
      }),
      { somaQtdProd: 0, somaQtdVendas: 0, somaValor: 0 }
    )
  }, [dadosTopGarcons])

  const opcaoCalculatePeriodo = useMemo(
    () => periodoSelectV2ParaOpcaoCalculatePeriodo(periodoData),
    [periodoData]
  )

  const { inicio: inicioResumo, fim: fimResumo } = useMemo(() => {
    if (
      periodoData === 'personalizado' &&
      periodoPersonalizadoInicio &&
      periodoPersonalizadoFim
    ) {
      return { inicio: periodoPersonalizadoInicio, fim: periodoPersonalizadoFim }
    }
    return calculatePeriodo(opcaoCalculatePeriodo)
  }, [
    periodoData,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    opcaoCalculatePeriodo,
    dadosAtualizadosEm,
  ])

  const { inicio: inicioAnterior, fim: fimAnterior } = useMemo(() => {
    if (periodoData === 'personalizado' && inicioResumo && fimResumo) {
      return deslocarPeriodoEmDiasCorridos(
        inicioResumo,
        fimResumo,
        DIAS_COMPARACAO_PERIODO_PERSONALIZADO
      )
    }
    const r = calculatePeriodoAnteriorParaComparacao(opcaoCalculatePeriodo)
    if (!r) return { inicio: null, fim: null }
    return r
  }, [periodoData, inicioResumo, fimResumo, opcaoCalculatePeriodo, dadosAtualizadosEm])

  /**
   * Por hora: hoje/ontem, ou intervalo personalizado com até 2 dias corridos inclusivos
   * (mesma regra de `permiteOpcoesIntervaloPorHora`).
   */
  const permiteGraficoPorHora = useMemo(() => {
    if (periodoData === 'personalizado' && inicioResumo && fimResumo) {
      return permiteOpcoesIntervaloPorHora(inicioResumo, fimResumo)
    }
    return periodoData === 'hoje' || periodoData === 'ontem'
  }, [periodoData, inicioResumo, fimResumo])

  /** Detecta retorno de 7/30 dias → hoje/ontem para restaurar agregação de 30 min (evita estado “Por dia” inválido). */
  const estavaEmPeriodoSoDiarioRef = useRef(false)

  useEffect(() => {
    if (!permiteGraficoPorHora) {
      setGranularidade('dia')
      estavaEmPeriodoSoDiarioRef.current = true
      return
    }
    if (estavaEmPeriodoSoDiarioRef.current) {
      setGranularidade('intervalo_30')
      estavaEmPeriodoSoDiarioRef.current = false
    }
  }, [permiteGraficoPorHora, periodoData])

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

  /** Buckets horários (15/30/60 min) só em hoje/ontem e com range ≤2 dias corridos */
  const intervaloHoraEvolucao =
    permiteGraficoPorHora &&
    granularidade !== 'dia' &&
    inicioResumo &&
    fimResumo &&
    permiteOpcoesIntervaloPorHora(inicioResumo, fimResumo)
      ? intervaloMinutosAgregacaoGraficoV2(granularidade)
      : undefined

  const {
    data: evolucaoAtual,
    isLoading: carregandoEvolucaoAtual,
    isError: erroEvolucaoAtual,
  } = useDashboardEvolucaoQuery({
    periodoInicial: inicioResumo,
    periodoFinal: fimResumo,
    selectedStatuses: [metricaGraficoComparativo],
    intervaloHora: intervaloHoraEvolucao,
    enabled: inicioResumo != null && fimResumo != null,
  })

  const {
    data: evolucaoPeriodoAnterior,
    isLoading: carregandoEvolucaoAnterior,
    isError: erroEvolucaoAnterior,
  } = useDashboardEvolucaoQuery({
    periodoInicial: inicioAnterior,
    periodoFinal: fimAnterior,
    selectedStatuses: [metricaGraficoComparativo],
    intervaloHora: intervaloHoraEvolucao,
    enabled: inicioAnterior != null && fimAnterior != null,
  })

  const {
    data: metodosPagamentoDetalhado,
    isLoading: carregandoMetodosPagamento,
    isError: erroMetodosPagamento,
  } = useDashboardMetodosPagamentoDetalhadoQuery({
    periodo:
      periodoData === 'personalizado' ? 'Últimos 30 Dias' : opcaoCalculatePeriodo,
    periodoInicial: inicioResumo,
    periodoFinal: fimResumo,
    enabled: inicioResumo != null && fimResumo != null,
  })

  /** Um mini-donut por método com quantidade > 0; ordenado pelo percentual (maior primeiro). */
  const metodosParaDonutsFormasPagamento = useMemo(() => {
    const lista = metodosPagamentoDetalhado ?? []
    return [...lista]
      .filter(m => m.getQuantidade() > 0)
      .sort((a, b) => b.getPercentual() - a.getPercentual())
  }, [metodosPagamentoDetalhado])

  const dadosGraficoComparativo = useMemo(() => {
    if (evolucaoAtual == null || evolucaoPeriodoAnterior == null) return []
    if (!inicioResumo || !fimResumo || !inicioAnterior || !fimAnterior) return []
    const modo = permiteGraficoPorHora ? 'hora' : 'dia'
    return mergePontosEvolucaoComparacao(evolucaoAtual, evolucaoPeriodoAnterior, {
      modo,
      metrica: metricaGraficoComparativo,
      inicioAtual: inicioResumo,
      fimAtual: fimResumo,
      inicioAnterior,
      fimAnterior,
    })
  }, [
    evolucaoAtual,
    evolucaoPeriodoAnterior,
    permiteGraficoPorHora,
    metricaGraficoComparativo,
    inicioResumo,
    fimResumo,
    inicioAnterior,
    fimAnterior,
  ])

  const { domain: domainYComparativo, ticks: ticksYComparativo } = useMemo(
    () => calcularTicksEDominioYComparativo(dadosGraficoComparativo),
    [dadosGraficoComparativo]
  )

  const carregandoGraficoComparativo = carregandoEvolucaoAtual || carregandoEvolucaoAnterior
  const erroGraficoComparativo = erroEvolucaoAtual || erroEvolucaoAnterior

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
    const ticketAtual = ticketMedioResumo(mA?.totalFaturado ?? 0, mA?.countVendasEfetivadas ?? 0)
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
    const atual = dadosResumo?.metricas?.canceladas?.countVendasCanceladas ?? 0
    const anterior = dadosResumoAnterior?.metricas?.canceladas?.countVendasCanceladas ?? 0
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
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'evolucao'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'metodos-pagamento-detalhado'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'top-produtos'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'top-garcons'] })
    void Promise.all([refetchEmpresa(), refetchResumo(), refetchResumoAnterior()]).then(() => {
      setDadosAtualizadosEm(Date.now())
      setTickRelogio(n => n + 1)
    })
  }

  /** Restaura o filtro global de período para Hoje (como ao carregar a página). */
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
    setGranularidade('intervalo_30')
  }, [])

  const copyComparacao = textosComparacaoPeriodoAnterior(periodoData)

  const irParaRelatoriosVendas = () => {
    const preset = periodoV2ParaQueryRelatorios(periodoData)
    if (preset) {
      router.push(`/relatorios-vendas?${new URLSearchParams({ periodo: preset }).toString()}`)
    } else {
      router.push('/relatorios-vendas')
    }
  }

  const handlePeriodoDataChange = useCallback((v: string) => {
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
        /* Sem período salvo: intervalo de um único dia = hoje; calendário com mês anterior à esquerda e mês atual à direita. */
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
  }, [periodoPersonalizadoInicio, periodoPersonalizadoFim])

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

  /**
   * Atualiza o intervalo. Se o DayPicker enviar `undefined`, volta ao padrão de um dia (hoje),
   * para não ficar sem seleção e manter só consulta retroativa.
   */
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
  }, [rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim, handleConfirmarIntervaloPersonalizado])

  return (
    <div className="font-nunito min-h-0 w-full bg-gray-50 pb-8 pt-2">
      {/* Cabeçalho + filtros */}
      <div className="mb-2 flex flex-col justify-start px-2 md:flex-row md:items-end md:px-4">
        <div>
          <h1 className="font-exo text-xl font-semibold text-primary-text md:text-xl">
            Visão Geral
          </h1>
          <p className="font-regular mt-1 flex flex-wrap items-center gap-2 text-sm text-primary-text">
            {subtituloAtualizacao}
          </p>
        </div>
        <span className="ml-2 mr-8 inline-flex shrink-0 items-center gap-1">
          
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
            <span>
              <button
                type="button"
                onClick={handleAtualizarDashboard}
                disabled={carregandoEmpresa}
                className="inline-flex h-[22px] w-[22px] items-center justify-center text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Atualizar dados do dashboard"
              >
                <RefreshCw
                  className={`h-4 w-4 ${carregandoEmpresa ? 'animate-spin' : ''}`}
                  aria-hidden
                />
              </button>
            </span>
          </MuiTooltip>
        </span>
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
                      className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
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
            <Select value={periodoData} onValueChange={handlePeriodoDataChange}>
              <SelectTrigger
                id="dashboard-periodo-data"
                className="h-auto min-h-[42px] w-full items-start rounded-lg bg-primary/5 py-2 pl-10 pr-3 text-left text-sm font-medium text-primary shadow-none ring-offset-0 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 data-[state=open]:border-primary [&>span]:line-clamp-none [&>span]:min-w-0 [&>span]:whitespace-normal [&>svg]:text-primary"
              >
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-gray-200 bg-white">
                <SelectItem
                  value="hoje"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
                >
                  <span className="inline-flex flex-wrap items-baseline gap-x-1">
                    <span className="text-sm font-semibold">Hoje</span>
                    <span className="text-[10px] font-normal opacity-90">· {labelDataHoje()}</span>
                  </span>
                </SelectItem>
                <SelectItem
                  value="ontem"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
                >
                  Ontem
                </SelectItem>
                <SelectItem
                  value="semana"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
                >
                  Últimos 7 dias
                </SelectItem>
                <SelectItem
                  value="30dias"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
                >
                  Últimos 30 dias
                </SelectItem>
                <SelectItem
                  value="personalizado"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
                >
                  {periodoPersonalizadoInicio && periodoPersonalizadoFim ? (
                    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1">
                      <span className="text-sm font-semibold">Por datas</span>
                      <span className="break-words text-[10px] font-normal opacity-90">
                        · {formatarDataHoraIntervaloCurta(periodoPersonalizadoInicio)} —{' '}
                        {formatarDataHoraIntervaloCurta(periodoPersonalizadoFim)}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex flex-wrap items-baseline gap-x-1">
                      <span className="text-sm font-semibold">Por datas</span>
                      <span className="text-[10px] font-normal opacity-90">…</span>
                    </span>
                  )}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <MuiTooltip
            title="Limpar filtro e voltar para Hoje"
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
            <span>
              <button
                type="button"
                onClick={handleLimparFiltroPeriodo}
                disabled={periodoData === 'hoje'}
                className="inline-flex h-[22px] w-[22px] items-center justify-center text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Limpar filtro de período e usar Hoje"
              >
                <FilterX className="h-4 w-4" aria-hidden />
              </button>
            </span>
          </MuiTooltip>
        </div>
      </div>

      {/* Faixa roxa: altura só do grid de 2 colunas; mascote em absolute (não entra no fluxo) */}
      <div className="relative z-0 mx-2 mb-2 overflow-visible md:mx-4">
        <div className="relative overflow-visible rounded-2xl bg-secondary bg-gradient-to-br px-3 py-2 pr-24 sm:pr-28 md:px-5 md:py-4 md:pr-32 lg:pr-[min(300px,32vw)]">
          {/* Duas colunas — definem a altura da faixa */}
          <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-3 lg:gap-8">
            <div>
              <div className="mb-2 flex items-center gap-1 text-white/90">
                <MdOutlineMonetizationOn className="h-8 w-8 text-[#F59E0B]" size={30} />
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
              <div className="font-regular mt-3 inline-flex flex-wrap items-center gap-1 py-1 text-base text-white/90">
                {comparacaoPeriodoAnterior.status === 'carregando' ? (
                  <span className="text-sm opacity-80">Carregando comparação…</span>
                ) : comparacaoPeriodoAnterior.status === 'erro' ? (
                  <span className="text-sm opacity-90">
                    Não foi possível carregar o período de comparação
                  </span>
                ) : comparacaoPeriodoAnterior.status === 'semBase' ? (
                  <span className="font-regular text-base">
                    vs. {formatarMoeda(0)} {copyComparacao.sufixoVs}
                  </span>
                ) : comparacaoPeriodoAnterior.status === 'ok' ? (
                  <>
                    <span
                      className={`rounded-lg px-3 py-0.5 text-sm font-semibold ${
                        comparacaoPeriodoAnterior.pct > 0
                          ? 'bg-[#00B074]'
                          : comparacaoPeriodoAnterior.pct < 0
                            ? 'bg-[#D92D20]'
                            : 'bg-white/25'
                      }`}
                    >
                      {comparacaoPeriodoAnterior.pct > 0 ? '+' : ''}
                      {comparacaoPeriodoAnterior.pct}%
                    </span>
                    <span className="font-regular text-base">
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
                className="inline-flex items-center gap-2 rounded-full bg-accent1 px-8 py-2 text-lg font-semibold text-white shadow-md transition hover:brightness-95"
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
                className="object-bottom-right object-contain drop-shadow-xl"
                sizes="(max-width: 768px) 220px, (max-width: 1024px) 260px, 320px"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 cards de métricas */}
      <div className="mx-2 mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:mx-4 xl:grid-cols-4">
        <MetricCard
          tituloBase="Pedidos"
          tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
          icon={
            <div className="relative flex h-8 w-8 items-center justify-center">
              <MdReceiptLong className="text-[#1E3A8A]" size={30} aria-hidden />
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center">
                <MdAdd className="font-bold text-[#00B074]" size={34} />
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
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D92D20] ring-2 ring-violet-100"
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
      <div className="mx-2 grid grid-cols-1 gap-2 md:mx-4 lg:grid-cols-12 lg:items-start">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="min-w-0 font-exo text-lg font-semibold text-primary-text md:text-xl">
              {tituloGraficoComparativoV2()}
            </h2>
            <div className="relative min-w-[160px] shrink-0">
              <select
                value={permiteGraficoPorHora ? granularidade : 'dia'}
                onChange={e => setGranularidade(e.target.value as AgregacaoGraficoV2)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-semibold text-primary-text focus:border-secondary"
                aria-label="Agregação temporal do gráfico"
              >
                {permiteGraficoPorHora ? (
                  <>
                    <option value="intervalo_60">Por hora</option>
                    <option value="intervalo_30">30 min</option>
                    <option value="intervalo_15">15 min</option>
                  </>
                ) : (
                  <option value="dia">Por dia</option>
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-text" />
            </div>
          </div>
          <div className="mb-3">
            <div className="inline-flex rounded-lg bg-gray-100/90 p-0.5">
              <button
                type="button"
                onClick={() => setMetricaGraficoComparativo('FINALIZADA')}
                className={`rounded-md px-3 py-0.5 text-xs font-medium transition md:px-4 md:text-xs ${
                  metricaGraficoComparativo === 'FINALIZADA'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-violet-100 text-violet-900 hover:bg-violet-200/90'
                }`}
              >
                Finalizadas
              </button>
              <button
                type="button"
                onClick={() => setMetricaGraficoComparativo('CANCELADA')}
                className={`rounded-md px-3 py-0.5 text-xs font-medium transition md:px-4 md:text-xs ${
                  metricaGraficoComparativo === 'CANCELADA'
                    ? 'bg-[#D92D20] text-white shadow-sm'
                    : 'bg-red-100 text-[#D92D20] hover:bg-red-200/90'
                }`}
              >
                Canceladas
              </button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-6 text-sm">
            <span
              className="inline-flex items-center gap-2 font-medium"
              style={{ color: corComparativoLinhaAtual }}
            >
              <span
                className="h-0.5 w-6 shrink-0 rounded"
                style={{ backgroundColor: corComparativoLinhaAtual }}
              />
              {rotuloLinhaGraficoPeriodoAtual(periodoData)}
            </span>
            <span
              className="inline-flex items-center gap-2 font-medium"
              style={{ color: corComparativoLinhaAnterior }}
            >
              <span
                className="h-0.5 w-6 shrink-0 rounded"
                style={{ backgroundColor: corComparativoLinhaAnterior }}
              />
              {rotuloLinhaGraficoPeriodoAnterior(periodoData)}
            </span>
          </div>
          <div className="h-[280px] w-full min-w-0 md:h-[320px]">
            {carregandoGraficoComparativo ? (
              <div className="flex h-full min-h-[260px] items-center justify-center">
                <JiffyLoading className="!gap-0 !py-0" />
              </div>
            ) : erroGraficoComparativo ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-red-600">
                Não foi possível carregar o comparativo de vendas.
              </div>
            ) : dadosGraficoComparativo.length === 0 ? (
              <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-gray-500">
                Nenhum dado para o período selecionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dadosGraficoComparativo}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="labelEixo"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                  />
                  <YAxis
                    domain={domainYComparativo}
                    ticks={ticksYComparativo}
                    tickFormatter={formatarTickEixoYReais}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const pAtual = payload.find(x => x.dataKey === 'periodoAtual')
                      const pAnt = payload.find(x => x.dataKey === 'periodoAnterior')
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
                          <p className="mb-1 text-xs font-semibold text-secondary-text">{label}</p>
                          {pAtual != null && (
                            <p
                              className="text-sm font-semibold"
                              style={{ color: corComparativoLinhaAtual }}
                            >
                              {rotuloLinhaGraficoPeriodoAtual(periodoData)}:{' '}
                              {formatarMoeda(Number(pAtual.value))}
                            </p>
                          )}
                          {pAnt != null && (
                            <p
                              className="text-sm font-medium"
                              style={{ color: corComparativoLinhaAnterior }}
                            >
                              {rotuloLinhaGraficoPeriodoAnterior(periodoData)}:{' '}
                              {formatarMoeda(Number(pAnt.value))}
                            </p>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="periodoAnterior"
                    stroke={corComparativoLinhaAnterior}
                    strokeWidth={2}
                    dot={false}
                    name={rotuloLinhaGraficoPeriodoAnterior(periodoData)}
                  />
                  <Line
                    type="monotone"
                    dataKey="periodoAtual"
                    stroke={corComparativoLinhaAtual}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: corComparativoLinhaAtual, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    name={rotuloLinhaGraficoPeriodoAtual(periodoData)}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-4">
          <h2 className="mb-4 font-exo text-lg font-semibold text-primary-text md:text-xl">
            Formas de Pagamento
          </h2>
          {carregandoMetodosPagamento ? (
            <div className="flex min-h-[200px] flex-1 items-center justify-center py-8">
              <JiffyLoading className="!gap-0 !py-0" />
            </div>
          ) : erroMetodosPagamento ? (
            <p className="py-6 text-center text-sm text-[#D92D20]">
              Não foi possível carregar os métodos de pagamento.
            </p>
          ) : metodosParaDonutsFormasPagamento.length === 0 ? (
            <p className="py-6 text-center text-sm text-secondary-text">
              Nenhuma forma de pagamento com movimentação no período.
            </p>
          ) : (
            /* Altura ~2 fileiras (4 donuts em grid 2x2); demais métodos rolam dentro do card sem esticar o comparativo */
            <div className="scrollbar-hide max-h-[300px] min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain md:max-h-[380px]">
              <div className="grid grid-cols-2 gap-10">
                {metodosParaDonutsFormasPagamento.map((item, index) => (
                  <DonutFormaPagamento
                    key={`${item.getMetodo()}-${index}`}
                    label={item.getMetodo()}
                    principal={
                      PALETA_PRINCIPAL_FORMAS_PAGAMENTO[
                        index % PALETA_PRINCIPAL_FORMAS_PAGAMENTO.length
                      ]
                    }
                    secundaria={COR_ARCO_RESTO_FORMAS_PAGAMENTO}
                    pct={item.getPercentual()}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Top produtos + Top garçons — duas colunas; listas com flex (sem tabela) */}
      <div className="mx-2 mt-2 grid grid-cols-1 gap-2 md:mx-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
            <h2 className="shrink-0 font-exo text-lg font-semibold text-primary-text md:text-xl">
              Top produtos
            </h2>
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
                onChange={e =>
                  setFiltroTopProduto(e.target.value as FiltroPeriodoTopTabelasV2)
                }
                className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-medium text-primary-text focus:border-secondary"
                aria-label="Período do ranking de produtos"
              >
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="semana">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="mes">Mês</option>
                <option value="personalizado" disabled={periodoData !== 'personalizado'}>
                  Por datas (filtro global)
                </option>
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
            {carregandoTopProdutos ? (
              <div className="flex min-h-[200px] items-center justify-center py-8">
                <JiffyLoading className="!gap-0 !py-0" />
              </div>
            ) : erroTopProdutos ? (
              <p className="py-6 text-center text-sm text-[#D92D20]">
                Não foi possível carregar o top produtos.
              </p>
            ) : linhasTopProdutosV2.length === 0 ? (
              <p className="py-6 text-center text-sm text-secondary-text">Nenhum dado disponível</p>
            ) : (
              <>
                {linhasTopProdutosV2.map((p, idx) => {
                  const larguraBarra =
                    modoTopProduto === 'porcentagem'
                      ? p.pct
                      : Math.round((p.valor / maxValorProduto) * 100)
                  const rotuloMeio =
                    modoTopProduto === 'porcentagem' ? `${p.pct}%` : formatarMoeda(p.valor)
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 py-2 text-sm md:gap-3 ${
                        idx > 0 ? 'border-t border-gray-100' : ''
                      }`}
                    >
                      <div className="flex min-w-0 flex-[1.4] items-center gap-2 md:flex-[1.6]">
                        <span className="font-regular text-sm uppercase text-primary-text">
                          {p.nome}
                        </span>
                      </div>
                      <div className="font-regular min-w-0 flex-1 text-center text-sm text-primary-text">
                        {p.qtd} <span className="text-xs">un</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* Barra em camadas: trilho + preenchimento + rótulo centralizado por cima */}
                        <div className="relative h-4 min-w-0 overflow-hidden rounded-lg bg-alternate/60">
                          <div
                            className="absolute left-0 top-0 z-0 h-full rounded-lg bg-secondary transition-all"
                            style={{ width: `${Math.min(100, larguraBarra)}%` }}
                          />
                          <span className="font-regular pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs tabular-nums text-white">
                            {rotuloMeio}
                          </span>
                        </div>
                      </div>
                      <div className="font-regular min-w-0 flex-1 text-right text-sm text-primary-text">
                        {formatarMoeda(p.valor)}
                      </div>
                    </div>
                  )
                })}
                {/* Total da lista: referência explícita para as porcentagens da barra (soma só do que está no ranking) */}
                <div className="mt-1 flex items-center gap-2 border-t border-gray-200 py-3 text-sm md:gap-3">
                  <div className="flex min-w-0 flex-[1.4] flex-col gap-0.5 md:flex-[1.6]">
                    <span className="text-sm font-semibold text-primary-text">Total</span>
                  </div>
                  <div className="min-w-0 flex-1 text-center text-sm font-semibold text-primary-text">
                    {totaisListaTopProdutosV2.somaQtd}{' '}
                    <span className="font-regular text-xs">un</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {modoTopProduto === 'porcentagem' ? (
                      <div className="relative h-4 min-w-0 overflow-hidden rounded-lg bg-gray-200">
                        <div className="absolute left-0 top-0 z-0 h-full w-full rounded-lg bg-secondary" />
                        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs font-semibold tabular-nums text-white">
                          100%
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-7 items-center justify-center text-xs text-secondary-text">
                        —
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-right text-sm font-semibold text-primary-text">
                    {formatarMoeda(totaisListaTopProdutosV2.somaValor)}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={verTodosProdutosDesabilitado}
            onClick={() => setTopProdutosListaCompleta(true)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-secondary transition hover:text-secondary/85 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-secondary"
          >
            Ver todos os produtos
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-exo text-lg font-semibold text-primary-text md:text-xl">
              Top Garçons
            </h2>
            <div className="relative min-w-[120px] self-end sm:self-auto">
              <select
                value={filtroTopGarcom}
                onChange={e =>
                  setFiltroTopGarcom(e.target.value as FiltroPeriodoTopTabelasV2)
                }
                className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-medium text-primary-text focus:border-secondary"
                aria-label="Período do ranking de garçons"
              >
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="semana">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="mes">Mês</option>
                <option value="personalizado" disabled={periodoData !== 'personalizado'}>
                  Por datas (filtro global)
                </option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-text" />
            </div>
          </div>

          <div className="mb-2 flex gap-2 border-b border-gray-200 pb-2 text-[11px] font-medium uppercase tracking-wide text-primary-text md:text-xs">
            <div className="w-7 shrink-0 text-center md:w-8">#</div>
            <div className="min-w-0 flex-1">Nome</div>
            <div className="min-w-0 flex-1 text-center">QTD. PROD.</div>
            <div className="min-w-0 flex-1 text-center">QTD. VENDAS</div>
            <div className="min-w-0 flex-1 text-right">Valor Total</div>
          </div>

          <div className="flex flex-col">
            {carregandoTopGarcons ? (
              <div className="flex min-h-[200px] items-center justify-center py-8">
                <JiffyLoading className="!gap-0 !py-0" />
              </div>
            ) : erroTopGarcons ? (
              <p className="py-6 text-center text-sm text-[#D92D20]">
                Não foi possível carregar o top garçons.
              </p>
            ) : (
              <>
                <div
                  className={
                    topGarconsListaCompleta
                      ? 'scrollbar-hide max-h-[min(70vh,560px)] min-h-0 overflow-y-auto overscroll-y-contain'
                      : ''
                  }
                >
                  {linhasTopGarconsV2.map((linha, idx) => (
                    <div
                      key={linha.key}
                      className={`flex items-center gap-2 py-2 text-sm md:gap-3 ${
                        idx > 0 ? 'border-t border-gray-100' : ''
                      }`}
                    >
                      <div className="flex w-7 shrink-0 items-center justify-center md:w-8">
                        <IconeColocacaoTopGarcom rank={linha.rank} />
                      </div>
                      <div className="font-regular min-w-0 flex-1 truncate text-primary-text">
                        {linha.vazio ? '—' : linha.nome}
                      </div>
                      <div className="font-regular min-w-0 flex-1 text-center text-sm tabular-nums text-primary-text">
                        {linha.vazio ? '—' : formatarContagemPedidos(linha.qtdProdutos)}
                      </div>
                      <div className="font-regular min-w-0 flex-1 text-center text-sm tabular-nums text-primary-text">
                        {linha.vazio ? '—' : formatarContagemPedidos(linha.qtdVendas)}
                      </div>
                      <div className="font-regular min-w-0 flex-1 text-right text-sm tabular-nums text-primary-text">
                        {linha.vazio ? '—' : formatarMoeda(linha.valorTotal)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-2 border-t border-gray-200 py-3 text-sm md:gap-3">
                  <div className="w-7 shrink-0 md:w-8" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-primary-text">Total</span>
                  </div>
                  <div className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums text-primary-text">
                    {formatarContagemPedidos(totaisTopGarconsV2.somaQtdProd)}
                  </div>
                  <div className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums text-primary-text">
                    {formatarContagemPedidos(totaisTopGarconsV2.somaQtdVendas)}
                  </div>
                  <div className="min-w-0 flex-1 text-right text-sm font-semibold tabular-nums text-primary-text">
                    {formatarMoeda(totaisTopGarconsV2.somaValor)}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={verTodosGarconsDesabilitado}
            onClick={() => setTopGarconsListaCompleta(true)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary transition hover:text-secondary/85 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-secondary"
          >
            Ver todos os usuários
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      </div>

      <JiffySidePanelModal
        open={modalIntervaloPersonalizadoAberto}
        onClose={() => setModalIntervaloPersonalizadoAberto(false)}
        title="Escolha o período"
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to}
            onClick={handleAplicarIntervaloPersonalizadoModal}
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
              className={`mr-4 rounded-md px-2 py-0.5 text-sm font-medium text-white ${
                badgePositivo ? 'bg-[#00B074]' : 'bg-[#D92D20]'
              }`}
            >
              {badge}
            </span>
          </div>
          <p className="mt-1 text-xs leading-snug text-[#006699] md:text-sm">{rodape}</p>
        </div>
      </div>
    </div>
  )
}

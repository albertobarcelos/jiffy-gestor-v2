'use client'

import { Exo_2 } from 'next/font/google'
import Image from 'next/image'
import { useMemo, useState, type ReactNode } from 'react'
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


/** Exo 2 (Google) — o token Tailwind `font-exo` aponta para General Sans; aqui usamos a família real */
const exo2CabecalhoFaturamento = Exo_2({
  subsets: ['latin', 'latin-ext'],
  weight: '600',
  display: 'swap',
})

/** Dados mock — substituir por hooks/API quando integrar */
const MOCK_FATURAMENTO_HOJE = 7251.2
const MOCK_ONTEM = 8240.0
const MOCK_VAR_PCT = -12

const MOCK_METRICAS = {
  pedidosHoje: { valor: 128, variacao: '+5%', ontem: 110, positivo: true },
  ticketMedio: { valor: 'R$ 428,00', variacao: '-R$30,00', ontem: 'Ontem: R$ 398,00', positivo: false },
  itensPorPedido: { valor: '1,2', variacao: '+5%', ontem: 'Ontem: 2', positivo: true },
  cancelamentos: { valor: 7, variacao: '+ Alto', ontem: 'Ontem: 3', positivo: false },
}

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

function formatarMoeda(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function labelDataHoje() {
  const d = new Date()
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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
  const [loja, setLoja] = useState('ki-delicia')
  const [periodoData, setPeriodoData] = useState('hoje')
  const [granularidade, setGranularidade] = useState('hora')
  const [modoTopProduto, setModoTopProduto] = useState<'porcentagem' | 'valor'>('porcentagem')
  const [filtroTopProduto, setFiltroTopProduto] = useState('hoje')
  const [filtroTopGarcom, setFiltroTopGarcom] = useState('hoje')

  const maxValorProduto = useMemo(
    () => Math.max(...MOCK_TOP_PRODUTOS.map(p => p.valor), 1),
    []
  )

  const subtituloAtualizacao = useMemo(() => {
    return 'Atualizado há 2 minutos'
  }, [])

  return (
    <div className="min-h-0 w-full bg-gray-50 pb-8 pt-2 font-nunito">
      {/* Cabeçalho + filtros */}
      <div className="mb-2 flex flex-col gap-8 px-2 md:flex-row md:items-end md:px-4">
        <div>
          <h1 className="font-exo text-xl font-semibold text-primary-text md:text-xl">Visão Geral</h1>
          <p className="mt-1 flex flex-wrap items-center font-regular gap-2 text-sm text-primary-text">
            {subtituloAtualizacao}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="inline-flex h-2 w-2 rounded-full bg-secondary" aria-hidden />
          <div className="relative min-w-[200px]">
            <label htmlFor="dashboard-loja" className="sr-only">
              Loja
            </label>
            {/* Radix Select: item destacado com primary (select nativo não permite estilizar a lista) */}
            <Select value={loja} onValueChange={setLoja}>
              <SelectTrigger
                id="dashboard-loja"
                className="h-auto min-h-[42px] w-full rounded-lg bg-primary/5 py-2 pl-4 pr-3 text-sm font-medium text-primary shadow-none ring-offset-0 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 data-[state=open]:border-primary [&>svg]:text-primary"
              >
                <SelectValue placeholder="Selecione a loja" />
              </SelectTrigger>
              <SelectContent className="border-gray-200 bg-white rounded-lg">
                <SelectItem
                  value="ki-delicia"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:!bg-primary data-[highlighted]:!text-white data-[highlighted]:rounded-lg data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:rounded-lg"
                >
                  Restaurante Ki Delicia
                </SelectItem>
                <SelectItem
                    value="demo"
                    className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:!bg-primary data-[highlighted]:!text-white data-[highlighted]:rounded-lg data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:rounded-lg"
                >
                  Loja demonstração
                </SelectItem>
              </SelectContent>
            </Select>
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
                  value="mes"
                  className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:!bg-primary data-[highlighted]:!text-white data-[highlighted]:rounded-lg data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:rounded-lg"
                >
                  Mês atual
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
                  Hoje você faturou
                </span>
              </div>
              <p className="font-exo text-2xl font-semibold text-white md:text-[40px]">
                {formatarMoeda(MOCK_FATURAMENTO_HOJE)}
              </p>
              <div className="mt-3 inline-flex items-center gap-1 py-1 text-base font-regular text-white/90">
                <span className="text-sm font-semibold bg-red-600 rounded-lg px-3 py-0.5">{MOCK_VAR_PCT}%</span> 
                <span className="text-base font-regular">vs. {formatarMoeda(MOCK_ONTEM)} ontem</span>
                
              </div>
            </div>
            <div className="flex flex-col col-span-2 items-start text-white/90 gap-4 lg:items-center lg:text-center">
            <span className= "text-lg font-semibold tracking-wide">
            Suas vendas estão <span className="font-bold text-xl">{Math.abs(MOCK_VAR_PCT)}%</span> abaixo de ontem
              </span>
              <button
                type="button"
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
          titulo="Pedidos hoje"
          icon={
            <div className="relative flex h-8 w-8 items-center justify-center">
              <MdReceiptLong className="text-[#1E3A8A]" size={30} aria-hidden />
              <span
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center"
              >
                <MdAdd  className="text-green-500 font-bold" size={34} />
              </span>
            </div>
          }
          valor={String(MOCK_METRICAS.pedidosHoje.valor)}
          badge={MOCK_METRICAS.pedidosHoje.variacao}
          rodape={`Ontem: ${MOCK_METRICAS.pedidosHoje.ontem}`}
          badgePositivo={MOCK_METRICAS.pedidosHoje.positivo}
        />
        <MetricCard
          titulo="Ticket médio"
          icon={<TbReceiptFilled size={32} />}
          valor={MOCK_METRICAS.ticketMedio.valor}
          badge={MOCK_METRICAS.ticketMedio.variacao}
          rodape={MOCK_METRICAS.ticketMedio.ontem}
          badgePositivo={MOCK_METRICAS.ticketMedio.positivo}
        />
        <MetricCard
          titulo="Itens por pedido"
          icon={<MdRestaurantMenu size={32} />}
          valor={MOCK_METRICAS.itensPorPedido.valor}
          badge={MOCK_METRICAS.itensPorPedido.variacao}
          rodape={MOCK_METRICAS.itensPorPedido.ontem}
          badgePositivo={MOCK_METRICAS.itensPorPedido.positivo}
        />
        <MetricCard
          titulo="Cancelamentos"
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
          valor={String(MOCK_METRICAS.cancelamentos.valor)}
          badge={MOCK_METRICAS.cancelamentos.variacao}
          rodape={MOCK_METRICAS.cancelamentos.ontem}
          badgePositivo={MOCK_METRICAS.cancelamentos.positivo}
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
  titulo,
  icon,
  valor,
  badge,
  rodape,
  badgePositivo,
}: {
  titulo: string
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
          <p className="text-lg font-semibold text-primary-text">{titulo}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-semibold tracking-tight text-primary-text md:text-[32px]">
              {valor}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-sm font-semibold text-white ${
                badgePositivo ? 'bg-emerald-500' : 'bg-red-500'
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

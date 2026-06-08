import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FaMedal, FaTrophy } from 'react-icons/fa'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { formatarMoeda } from './dashboardTextHelpers'
import { useDashboardTopProdutosQuery } from '@/src/presentation/hooks/useDashboardTopProdutosQuery'
import { assumirDateComoNoFusoEmpresaParaUtc, calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'

const LIMITE_LINHAS_TOP_PRODUTOS = 10

/** Valores do `<select>` de período em Top produtos / Top garçons (espelham o filtro global quando sincronizados). */
export type FiltroPeriodoTopTabelasV2 = 'hoje' | 'ontem' | 'semana' | '30dias' | 'mes' | 'personalizado'

/** Filtro global do topo → valor inicial/alinhado dos selects das tabelas inferiores. */
export function periodoTopoV2ParaFiltroTabelas(periodoData: string): FiltroPeriodoTopTabelasV2 {
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

/** 1º–3º: troféu/medalhas; 4º em diante: número da posição (igual ao card Top Garçons). */
function IconeColocacaoTopProduto({ rank }: { rank: number }) {
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

/** Mapeia filtro local do card Top produtos → parâmetro `periodo` da API `/dashboard/top-produtos`. */
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

interface DashboardTopProdutosProps {
  periodoData: string
  periodoPersonalizadoInicio: Date | null
  periodoPersonalizadoFim: Date | null
  timezoneAgregacao: string | undefined
  dadosAtualizadosEm: number
}

function pctDoPeriodo(parte: number, totalPeriodo: number): number {
  if (totalPeriodo <= 0 || !Number.isFinite(parte) || !Number.isFinite(totalPeriodo)) return 0
  return Math.round((parte / totalPeriodo) * 100)
}

export function DashboardTopProdutos({
  periodoData,
  periodoPersonalizadoInicio,
  periodoPersonalizadoFim,
  timezoneAgregacao,
  dadosAtualizadosEm,
}: DashboardTopProdutosProps) {
  const [modoTopProduto, setModoTopProduto] = useState<'quantidade' | 'valor'>('quantidade')
  const [filtroTopProduto, setFiltroTopProduto] = useState<FiltroPeriodoTopTabelasV2>('hoje')

  useEffect(() => {
    setFiltroTopProduto(periodoTopoV2ParaFiltroTabelas(periodoData))
  }, [periodoData, periodoPersonalizadoInicio, periodoPersonalizadoFim])

  const opcaoPeriodoTopProduto = useMemo(
    () => filtroTopProdutoV2ParaOpcaoCalculatePeriodo(filtroTopProduto),
    [filtroTopProduto]
  )

  const { inicio: inicioTopProduto, fim: fimTopProduto } = useMemo(() => {
    const tzEmpresa = timezoneAgregacao?.trim() || 'America/Sao_Paulo'
    if (
      filtroTopProduto === 'personalizado' &&
      periodoPersonalizadoInicio &&
      periodoPersonalizadoFim
    ) {
      return {
        inicio: assumirDateComoNoFusoEmpresaParaUtc(periodoPersonalizadoInicio, tzEmpresa),
        fim: assumirDateComoNoFusoEmpresaParaUtc(periodoPersonalizadoFim, tzEmpresa),
      }
    }
    return calcularPeriodoNoFusoEmpresa(opcaoPeriodoTopProduto, tzEmpresa)
  }, [
    filtroTopProduto,
    opcaoPeriodoTopProduto,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    dadosAtualizadosEm,
    timezoneAgregacao,
  ])

  const periodoApiTopProduto = useMemo(
    () => filtroTopProdutoV2ParaApiPeriodo(filtroTopProduto),
    [filtroTopProduto]
  )

  const {
    data: payloadTopProdutos,
    isLoading: carregandoTopProdutos,
    isError: erroTopProdutos,
  } = useDashboardTopProdutosQuery({
    periodo: periodoApiTopProduto,
    periodoInicial: inicioTopProduto,
    periodoFinal: fimTopProduto,
    timezone: timezoneAgregacao,
    enabled: inicioTopProduto != null && fimTopProduto != null,
  })

  const totaisPeriodo = payloadTopProdutos?.totaisPeriodo ?? { quantidadeTotal: 0, valorTotal: 0 }
  const listaProdutos = payloadTopProdutos?.produtos ?? []

  const listaProdutosOrdenada = useMemo(() => {
    const copia = [...listaProdutos]
    if (modoTopProduto === 'valor') {
      copia.sort((a, b) => b.getValorTotal() - a.getValorTotal())
    } else {
      copia.sort((a, b) => b.getQuantidade() - a.getQuantidade())
    }
    return copia.slice(0, LIMITE_LINHAS_TOP_PRODUTOS)
  }, [listaProdutos, modoTopProduto])

  const linhasTopProdutosV2 = useMemo(() => {
    const visivel = listaProdutosOrdenada
    const linhas = visivel.map((p, i) => {
      const valor = p.getValorTotal()
      const qtd = p.getQuantidade()
      const pctQtd = pctDoPeriodo(qtd, totaisPeriodo.quantidadeTotal)
      const pctValor = pctDoPeriodo(valor, totaisPeriodo.valorTotal)
      return {
        id: `top-prod-${i}-${p.getProduto()}`,
        rank: i + 1,
        vazio: false as const,
        nome: p.getProduto(),
        qtd,
        valor,
        pctQtd,
        pctValor,
      }
    })

    const faltantes = Math.max(0, LIMITE_LINHAS_TOP_PRODUTOS - linhas.length)
    if (faltantes === 0) return linhas

    return [
      ...linhas,
      ...Array.from({ length: faltantes }, (_, idx) => ({
        id: `top-produto-vazio-${idx}`,
        rank: linhas.length + idx + 1,
        vazio: true as const,
        nome: '—',
        qtd: 0,
        valor: 0,
        pctQtd: 0,
        pctValor: 0,
      })),
    ]
  }, [listaProdutosOrdenada, totaisPeriodo.quantidadeTotal, totaisPeriodo.valorTotal])

  const pctTop10NaQuantidadePeriodo = pctDoPeriodo(
    linhasTopProdutosV2.filter(p => !p.vazio).reduce((s, p) => s + p.qtd, 0),
    totaisPeriodo.quantidadeTotal
  )
  const pctTop10NoValorPeriodo = pctDoPeriodo(
    linhasTopProdutosV2.filter(p => !p.vazio).reduce((s, p) => s + p.valor, 0),
    totaisPeriodo.valorTotal
  )

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
        <h2 className="shrink-0 font-exo text-lg font-semibold text-primary-text md:text-xl">
          Top Produtos
        </h2>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 xl:justify-center">
          <div className="inline-flex rounded-lg bg-violet-100/90 p-0.5">
            <button
              type="button"
              onClick={() => setModoTopProduto('quantidade')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition md:px-4 md:text-sm ${
                modoTopProduto === 'quantidade'
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-primary-text hover:bg-white/60'
              }`}
            >
              Quantidade
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
            onChange={e => setFiltroTopProduto(e.target.value as FiltroPeriodoTopTabelasV2)}
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

      <div className="mb-2 flex gap-2 border-b border-gray-200 pb-2 text-[11px] font-medium uppercase tracking-wide text-primary-text md:text-xs">
        <div className="w-7 shrink-0 text-center md:w-8">#</div>
        <div className="min-w-0 flex-[1.4] md:flex-[1.6]">Produto</div>
        <div className="flex-1 text-center">Quantidade</div>
        <div className="flex-1 text-center" title="Percentual em relação ao total vendido no período selecionado">
          {modoTopProduto === 'quantidade' ? '% qtd. período' : '% valor período'}
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
              const pctBarra = p.vazio
                ? 0
                : modoTopProduto === 'quantidade'
                  ? p.pctQtd
                  : p.pctValor
              const rotuloMeio = p.vazio
                ? '—'
                : modoTopProduto === 'quantidade'
                  ? `${p.pctQtd}%`
                  : `${p.pctValor}%`
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 py-2 text-sm md:gap-3 ${
                    idx > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  <div className="flex w-7 shrink-0 items-center justify-center md:w-8">
                    <IconeColocacaoTopProduto rank={p.rank} />
                  </div>
                  <div className="flex min-w-0 flex-[1.4] items-center gap-2 md:flex-[1.6]">
                    <span className="font-regular text-sm uppercase text-primary-text">
                      {p.vazio ? '—' : p.nome}
                    </span>
                  </div>
                  <div className="font-regular min-w-0 flex-1 text-center text-sm text-primary-text">
                    {p.vazio ? (
                      '—'
                    ) : (
                      <>
                        {p.qtd} <span className="text-xs">un</span>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="relative h-4 min-w-0 overflow-hidden rounded-lg bg-alternate/60">
                      <div
                        className="absolute left-0 top-0 z-0 h-full rounded-lg bg-secondary transition-all"
                        style={{ width: `${Math.min(100, pctBarra)}%` }}
                      />
                      <span className="font-regular pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs tabular-nums text-white">
                        {rotuloMeio}
                      </span>
                    </div>
                  </div>
                  <div className="font-regular min-w-0 flex-1 text-right text-sm text-primary-text">
                    {p.vazio ? '—' : formatarMoeda(p.valor)}
                  </div>
                </div>
              )
            })}
            <div className="mt-1 flex items-center gap-2 border-t border-gray-200 py-3 text-sm md:gap-3">
              <div className="w-7 shrink-0 md:w-8" />
              <div className="flex min-w-0 flex-[1.4] flex-col gap-0.5 md:flex-[1.6]">
                <span className="text-sm font-semibold text-primary-text">Total período</span>
              </div>
              <div className="min-w-0 flex-1 text-center text-sm font-semibold text-primary-text">
                {totaisPeriodo.quantidadeTotal}{' '}
                <span className="font-regular text-xs">un</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative h-4 min-w-0 overflow-hidden rounded-lg bg-alternate/60">
                  <div
                    className="absolute left-0 top-0 z-0 h-full rounded-lg bg-secondary transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        modoTopProduto === 'quantidade' ? pctTop10NaQuantidadePeriodo : pctTop10NoValorPeriodo
                      )}%`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[10px] font-semibold tabular-nums text-white md:text-xs"
                    title="Participação do top 10 no total do período"
                  >
                    {modoTopProduto === 'quantidade'
                      ? `${pctTop10NaQuantidadePeriodo}%`
                      : `${pctTop10NoValorPeriodo}%`}
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1 text-right text-sm font-semibold text-primary-text">
                {formatarMoeda(totaisPeriodo.valorTotal)}
              </div>
            </div>
          </>
        )}
      </div>

      <Link
        href="/relatorios-produtos-vendidos"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary transition hover:text-secondary/85"
      >
        Ver relatório completo
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  )
}

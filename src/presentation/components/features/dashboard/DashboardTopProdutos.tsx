import { useMemo, useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { formatarMoeda } from './dashboardTextHelpers'
import { useDashboardTopProdutosQuery } from '@/src/presentation/hooks/useDashboardTopProdutosQuery'
import { assumirDateComoNoFusoEmpresaParaUtc, calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'

/** Limite ao expandir “Ver todos os produtos” no card Top produtos V2 (API faz slice após agregar). */
const LIMITE_TOP_PRODUTOS_V2_COMPLETO = 500
/** No resumo pedimos 11 itens, exibimos 10; o 11º indica que existe lista maior (habilita o botão). */
const LIMITE_TOP_PRODUTOS_V2_RESUMO = 10
const LIMITE_TOP_PRODUTOS_V2_RESUMO_FETCH = LIMITE_TOP_PRODUTOS_V2_RESUMO + 1

/** Valores do `<select>` de período em Top produtos / Top garçons (espelham o filtro global quando sincronizados). */
export type FiltroPeriodoTopTabelasV2 = 'hoje' | 'ontem' | 'semana' | '30dias' | 'mes' | 'personalizado'

/** Filtro global do topo → valor inicial/alinhado dos selects das tabelas inferiores. */
export function periodoTopoV2ParaFiltroTabelas(periodoData: string): FiltroPeriodoTopTabelasV2 {
  switch (periodoData) {
    case 'hoje': return 'hoje'
    case 'ontem': return 'ontem'
    case 'semana': return 'semana'
    case '30dias': return '30dias'
    case 'personalizado': return 'personalizado'
    default: return 'hoje'
  }
}

/** Select local do card Top produtos (V2) → rótulo de `calculatePeriodo` (datas na API). */
function filtroTopProdutoV2ParaOpcaoCalculatePeriodo(filtro: string): string {
  switch (filtro) {
    case 'hoje': return 'Hoje'
    case 'ontem': return 'Ontem'
    case 'semana': return 'Últimos 7 Dias'
    case '30dias': return 'Últimos 30 Dias'
    case 'mes': return 'Mês Atual'
    case 'personalizado': return 'Hoje'
    default: return 'Hoje'
  }
}

/** Mapeia filtro local do card Top produtos → parâmetro `periodo` da API `/dashboard/top-produtos`. */
function filtroTopProdutoV2ParaApiPeriodo(filtro: string): string {
  switch (filtro) {
    case 'hoje': return 'hoje'
    case 'ontem': return 'ontem'
    case 'semana': return 'semana'
    case '30dias': return '30dias'
    case 'mes': return 'mes'
    case 'personalizado': return 'personalizado'
    default: return 'hoje'
  }
}

interface DashboardTopProdutosProps {
  periodoData: string
  periodoPersonalizadoInicio: Date | null
  periodoPersonalizadoFim: Date | null
  timezoneAgregacao: string | undefined
  dadosAtualizadosEm: number
}

export function DashboardTopProdutos({
  periodoData,
  periodoPersonalizadoInicio,
  periodoPersonalizadoFim,
  timezoneAgregacao,
  dadosAtualizadosEm,
}: DashboardTopProdutosProps) {
  const [modoTopProduto, setModoTopProduto] = useState<'porcentagem' | 'valor'>('porcentagem')
  const [filtroTopProduto, setFiltroTopProduto] = useState<FiltroPeriodoTopTabelasV2>('hoje')
  const [topProdutosListaCompleta, setTopProdutosListaCompleta] = useState(false)

  useEffect(() => {
    setTopProdutosListaCompleta(false)
  }, [filtroTopProduto])

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
    timezone: timezoneAgregacao,
    enabled: inicioTopProduto != null && fimTopProduto != null,
  })

  const quantidadeTopProdutosRetornada = dadosTopProdutos?.length ?? 0
  const verTodosProdutosDesabilitado =
    carregandoTopProdutos ||
    erroTopProdutos ||
    topProdutosListaCompleta ||
    quantidadeTopProdutosRetornada <= LIMITE_TOP_PRODUTOS_V2_RESUMO

  const linhasTopProdutosV2 = useMemo(() => {
    const lista = dadosTopProdutos ?? []
    const visivel = topProdutosListaCompleta ? lista : lista.slice(0, LIMITE_TOP_PRODUTOS_V2_RESUMO)
    const somaValor = visivel.reduce((acc, p) => acc + p.getValorTotal(), 0)
    const linhas = visivel.map((p, i) => {
      const valor = p.getValorTotal()
      const pct = somaValor > 0 ? Math.round((valor / somaValor) * 100) : 0
      return {
        id: `${p.getRank()}-${i}-${p.getProduto()}`,
        vazio: false as const,
        nome: p.getProduto(),
        qtd: p.getQuantidade(),
        valor,
        pct,
      }
    })

    if (topProdutosListaCompleta) return linhas

    const faltantes = Math.max(0, LIMITE_TOP_PRODUTOS_V2_RESUMO - linhas.length)
    if (faltantes === 0) return linhas

    return [
      ...linhas,
      ...Array.from({ length: faltantes }, (_, idx) => ({
        id: `top-produto-vazio-${idx}`,
        vazio: true as const,
        nome: '—',
        qtd: 0,
        valor: 0,
        pct: 0,
      })),
    ]
  }, [dadosTopProdutos, topProdutosListaCompleta])

  const maxValorProduto = useMemo(
    () => Math.max(...linhasTopProdutosV2.filter(p => !p.vazio).map(p => p.valor), 1),
    [linhasTopProdutosV2]
  )

  const totaisListaTopProdutosV2 = useMemo(() => {
    return linhasTopProdutosV2
      .filter(p => !p.vazio)
      .reduce(
        (acc, p) => ({
          somaValor: acc.somaValor + p.valor,
          somaQtd: acc.somaQtd + p.qtd,
        }),
        { somaValor: 0, somaQtd: 0 }
      )
  }, [linhasTopProdutosV2])

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
              const larguraBarra = p.vazio
                ? 0
                : modoTopProduto === 'porcentagem'
                  ? p.pct
                  : Math.round((p.valor / maxValorProduto) * 100)
              const rotuloMeio = p.vazio
                ? '—'
                : modoTopProduto === 'porcentagem'
                  ? `${p.pct}%`
                  : formatarMoeda(p.valor)
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 py-2 text-sm md:gap-3 ${
                    idx > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
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
                        style={{ width: `${Math.min(100, larguraBarra)}%` }}
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
  )
}

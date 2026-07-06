import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FaMedal, FaTrophy } from 'react-icons/fa'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { formatarMoeda, formatarContagemPedidos } from './dashboardTextHelpers'
import { useDashboardTopGarconsQuery } from '@/src/presentation/hooks/useDashboardTopGarconsQuery'
import { assumirDateComoNoFusoEmpresaParaUtc, calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'
import { FiltroPeriodoTopTabelasV2, periodoTopoV2ParaFiltroTabelas } from './DashboardTopProdutos'

/** Ranking fixo: sempre os 10 garçons com maior valor vendido (BFF com limit=10). */
const LIMITE_TOP_GARCONS_V2 = 10

/** Select local do card Top garçons (V2) → rótulo de `calculatePeriodo` (datas na API). */
function filtroTopGarcomV2ParaOpcaoCalculatePeriodo(filtro: string): string {
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

/** Mapeia filtro local do card Top garçons → parâmetro `periodo` da API `/dashboard/top-garcons`. */
function filtroTopGarcomV2ParaApiPeriodo(filtro: string): string {
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

interface DashboardTopGarconsProps {
  periodoData: string
  periodoPersonalizadoInicio: Date | null
  periodoPersonalizadoFim: Date | null
  timezoneAgregacao: string | undefined
  dadosAtualizadosEm: number
}

export function DashboardTopGarcons({
  periodoData,
  periodoPersonalizadoInicio,
  periodoPersonalizadoFim,
  timezoneAgregacao,
  dadosAtualizadosEm,
}: DashboardTopGarconsProps) {
  const [filtroTopGarcom, setFiltroTopGarcom] = useState<FiltroPeriodoTopTabelasV2>('hoje')

  useEffect(() => {
    setFiltroTopGarcom(periodoTopoV2ParaFiltroTabelas(periodoData))
  }, [periodoData, periodoPersonalizadoInicio, periodoPersonalizadoFim])

  const opcaoPeriodoTopGarcom = useMemo(
    () => filtroTopGarcomV2ParaOpcaoCalculatePeriodo(filtroTopGarcom),
    [filtroTopGarcom]
  )

  const { inicio: inicioTopGarcom, fim: fimTopGarcom } = useMemo(() => {
    const tzEmpresa = timezoneAgregacao?.trim() || 'America/Sao_Paulo'
    if (
      filtroTopGarcom === 'personalizado' &&
      periodoPersonalizadoInicio &&
      periodoPersonalizadoFim
    ) {
      return {
        inicio: assumirDateComoNoFusoEmpresaParaUtc(periodoPersonalizadoInicio, tzEmpresa),
        fim: assumirDateComoNoFusoEmpresaParaUtc(periodoPersonalizadoFim, tzEmpresa),
      }
    }
    return calcularPeriodoNoFusoEmpresa(opcaoPeriodoTopGarcom, tzEmpresa)
  }, [
    filtroTopGarcom,
    opcaoPeriodoTopGarcom,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    dadosAtualizadosEm,
    timezoneAgregacao,
  ])

  const periodoApiTopGarcom = useMemo(
    () => filtroTopGarcomV2ParaApiPeriodo(filtroTopGarcom),
    [filtroTopGarcom]
  )

  const {
    data: dadosTopGarconsQuery,
    isLoading: carregandoTopGarcons,
    isError: erroTopGarcons,
  } = useDashboardTopGarconsQuery({
    periodo: periodoApiTopGarcom,
    limit: LIMITE_TOP_GARCONS_V2,
    periodoInicial: inicioTopGarcom,
    periodoFinal: fimTopGarcom,
    timezone: timezoneAgregacao,
    enabled: inicioTopGarcom != null && fimTopGarcom != null,
  })

  const dadosTopGarcons = dadosTopGarconsQuery?.garcons ?? []

  const linhasTopGarconsV2 = useMemo(() => {
    const lista = dadosTopGarcons ?? []
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
  }, [dadosTopGarcons])

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

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-exo text-lg font-semibold text-primary-text md:text-xl">
          Top Garçons
        </h2>
        <div className="relative min-w-[120px] self-end sm:self-auto">
          <select
            value={filtroTopGarcom}
            onChange={e => setFiltroTopGarcom(e.target.value as FiltroPeriodoTopTabelasV2)}
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
        ) : (
          <>
            {erroTopGarcons ? (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-[#D92D20]">
                Não foi possível carregar o top garçons.
              </p>
            ) : null}
            <div>
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

      <Link
        href="/vendas/comissoes"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary transition hover:text-secondary/85"
      >
        Ver Comissões
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  )
}

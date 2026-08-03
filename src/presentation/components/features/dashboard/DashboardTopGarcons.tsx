import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { FaMedal, FaTrophy } from 'react-icons/fa'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { formatarMoeda, formatarContagemPedidos } from './dashboardTextHelpers'
import { useDashboardTopGarconsQuery } from '@/src/presentation/hooks/useDashboardTopGarconsQuery'
import { assumirDateComoNoFusoEmpresaParaUtc, calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'
import {
  periodoGlobalParaApiTopTabelas,
  periodoGlobalParaOpcaoCalculatePeriodo,
} from './DashboardTopProdutos'

/** Ranking fixo: sempre os 10 garçons (BFF com limit=10). */
const LIMITE_TOP_GARCONS_V2 = 10

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
  const [modoTopGarcom, setModoTopGarcom] = useState<'quantidade' | 'valor'>('quantidade')

  const opcaoPeriodo = useMemo(
    () => periodoGlobalParaOpcaoCalculatePeriodo(periodoData),
    [periodoData]
  )

  const { inicio: inicioTopGarcom, fim: fimTopGarcom } = useMemo(() => {
    const tzEmpresa = timezoneAgregacao?.trim() || 'America/Sao_Paulo'
    if (
      periodoData === 'personalizado' &&
      periodoPersonalizadoInicio &&
      periodoPersonalizadoFim
    ) {
      return {
        inicio: assumirDateComoNoFusoEmpresaParaUtc(periodoPersonalizadoInicio, tzEmpresa),
        fim: assumirDateComoNoFusoEmpresaParaUtc(periodoPersonalizadoFim, tzEmpresa),
      }
    }
    return calcularPeriodoNoFusoEmpresa(opcaoPeriodo, tzEmpresa)
  }, [
    periodoData,
    opcaoPeriodo,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    dadosAtualizadosEm,
    timezoneAgregacao,
  ])

  const periodoApi = useMemo(() => periodoGlobalParaApiTopTabelas(periodoData), [periodoData])

  const {
    data: dadosTopGarconsQuery,
    isLoading: carregandoTopGarcons,
    isError: erroTopGarcons,
  } = useDashboardTopGarconsQuery({
    periodo: periodoApi,
    limit: LIMITE_TOP_GARCONS_V2,
    ordenarPor: modoTopGarcom,
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h2 className="shrink-0 text-lg font-semibold text-primary-text md:text-xl">
          Top Garçons
        </h2>
        <div className="inline-flex self-start rounded-lg bg-violet-100/90 p-0.5 sm:self-auto">
          <button
            type="button"
            onClick={() => setModoTopGarcom('quantidade')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition md:px-4 md:text-sm ${
              modoTopGarcom === 'quantidade'
                ? 'bg-secondary text-white shadow-sm'
                : 'text-primary-text hover:bg-white/60'
            }`}
          >
            Quantidade
          </button>
          <button
            type="button"
            onClick={() => setModoTopGarcom('valor')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition md:px-4 md:text-sm ${
              modoTopGarcom === 'valor'
                ? 'bg-secondary text-white shadow-sm'
                : 'text-primary-text hover:bg-white/60'
            }`}
          >
            Valor Total
          </button>
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

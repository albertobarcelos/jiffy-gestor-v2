import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { MdOutlineMonetizationOn } from 'react-icons/md'
import {
  tituloFaturamentoBanner,
  formatarMoeda,
  textosComparacaoPeriodoAnterior,
  prefixoSemFaturamentoNaBase,
} from './dashboardTextHelpers'

interface FaturamentoBannerProps {
  periodoData: string
  carregandoResumo: boolean
  /** Troca de período em andamento (isFetching) — dados anteriores ainda visíveis */
  atualizandoResumo: boolean
  erroResumo: boolean
  totalFaturadoPeriodo: number
  comparacaoPeriodoAnterior: {
    status: 'carregando' | 'erro' | 'sem_base' | 'neutro' | 'positivo' | 'negativo'
    percentual: number
    anterior: number
  }
  irParaRelatoriosVendas: () => void
}

export function FaturamentoBanner({
  periodoData,
  carregandoResumo,
  atualizandoResumo,
  erroResumo,
  totalFaturadoPeriodo,
  comparacaoPeriodoAnterior,
  irParaRelatoriosVendas,
}: FaturamentoBannerProps) {
  const copyComparacao = textosComparacaoPeriodoAnterior(periodoData)

  return (
    <div className="relative z-0 mx-2 mb-2 overflow-visible pt-1.5 md:mx-4">
      <div className="relative overflow-hidden rounded-2xl bg-secondary bg-gradient-to-br px-3 py-3 pr-3 sm:overflow-visible sm:pr-28 md:overflow-visible md:px-5 md:py-4 md:pr-32 lg:pr-[min(300px,32vw)]">
        {/* Duas colunas — definem a altura da faixa */}
        <div className="relative z-10 grid grid-cols-1 items-center gap-3 lg:grid-cols-3 lg:gap-8">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-1 text-white/90">
              <MdOutlineMonetizationOn className="h-7 w-7 shrink-0 text-[#F59E0B] md:h-8 md:w-8" size={30} />
              <span className="text-base font-semibold md:text-lg">
                {tituloFaturamentoBanner(periodoData)}
              </span>
            </div>
            <p
              className={`text-2xl font-semibold text-white md:text-[40px] ${
                carregandoResumo ? 'animate-pulse opacity-80' : atualizandoResumo ? 'animate-pulse opacity-50' : ''
              }`}
            >
              {erroResumo
                ? '—'
                : carregandoResumo
                  ? '…'
                  : formatarMoeda(totalFaturadoPeriodo)}
            </p>
            <div
              className={`font-regular mt-2 inline-flex flex-wrap items-center gap-1 py-1 text-sm text-white/90 transition-opacity duration-300 md:mt-3 md:text-base ${
                atualizandoResumo && !carregandoResumo ? 'opacity-50' : ''
              }`}
            >
              {comparacaoPeriodoAnterior.status === 'carregando' ? (
                <span className="text-sm opacity-80">Carregando comparação…</span>
              ) : comparacaoPeriodoAnterior.status === 'erro' ? (
                <span className="text-sm opacity-90">
                  Não foi possível carregar o período de comparação
                </span>
              ) : comparacaoPeriodoAnterior.status === 'sem_base' ? (
                <span className="font-regular text-base">
                  vs. {formatarMoeda(0)} {copyComparacao.sufixoVs}
                </span>
              ) : (
                <>
                  <span
                    className={`rounded-lg px-3 py-0.5 text-sm font-semibold ${
                      comparacaoPeriodoAnterior.status === 'positivo'
                        ? 'bg-[#00B074]'
                        : comparacaoPeriodoAnterior.status === 'negativo'
                          ? 'bg-[#D92D20]'
                          : 'bg-white/25'
                    }`}
                  >
                    {comparacaoPeriodoAnterior.percentual > 0 ? '+' : ''}
                    {comparacaoPeriodoAnterior.percentual}%
                  </span>
                  <span className="font-regular text-base">
                    vs. {formatarMoeda(comparacaoPeriodoAnterior.anterior)}{' '}
                    {copyComparacao.sufixoVs}
                  </span>
                </>
              )}
            </div>
            </div>
            <div className="relative h-[132px] w-[108px] shrink-0 sm:hidden" aria-hidden>
              <Image
                src="/images/jiffy-acenando.png"
                alt=""
                fill
                className="object-contain object-bottom drop-shadow-xl"
                sizes="108px"
                priority
              />
            </div>
          </div>
          <div
            className={`col-span-2 flex flex-col items-start gap-4 text-white/90 transition-opacity duration-300 lg:items-center lg:text-center ${
              atualizandoResumo && !carregandoResumo ? 'opacity-50' : ''
            }`}
          >
            {comparacaoPeriodoAnterior.status === 'carregando' ? (
              <span className="text-base font-semibold tracking-wide opacity-80 md:text-lg">…</span>
            ) : comparacaoPeriodoAnterior.status === 'erro' ? (
              <span className="text-base font-semibold tracking-wide opacity-90 md:text-lg">
                Atualize a página ou tente novamente em instantes
              </span>
            ) : comparacaoPeriodoAnterior.status === 'sem_base' ? (
              <span className="text-base font-semibold tracking-wide md:text-lg">
                {prefixoSemFaturamentoNaBase(periodoData)}
              </span>
            ) : comparacaoPeriodoAnterior.percentual > 0 ? (
                <span className="text-base font-semibold tracking-wide md:text-lg">
                  Suas vendas estão{' '}
                  <span className="text-lg font-bold md:text-xl">{comparacaoPeriodoAnterior.percentual}%</span>{' '}
                  acima {copyComparacao.acimaResto}
                </span>
              ) : comparacaoPeriodoAnterior.percentual < 0 ? (
                <span className="text-base font-semibold tracking-wide md:text-lg">
                  Suas vendas estão{' '}
                  <span className="text-lg font-bold md:text-xl">
                    {Math.abs(comparacaoPeriodoAnterior.percentual)}%
                  </span>{' '}
                  abaixo {copyComparacao.abaixoResto}
                </span>
              ) : (
                <span className="text-base font-semibold tracking-wide md:text-lg">
                  Faturamento alinhado com {copyComparacao.alinhadoCom} (
                  {formatarMoeda(comparacaoPeriodoAnterior.anterior)})
                </span>
              )}
            <button
              type="button"
              onClick={irParaRelatoriosVendas}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent1 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-95 sm:gap-2 sm:px-8 sm:text-lg"
            >
              Veja suas vendas em tempo real
              <ChevronRight className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Mascote fora do grid: absolute em relação à faixa; não influencia altura */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 z-20 hidden h-[230px] w-[200px] translate-x-4 translate-y-3 sm:block md:h-[180px] md:w-[180px] md:translate-x-6 lg:h-[240px] lg:w-[200px] lg:translate-x-8 lg:translate-y-4 xl:h-[240px] xl:w-[220px] xl:translate-x-12"
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
  )
}

import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { MdOutlineMonetizationOn } from 'react-icons/md'
import { exo2CabecalhoFaturamento } from '@/src/presentation/fonts/exo2CabecalhoFaturamento'
import {
  tituloFaturamentoBanner,
  formatarMoeda,
  textosComparacaoPeriodoAnterior,
  prefixoSemFaturamentoNaBase,
} from './dashboardTextHelpers'

interface FaturamentoBannerProps {
  periodoData: string
  carregandoResumo: boolean
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
  erroResumo,
  totalFaturadoPeriodo,
  comparacaoPeriodoAnterior,
  irParaRelatoriosVendas,
}: FaturamentoBannerProps) {
  const copyComparacao = textosComparacaoPeriodoAnterior(periodoData)

  return (
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
                : carregandoResumo
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
          <div className="col-span-2 flex flex-col items-start gap-4 text-white/90 lg:items-center lg:text-center">
            {comparacaoPeriodoAnterior.status === 'carregando' ? (
              <span className="text-lg font-semibold tracking-wide opacity-80">…</span>
            ) : comparacaoPeriodoAnterior.status === 'erro' ? (
              <span className="text-lg font-semibold tracking-wide opacity-90">
                Atualize a página ou tente novamente em instantes
              </span>
            ) : comparacaoPeriodoAnterior.status === 'sem_base' ? (
              <span className="text-lg font-semibold tracking-wide">
                {prefixoSemFaturamentoNaBase(periodoData)}
              </span>
            ) : comparacaoPeriodoAnterior.percentual > 0 ? (
                <span className="text-lg font-semibold tracking-wide">
                  Suas vendas estão{' '}
                  <span className="text-xl font-bold">{comparacaoPeriodoAnterior.percentual}%</span>{' '}
                  acima {copyComparacao.acimaResto}
                </span>
              ) : comparacaoPeriodoAnterior.percentual < 0 ? (
                <span className="text-lg font-semibold tracking-wide">
                  Suas vendas estão{' '}
                  <span className="text-xl font-bold">
                    {Math.abs(comparacaoPeriodoAnterior.percentual)}%
                  </span>{' '}
                  abaixo {copyComparacao.abaixoResto}
                </span>
              ) : (
                <span className="text-lg font-semibold tracking-wide">
                  Faturamento alinhado com {copyComparacao.alinhadoCom} (
                  {formatarMoeda(comparacaoPeriodoAnterior.anterior)})
                </span>
              )}
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
  )
}

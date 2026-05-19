'use client'

import { Exo_2 } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  periodoFetchFaturamentoCalendarioDoisMeses,
} from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { useQueryClient } from '@tanstack/react-query'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useDashboardResumoQuery } from '@/src/presentation/hooks/useDashboardResumoQuery'
import { useDashboardFaturamentoPorDiaQuery } from '@/src/presentation/hooks/useDashboardFaturamentoPorDiaQuery'
import { DashboardFiltros } from './DashboardFiltros'
import { FaturamentoBanner } from './FaturamentoBanner'
import { DashboardMetricas } from './DashboardMetricas'
import { DashboardGraficoComparativo, type AgregacaoGraficoV2 } from './DashboardGraficoComparativo'
import { DashboardFormasPagamento } from './DashboardFormasPagamento'
import { DashboardTopProdutos } from './DashboardTopProdutos'
import { DashboardTopGarcons } from './DashboardTopGarcons'
import { useDashboardPeriodo } from '@/src/presentation/hooks/useDashboardPeriodo'
import { textoUltimaAtualizacao } from './dashboardTextHelpers'
// (dateFilters) não usado aqui: ranges agora são calculados no fuso da empresa
import {
  assumirDateComoNoFusoEmpresaParaUtc,
  calcularPeriodoAnteriorParaComparacaoNoFusoEmpresa,
  calcularPeriodoNoFusoEmpresa,
  deslocarPeriodoEmDiasCorridosUtc,
  permiteOpcoesIntervaloPorHoraNoFuso,
} from '@/src/shared/utils/periodoNoFusoEmpresa'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'

/** Exo 2 (Google) — o token Tailwind `font-exo` aponta para General Sans; aqui usamos a família real */
const exo2CabecalhoFaturamento = Exo_2({
  subsets: ['latin', 'latin-ext'],
  weight: '600',
  display: 'swap',
})
/**
 * Comparativo do período personalizado: mesma janela deslocada N dias corridos para trás
 * (início e fim, preservando horário).
 */
const DIAS_COMPARACAO_PERIODO_PERSONALIZADO = 30

/**
 * Valores do Select de período (V2) → rótulos esperados por `calculatePeriodo`.
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
/**
 * Nova visão geral do dashboard (layout Figma).
 * Conteúdo abaixo do TopNav — navegação global fica no layout `app/dashboard/layout.tsx`.
 */
export default function DashboardV2() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    timezoneAgregacao,
    isLoading: carregandoEmpresa,
    refetch: refetchEmpresa,
  } = useEmpresaMe()
  const {
    periodoData,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    modalIntervaloPersonalizadoAberto,
    setModalIntervaloPersonalizadoAberto,
    rascunhoIntervaloRange,
    mesCalendarioIntervalo,
    setMesCalendarioIntervalo,
    rascunhoHoraInicio,
    setRascunhoHoraInicio,
    rascunhoHoraFim,
    setRascunhoHoraFim,
    handleLimparFiltroPeriodo,
    handlePeriodoDataChange,
    handleRascunhoIntervaloRangeChange,
    handleAplicarIntervaloPersonalizadoModal,
  } = useDashboardPeriodo()

  const [granularidade, setGranularidade] = useState<AgregacaoGraficoV2>('intervalo_30')

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
    timeZoneEmpresa: timezoneAgregacao,
  })

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


  const opcaoCalculatePeriodo = useMemo(
    () => periodoSelectV2ParaOpcaoCalculatePeriodo(periodoData),
    [periodoData]
  )

  const { inicio: inicioResumo, fim: fimResumo } = useMemo(() => {
    const tzEmpresa = timezoneAgregacao?.trim() || 'America/Sao_Paulo'
    if (periodoData === 'personalizado' && periodoPersonalizadoInicio && periodoPersonalizadoFim) {
      return {
        inicio: assumirDateComoNoFusoEmpresaParaUtc(periodoPersonalizadoInicio, tzEmpresa),
        fim: assumirDateComoNoFusoEmpresaParaUtc(periodoPersonalizadoFim, tzEmpresa),
      }
    }
    return calcularPeriodoNoFusoEmpresa(opcaoCalculatePeriodo, tzEmpresa)
  }, [
    periodoData,
    periodoPersonalizadoInicio,
    periodoPersonalizadoFim,
    opcaoCalculatePeriodo,
    dadosAtualizadosEm,
    timezoneAgregacao,
  ])

  const { inicio: inicioAnterior, fim: fimAnterior } = useMemo(() => {
    const tzEmpresa = timezoneAgregacao?.trim() || 'America/Sao_Paulo'
    if (periodoData === 'personalizado' && inicioResumo && fimResumo) {
      return deslocarPeriodoEmDiasCorridosUtc(
        inicioResumo,
        fimResumo,
        DIAS_COMPARACAO_PERIODO_PERSONALIZADO
      )
    }
    const r = calcularPeriodoAnteriorParaComparacaoNoFusoEmpresa(opcaoCalculatePeriodo, tzEmpresa)
    if (!r) return { inicio: null, fim: null }
    return r
  }, [periodoData, inicioResumo, fimResumo, opcaoCalculatePeriodo, dadosAtualizadosEm, timezoneAgregacao])

  /**
   * Por hora: hoje/ontem, ou intervalo personalizado com até 2 dias corridos inclusivos
   * (mesma regra de `permiteOpcoesIntervaloPorHora`).
   */
  const permiteGraficoPorHora = useMemo(() => {
    const tzEmpresa = timezoneAgregacao?.trim() || 'America/Sao_Paulo'
    if (periodoData === 'personalizado' && inicioResumo && fimResumo) {
      return permiteOpcoesIntervaloPorHoraNoFuso(inicioResumo, fimResumo, tzEmpresa)
    }
    return periodoData === 'hoje' || periodoData === 'ontem'
  }, [periodoData, inicioResumo, fimResumo, timezoneAgregacao])

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
    periodo: periodoData,
    timezone: timezoneAgregacao,
    intervaloAtualInicio: inicioResumo,
    intervaloAtualFim: fimResumo,
    intervaloComparacaoInicio: inicioAnterior,
    intervaloComparacaoFim: fimAnterior,
  })
  const totalFaturadoPeriodo = dadosResumo?.atual?.total?.totalFaturado ?? 0

  const subtituloAtualizacao = textoUltimaAtualizacao(dadosAtualizadosEm)

  const handleAtualizarDashboard = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'evolucao'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'metodos-pagamento-detalhado'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'top-produtos'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'top-garcons'] })
    void Promise.all([refetchEmpresa(), refetchResumo()]).then(() => {
      setDadosAtualizadosEm(Date.now())
      setTickRelogio(n => n + 1)
    })
  }

  /** Restaura o filtro global de período para Hoje (como ao carregar a página). */
  const irParaRelatoriosVendas = () => {
    const preset = periodoV2ParaQueryRelatorios(periodoData)
    if (preset) {
      router.push(`/relatorios-vendas?${new URLSearchParams({ periodo: preset }).toString()}`)
    } else {
      router.push('/relatorios-vendas')
    }
  }

  return (
    <div className="font-nunito min-h-0 w-full bg-gray-50 pb-8 pt-2">
      {/* Cabeçalho + filtros */}
      <DashboardFiltros
        subtituloAtualizacao={subtituloAtualizacao}
        handleAtualizarDashboard={handleAtualizarDashboard}
        carregandoEmpresa={carregandoEmpresa}
        periodoData={periodoData}
        handlePeriodoDataChange={handlePeriodoDataChange}
        periodoPersonalizadoInicio={periodoPersonalizadoInicio}
        periodoPersonalizadoFim={periodoPersonalizadoFim}
        handleLimparFiltroPeriodo={handleLimparFiltroPeriodo}
      />

      {/* Faixa roxa: altura só do grid de 2 colunas; mascote em absolute (não entra no fluxo) */}
      <FaturamentoBanner
        periodoData={periodoData}
        carregandoResumo={carregandoResumo}
        erroResumo={erroResumo}
        totalFaturadoPeriodo={totalFaturadoPeriodo}
        comparacaoPeriodoAnterior={
          dadosResumo?.comparacao?.totalFaturado
            ? {
                status: dadosResumo.comparacao.totalFaturado.status,
                percentual: dadosResumo.comparacao.totalFaturado.percentual,
                anterior: dadosResumo.anterior.total.totalFaturado,
              }
            : { status: 'carregando', percentual: 0, anterior: 0 }
        }
        irParaRelatoriosVendas={irParaRelatoriosVendas}
      />

      {/* 4 cards de métricas */}
      <DashboardMetricas
        periodoData={periodoData}
        dadosResumo={dadosResumo}
        carregandoResumo={carregandoResumo}
        erroResumo={erroResumo}
      />

      {/* Gráfico + formas de pagamento */}
      <div className="mx-2 grid grid-cols-1 gap-2 md:mx-4 lg:grid-cols-12 lg:items-start">
        <DashboardGraficoComparativo
          periodoData={periodoData}
          timezoneAgregacao={timezoneAgregacao ?? 'America/Sao_Paulo'}
          periodoPersonalizadoInicio={periodoPersonalizadoInicio}
          periodoPersonalizadoFim={periodoPersonalizadoFim}
          permiteGraficoPorHora={permiteGraficoPorHora}
          granularidade={granularidade}
          setGranularidade={setGranularidade}
        />

        <DashboardFormasPagamento
          periodoData={periodoData}
          opcaoCalculatePeriodo={opcaoCalculatePeriodo}
          inicioResumo={inicioResumo}
          fimResumo={fimResumo}
        />
      </div>

      {/* Top produtos + Top garçons — duas colunas; listas com flex (sem tabela) */}
      <div className="mx-2 mt-2 grid grid-cols-1 gap-2 md:mx-4 lg:grid-cols-2">
        <DashboardTopProdutos
          periodoData={periodoData}
          periodoPersonalizadoInicio={periodoPersonalizadoInicio}
          periodoPersonalizadoFim={periodoPersonalizadoFim}
          timezoneAgregacao={timezoneAgregacao}
          dadosAtualizadosEm={dadosAtualizadosEm}
        />

        <DashboardTopGarcons
          periodoData={periodoData}
          periodoPersonalizadoInicio={periodoPersonalizadoInicio}
          periodoPersonalizadoFim={periodoPersonalizadoFim}
          timezoneAgregacao={timezoneAgregacao}
          dadosAtualizadosEm={dadosAtualizadosEm}
        />
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
            className="rounded-b-l-lg font-nunito flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar
          </button>
        }
      >
        <div className="flex min-h-0 w-full flex-1 flex-col items-stretch justify-start overflow-x-auto overflow-y-auto">
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
    </div>
  )
}

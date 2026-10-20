'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { startOfDay } from 'date-fns'
import { MdSearch } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import {
  useRelatorioEntregas,
  useRelatorioEntregasDetalhe,
  type RelatorioEntregasFetchParams,
} from '@/src/presentation/hooks/useRelatorioEntregas'
import type {
  OrderByDirectionRelatorioEntregas,
  OrderByFieldRelatorioEntregas,
  RelatorioEntregasItemDTO,
} from '@/src/application/dto/RelatorioEntregasDTO'
import { RELATORIO_ENTREGAS_INTERVALO_MAX_DIAS } from '@/src/infrastructure/relatorios/montarQueryRelatorioEntregas'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { cn } from '@/src/shared/utils/cn'
import {
  dateLocalToIsoFim,
  dateLocalToIsoInicio,
  dateToYmdLocal,
  formatarDataHoraBr,
  formatarInteiroBr,
  formatarMoedaBrl,
  formatarTempoMedioSegundos,
  intervaloExcedeMaximoDias,
  parseYmdLocal,
  periodoPadraoUltimos30Dias,
} from './relatorioEntregasFormat'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 650

const ORDER_FIELD_OPTIONS: { value: OrderByFieldRelatorioEntregas; label: string }[] = [
  { value: 'nomeEntregador', label: 'Nome do entregador' },
  { value: 'countEntregasParticipadas', label: 'Quantidade de entregas' },
  { value: 'valorTotalEntregasParticipadas', label: 'Total das entregas' },
  { value: 'somaTaxasEntrega', label: 'Taxas a pagar' },
  { value: 'tempoMedioEntregaEmSegundos', label: 'Tempo médio' },
]

type FiltrosUI = {
  q: string
  finalIni: string
  finalFim: string
  horaIni: string
  horaFim: string
  orderByField: OrderByFieldRelatorioEntregas
  orderByDirection: OrderByDirectionRelatorioEntregas
}

function filtrosIniciais(): FiltrosUI {
  const padrao = periodoPadraoUltimos30Dias()
  return {
    q: '',
    finalIni: padrao.ini,
    finalFim: padrao.fim,
    horaIni: '00:00',
    horaFim: '23:59',
    orderByField: 'somaTaxasEntrega',
    orderByDirection: 'desc',
  }
}

function stringsParaDateRange(ini: string, fim: string): DateRange | undefined {
  const from = parseYmdLocal(ini)
  if (!from) return undefined
  const to = fim.trim() ? parseYmdLocal(fim) : from
  return { from, to: to ?? from }
}

function textoPeriodoResumo(ini: string, fim: string): string {
  const dIni = parseYmdLocal(ini)
  if (!dIni) return ''
  const dFim = fim.trim() ? parseYmdLocal(fim) : dIni
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const a = fmt.format(dIni)
  const b = dFim ? fmt.format(dFim) : a
  return a === b ? a : `${a} — ${b}`
}

function montarParams(
  filtros: FiltrosUI,
  offset: number
): RelatorioEntregasFetchParams {
  const p: RelatorioEntregasFetchParams = {
    offset,
    limit: PAGE_SIZE,
    orderByField: filtros.orderByField,
    orderByDirection: filtros.orderByDirection,
  }
  const qTrim = filtros.q.trim()
  if (qTrim) p.q = qTrim
  if (filtros.finalIni) p.dataFinalizacaoInicio = dateLocalToIsoInicio(filtros.finalIni, filtros.horaIni)
  if (filtros.finalFim) p.dataFinalizacaoFim = dateLocalToIsoFim(filtros.finalFim, filtros.horaFim)
  return p
}

/**
 * Relatório de entregas por entregador — somaTaxasEntrega é o valor a pagar ao motoboy.
 */
export function RelatorioEntregasList() {
  const { timezoneAgregacao } = useEmpresaMe()
  const [draft, setDraft] = useState<FiltrosUI>(filtrosIniciais)
  const [active, setActive] = useState<FiltrosUI>(filtrosIniciais)
  const [offset, setOffset] = useState(0)
  const [painelIntervalo, setPainelIntervalo] = useState(false)
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(undefined)
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')
  const [erroPeriodo, setErroPeriodo] = useState<string | null>(null)
  const [entregadorAberto, setEntregadorAberto] = useState<RelatorioEntregasItemDTO | null>(null)
  const [offsetDetalhe, setOffsetDetalhe] = useState(0)

  const fetchParams = useMemo(() => montarParams(active, offset), [active, offset])

  const { data, isLoading, isFetching, error } = useRelatorioEntregas(fetchParams)

  const detalheParams = useMemo(() => {
    if (!entregadorAberto) return null
    return montarParams(active, offsetDetalhe)
  }, [entregadorAberto, active, offsetDetalhe])

  const detalheQuery = useRelatorioEntregasDetalhe(
    entregadorAberto?.entregador.id ?? null,
    detalheParams
  )

  useEffect(() => {
    if (draft.q === active.q) return
    const timer = setTimeout(() => {
      setOffset(0)
      setActive(prev => ({ ...prev, q: draft.q }))
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [active.q, draft.q])

  const limparTodosFiltros = useCallback(() => {
    const iniciais = filtrosIniciais()
    setDraft(iniciais)
    setActive(iniciais)
    setOffset(0)
    setErroPeriodo(null)
    setEntregadorAberto(null)
  }, [])

  const textoResumoPeriodo = useMemo(
    () => textoPeriodoResumo(draft.finalIni, draft.finalFim),
    [draft.finalIni, draft.finalFim]
  )

  const itens = data?.items ?? []
  const hasNext = data?.hasNext === true
  const hasPrevious = data?.hasPrevious === true
  const totalRegistros = data?.count
  const listagemErro = error instanceof Error ? error.message : error ? String(error) : null
  const loadingLista = isLoading || isFetching

  const irProxima = useCallback(() => {
    if (hasNext) setOffset(o => o + PAGE_SIZE)
  }, [hasNext])

  const irAnterior = useCallback(() => {
    if (hasPrevious) setOffset(o => Math.max(0, o - PAGE_SIZE))
  }, [hasPrevious])

  const abrirPainelPeriodo = useCallback(() => {
    setPainelIntervalo(true)
    const r = stringsParaDateRange(draft.finalIni, draft.finalFim)
    const base = r?.from ?? startOfDay(new Date())
    setRascunhoIntervaloRange(r ?? { from: base, to: base })
    setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(base))
    setRascunhoHoraInicio(draft.horaIni)
    setRascunhoHoraFim(draft.horaFim)
  }, [draft.finalIni, draft.finalFim, draft.horaIni, draft.horaFim])

  const handleRascunhoIntervaloRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoIntervaloRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
  }, [])

  const aplicarPainelIntervalo = useCallback(() => {
    if (!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to) return
    const ini = dateToYmdLocal(rascunhoIntervaloRange.from)
    const fim = dateToYmdLocal(rascunhoIntervaloRange.to)
    if (intervaloExcedeMaximoDias(ini, fim)) {
      setErroPeriodo(`O intervalo máximo é de ${RELATORIO_ENTREGAS_INTERVALO_MAX_DIAS} dias.`)
      return
    }
    setErroPeriodo(null)
    let merged: FiltrosUI | null = null
    setDraft(prev => {
      merged = { ...prev, finalIni: ini, finalFim: fim, horaIni: rascunhoHoraInicio, horaFim: rascunhoHoraFim }
      return merged
    })
    if (merged) {
      setActive(merged)
      setOffset(0)
    }
    setPainelIntervalo(false)
  }, [rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim])

  const abrirDetalhe = useCallback((row: RelatorioEntregasItemDTO) => {
    setOffsetDetalhe(0)
    setEntregadorAberto(row)
  }, [])

  const inputCompact =
    'focus:border-primary h-8 w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 text-xs text-primary-text focus:outline-none md:text-sm'

  const vendas = detalheQuery.data?.vendas.items ?? []
  const detalheHasNext = detalheQuery.data?.vendas.hasNext === true
  const detalheHasPrevious = detalheQuery.data?.vendas.hasPrevious === true
  const detalheCount = detalheQuery.data?.vendas.count
  const detalheResumo = detalheQuery.data ?? entregadorAberto

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-shrink-0 px-2 py-2 md:px-[30px] md:py-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-base font-semibold text-primary md:text-lg">Relatório de Entregas</h2>
          <p className="text-xs text-secondary-text">
            Taxas a pagar = soma da taxa de entrega das vendas finalizadas do motoboy.
          </p>
        </div>
      </div>

      <div className="h-px flex-shrink-0 bg-primary/40 md:h-0.5" />

      <div className="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50/90 px-2 py-2 md:px-[30px]">
        <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-end xl:gap-x-3 xl:gap-y-2">
          <div className="relative min-w-0 xl:max-w-[240px] xl:flex-[1_1_200px]">
            <label htmlFor="entregas-busca" className="sr-only">
              Buscar entregador
            </label>
            <MdSearch
              className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
              size={17}
            />
            <input
              id="entregas-busca"
              type="text"
              placeholder="Nome do entregador…"
              value={draft.q}
              onChange={e => setDraft(d => ({ ...d, q: e.target.value }))}
              className={`${inputCompact} h-9 pl-9`}
            />
          </div>

          <div className="flex w-full min-w-0 flex-col gap-1 xl:w-auto xl:max-w-[min(100%,28rem)] xl:shrink">
            <div className="mb-0.5 flex min-h-[1rem] flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0 xl:justify-start">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                Período pela finalização
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={abrirPainelPeriodo}
                title="Período pela data de finalização da entrega"
                className={cn(
                  'h-9 shrink-0 rounded-md border px-3 text-xs font-semibold transition-colors',
                  textoResumoPeriodo
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-primary-text hover:border-primary/40 hover:bg-gray-50'
                )}
              >
                {textoResumoPeriodo || 'Escolher período'}
              </button>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-end gap-2 xl:ml-auto xl:w-auto xl:flex-[2_1_280px] xl:justify-end">
            <div className="min-w-[min(100%,12rem)] flex-1 sm:min-w-[14rem] xl:min-w-[11rem] xl:flex-initial">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                Ordenar por:
              </span>
              <select
                value={draft.orderByField}
                onChange={e =>
                  setDraft(prev => {
                    const next = {
                      ...prev,
                      orderByField: e.target.value as OrderByFieldRelatorioEntregas,
                    }
                    setOffset(0)
                    setActive(next)
                    return next
                  })
                }
                className={`${inputCompact} h-9`}
              >
                {ORDER_FIELD_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[8.25rem] shrink-0">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                Sentido:
              </span>
              <div
                className="inline-flex h-9 w-full rounded-md border border-gray-200 bg-white p-0.5"
                role="group"
                aria-label="Sentido da ordenação"
              >
                <button
                  type="button"
                  onClick={() =>
                    setDraft(prev => {
                      const next = { ...prev, orderByDirection: 'asc' as const }
                      setOffset(0)
                      setActive(next)
                      return next
                    })
                  }
                  className={cn(
                    'flex-1 rounded-sm px-2 text-xs font-semibold transition-colors',
                    draft.orderByDirection === 'asc'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-primary-text hover:bg-gray-50'
                  )}
                  aria-pressed={draft.orderByDirection === 'asc'}
                  title="Crescente (menor → maior)"
                >
                  Cresc.
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft(prev => {
                      const next = { ...prev, orderByDirection: 'desc' as const }
                      setOffset(0)
                      setActive(next)
                      return next
                    })
                  }
                  className={cn(
                    'flex-1 rounded-sm px-2 text-xs font-semibold transition-colors',
                    draft.orderByDirection === 'desc'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-primary-text hover:bg-gray-50'
                  )}
                  aria-pressed={draft.orderByDirection === 'desc'}
                  title="Decrescente (maior → menor)"
                >
                  Decresc.
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={limparTodosFiltros}
              className="h-9 w-full shrink-0 rounded-md border border-primary/50 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 sm:w-auto"
            >
              Limpar
            </button>
          </div>
        </div>
        {erroPeriodo ? <p className="text-xs text-red-700">{erroPeriodo}</p> : null}
      </div>

      <JiffySidePanelModal
        open={painelIntervalo}
        onClose={() => setPainelIntervalo(false)}
        title="Período — finalização da entrega"
        fullScreenOnMobile
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to}
            onClick={aplicarPainelIntervalo}
            className="rounded-b-l-lg flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar período
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
            faturamentoPorDia={undefined}
            faturamentoCarregando={false}
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

      <JiffySidePanelModal
        open={entregadorAberto !== null}
        onClose={() => setEntregadorAberto(null)}
        title="Entregas"
        subtitle={
          detalheResumo
            ? [detalheResumo.entregador.nome, detalheResumo.entregador.telefone]
                .filter(Boolean)
                .join(' · ') || undefined
            : undefined
        }
        fullScreenOnMobile
        panelClassName="w-[min(100vw-1rem,42rem)]"
      >
        {detalheResumo ? (
          <div className="space-y-4 px-1 py-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-xs text-secondary-text">Entregas</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-primary-text">
                  {formatarInteiroBr(detalheResumo.countEntregasParticipadas)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-xs text-secondary-text">Total dos pedidos</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-primary-text">
                  {formatarMoedaBrl(detalheResumo.valorTotalEntregasParticipadas)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-xs text-secondary-text">Taxas a pagar</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-primary-text">
                  {formatarMoedaBrl(detalheResumo.somaTaxasEntrega)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-xs text-secondary-text">Tempo médio</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-primary-text">
                  {formatarTempoMedioSegundos(detalheResumo.tempoMedioEntregaEmSegundos)}
                </p>
              </div>
            </div>

            {detalheQuery.isLoading || detalheQuery.isFetching ? (
              <div className="flex justify-center py-8">
                <JiffyLoading />
              </div>
            ) : detalheQuery.error ? (
              <p className="text-sm text-red-700">
                {detalheQuery.error instanceof Error
                  ? detalheQuery.error.message
                  : 'Erro ao carregar entregas.'}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-secondary-text">
                    {typeof detalheCount === 'number'
                      ? `${detalheCount} entrega(s)`
                      : `${vendas.length} entrega(s) nesta página`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!detalheHasPrevious}
                      onClick={() => setOffsetDetalhe(o => Math.max(0, o - PAGE_SIZE))}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={!detalheHasNext}
                      onClick={() => setOffsetDetalhe(o => o + PAGE_SIZE)}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <div className="hidden grid-cols-[minmax(0,1.4fr)_7.5rem_7.5rem] gap-2 bg-gray-50 px-3 py-2 text-xs font-medium text-secondary-text sm:grid">
                    <span>Pedido</span>
                    <span className="text-center">Valor do pedido</span>
                    <span className="text-center">Taxa de entrega</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {vendas.length === 0 ? (
                      <p className="py-8 text-center text-sm text-secondary-text">
                        Nenhuma entrega neste período.
                      </p>
                    ) : (
                      vendas.map(venda => (
                        <div
                          key={venda.id}
                          className="grid grid-cols-1 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1.4fr)_7.5rem_7.5rem] sm:items-center sm:gap-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-primary-text">
                              {venda.codigoVenda || venda.id}
                              {venda.numeroVenda != null ? ` · Nº ${venda.numeroVenda}` : ''}
                            </p>
                            <p className="text-xs text-secondary-text">
                              {formatarDataHoraBr(venda.dataFinalizacao)}
                              {venda.nomeCliente ? ` · ${venda.nomeCliente}` : ''}
                            </p>
                          </div>
                          <div className="flex items-baseline justify-between sm:block sm:text-center">
                            <span className="text-[10px] font-semibold uppercase text-secondary-text sm:hidden">
                              Valor do pedido
                            </span>
                            <p className="text-sm tabular-nums text-primary-text">
                              {formatarMoedaBrl(venda.valorFinal)}
                            </p>
                          </div>
                          <div className="flex items-baseline justify-between sm:block sm:text-center">
                            <span className="text-[10px] font-semibold uppercase text-secondary-text sm:hidden">
                              Taxa de entrega
                            </span>
                            <p className="text-sm tabular-nums text-primary-text">
                              {venda.taxaEntrega == null ? '—' : formatarMoedaBrl(venda.taxaEntrega)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </JiffySidePanelModal>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-3 pt-2 md:px-[30px]">
        {listagemErro ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {listagemErro}
          </div>
        ) : null}

        {loadingLista ? (
          <div className="flex justify-center py-12">
            <JiffyLoading />
          </div>
        ) : null}

        {!loadingLista && !listagemErro ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-secondary-text">
                {typeof totalRegistros === 'number'
                  ? `Total de entregadores: ${totalRegistros}`
                  : `Exibindo ${itens.length} linha(s) nesta página`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={irAnterior}
                  disabled={!hasPrevious}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={irProxima}
                  disabled={!hasNext}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>

            <div className="hidden h-11 items-center gap-[10px] rounded-lg bg-custom-2 px-2 md:flex md:px-4">
              <div className="flex-[2] text-xs font-semibold text-primary-text md:text-sm">
                Entregador
              </div>
              <div className="hidden flex-1 text-center text-xs font-semibold text-primary-text md:block md:text-sm">
                Entregas
              </div>
              <div className="hidden flex-1 text-center text-xs font-semibold text-primary-text lg:block lg:text-sm">
                Total vendas
              </div>
              <div className="flex-1 text-center text-xs font-semibold text-primary-text md:text-sm">
                Taxas a pagar
              </div>
              <div className="hidden flex-1 text-center text-xs font-semibold text-primary-text md:block md:text-sm">
                Tempo médio
              </div>
            </div>

            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
              {itens.length === 0 ? (
                <div className="py-12 text-center text-sm text-secondary-text">
                  Nenhum entregador com entregas no período.
                </div>
              ) : (
                itens.map((row, index) => (
                  <button
                    key={row.entregador.id}
                    type="button"
                    onClick={() => abrirDetalhe(row)}
                    className={cn(
                      'flex w-full flex-col gap-2 px-3 py-3 text-left md:flex-row md:items-center md:gap-[10px] md:px-4',
                      index % 2 === 0 ? 'bg-gray-50/80' : 'bg-white',
                      'hover:bg-primary/5'
                    )}
                  >
                    <div className="min-w-0 md:flex-[2]">
                      <p className="font-medium text-primary-text">{row.entregador.nome ?? '—'}</p>
                      {row.entregador.telefone ? (
                        <p className="text-xs text-secondary-text">{row.entregador.telefone}</p>
                      ) : null}
                    </div>
                    <div className="text-sm tabular-nums text-primary-text md:flex-1 md:text-center">
                      {formatarInteiroBr(row.countEntregasParticipadas)}
                    </div>
                    <div className="hidden text-sm tabular-nums text-primary-text lg:block lg:flex-1 lg:text-center">
                      {formatarMoedaBrl(row.valorTotalEntregasParticipadas)}
                    </div>
                    <div className="text-sm tabular-nums text-primary-text md:flex-1 md:text-center">
                      {formatarMoedaBrl(row.somaTaxasEntrega)}
                    </div>
                    <div className="hidden text-sm tabular-nums text-primary-text md:block md:flex-1 md:text-center">
                      {formatarTempoMedioSegundos(row.tempoMedioEntregaEmSegundos)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

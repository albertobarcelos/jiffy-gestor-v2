'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { startOfDay } from 'date-fns'
import { MdSearch } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useRelatorioEntregadores } from '@/src/presentation/hooks/useRelatorioEntregadores'
import type {
  OrderByDirectionRelatorioEntregadores,
  OrderByFieldRelatorioEntregadores,
} from '@/src/application/dto/RelatorioEntregadoresDTO'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import { cn } from '@/src/shared/utils/cn'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 650

const ORDER_FIELD_OPTIONS: { value: OrderByFieldRelatorioEntregadores; label: string }[] = [
  { value: 'nome', label: 'Nome do entregador' },
  { value: 'quantidadeEntregasFinalizadas', label: 'Qtd. entrega finalizada' },
  { value: 'quantidadeEntregasPendentes', label: 'Qtd. entrega pendente' },
  { value: 'valorAReceber', label: 'Valor a receber' },
]

function dateLocalToIsoInicio(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
}

function dateLocalToIsoFim(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}

function dateToYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYmdLocal(s: string): Date | null {
  const t = s.trim()
  if (!t) return null
  const [y, m, d] = t.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function stringsParaDateRange(ini: string, fim: string): DateRange | undefined {
  const from = parseYmdLocal(ini)
  if (!from) return undefined
  const to = fim.trim() ? parseYmdLocal(fim) : from
  return { from, to: to ?? from }
}

function periodoMesAtual(): { ini: string; fim: string } {
  const agora = new Date()
  const ini = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
  return { ini: dateToYmdLocal(ini), fim: dateToYmdLocal(fim) }
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

const fmtBrl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtInt = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v)

type FiltrosUI = {
  q: string
  entregadorId: string
  coberturaId: string
  finalIni: string
  finalFim: string
  orderByField: OrderByFieldRelatorioEntregadores
  orderByDirection: OrderByDirectionRelatorioEntregadores
}

function filtrosIniciais(): FiltrosUI {
  const mes = periodoMesAtual()
  return {
    q: '',
    entregadorId: '',
    coberturaId: '',
    finalIni: mes.ini,
    finalFim: mes.fim,
    orderByField: 'nome',
    orderByDirection: 'asc',
  }
}

export function RelatorioEntregadoresList() {
  const { timezoneAgregacao } = useEmpresaMe()
  const [draft, setDraft] = useState<FiltrosUI>(filtrosIniciais)
  const [active, setActive] = useState<FiltrosUI>(filtrosIniciais)
  const [offset, setOffset] = useState(0)
  const [painelPeriodo, setPainelPeriodo] = useState(false)
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(
    undefined
  )
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')

  const fetchParams = useMemo(() => {
    if (!active.finalIni || !active.finalFim) return null
    return {
      dataFinalizacaoInicio: dateLocalToIsoInicio(active.finalIni),
      dataFinalizacaoFim: dateLocalToIsoFim(active.finalFim),
      offset,
      limit: PAGE_SIZE,
      q: active.q.trim() || undefined,
      entregadorId: active.entregadorId.trim() || undefined,
      coberturaId: active.coberturaId.trim() || undefined,
      orderByField: active.orderByField,
      orderByDirection: active.orderByDirection,
    }
  }, [active, offset])

  const { data, isLoading, isFetching, error } = useRelatorioEntregadores(fetchParams)

  useEffect(() => {
    if (draft.q === active.q) return
    const timer = setTimeout(() => {
      setOffset(0)
      setActive(prev => ({ ...prev, q: draft.q }))
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [active.q, draft.q])

  const limparFiltros = useCallback(() => {
    const inicial = filtrosIniciais()
    setDraft(inicial)
    setActive(inicial)
    setOffset(0)
  }, [])

  const abrirPainelPeriodo = useCallback(() => {
    const r = stringsParaDateRange(draft.finalIni, draft.finalFim)
    const base = r?.from ?? startOfDay(new Date())
    setRascunhoIntervaloRange(r ?? { from: base, to: base })
    setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(base))
    setRascunhoHoraInicio('00:00')
    setRascunhoHoraFim('23:59')
    setPainelPeriodo(true)
  }, [draft.finalIni, draft.finalFim])

  const aplicarPeriodo = useCallback(() => {
    if (!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to) return
    const next: FiltrosUI = {
      ...draft,
      finalIni: dateToYmdLocal(rascunhoIntervaloRange.from),
      finalFim: dateToYmdLocal(rascunhoIntervaloRange.to),
    }
    setDraft(next)
    setActive(next)
    setOffset(0)
    setPainelPeriodo(false)
  }, [draft, rascunhoIntervaloRange])

  const itens = data?.items ?? []
  const coberturas = data?.coberturas ?? []
  const totais = data?.totais
  const listagemErro = error instanceof Error ? error.message : error ? String(error) : null
  const loadingLista = isLoading || isFetching
  const textoResumoPeriodo = textoPeriodoResumo(draft.finalIni, draft.finalFim)

  const inputCompact =
    'focus:border-primary h-8 w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 text-xs text-primary-text focus:outline-none md:text-sm'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-shrink-0 px-2 py-2 md:px-[30px] md:py-2">
        <h2 className="text-base font-semibold text-primary md:text-lg">
          Relatório de entregadores
        </h2>
        <p className="text-xs text-secondary-text">
          Taxas das áreas e raios já lançadas no pedido · em rota e cancelados ficam de fora
        </p>
      </div>

      <div className="h-px flex-shrink-0 bg-primary/40 md:h-0.5" />

      <div className="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50/90 px-2 py-2 md:px-[30px]">
        <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-end xl:gap-x-3 xl:gap-y-2">
          <div className="min-w-0 xl:max-w-[280px] xl:flex-[1_1_220px]">
            <label
              htmlFor="relatorio-entregadores-cobertura"
              className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text"
            >
              Cobertura
            </label>
            <select
              id="relatorio-entregadores-cobertura"
              value={draft.coberturaId}
              onChange={e => {
                const coberturaId = e.target.value
                setDraft(prev => ({ ...prev, coberturaId }))
                setActive(prev => ({ ...prev, coberturaId }))
                setOffset(0)
              }}
              className={`${inputCompact} h-9`}
            >
              <option value="">Todas as áreas e raios</option>
              {coberturas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.tipo === 'area' ? 'Área' : 'Raio'} {c.nome} — {fmtBrl(c.valorTaxa)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 xl:max-w-[260px] xl:flex-[1_1_220px]">
            <label
              htmlFor="relatorio-entregadores-select"
              className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text"
            >
              Entregador
            </label>
            <select
              id="relatorio-entregadores-select"
              value={draft.entregadorId}
              onChange={e => {
                const entregadorId = e.target.value
                setDraft(prev => ({ ...prev, entregadorId }))
                setActive(prev => ({ ...prev, entregadorId }))
                setOffset(0)
              }}
              className={`${inputCompact} h-9`}
            >
              <option value="">Todos os entregadores</option>
              {(data?.entregadores ?? []).map(e => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-0 xl:max-w-[240px] xl:flex-[1_1_200px]">
            <label htmlFor="relatorio-entregadores-busca" className="sr-only">
              Buscar entregador
            </label>
            <MdSearch
              className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
              size={17}
            />
            <input
              id="relatorio-entregadores-busca"
              type="text"
              placeholder="Nome do entregador…"
              value={draft.q}
              onChange={e => setDraft(d => ({ ...d, q: e.target.value }))}
              className={`${inputCompact} h-9 pl-9`}
            />
          </div>

          <div className="flex w-full min-w-0 flex-col gap-1 xl:w-auto xl:max-w-[min(100%,28rem)] xl:shrink">
            <div className="mb-0.5 flex min-h-[1rem] flex-wrap items-baseline gap-x-1.5">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                Período
              </span>
              {textoResumoPeriodo ? (
                <span className="text-[10px] text-primary-text">{textoResumoPeriodo}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={abrirPainelPeriodo}
              className={cn(
                'h-9 w-fit shrink-0 rounded-md border px-3 text-xs font-semibold transition-colors',
                textoResumoPeriodo
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 bg-white text-primary-text hover:border-primary/40'
              )}
            >
              Finalização do pedido
            </button>
          </div>

          <div className="flex w-full flex-wrap items-end gap-2 xl:ml-auto xl:w-auto xl:justify-end">
            <div className="min-w-[min(100%,12rem)] flex-1 sm:min-w-[14rem] xl:min-w-[11rem] xl:flex-initial">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                Ordenar por:
              </span>
              <select
                value={draft.orderByField}
                onChange={e => {
                  const orderByField = e.target.value as OrderByFieldRelatorioEntregadores
                  const next = { ...draft, orderByField }
                  setDraft(next)
                  setActive(next)
                  setOffset(0)
                }}
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
              <div className="inline-flex h-9 w-full rounded-md border border-gray-200 bg-white p-0.5">
                {(['asc', 'desc'] as const).map(dir => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => {
                      const next = { ...draft, orderByDirection: dir }
                      setDraft(next)
                      setActive(next)
                      setOffset(0)
                    }}
                    className={cn(
                      'flex-1 rounded-sm px-2 text-xs font-semibold transition-colors',
                      draft.orderByDirection === dir
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-primary-text hover:bg-gray-50'
                    )}
                  >
                    {dir === 'asc' ? 'Cresc.' : 'Decresc.'}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={limparFiltros}
              className="h-9 w-full shrink-0 rounded-md border border-primary/50 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15 sm:w-auto"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      <JiffySidePanelModal
        open={painelPeriodo}
        onClose={() => setPainelPeriodo(false)}
        title="Período — finalização do pedido"
        fullScreenOnMobile
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to}
            onClick={aplicarPeriodo}
            className="flex h-full w-full items-center justify-center rounded-b-l-lg bg-primary text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            Aplicar período
          </button>
        }
      >
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-auto py-2">
          <FaturamentoRangeCalendar
            embutidoNoModal
            embutidoFundoClaro
            range={rascunhoIntervaloRange}
            onRangeChange={next => {
              if (next != null) {
                setRascunhoIntervaloRange(next)
                return
              }
              const hoje = startOfDay(new Date())
              setRascunhoIntervaloRange({ from: hoje, to: hoje })
            }}
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

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2 md:px-[30px]">
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

        {!loadingLista && !listagemErro && totais ? (
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                Total entregas finalizadas
              </p>
              <p className="text-lg font-semibold text-primary">
                {fmtBrl(totais.valorAReceberFinalizadas)}
              </p>
              <p className="text-xs text-secondary-text">
                {fmtInt(totais.quantidadeEntregasFinalizadas)} entrega(s)
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                Total entregas pendentes
              </p>
              <p className="text-lg font-semibold text-primary">
                {fmtBrl(totais.valorAReceberPendentes)}
              </p>
              <p className="text-xs text-secondary-text">
                {fmtInt(totais.quantidadeEntregasPendentes)} entrega(s)
              </p>
            </div>
          </div>
        ) : null}

        {data?.truncado && !loadingLista && !listagemErro ? (
          <p className="mb-2 rounded border border-secondary bg-secondary/50 px-2 py-1.5 text-xs text-secondary">
            Há mais pedidos no período do que o limite temporário desta tela. Refine as datas se o
            total parecer incompleto.
          </p>
        ) : null}

        {!loadingLista && !listagemErro ? (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-secondary-text">
                Total de registros: {data?.count ?? 0}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
                  disabled={!data?.hasPrevious}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setOffset(o => o + PAGE_SIZE)}
                  disabled={!data?.hasNext}
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
              <div className="hidden flex-1 text-xs font-semibold text-primary-text md:flex md:text-sm">
                Telefone
              </div>
              <div className="flex-1 text-center text-xs font-semibold text-primary-text md:text-sm">
                Qtd. entrega finalizada
              </div>
              <div className="flex-1 text-center text-xs font-semibold text-primary-text md:text-sm">
                Qtd. entrega pendente
              </div>
              <div className="flex-1 text-end text-xs font-semibold text-primary-text">
                A receber (R$)
              </div>
            </div>

            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
              {itens.length === 0 ? (
                <div className="py-12 text-center text-sm text-secondary-text">
                  Nenhum entregador com entregas neste período.
                </div>
              ) : (
                itens.map((row, index) => (
                  <div
                    key={row.entregadorId}
                    className={cn(
                      'flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:gap-[10px] md:px-4',
                      index % 2 === 0 ? 'bg-gray-50/80' : 'bg-white'
                    )}
                  >
                    <div className="min-w-0 font-medium text-primary-text md:flex-[2]">
                      {row.nome}
                    </div>
                    <div className="text-sm text-primary-text md:flex-1">
                      {row.telefone ? formatarTelefoneBr(row.telefone) || row.telefone : '—'}
                    </div>
                    <div className="text-sm tabular-nums text-primary-text md:flex-1 md:text-center">
                      <span className="md:hidden text-secondary-text">Finalizada: </span>
                      {fmtInt(row.quantidadeEntregasFinalizadas)}
                    </div>
                    <div className="text-sm tabular-nums text-primary-text md:flex-1 md:text-center">
                      <span className="md:hidden text-secondary-text">Pendente: </span>
                      {fmtInt(row.quantidadeEntregasPendentes)}
                    </div>
                    <div className="font-semibold tabular-nums text-primary md:flex-1 md:text-right">
                      {fmtBrl(row.valorAReceber)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { DateRange } from 'react-day-picker'
import { startOfDay } from 'date-fns'
import { MdSearch } from 'react-icons/md'
import { Taxa } from '@/src/domain/entities/Taxa'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useComissoesPdv } from '@/src/presentation/hooks/useComissoesPdv'
import type { ComissoesPdvFetchParams } from '@/src/presentation/hooks/useComissoesPdv'
import type {
  OrderByFieldComissoes,
  OrderByDirectionComissoes,
} from '@/src/application/dto/ComissoesPdvDTO'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { cn } from '@/src/shared/utils/cn'

const PAGE_SIZE = 10
/** Limite máximo aceito pelo fiscal em GET /api/v1/taxas (validação no backend). */
const TAXAS_PAGE_FETCH = 100
const SEARCH_DEBOUNCE_MS = 650

const ORDER_FIELD_OPTIONS: { value: OrderByFieldComissoes; label: string }[] = [
  { value: 'nomeUsuarioPdv', label: 'Nome do usuário PDV' },
  { value: 'valorTotalVendasParticipadas', label: 'Total vendas participadas' },
  { value: 'valorBaseTaxaUsuario', label: 'Base da taxa (usuário)' },
  { value: 'countVendasParticipadas', label: 'Quantidade de vendas' },
  { value: 'valorTotalComissao', label: 'Valor total comissão' },
]

function isTipoPercentual(tipoRaw: string): boolean {
  return tipoRaw.toLowerCase() === 'percentual'
}

/** Converte data local (YYYY-MM-DD) para início do dia em ISO (UTC). */
function dateLocalToIsoInicio(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
}

/** Converte data local (YYYY-MM-DD) para fim do dia em ISO (UTC). */
function dateLocalToIsoFim(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}

const fmtBrl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtInt = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v)

type FiltrosUI = {
  q: string
  criacaoIni: string
  criacaoFim: string
  finalIni: string
  finalFim: string
  orderByField: OrderByFieldComissoes
  orderByDirection: OrderByDirectionComissoes
}

const FILTROS_INICIAIS: FiltrosUI = {
  q: '',
  criacaoIni: '',
  criacaoFim: '',
  finalIni: '',
  finalFim: '',
  orderByField: 'nomeUsuarioPdv',
  orderByDirection: 'asc',
}

function parseYmdLocal(s: string): Date | null {
  const t = s.trim()
  if (!t) return null
  const [y, m, d] = t.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function dateToYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function stringsParaDateRange(ini: string, fim: string): DateRange | undefined {
  const from = parseYmdLocal(ini)
  if (!from) return undefined
  const to = fim.trim() ? parseYmdLocal(fim) : from
  return { from, to: to ?? from }
}

/** Prévia do período nos botões (dd/mm/aaaa — dd/mm/aaaa). */
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

/**
 * Relatório de comissões por PDV — taxa percentual obrigatória; filtros alinhados à API fiscal.
 * Layout no padrão das listas em Configurações (ex.: Taxas).
 */
export function ComissoesList() {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  const [taxaId, setTaxaId] = useState('')
  const [draft, setDraft] = useState<FiltrosUI>(FILTROS_INICIAIS)
  const [active, setActive] = useState<FiltrosUI>(FILTROS_INICIAIS)
  const [offset, setOffset] = useState(0)
  const [painelIntervalo, setPainelIntervalo] = useState<'criacao' | 'finalizacao' | null>(null)
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(
    undefined
  )
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')

  useEffect(() => {
    setDraft(FILTROS_INICIAIS)
    setActive(FILTROS_INICIAIS)
    setOffset(0)
  }, [taxaId])

  const fetchParams = useMemo((): ComissoesPdvFetchParams | null => {
    const id = taxaId.trim()
    if (!id) return null
    const p: ComissoesPdvFetchParams = {
      taxaId: id,
      offset,
      limit: PAGE_SIZE,
      orderByField: active.orderByField,
      orderByDirection: active.orderByDirection,
    }
    const qTrim = active.q.trim()
    if (qTrim) p.q = qTrim
    if (active.criacaoIni) p.dataCriacaoInicio = dateLocalToIsoInicio(active.criacaoIni)
    if (active.criacaoFim) p.dataCriacaoFim = dateLocalToIsoFim(active.criacaoFim)
    if (active.finalIni) p.dataFinalizacaoInicio = dateLocalToIsoInicio(active.finalIni)
    if (active.finalFim) p.dataFinalizacaoFim = dateLocalToIsoFim(active.finalFim)
    return p
  }, [taxaId, offset, active])

  const { data, isLoading, isFetching, error } = useComissoesPdv(fetchParams)

  const taxasPercentualQuery = useQuery({
    queryKey: ['taxas', 'dropdown-comissoes'],
    queryFn: async (): Promise<Taxa[]> => {
      if (!token) return []
      const todas: Taxa[] = []
      let offsetLista = 0
      const maxPaginas = 80
      for (let p = 0; p < maxPaginas; p++) {
        const sp = new URLSearchParams({
          limit: String(TAXAS_PAGE_FETCH),
          offset: String(offsetLista),
        })
        const response = await fetch(`/api/taxas?${sp.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (!response.ok) break
        const json = (await response.json()) as { items?: Record<string, unknown>[] }
        const items = json.items || []
        for (const row of items) {
          todas.push(Taxa.fromJSON(row))
        }
        if (items.length < TAXAS_PAGE_FETCH) break
        offsetLista += items.length
      }
      return todas
        .filter(t => isTipoPercentual(t.getTipo()))
        .sort((a, b) => a.getNome().localeCompare(b.getNome(), undefined, { sensitivity: 'base' }))
    },
    enabled: !!token,
    staleTime: 5 * 60_000,
  })

  const taxasOpts = taxasPercentualQuery.data ?? []

  /** Aplica busca automaticamente após pequena pausa ao digitar. */
  useEffect(() => {
    if (!taxaId) return
    if (draft.q === active.q) return

    const timer = setTimeout(() => {
      setOffset(0)
      setActive(prev => ({ ...prev, q: draft.q }))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [active.q, draft.q, taxaId])

  /** Reseta filtros opcionais (mantém taxa selecionada). */
  const limparTodosFiltros = useCallback(() => {
    setDraft(FILTROS_INICIAIS)
    setActive(FILTROS_INICIAIS)
    setOffset(0)
  }, [])

  const textoResumoPeriodo = useMemo(() => {
    const c = textoPeriodoResumo(draft.criacaoIni, draft.criacaoFim)
    const f = textoPeriodoResumo(draft.finalIni, draft.finalFim)
    if (!c && !f) return ''
    const partes: string[] = []
    if (c) partes.push(`Criação: ${c}`)
    if (f) partes.push(`Finalização: ${f}`)
    return partes.join(' · ')
  }, [draft.criacaoIni, draft.criacaoFim, draft.finalIni, draft.finalFim])

  const itens = data?.items ?? []
  const hasNext = data?.hasNext === true
  const hasPrevious = data?.hasPrevious === true
  const totalRegistros = data?.count

  const irProxima = useCallback(() => {
    if (hasNext) setOffset(o => o + PAGE_SIZE)
  }, [hasNext])

  const irAnterior = useCallback(() => {
    if (hasPrevious) setOffset(o => Math.max(0, o - PAGE_SIZE))
  }, [hasPrevious])

  const abrirPainelCriacao = useCallback(() => {
    setPainelIntervalo('criacao')
    const r = stringsParaDateRange(draft.criacaoIni, draft.criacaoFim)
    const base = r?.from ?? startOfDay(new Date())
    setRascunhoIntervaloRange(r ?? { from: base, to: base })
    setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(base))
    setRascunhoHoraInicio('00:00')
    setRascunhoHoraFim('23:59')
  }, [draft.criacaoIni, draft.criacaoFim])

  const abrirPainelFinalizacao = useCallback(() => {
    setPainelIntervalo('finalizacao')
    const r = stringsParaDateRange(draft.finalIni, draft.finalFim)
    const base = r?.from ?? startOfDay(new Date())
    setRascunhoIntervaloRange(r ?? { from: base, to: base })
    setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(base))
    setRascunhoHoraInicio('00:00')
    setRascunhoHoraFim('23:59')
  }, [draft.finalIni, draft.finalFim])

  const handleRascunhoIntervaloRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoIntervaloRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
  }, [])

  const aplicarPainelIntervalo = useCallback(() => {
    if (!painelIntervalo) return
    if (!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to) return
    const ini = dateToYmdLocal(rascunhoIntervaloRange.from)
    const fim = dateToYmdLocal(rascunhoIntervaloRange.to)

    let merged: FiltrosUI | null = null
    setDraft(prev => {
      merged =
        painelIntervalo === 'criacao'
          ? { ...prev, criacaoIni: ini, criacaoFim: fim }
          : { ...prev, finalIni: ini, finalFim: fim }
      return merged
    })
    if (merged) {
      setActive(merged)
      setOffset(0)
    }
    setPainelIntervalo(null)
  }, [painelIntervalo, rascunhoIntervaloRange])

  const loadingLista = Boolean(taxaId && (isLoading || isFetching))

  const inputCompact =
    'focus:border-primary h-8 w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 text-xs text-primary-text focus:outline-none md:text-sm'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-shrink-0 px-2 py-2 md:px-[30px] md:py-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-base font-semibold text-primary md:text-lg">
            Comissões por usuário PDV
          </h2>
        </div>
      </div>

      <div className="h-px flex-shrink-0 bg-primary/40 md:h-0.5" />

      {/* Barra de filtros compacta — não rola com a lista */}
      <div className="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50/90 px-2 py-2 md:px-[30px]">
        <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-end xl:gap-x-3 xl:gap-y-2">
          <div className="min-w-0 xl:max-w-[280px] xl:flex-[1_1_220px]">
            <label
              htmlFor="comissoes-taxa"
              className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text"
            >
              Taxa %
            </label>
            <select
              id="comissoes-taxa"
              value={taxaId}
              onChange={e => setTaxaId(e.target.value)}
              className={`${inputCompact} h-9`}
            >
              <option value="">Selecione…</option>
              {taxasOpts.map(t => (
                <option key={t.getId()} value={t.getId()}>
                  {t.getNome()} —{' '}
                  {(t.getValor() * 100).toLocaleString('pt-BR', {
                    maximumFractionDigits: 2,
                  })}
                  %
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-0 xl:max-w-[240px] xl:flex-[1_1_200px]">
            <label htmlFor="comissoes-busca" className="sr-only">
              Buscar usuário PDV
            </label>
            <MdSearch
              className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
              size={17}
            />
            <input
              id="comissoes-busca"
              type="text"
              placeholder="Nome do usuário PDV…"
              value={draft.q}
              onChange={e => setDraft(d => ({ ...d, q: e.target.value }))}
              className={`${inputCompact} h-9 pl-9`}
            />
          </div>

          {/* Período — na mesma barra (calendário no painel lateral) */}
          <div className="flex w-full min-w-0 flex-col gap-1 xl:w-auto xl:max-w-[min(100%,28rem)] xl:shrink">
            <div className="mb-0.5 flex min-h-[1rem] flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0 xl:justify-start">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                Período
              </span>
              {textoResumoPeriodo ? (
                <span
                  className="min-w-0 max-w-full break-words text-[10px] font-normal normal-case tracking-normal text-primary-text"
                  title={textoResumoPeriodo}
                >
                  {textoResumoPeriodo}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={abrirPainelCriacao}
                title={
                  textoPeriodoResumo(draft.criacaoIni, draft.criacaoFim)
                    ? `Selecionado: ${textoPeriodoResumo(draft.criacaoIni, draft.criacaoFim)}`
                    : 'Escolher intervalo — data de criação da venda'
                }
                className={cn(
                  'h-9 shrink-0 rounded-md border px-3 font-exo text-xs font-semibold transition-colors',
                  textoPeriodoResumo(draft.criacaoIni, draft.criacaoFim)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-primary-text hover:border-primary/40 hover:bg-gray-50'
                )}
              >
                Criação da venda
              </button>
              <button
                type="button"
                onClick={abrirPainelFinalizacao}
                title={
                  textoPeriodoResumo(draft.finalIni, draft.finalFim)
                    ? `Selecionado: ${textoPeriodoResumo(draft.finalIni, draft.finalFim)}`
                    : 'Escolher intervalo — data de finalização da venda'
                }
                className={cn(
                  'h-9 shrink-0 rounded-md border px-3 font-exo text-xs font-semibold transition-colors',
                  textoPeriodoResumo(draft.finalIni, draft.finalFim)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-primary-text hover:border-primary/40 hover:bg-gray-50'
                )}
              >
                Finalização da venda
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
                      orderByField: e.target.value as OrderByFieldComissoes,
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
              className="h-9 w-full shrink-0 rounded-md border border-primary/50 bg-primary/10 px-3 font-exo text-xs font-semibold text-primary transition-colors hover:bg-primary/15 sm:w-auto"
            >
              Limpar
            </button>
          </div>
        </div>

        {taxasPercentualQuery.isFetched && taxasOpts.length === 0 && (
          <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
            Nenhuma taxa percentual. Cadastre na aba <strong>Taxas</strong>.
          </p>
        )}
      </div>

      <JiffySidePanelModal
        open={painelIntervalo !== null}
        onClose={() => setPainelIntervalo(null)}
        title={
          painelIntervalo === 'finalizacao'
            ? 'Período — finalização da venda'
            : 'Período — criação da venda'
        }
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to}
            onClick={aplicarPainelIntervalo}
            className="rounded-b-l-lg font-nunito flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
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
            horaInicio={rascunhoHoraInicio}
            horaFim={rascunhoHoraFim}
            onHorariosChange={(hi, hf) => {
              setRascunhoHoraInicio(hi)
              setRascunhoHoraFim(hf)
            }}
          />
        </div>
      </JiffySidePanelModal>

      {/* Lista: ocupa o restante da aba e rola só aqui */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-3 pt-2 md:px-[30px]">
        {!taxaId && (
          <div className="flex items-center justify-center py-16">
            <p className="text-secondary-text">
              Selecione uma taxa percentual para carregar o relatório.
            </p>
          </div>
        )}

        {taxaId && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error instanceof Error ? error.message : 'Erro ao carregar comissões.'}
          </div>
        )}

        {taxaId && loadingLista && (
          <div className="flex justify-center py-12">
            <JiffyLoading />
          </div>
        )}

        {taxaId && !loadingLista && !error && (
          <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-secondary-text">
                {typeof totalRegistros === 'number'
                  ? `Total de registros: ${totalRegistros}`
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
                Usuário PDV
              </div>
              <div className="hidden flex-1 text-xs font-semibold text-primary-text md:flex md:text-sm text-center justify-end">
                Vendas participadas (R$)
              </div>
              <div className="hidden flex-1 text-xs font-semibold text-primary-text lg:flex lg:text-sm text-center justify-end">
                Base taxa (R$)
              </div>
              <div className="hidden flex-1 text-xs font-semibold text-primary-text md:flex md:text-sm text-center justify-center">
                Qtd. vendas
              </div>
              <div className="flex-1 text-end text-xs font-semibold text-primary-text">
                Comissão (R$)
              </div>
            </div>

            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
              {itens.length === 0 ? (
                <div className="py-12 text-center text-sm text-secondary-text">
                  Nenhum registro para os filtros atuais.
                </div>
              ) : (
                itens.map((row, index) => (
                  <div
                    key={`${row.usuarioPdvId}-${index}`}
                    className={cn(
                      'flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:gap-[10px] md:px-4',
                      index % 2 === 0 ? 'bg-gray-50/80' : 'bg-white'
                    )}
                  >
                    <div className="min-w-0 font-medium uppercase text-primary-text md:flex-[2]">
                      {row.nomeUsuarioPdv}
                    </div>
                    <div className="text-sm tabular-nums text-primary-text md:flex-1 md:text-right">
                      {fmtBrl(row.valorTotalVendasParticipadas)}
                    </div>
                    <div className="hidden text-sm tabular-nums text-primary-text lg:flex lg:flex-1 lg:justify-end">
                      {fmtBrl(row.valorBaseTaxaUsuario)}
                    </div>
                    <div className="text-sm tabular-nums text-primary-text md:flex-1 md:text-center">
                      {fmtInt(row.countVendasParticipadas)}
                    </div>
                    <div className="font-semibold tabular-nums text-primary md:flex-1 md:text-right">
                      {fmtBrl(row.valorTotalComissao)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

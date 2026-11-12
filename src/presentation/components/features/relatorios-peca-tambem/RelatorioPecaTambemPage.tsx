'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormControl, MenuItem, Modal, Select } from '@mui/material'
import {
  MdArrowBack,
  MdAttachMoney,
  MdClose,
  MdMouse,
  MdVisibility,
  MdAddShoppingCart,
  MdShoppingBag,
  MdReceiptLong,
  MdCalendarToday,
  MdSearch,
} from 'react-icons/md'
import { startOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useRelatorioPecaTambem } from '@/src/presentation/hooks/useRelatorioPecaTambem'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { FaturamentoRangeCalendar } from '@/src/presentation/components/ui/FaturamentoRangeCalendar'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import {
  formatarMoedaBrl,
  formatarInteiroBr,
} from '@/src/presentation/components/features/relatorios/relatorioEntregasFormat'
import { MSG_SEM_DADOS_PECA_TAMBEM } from '@/src/shared/types/relatorioPecaTambemApi'
import {
  OPCOES_PERIODO_PECA_TAMBEM,
  formatarTaxaPct,
  isPeriodoPecaTambemLabel,
  resolverIntervaloPecaTambem,
  taxaPercentual,
  type PeriodoPecaTambemLabel,
} from '@/src/presentation/utils/relatorioPecaTambemPeriodo'
import { RelatorioPecaTambemDonutFaturamento } from '@/src/presentation/components/features/relatorios-peca-tambem/RelatorioPecaTambemDonutFaturamento'
import { RelatorioPecaTambemDonutProdutos } from '@/src/presentation/components/features/relatorios-peca-tambem/RelatorioPecaTambemDonutProdutos'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import { combinarIntervaloCalendarParaDatas } from '@/src/shared/utils/intervaloCalendarioComHoras'

const BUSCA_DEBOUNCE_MS = 400

const MESES_ABREV = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const

function formatarDataHoraFiltroCurta(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0')
  const mes = MESES_ABREV[date.getMonth()]
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dia}-${mes} ${h}:${min}`
}

function formatarHoraParaInputCalendar(d: Date | null | undefined): string {
  if (!d) return '00:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function parseIsoDate(value: string | null): Date | null {
  if (!value?.trim()) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function MetricCard({
  titulo,
  valor,
  rodape,
  icon,
  iconBgClass,
  onClick,
}: {
  titulo: string
  valor: string
  rodape: string
  icon: React.ReactNode
  /** Classe Tailwind do círculo do ícone (ex.: bg-alternate), no padrão do relatório de vendas. */
  iconBgClass: string
  onClick?: () => void
}) {
  const classeBase =
    'flex min-w-[200px] flex-1 items-center gap-3 rounded-lg border-2 bg-white p-1 text-left'
  const classeClicavel = onClick
    ? ' cursor-pointer transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
    : ''

  const conteudo = (
    <>
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconBgClass}`}
      >
        <span className="text-xl text-info">{icon}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-end">
        <span className="text-xs text-secondary-text">{titulo}</span>
        <span className="text-[22px] leading-tight text-primary">{valor}</span>
        <span className="max-w-full truncate text-right text-[10px] leading-tight text-secondary-text">
          {rodape}
        </span>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${classeBase}${classeClicavel}`}>
        {conteudo}
      </button>
    )
  }

  return <div className={classeBase}>{conteudo}</div>
}

export function RelatorioPecaTambemPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { timezoneAgregacao } = useEmpresaMe()
  const tz = timezoneAgregacao?.trim() || 'America/Sao_Paulo'

  const periodoQuery = searchParams.get('periodo') || 'Últimos 30 Dias'
  const deQuery = searchParams.get('de')
  const ateQuery = searchParams.get('ate')

  const [periodo, setPeriodo] = useState<string>(() =>
    isPeriodoPecaTambemLabel(periodoQuery) ? periodoQuery : 'Últimos 30 Dias'
  )
  const [periodoInicial, setPeriodoInicial] = useState<Date | null>(() => parseIsoDate(deQuery))
  const [periodoFinal, setPeriodoFinal] = useState<Date | null>(() => parseIsoDate(ateQuery))

  const [buscaDraft, setBuscaDraft] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')

  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false)
  const [isDonutFaturamentoOpen, setIsDonutFaturamentoOpen] = useState(false)
  const [isDonutProdutosOpen, setIsDonutProdutosOpen] = useState(false)
  const [rascunhoIntervaloRange, setRascunhoIntervaloRange] = useState<DateRange | undefined>(
    undefined
  )
  const [mesCalendarioIntervalo, setMesCalendarioIntervalo] = useState(() =>
    primeiroMesQuadroDuploCalendario(startOfDay(new Date()))
  )
  const [rascunhoHoraInicio, setRascunhoHoraInicio] = useState('00:00')
  const [rascunhoHoraFim, setRascunhoHoraFim] = useState('23:59')

  useEffect(() => {
    if (deQuery && ateQuery) {
      setPeriodoInicial(parseIsoDate(deQuery))
      setPeriodoFinal(parseIsoDate(ateQuery))
      return
    }
    setPeriodoInicial(null)
    setPeriodoFinal(null)
    if (isPeriodoPecaTambemLabel(periodoQuery)) {
      setPeriodo(periodoQuery)
    }
  }, [deQuery, ateQuery, periodoQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBuscaAtiva(buscaDraft.trim())
    }, BUSCA_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [buscaDraft])

  const intervalo = useMemo(() => {
    if (periodoInicial && periodoFinal) {
      return {
        de: periodoInicial.toISOString(),
        ate: periodoFinal.toISOString(),
      }
    }
    return resolverIntervaloPecaTambem({
      periodo,
      timeZoneEmpresa: tz,
    })
  }, [periodo, periodoInicial, periodoFinal, tz])

  const query = useRelatorioPecaTambem({
    de: intervalo.de,
    ate: intervalo.ate,
    q: buscaAtiva || null,
  })

  const resumo = query.data?.resumo
  const ranking = query.data?.ranking ?? []

  const taxaClique = taxaPercentual(resumo?.cliques ?? 0, resumo?.impressoes ?? 0)
  const taxaAdd = taxaPercentual(resumo?.adds ?? 0, resumo?.cliques ?? 0)
  const taxaConversao = taxaPercentual(resumo?.conversoes ?? 0, resumo?.adds ?? 0)

  const sincronizarUrl = useCallback(
    (next: { periodo?: string; de?: Date | null; ate?: Date | null }) => {
      const qs = new URLSearchParams()
      if (next.de && next.ate) {
        qs.set('de', next.de.toISOString())
        qs.set('ate', next.ate.toISOString())
      } else if (next.periodo && isPeriodoPecaTambemLabel(next.periodo)) {
        qs.set('periodo', next.periodo)
      } else {
        qs.set('periodo', 'Últimos 30 Dias')
      }
      router.replace(`/relatorios-peca-tambem?${qs.toString()}`)
    },
    [router]
  )

  const voltarParaVendas = () => {
    const qs = new URLSearchParams()
    if (periodoInicial && periodoFinal) {
      qs.set('de', periodoInicial.toISOString())
      qs.set('ate', periodoFinal.toISOString())
    } else if (isPeriodoPecaTambemLabel(periodo)) {
      qs.set('periodo', periodo)
    }
    const suffix = qs.toString()
    router.push(suffix ? `/relatorios-vendas?${suffix}` : '/relatorios-vendas')
  }

  const onChangePeriodo = (value: string) => {
    setPeriodo(value)
    setPeriodoInicial(null)
    setPeriodoFinal(null)
    sincronizarUrl({ periodo: value })
  }

  const handleRascunhoIntervaloRangeChange = useCallback((next: DateRange | undefined) => {
    if (next != null) {
      setRascunhoIntervaloRange(next)
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
  }, [])

  useEffect(() => {
    if (!isDatasModalOpen) return
    if (periodoInicial && periodoFinal) {
      setRascunhoIntervaloRange({
        from: startOfDay(periodoInicial),
        to: startOfDay(periodoFinal),
      })
      setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(startOfDay(periodoFinal)))
      setRascunhoHoraInicio(formatarHoraParaInputCalendar(periodoInicial))
      setRascunhoHoraFim(formatarHoraParaInputCalendar(periodoFinal))
      return
    }
    const hoje = startOfDay(new Date())
    setRascunhoIntervaloRange({ from: hoje, to: hoje })
    setMesCalendarioIntervalo(primeiroMesQuadroDuploCalendario(hoje))
    setRascunhoHoraInicio('00:00')
    setRascunhoHoraFim('23:59')
  }, [isDatasModalOpen, periodoInicial, periodoFinal])

  const handleAplicarIntervaloDatas = useCallback(() => {
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      rascunhoIntervaloRange,
      rascunhoHoraInicio,
      rascunhoHoraFim
    )
    if (!dataInicial || !dataFinal) return
    setPeriodoInicial(dataInicial)
    setPeriodoFinal(dataFinal)
    sincronizarUrl({ de: dataInicial, ate: dataFinal })
    setIsDatasModalOpen(false)
  }, [rascunhoIntervaloRange, rascunhoHoraInicio, rascunhoHoraFim, sincronizarUrl])

  const periodoControls = (
    <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
      <span className="text-sm text-primary">Período:</span>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select
          value={isPeriodoPecaTambemLabel(periodo) ? periodo : 'Últimos 30 Dias'}
          onChange={e => onChangePeriodo(String(e.target.value))}
          sx={{
            height: '32px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            fontSize: '13px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-primary)',
            },
            '& .MuiSvgIcon-root': {
              color: 'white',
            },
          }}
        >
          {OPCOES_PERIODO_PECA_TAMBEM.map(opcao => (
            <MenuItem key={opcao} value={opcao}>
              {opcao}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <button
        type="button"
        onClick={() => setIsDatasModalOpen(true)}
        className="flex h-8 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
      >
        <MdCalendarToday size={18} />
        Por datas
      </button>

      {periodoInicial && periodoFinal ? (
        <div className="flex shrink-0 flex-col gap-0 text-[11px] leading-snug text-primary/85 sm:text-xs">
          <span className="whitespace-nowrap">
            Dt. Ini.: {formatarDataHoraFiltroCurta(periodoInicial)}
          </span>
          <span className="whitespace-nowrap">
            Dt. Fim: {formatarDataHoraFiltroCurta(periodoFinal)}
          </span>
        </div>
      ) : null}
    </div>
  )

  const buscaRanking = (
    <div className="relative w-full min-w-[280px] max-w-md md:w-[28rem]">
      <label htmlFor="peca-tambem-busca-produto" className="sr-only">
        Buscar produto no ranking
      </label>
      <MdSearch
        className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
        size={17}
      />
      <input
        id="peca-tambem-busca-produto"
        type="search"
        placeholder="Buscar produto…"
        value={buscaDraft}
        onChange={e => setBuscaDraft(e.target.value)}
        className="h-8 w-full rounded-md border border-gray-200 bg-white py-1 pl-9 pr-3 text-sm text-primary-text outline-none focus:border-primary"
      />
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-4 p-3 md:p-4">
      <div className="grid grid-cols-1 items-center gap-2 border-b-2 border-primary/70 pb-2 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={voltarParaVendas}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-3 text-sm text-primary transition-colors hover:bg-primary/5"
          >
            <MdArrowBack size={18} />
            Voltar
          </button>
          <h1 className="text-xl font-semibold text-primary">Relatório Peça Também</h1>
        </div>
        <div className="flex w-full justify-center md:w-auto">{buscaRanking}</div>
        <div className="flex justify-start md:justify-end">{periodoControls}</div>
      </div>

      {query.isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <JiffyLoading />
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          {query.error?.message || MSG_SEM_DADOS_PECA_TAMBEM}
        </div>
      ) : (
        <>
          {(resumo?.produtosVendidos ?? 0) === 0 &&
          (resumo?.pedidosComPecaTambem ?? 0) === 0 &&
          (resumo?.impressoes ?? 0) === 0 &&
          (resumo?.cliques ?? 0) === 0 &&
          (resumo?.adds ?? 0) === 0 &&
          !buscaAtiva ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center">
              <p className="text-sm font-medium text-primary-text">
                Nenhuma atividade do Peça Também neste período
              </p>
              <p className="mt-2 text-sm text-primary/70">
                Ainda não há impressões, cliques nem vendas atribuídas ao carrossel. Quando os
                clientes interagirem e comprarem sugestões, o funil e o ranking aparecem aqui.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-[2pt]">
                <section className="scrollbar-thin m-1 flex gap-2 overflow-x-auto">
                  <MetricCard
                    titulo="Produtos vendidos"
                    valor={formatarInteiroBr(resumo?.produtosVendidos ?? 0)}
                    rodape="Clique para ver participação no período"
                    icon={<MdShoppingBag size={20} />}
                    iconBgClass="bg-warning"
                    onClick={() => setIsDonutProdutosOpen(true)}
                  />
                  <MetricCard
                    titulo="Faturamento"
                    valor={formatarMoedaBrl(resumo?.faturamento ?? 0)}
                    rodape="Clique para ver participação no período"
                    icon={<MdAttachMoney size={20} />}
                    iconBgClass="bg-accent1"
                    onClick={() => setIsDonutFaturamentoOpen(true)}
                  />
                  <MetricCard
                    titulo="Pedidos"
                    valor={formatarInteiroBr(resumo?.pedidosComPecaTambem ?? 0)}
                    rodape="Pedidos com pelo menos 1 item Peça Também"
                    icon={<MdReceiptLong size={20} />}
                    iconBgClass="bg-alternate"
                  />
                </section>

                <section className="scrollbar-thin m-1 flex gap-2 overflow-x-auto">
                  <MetricCard
                    titulo="Impressões"
                    valor={formatarInteiroBr(resumo?.impressoes ?? 0)}
                    rodape="Carrossel exibido"
                    icon={<MdVisibility size={20} />}
                    iconBgClass="bg-accent3"
                  />
                  <MetricCard
                    titulo="Cliques"
                    valor={formatarInteiroBr(resumo?.cliques ?? 0)}
                    rodape={`Taxa clique: ${formatarTaxaPct(taxaClique)}`}
                    icon={<MdMouse size={20} />}
                    iconBgClass="bg-secondary"
                  />
                  <MetricCard
                    titulo="Adds no carrinho"
                    valor={formatarInteiroBr(resumo?.adds ?? 0)}
                    rodape={`Taxa add: ${formatarTaxaPct(taxaAdd)}`}
                    icon={<MdAddShoppingCart size={20} />}
                    iconBgClass="bg-accent4"
                  />
                  <MetricCard
                    titulo="Conversões"
                    valor={formatarInteiroBr(resumo?.conversoes ?? 0)}
                    rodape={`Taxa conversão: ${formatarTaxaPct(taxaConversao)}`}
                    icon={<MdShoppingBag size={20} />}
                    iconBgClass="bg-accent5"
                  />
                </section>
              </div>

              <section className="flex flex-col gap-2">
                <div className="overflow-hidden rounded-lg bg-info">
                  {ranking.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-primary/70">
                      {buscaAtiva
                        ? `Nenhum produto encontrado para “${buscaAtiva}”.`
                        : 'Nenhuma venda atribuída ao Peça Também neste período. O funil acima mostra a interação; as vendas aparecem quando um item sugerido for finalizado.'}
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 rounded-t-lg bg-custom-2 px-3 py-2 text-sm font-semibold text-primary-text">
                        <div className="min-w-0 flex-[1.2]">Produto</div>
                        <div className="w-36 text-center md:w-44">Quantidade</div>
                        <div className="w-44 text-right md:w-56">Faturamento</div>
                      </div>
                      <div className="divide-y divide-gray-100 bg-white">
                        {ranking.map(item => (
                          <div
                            key={item.produtoId}
                            className="flex items-center gap-2 px-3 py-2.5 text-sm text-primary-text hover:bg-primary/[0.03]"
                          >
                            <div className="min-w-0 flex-[1.2] truncate">{item.nomeProduto}</div>
                            <div className="w-36 text-center md:w-44">
                              {formatarInteiroBr(item.quantidade)}
                            </div>
                            <div className="w-44 text-right md:w-56">
                              {formatarMoedaBrl(item.faturamento)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      )}

      <Modal
        open={isDonutFaturamentoOpen}
        onClose={() => setIsDonutFaturamentoOpen(false)}
        aria-labelledby="modal-faturamento-peca-tambem"
      >
        <div className="absolute left-1/2 top-1/2 w-[min(100vw-2rem,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl outline-none">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2
              id="modal-faturamento-peca-tambem"
              className="text-lg font-semibold text-primary-text"
            >
              Participação no faturamento
            </h2>
            <button
              type="button"
              onClick={() => setIsDonutFaturamentoOpen(false)}
              className="rounded-full p-1 text-primary/70 transition-colors hover:bg-gray-100 hover:text-primary-text"
              aria-label="Fechar"
            >
              <MdClose size={20} />
            </button>
          </div>
          <RelatorioPecaTambemDonutFaturamento
            faturamentoPecaTambem={resumo?.faturamento ?? 0}
            faturamentoTotalPeriodo={resumo?.faturamentoTotalPeriodo ?? 0}
            embutidoNoModal
          />
        </div>
      </Modal>

      <Modal
        open={isDonutProdutosOpen}
        onClose={() => setIsDonutProdutosOpen(false)}
        aria-labelledby="modal-produtos-peca-tambem"
      >
        <div className="absolute left-1/2 top-1/2 w-[min(100vw-2rem,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl outline-none">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2
              id="modal-produtos-peca-tambem"
              className="text-lg font-semibold text-primary-text"
            >
              Participação nos produtos vendidos
            </h2>
            <button
              type="button"
              onClick={() => setIsDonutProdutosOpen(false)}
              className="rounded-full p-1 text-primary/70 transition-colors hover:bg-gray-100 hover:text-primary-text"
              aria-label="Fechar"
            >
              <MdClose size={20} />
            </button>
          </div>
          <RelatorioPecaTambemDonutProdutos
            produtosPecaTambem={resumo?.produtosVendidos ?? 0}
            produtosTotalPeriodo={resumo?.produtosVendidosTotalPeriodo ?? 0}
            embutidoNoModal
          />
        </div>
      </Modal>

      <JiffySidePanelModal
        open={isDatasModalOpen}
        onClose={() => setIsDatasModalOpen(false)}
        title="Escolha o período"
        fullScreenOnMobile
        panelClassName="!bg-[#f9fafb] w-[45vw] min-w-[260px] max-w-[min(100vw-1rem,95vw)] sm:min-w-[280px]"
        scrollableBody={false}
        footerSlot={
          <button
            type="button"
            disabled={!rascunhoIntervaloRange?.from || !rascunhoIntervaloRange?.to}
            onClick={handleAplicarIntervaloDatas}
            className="rounded-b-l-lg flex h-full w-full items-center justify-center bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar
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
    </div>
  )
}

export type { PeriodoPecaTambemLabel }

'use client'

import * as React from 'react'
import type { ComponentProps } from 'react'
import { startOfDay, startOfMonth } from 'date-fns'
import { Clock } from 'lucide-react'
import { DateLib, DayButton, type DateLibOptions, type DateRange } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'

import { cn } from '@/src/shared/utils/cn'
import { colors } from '@/src/shared/theme/colors'

import { Calendar } from '@/src/presentation/components/ui/calendar'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'
import {
  combinarIntervaloCalendarParaDatas,
  formatarDataHoraIntervaloCurta,
} from '@/src/shared/utils/intervaloCalendarioComHoras'

/**
 * O Intl/pt-BR devolve o nome do mês em minúsculas; CSS `capitalize` nem sempre altera o texto gerado.
 * Usamos o mesmo `formatMonthYear` do DayPicker e só elevamos a primeira letra.
 */
function formatCaptionMesInicialMaiuscula(month: Date, options?: DateLibOptions, dateLib?: DateLib): string {
  const lib = dateLib ?? new DateLib(options)
  const s = lib.formatMonthYear(month)
  if (!s) return s
  return s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1)
}

/**
 * Faturamento exibido na célula do calendário (valor alinhado ao banco em pt-BR).
 * - Até 9.999: inteiro formatado (ex.: $ 153, $ 1.234, $ 9.456).
 * - 10.000 … 999.999: compacto em milhares (ex.: $ 10k+, $ 100k+).
 * - 1.000.000 ou mais: milhões com sufixo kk (ex.: $ 1kk+, $ 2kk+).
 */
export function formatarFaturamentoValorCelulaCalendario(valor: number): string {
  const n = Math.trunc(Number(valor))
  if (!Number.isFinite(n)) return '$ —'
  if (n < 0) {
    return `$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)}`
  }
  if (n <= 9_999) {
    return `$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)}`
  }
  if (n < 1_000_000) {
    return `$ ${Math.floor(n / 1000)}k+`
  }
  return `$ ${Math.floor(n / 1_000_000)}kk+`
}

type DayButtonProps = ComponentProps<typeof DayButton>

type FaturamentoDayButtonProps = DayButtonProps & {
  resolverValor: (isoDate: string, foraDoMes: boolean) => number | null
  /** Células maiores no painel lateral (modal) — proporcional ao --rdp-day_* ampliado. */
  celulasAmpliadas?: boolean
}

/**
 * Botão do dia com número + linha de faturamento.
 */
function FaturamentoDayButton({
  day,
  modifiers,
  className,
  children,
  resolverValor,
  celulasAmpliadas = false,
  ...rest
}: FaturamentoDayButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const foraDoMes = Boolean(modifiers.outside)
  const valor = resolverValor(day.isoDate, foraDoMes)

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex flex-col items-center justify-center leading-none',
        celulasAmpliadas ? 'min-h-0 gap-0.5' : 'min-h-[2.75rem] gap-0.5',
        className
      )}
      {...rest}
    >
      <span className={cn('font-semibold', celulasAmpliadas ? 'text-xs' : 'text-sm')}>{children}</span>
      {valor != null && (
        <span
          className={cn(
            'truncate font-medium tabular-nums opacity-85',
            celulasAmpliadas ? 'max-w-[3rem] text-[0.625rem]' : 'max-w-[3.75rem] text-[0.625rem]'
          )}
          style={{ color: 'inherit' }}
        >
          {formatarFaturamentoValorCelulaCalendario(valor)}
        </span>
      )}
    </button>
  )
}

export type FaturamentoRangeCalendarProps = {
  className?: string
  /** Intervalo inicial (estado interno se `range` não for controlado). */
  defaultRange?: DateRange
  /** Controle opcional do intervalo. */
  range?: DateRange | undefined
  onRangeChange?: (range: DateRange | undefined) => void
  /** Horários HH:mm (visual; integração com filtro em etapa futura). */
  defaultHoraInicio?: string
  defaultHoraFim?: string
  horaInicio?: string
  horaFim?: string
  onHorariosChange?: (horaInicio: string, horaFim: string) => void
  /** Mapa ISO yyyy-MM-dd → faturamento (vendas finalizadas). Ausente enquanto carrega. */
  faturamentoPorDia?: Record<string, number>
  /** Enquanto true, não exibe o valor na célula (evita número errado durante o fetch). */
  faturamentoCarregando?: boolean
  /** Mês do primeiro painel (esquerda), controlado pelo pai para alinhar fetch aos dois meses visíveis. */
  month?: Date
  onMonthChange?: (month: Date) => void
  /**
   * Quando true, remove o cartão roxo externo (uso dentro de modal já roxo).
   */
  embutidoNoModal?: boolean
  /**
   * Com `embutidoNoModal`: modal com fundo claro (#f9fafb) — ajusta bordas, texto e grid do DayPicker.
   */
  embutidoFundoClaro?: boolean
}

/**
 * Calendário de intervalo (dois meses), valor por célula e rodapé com hora início/fim.
 */
export function FaturamentoRangeCalendar({
  className,
  defaultRange,
  range: rangeControlled,
  onRangeChange,
  defaultHoraInicio = '10:30',
  defaultHoraFim = '12:30',
  horaInicio: horaInicioControlled,
  horaFim: horaFimControlled,
  onHorariosChange,
  faturamentoPorDia,
  faturamentoCarregando = false,
  month: monthControlled,
  onMonthChange,
  embutidoNoModal = false,
  embutidoFundoClaro = false,
}: FaturamentoRangeCalendarProps) {
  const fundoModalClaro = embutidoNoModal && embutidoFundoClaro
  const [rangeUncontrolled, setRangeUncontrolled] = React.useState<DateRange | undefined>(() => {
    if (defaultRange !== undefined) return defaultRange
    const hoje = startOfDay(new Date())
    return { from: hoje, to: hoje }
  })
  const isRangeControlled = rangeControlled !== undefined
  const range = isRangeControlled ? rangeControlled : rangeUncontrolled

  const setRange = React.useCallback(
    (next: DateRange | undefined) => {
      if (!isRangeControlled) setRangeUncontrolled(next)
      onRangeChange?.(next)
    },
    [isRangeControlled, onRangeChange]
  )

  const [horaInicioUncontrolled, setHoraInicioUncontrolled] = React.useState(defaultHoraInicio)
  const [horaFimUncontrolled, setHoraFimUncontrolled] = React.useState(defaultHoraFim)
  const horaInicio = horaInicioControlled ?? horaInicioUncontrolled
  const horaFim = horaFimControlled ?? horaFimUncontrolled

  /** Mesmo texto do item “Por datas” no select do dashboard (prévia antes de aplicar). */
  const textoPeriodoSelecionado = React.useMemo(() => {
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(range, horaInicio, horaFim)
    if (!dataInicial || !dataFinal) return null
    return `Por datas: ${formatarDataHoraIntervaloCurta(dataInicial)} — ${formatarDataHoraIntervaloCurta(dataFinal)}`
  }, [range, horaInicio, horaFim])

  const resolverValor = React.useCallback(
    (isoDate: string, foraDoMes: boolean): number | null => {
      if (foraDoMes) return null
      if (faturamentoCarregando) return null
      if (faturamentoPorDia === undefined) return null
      return faturamentoPorDia[isoDate] ?? 0
    },
    [faturamentoCarregando, faturamentoPorDia]
  )

  const dayButtonRenderer = React.useCallback(
    (props: DayButtonProps) => (
      <FaturamentoDayButton {...props} resolverValor={resolverValor} celulasAmpliadas={fundoModalClaro} />
    ),
    [resolverValor, fundoModalClaro]
  )

  const formattersRdp = React.useMemo(
    () => ({
      formatCaption: formatCaptionMesInicialMaiuscula,
    }),
    []
  )

  /** Referência para qual mês fica à direita: fim do intervalo ou início (período só retroativo). */
  const dataRefQuadro = range?.to ?? range?.from ?? new Date()
  const defaultMonthDuplo = primeiroMesQuadroDuploCalendario(dataRefQuadro)

  const isMonthControlled = monthControlled !== undefined
  const [monthLocal, setMonthLocal] = React.useState(defaultMonthDuplo)
  React.useEffect(() => {
    if (!isMonthControlled) setMonthLocal(defaultMonthDuplo)
  }, [defaultMonthDuplo, isMonthControlled])

  const monthPicker = isMonthControlled ? monthControlled : monthLocal
  const handleMonthChange = React.useCallback(
    (next: Date) => {
      if (!isMonthControlled) setMonthLocal(next)
      onMonthChange?.(next)
    },
    [isMonthControlled, onMonthChange]
  )

  /** Só permite escolher até o dia de hoje (nada no futuro). */
  const desabilitarDiasFuturos = React.useCallback((date: Date) => {
    return startOfDay(date).getTime() > startOfDay(new Date()).getTime()
  }, [])

  /** Não navegar para além do mês corrente (só passado e mês atual). */
  const limiteMesNavegacao = startOfMonth(new Date())

  const raioCelula = '6px'

  /** Tema: roxo (padrão) ou grid claro quando embutido em modal #f9fafb. */
  const temaRdp = {
    '--rdp-accent-color': colors.accent1,
    '--rdp-accent-background-color': fundoModalClaro ? 'rgba(83, 12, 163, 0.08)' : 'rgba(237, 233, 254, 0.22)',
    '--rdp-day_button-border': fundoModalClaro
      ? '1px solid rgba(15, 23, 42, 0.12)'
      : '1px solid rgba(255, 255, 255, 0.35)',
    '--rdp-range_middle-background-color': colors.accent1,
    '--rdp-range_middle-color': colors.primary,
    '--rdp-range_start-date-background-color': colors.accent1,
    '--rdp-range_end-date-background-color': colors.accent1,
    '--rdp-range_start-color': colors.primary,
    '--rdp-range_end-color': colors.primary,
    '--rdp-selected-border': fundoModalClaro
      ? '2px solid rgba(83, 12, 163, 0.35)'
      : '2px solid rgba(255, 255, 255, 0.35)',
    /* Dimensões do grid ficam no <style> em .rdp-root — o RDP fixa 44px em .rdp-root e ignora variáveis só no wrapper. */
    '--rdp-outside-opacity': '0.45',
    '--rdp-today-color': fundoModalClaro ? colors.primary : '#ffffff',
  } as unknown as React.CSSProperties

  const estiloEscopoClaro = fundoModalClaro
    ? `
        .faturamento-rdp-scope .rdp-root {
          --rdp-accent-color: ${colors.accent1};
          --rdp-today-color: ${colors.primary};
          --rdp-range_start-date-background-color: ${colors.primary};
          --rdp-range_end-date-background-color: ${colors.primary};
          --rdp-range_start-color: ${colors.info};
          --rdp-range_end-color: ${colors.info};
          --rdp-outside-opacity: 0.45;
          /* Painel ~30vw: grid compacto; overflow-x no .rdp-months se ainda faltar largura */
          --rdp-day-height: 2.7rem;
          --rdp-day-width: 2.45rem;
          --rdp-day_button-height: 2.55rem;
          --rdp-day_button-width: 2.35rem;
          --rdp-day_button-border-radius: ${raioCelula};
          --rdp-nav-height: 2.5rem;
          --rdp-months-gap: 0.625rem;
          --rdp-nav_button-width: 2rem;
          --rdp-nav_button-height: 2rem;
        }
        .faturamento-rdp-scope.faturamento-rdp-modal .rdp-months {
          width: 100%;
          max-width: none;
          flex-wrap: nowrap;
          justify-content: center;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }
        .faturamento-rdp-scope .rdp-month_caption,
        .faturamento-rdp-scope .rdp-caption_label {
          font-weight: 500;
        }
        .faturamento-rdp-scope .rdp-chevron {
          fill: ${colors.primaryText} !important;
        }
        .faturamento-rdp-scope .rdp-day_button {
          border: 1px solid rgba(15, 23, 42, 0.12) !important;
          border-radius: ${raioCelula} !important;
          box-sizing: border-box;
        }
        .faturamento-rdp-scope td.rdp-outside .rdp-day_button {
          border-color: rgba(15, 23, 42, 0.08) !important;
        }
        .faturamento-rdp-scope td.rdp-range_middle .rdp-day_button {
          border: 1px solid rgba(0, 51, 102, 0.45) !important;
          border-radius: ${raioCelula} !important;
        }
        .faturamento-rdp-scope td.rdp-range_start .rdp-day_button,
        .faturamento-rdp-scope td.rdp-range_end .rdp-day_button {
          border: 1px solid rgba(51, 4, 104, 0.4) !important;
          border-radius: ${raioCelula} !important;
        }
      `
    : `
        .faturamento-rdp-scope .rdp-root {
          --rdp-accent-color: ${colors.accent1};
          --rdp-today-color: #ffffff;
          --rdp-range_start-date-background-color: ${colors.accent1};
          --rdp-range_end-date-background-color: ${colors.accent1};
          --rdp-range_start-color: ${colors.primary};
          --rdp-range_end-color: ${colors.primary};
          --rdp-outside-opacity: 0.45;
          --rdp-day-height: 4rem;
          --rdp-day-width: 3.5rem;
          --rdp-day_button-height: 3.75rem;
          --rdp-day_button-width: 3.35rem;
          --rdp-day_button-border-radius: 6px;
          --rdp-nav-height: 2.75rem;
          --rdp-months-gap: 2rem;
          --rdp-nav_button-width: 2.25rem;
          --rdp-nav_button-height: 2.25rem;
        }
        .faturamento-rdp-scope .rdp-month_caption,
        .faturamento-rdp-scope .rdp-caption_label {
          font-weight: 500;
        }
        .faturamento-rdp-scope .rdp-chevron {
          fill: ${colors.accent1} !important;
        }
        .faturamento-rdp-scope .rdp-day_button {
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          border-radius: 6px !important;
          box-sizing: border-box;
        }
        .faturamento-rdp-scope td.rdp-outside .rdp-day_button {
          border-color: rgba(255, 255, 255, 0.22) !important;
        }
        .faturamento-rdp-scope td.rdp-range_middle .rdp-day_button {
          border: 1px solid rgba(0, 51, 102, 0.5) !important;
          border-radius: 6px !important;
        }
        .faturamento-rdp-scope td.rdp-range_start .rdp-day_button,
        .faturamento-rdp-scope td.rdp-range_end .rdp-day_button {
          border: 1px solid rgba(51, 4, 104, 0.45) !important;
          border-radius: 6px !important;
        }
      `

  return (
    <div
      className={cn(
        'faturamento-rdp-scope max-w-full overflow-x-auto',
        fundoModalClaro ? 'faturamento-rdp-modal w-full text-gray-900' : 'w-fit text-white',
        embutidoNoModal ? 'p-0' : 'rounded-xl border border-white/20 bg-secondary bg-gradient-to-br from-secondary to-[#451090] p-4 shadow-lg',
        className
      )}
      style={temaRdp}
    >
      {/* Borda em todos os dias; o CSS do RDP remove borda no meio do intervalo e em .rdp-selected */}
      <style>{`
        /*
         * O style.css do RDP define em .rdp-root --rdp-range_* e --rdp-day-width/height (44px).
         * Variáveis só no wrapper não valem: redeclarar grid e cores em .faturamento-rdp-scope .rdp-root.
         */
        ${estiloEscopoClaro}
      `}</style>
      {/* showOutsideDays=false: não mostra células do mês anterior/seguinte (evita duplicar datas e confundir com o intervalo). */}
      {/* navLayout=around: seta « no 1º mês (esq.) e seta » no último mês (dir.). */}
      <Calendar
        mode="range"
        locale={ptBR}
        numberOfMonths={2}
        month={monthPicker}
        onMonthChange={handleMonthChange}
        endMonth={limiteMesNavegacao}
        disabled={desabilitarDiasFuturos}
        selected={range}
        onSelect={setRange}
        showOutsideDays={false}
        navLayout="around"
        formatters={formattersRdp}
        className={cn(
          'rounded-lg [&_.rdp-caption_label]:font-medium',
          fundoModalClaro
            ? 'w-full max-w-none border border-gray-200 bg-white p-2 text-primary-text [&_.rdp-caption_label]:text-sm [&_.rdp-selected]:!text-xs [&_.rdp-weekday]:py-1 [&_.rdp-weekday]:text-[10px] [&_.rdp-caption_label]:text-secondary [&_.rdp-dropdown]:text-[#330468] [&_.rdp-nav_button]:text-secondary [&_.rdp-weekday]:text-gray-500'
            : 'w-fit p-2 [--rdp-nav-height:2.75rem] [&_.rdp-selected]:!text-sm border border-white/15 bg-white/5 text-accent1 [&_.rdp-caption_label]:text-accent1 [&_.rdp-dropdown]:text-[#330468] [&_.rdp-nav_button]:text-white [&_.rdp-weekday]:text-white/80'
        )}
        components={{
          DayButton: dayButtonRenderer,
        }}
      />

      <div className={cn('mt-4 border-t pt-4', fundoModalClaro ? 'border-gray-200' : 'border-white/20')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="faturamento-range-hora-inicio" className="text-sm font-medium text-primary-text">
              Hora de início
            </label>
            <div className="relative flex items-center">
              <input
                id="faturamento-range-hora-inicio"
                type="time"
                step={60}
                value={horaInicio}
                onChange={e => {
                  const v = e.target.value
                  if (horaInicioControlled === undefined) setHoraInicioUncontrolled(v)
                  onHorariosChange?.(v, horaFim)
                }}
                className={cn(
                  'w-full rounded-lg border py-2 pl-3 pr-10 text-sm',
                  fundoModalClaro
                    ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                    : 'border-[#530CA3]/40 bg-[#F5F3FF] text-[#330468] placeholder:text-[#530CA3]/60',
                  'appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                )}
              />
              <Clock
                className={cn(
                  'pointer-events-none absolute right-3 size-4',
                  fundoModalClaro ? 'text-gray-500' : 'text-[#530CA3]/70'
                )}
                aria-hidden
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="faturamento-range-hora-fim" className="text-sm font-medium text-primary-text">
              Hora de término
            </label>
            <div className="relative flex items-center">
              <input
                id="faturamento-range-hora-fim"
                type="time"
                step={60}
                value={horaFim}
                onChange={e => {
                  const v = e.target.value
                  if (horaFimControlled === undefined) setHoraFimUncontrolled(v)
                  onHorariosChange?.(horaInicio, v)
                }}
                className={cn(
                  'w-full rounded-lg border py-2 pl-3 pr-10 text-sm',
                  fundoModalClaro
                    ? 'border-gray-300 bg-white text-primary-text'
                    : 'border-[#530CA3]/40 bg-[#F5F3FF] text-[#330468]',
                  'appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                )}
              />
              <Clock
                className={cn(
                  'pointer-events-none absolute right-3 size-4',
                  fundoModalClaro ? 'text-gray-500' : 'text-[#530CA3]/70'
                )}
                aria-hidden
              />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'mt-6 border-t pt-2',
            fundoModalClaro ? 'border-gray-200 bg-primary/10 rounded-lg p-2' : 'border-white/20'
          )}
        >
          <p
            className={cn(
              'text-sm font-medium py-2',
              fundoModalClaro ? 'text-primary-text' : 'text-white/80'
            )}
          >
            Período selecionado
          </p>
          <p
            className={cn(
              'mt-1 break-words text-sm leading-snug py-2',
              fundoModalClaro ? 'text-primary' : 'text-white',
              !textoPeriodoSelecionado && 'italic opacity-80'
            )}
          >
            {textoPeriodoSelecionado ??
              'Selecione o intervalo no calendário e as horas de início e término.'}
          </p>
        </div>
      </div>
    </div>
  )
}

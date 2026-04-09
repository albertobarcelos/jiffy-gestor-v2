'use client'

import * as React from 'react'
import type { ComponentProps } from 'react'
import { startOfDay, startOfMonth } from 'date-fns'
import { Clock } from 'lucide-react'
import { DayButton, type DateRange } from 'react-day-picker'
import { ptBR } from 'react-day-picker/locale'

import { cn } from '@/src/shared/utils/cn'
import { colors } from '@/src/shared/theme/colors'

import { Calendar } from '@/src/presentation/components/ui/calendar'
import { primeiroMesQuadroDuploCalendario } from '@/src/shared/utils/calendarioIntervaloFaturamento'

/** Valor na célula sem símbolo R$ (só número formatado pt-BR). */
const formatarNumeroValorCelula = (valor: number) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(valor)

type DayButtonProps = ComponentProps<typeof DayButton>

type FaturamentoDayButtonProps = DayButtonProps & {
  resolverValor: (isoDate: string, foraDoMes: boolean) => number | null
}

/**
 * Botão do dia com número + linha de faturamento.
 */
function FaturamentoDayButton({ day, modifiers, className, children, resolverValor, ...rest }: FaturamentoDayButtonProps) {
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
        'flex min-h-[2.75rem] flex-col items-center justify-center gap-0.5 leading-none',
        className
      )}
      {...rest}
    >
      <span className="text-sm font-semibold">{children}</span>
      {valor != null && (
        <span
          className="max-w-[3.75rem] truncate text-[0.625rem] font-medium tabular-nums opacity-85"
          style={{ color: 'inherit' }}
        >
          {formatarNumeroValorCelula(valor)}
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
}: FaturamentoRangeCalendarProps) {
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
    (props: DayButtonProps) => <FaturamentoDayButton {...props} resolverValor={resolverValor} />,
    [resolverValor]
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

  /** Tema: faixa roxa (secondary); meio do intervalo = accent1 (verde) com texto primary para leitura. */
  const temaRdp = {
    '--rdp-accent-color': colors.accent1,
    '--rdp-accent-background-color': 'rgba(237, 233, 254, 0.22)',
    '--rdp-day_button-border-radius': '6px',
    '--rdp-day_button-border': '1px solid rgba(255, 255, 255, 0.35)',
    '--rdp-range_middle-background-color': colors.accent1,
    '--rdp-range_middle-color': colors.primary,
    '--rdp-range_start-date-background-color': colors.accent1,
    '--rdp-range_end-date-background-color': colors.accent1,
    '--rdp-range_start-color': colors.primary,
    '--rdp-range_end-color': colors.primary,
    '--rdp-selected-border': '2px solid rgba(255, 255, 255, 0.35)',
    '--rdp-day-height': '4rem',
    '--rdp-day-width': '3.5rem',
    '--rdp-day_button-height': '3.75rem',
    '--rdp-day_button-width': '3.35rem',
    '--rdp-outside-opacity': '0.45',
    /** Sobrescrito também em .rdp-root no <style> (lá o padrão amarra hoje ao accent azul). */
    '--rdp-today-color': '#ffffff',
  } as React.CSSProperties

  return (
    <div
      className={cn(
        'faturamento-rdp-scope w-fit max-w-full overflow-x-auto text-white',
        embutidoNoModal ? 'p-0' : 'rounded-xl border border-white/20 bg-secondary bg-gradient-to-br from-secondary to-[#451090] p-4 shadow-lg',
        className
      )}
      style={temaRdp}
    >
      {/* Borda em todos os dias; o CSS do RDP remove borda no meio do intervalo e em .rdp-selected */}
      <style>{`
        /*
         * O style.css do RDP define em .rdp-root --rdp-range_*-date-background-color como var(--rdp-accent-color) (azul).
         * Precisamos repetir aqui (especificidade .faturamento-rdp-scope .rdp-root) para o fundo dos extremos do intervalo ser accent1.
         */
        .faturamento-rdp-scope .rdp-root {
          --rdp-accent-color: ${colors.accent1};
          --rdp-today-color: #ffffff;
          --rdp-range_start-date-background-color: ${colors.accent1};
          --rdp-range_end-date-background-color: ${colors.accent1};
          --rdp-range_start-color: ${colors.primary};
          --rdp-range_end-color: ${colors.primary};
        }
        /* O style.css do RDP define .rdp-month_caption como font-weight: bold; pedido: títulos “março 2026” em medium (500). */
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
      `}</style>
      {/* showOutsideDays=false: não mostra células do mês anterior/seguinte (evita duplicar datas e confundir com o intervalo). */}
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
        className="rounded-lg border border-white/15 bg-white/5 p-2 text-accent1 [--rdp-nav-height:2.75rem] [&_.rdp-caption_label]:font-medium [&_.rdp-caption_label]:text-accent1 [&_.rdp-dropdown]:text-[#330468] [&_.rdp-nav_button]:text-white [&_.rdp-selected]:!text-sm [&_.rdp-weekday]:text-white/80"
        components={{
          DayButton: dayButtonRenderer,
        }}
      />

      <div className="mt-4 border-t border-white/20 pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="faturamento-range-hora-inicio" className="text-sm font-medium text-accent1">
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
                  'w-full rounded-lg border border-[#530CA3]/40 bg-[#F5F3FF] py-2 pl-3 pr-10 text-sm text-[#330468]',
                  'placeholder:text-[#530CA3]/60',
                  'appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                )}
              />
              <Clock className="pointer-events-none absolute right-3 size-4 text-[#530CA3]/70" aria-hidden />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="faturamento-range-hora-fim" className="text-sm font-medium text-accent1">
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
                  'w-full rounded-lg border border-[#530CA3]/40 bg-[#F5F3FF] py-2 pl-3 pr-10 text-sm text-[#330468]',
                  'appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                )}
              />
              <Clock className="pointer-events-none absolute right-3 size-4 text-[#530CA3]/70" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

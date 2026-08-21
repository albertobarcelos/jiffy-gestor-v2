import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { CalendarDays, FilterX, RefreshCw } from 'lucide-react'
import { Tooltip as MuiTooltip } from '@mui/material'
import { labelFaixaDatasPeriodoPreset } from './dashboardTextHelpers'
import { formatarDataHoraIntervaloCurta } from '@/src/shared/utils/intervaloCalendarioComHoras'

interface DashboardFiltrosProps {
  subtituloAtualizacao: string
  handleAtualizarDashboard: () => void
  atualizando?: boolean
  periodoData: string
  handlePeriodoDataChange: (val: string) => void
  /** Reabre o modal quando “Por datas” já está ativo (Select não dispara onValueChange). */
  onAbrirPeriodoPersonalizado: () => void
  periodoPersonalizadoInicio: Date | null
  periodoPersonalizadoFim: Date | null
  handleLimparFiltroPeriodo: () => void
  /** Fuso da empresa para exibir a faixa de datas dos presets. */
  timeZoneEmpresa?: string
}

function RotuloPeriodoComDatas({
  titulo,
  faixa,
}: {
  titulo: string
  faixa: string | null
}) {
  return (
    <span className="inline-flex max-w-full items-baseline gap-x-1">
      <span className="text-sm font-semibold">{titulo}</span>
      {faixa ? (
        <span className="truncate text-[10px] font-normal opacity-90 sm:text-xs">· {faixa}</span>
      ) : null}
    </span>
  )
}

export function DashboardFiltros({
  subtituloAtualizacao,
  handleAtualizarDashboard,
  atualizando = false,
  periodoData,
  handlePeriodoDataChange,
  onAbrirPeriodoPersonalizado,
  periodoPersonalizadoInicio,
  periodoPersonalizadoFim,
  handleLimparFiltroPeriodo,
  timeZoneEmpresa = 'America/Sao_Paulo',
}: DashboardFiltrosProps) {
  const mostrarLimparFiltro = periodoData !== 'hoje'
  const faixaHoje = labelFaixaDatasPeriodoPreset('hoje', timeZoneEmpresa)
  const faixaOntem = labelFaixaDatasPeriodoPreset('ontem', timeZoneEmpresa)
  const faixaSemana = labelFaixaDatasPeriodoPreset('semana', timeZoneEmpresa)
  const faixaMes = labelFaixaDatasPeriodoPreset('mes', timeZoneEmpresa)

  return (
    <div className="relative z-30 mb-2 flex flex-col gap-2 px-2 pt-2 md:flex-row md:items-center md:gap-x-3 md:px-4">
      <div className="flex items-center justify-between gap-2 md:contents">
        <h1 className="shrink-0 text-xl font-semibold text-primary-text">Visão Geral</h1>
        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <p className="whitespace-nowrap text-xs text-primary-text/60">
            {atualizando ? 'Atualizando…' : subtituloAtualizacao}
          </p>
          <MuiTooltip
            title="Atualizar dados"
            placement="bottom"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: '#ffffff',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  boxShadow: 2,
                  fontSize: '0.75rem',
                },
              },
            }}
          >
            <span>
              <button
                type="button"
                onClick={handleAtualizarDashboard}
                disabled={atualizando}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Atualizar dados do dashboard"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${atualizando ? 'animate-spin' : ''}`}
                  aria-hidden
                />
              </button>
            </span>
          </MuiTooltip>
        </div>
      </div>

      <div className="flex min-w-0 w-full items-center gap-1.5 md:w-auto md:shrink-0">
        <div className="relative min-w-0 w-full md:w-fit md:max-w-[min(100%,28rem)]">
          <label htmlFor="dashboard-periodo-data" className="sr-only">
            Período
          </label>
          <CalendarDays
            className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary"
            aria-hidden
          />
          <Select value={periodoData} onValueChange={handlePeriodoDataChange}>
            <SelectTrigger
              id="dashboard-periodo-data"
              className="!h-9 !w-full max-w-full gap-2 rounded-lg bg-primary/5 py-0 pl-9 pr-2 text-left text-sm font-medium text-primary shadow-none ring-offset-0 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 data-[state=open]:border-primary md:!w-fit [&>span]:min-w-0 [&>span]:truncate [&>svg]:shrink-0 [&>svg]:text-primary"
            >
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="w-auto max-w-[calc(100vw-2rem)] rounded-lg border-gray-200 bg-white">
              <SelectItem
                value="hoje"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                <RotuloPeriodoComDatas titulo="Hoje" faixa={faixaHoje} />
              </SelectItem>
              <SelectItem
                value="ontem"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                <RotuloPeriodoComDatas titulo="Ontem" faixa={faixaOntem} />
              </SelectItem>
              <SelectItem
                value="semana"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                <RotuloPeriodoComDatas titulo="Últimos 7 dias" faixa={faixaSemana} />
              </SelectItem>
              <SelectItem
                value="mes"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                <RotuloPeriodoComDatas titulo="Mês atual" faixa={faixaMes} />
              </SelectItem>
              <SelectItem
                value="personalizado"
                onPointerDown={() => {
                  if (periodoData === 'personalizado') {
                    onAbrirPeriodoPersonalizado()
                  }
                }}
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                {periodoPersonalizadoInicio && periodoPersonalizadoFim ? (
                  <RotuloPeriodoComDatas
                    titulo="Por datas"
                    faixa={`${formatarDataHoraIntervaloCurta(periodoPersonalizadoInicio)} — ${formatarDataHoraIntervaloCurta(periodoPersonalizadoFim)}`}
                  />
                ) : (
                  <RotuloPeriodoComDatas titulo="Por datas" faixa="…" />
                )}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mostrarLimparFiltro ? (
          <MuiTooltip
            title="Limpar filtro e voltar para Hoje"
            placement="bottom"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: '#ffffff',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  boxShadow: 2,
                  fontSize: '0.8125rem',
                },
              },
            }}
          >
            <span>
              <button
                type="button"
                onClick={handleLimparFiltroPeriodo}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary transition hover:bg-primary/5"
                aria-label="Limpar filtro de período e usar Hoje"
              >
                <FilterX className="h-4 w-4" aria-hidden />
              </button>
            </span>
          </MuiTooltip>
        ) : null}

        <div className="hidden shrink-0 items-center gap-1 md:flex">
          <p className="whitespace-nowrap text-sm text-primary-text/60">
            {atualizando ? 'Atualizando…' : subtituloAtualizacao}
          </p>
          <MuiTooltip
            title="Atualizar dados"
            placement="bottom"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: '#ffffff',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  boxShadow: 2,
                  fontSize: '0.75rem',
                },
              },
            }}
          >
            <span>
              <button
                type="button"
                onClick={handleAtualizarDashboard}
                disabled={atualizando}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Atualizar dados do dashboard"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${atualizando ? 'animate-spin' : ''}`}
                  aria-hidden
                />
              </button>
            </span>
          </MuiTooltip>
        </div>
      </div>
    </div>
  )
}

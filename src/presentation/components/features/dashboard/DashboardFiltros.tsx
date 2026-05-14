import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { CalendarDays, FilterX, RefreshCw } from 'lucide-react'
import { Tooltip as MuiTooltip } from '@mui/material'
import { labelDataHoje } from './dashboardTextHelpers'
import { formatarDataHoraIntervaloCurta } from '@/src/shared/utils/intervaloCalendarioComHoras'

const CLASSES_SELECT_EMPRESA =
  'h-auto min-h-[42px] w-full rounded-lg bg-primary/5 py-2 pl-4 pr-3 text-sm font-medium text-primary shadow-none ring-offset-0 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 data-[state=open]:border-primary [&>svg]:text-primary'

interface DashboardFiltrosProps {
  subtituloAtualizacao: string
  handleAtualizarDashboard: () => void
  carregandoEmpresa: boolean
  erroEmpresa: string | null
  empresaLogada: { id: string; nomeExibicao: string } | null
  refetchEmpresa: () => void
  valorEmpresaSelect: string
  setLojaId: (val: string) => void
  periodoData: string
  handlePeriodoDataChange: (val: string) => void
  periodoPersonalizadoInicio: Date | null
  periodoPersonalizadoFim: Date | null
  handleLimparFiltroPeriodo: () => void
}

export function DashboardFiltros({
  subtituloAtualizacao,
  handleAtualizarDashboard,
  carregandoEmpresa,
  erroEmpresa,
  empresaLogada,
  refetchEmpresa,
  valorEmpresaSelect,
  setLojaId,
  periodoData,
  handlePeriodoDataChange,
  periodoPersonalizadoInicio,
  periodoPersonalizadoFim,
  handleLimparFiltroPeriodo,
}: DashboardFiltrosProps) {
  return (
    <div className="mb-2 flex flex-col justify-start px-2 md:flex-row md:items-end md:px-4">
      <div>
        <h1 className="font-exo text-xl font-semibold text-primary-text md:text-xl">
          Visão Geral
        </h1>
        <p className="font-regular mt-1 flex flex-wrap items-center gap-2 text-sm text-primary-text">
          {subtituloAtualizacao}
        </p>
      </div>
      <span className="ml-2 mr-8 inline-flex shrink-0 items-center gap-1">
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
                fontSize: '0.5625rem',
              },
            },
          }}
        >
          <span>
            <button
              type="button"
              onClick={handleAtualizarDashboard}
              disabled={carregandoEmpresa}
              className="inline-flex h-[22px] w-[22px] items-center justify-center text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Atualizar dados do dashboard"
            >
              <RefreshCw
                className={`h-3 w-3 ${carregandoEmpresa ? 'animate-spin' : ''}`}
                aria-hidden
              />
            </button>
          </span>
        </MuiTooltip>
      </span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-secondary" aria-hidden />
          <div className="relative min-w-[200px] flex-1">
            <label htmlFor="dashboard-empresa" className="sr-only">
              Empresa
            </label>
            {carregandoEmpresa ? (
              <div
                className={`${CLASSES_SELECT_EMPRESA} flex cursor-wait items-center text-primary/70`}
                aria-busy="true"
              >
                Carregando empresa…
              </div>
            ) : erroEmpresa || !empresaLogada ? (
              <div
                className={`${CLASSES_SELECT_EMPRESA} flex flex-col gap-1 border border-red-200 bg-red-50/80 py-2 text-xs text-red-800`}
                role="alert"
              >
                <span>{erroEmpresa ?? 'Empresa não disponível'}</span>
                <button
                  type="button"
                  onClick={() => void refetchEmpresa()}
                  className="self-start text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <Select value={valorEmpresaSelect} onValueChange={setLojaId}>
                <SelectTrigger id="dashboard-empresa" className={CLASSES_SELECT_EMPRESA}>
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-gray-200 bg-white">
                  <SelectItem
                    value={empresaLogada.id}
                    className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
                  >
                    {empresaLogada.nomeExibicao}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <span className="inline-flex h-2 w-2 rounded-full bg-secondary" aria-hidden />
        <div className="relative min-w-[200px]">
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
              className="h-auto min-h-[42px] w-full items-start rounded-lg bg-primary/5 py-2 pl-10 pr-3 text-left text-sm font-medium text-primary shadow-none ring-offset-0 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 data-[state=open]:border-primary [&>span]:line-clamp-none [&>span]:min-w-0 [&>span]:whitespace-normal [&>svg]:text-primary"
            >
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-gray-200 bg-white">
              <SelectItem
                value="hoje"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                <span className="inline-flex flex-wrap items-baseline gap-x-1">
                  <span className="text-sm font-semibold">Hoje</span>
                  <span className="text-[10px] font-normal opacity-90">· {labelDataHoje()}</span>
                </span>
              </SelectItem>
              <SelectItem
                value="ontem"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                Ontem
              </SelectItem>
              <SelectItem
                value="semana"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                Últimos 7 dias
              </SelectItem>
              <SelectItem
                value="30dias"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                Últimos 30 dias
              </SelectItem>
              <SelectItem
                value="personalizado"
                className="cursor-pointer focus:!bg-primary focus:!text-white data-[highlighted]:rounded-lg data-[state=checked]:rounded-lg data-[highlighted]:!bg-primary data-[state=checked]:bg-primary/10 data-[highlighted]:!text-white data-[state=checked]:text-primary"
              >
                {periodoPersonalizadoInicio && periodoPersonalizadoFim ? (
                  <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1">
                    <span className="text-sm font-semibold">Por datas</span>
                    <span className="break-words text-[10px] font-normal opacity-90">
                      · {formatarDataHoraIntervaloCurta(periodoPersonalizadoInicio)} —{' '}
                      {formatarDataHoraIntervaloCurta(periodoPersonalizadoFim)}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-baseline gap-x-1">
                    <span className="text-sm font-semibold">Por datas</span>
                    <span className="text-[10px] font-normal opacity-90">…</span>
                  </span>
                )}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              disabled={periodoData === 'hoje'}
              className="inline-flex h-[22px] w-[22px] items-center justify-center text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Limpar filtro de período e usar Hoje"
            >
              <FilterX className="h-4 w-4" aria-hidden />
            </button>
          </span>
        </MuiTooltip>
      </div>
    </div>
  )
}

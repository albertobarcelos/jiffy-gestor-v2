import { calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'
import { intervaloDiaOperacionalKanban } from './diaOperacionalKanban'

export type KanbanFiltroDataPreset = 'hoje' | 'ontem' | 'ultimos_7' | 'todos' | 'por_data'

export const KANBAN_FILTRO_DATA_PRESET_OPCOES: ReadonlyArray<{
  value: KanbanFiltroDataPreset
  label: string
}> = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: 'ultimos_7', label: 'Últimos 7 dias' },
  { value: 'todos', label: 'Todos os pedidos' },
  { value: 'por_data', label: 'Por data' },
]

const PRESET_TO_PERIODO_OPCAO: Record<
  Exclude<KanbanFiltroDataPreset, 'todos' | 'por_data'>,
  string
> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  ultimos_7: 'Últimos 7 Dias',
}

export function intervaloPresetKanbanFiltroData(
  preset: Exclude<KanbanFiltroDataPreset, 'todos' | 'por_data'>,
  timeZoneEmpresa: string,
  opcoes?: { diaOperacionalFlow?: boolean; agora?: Date }
): { inicio: Date; fim: Date } | null {
  const tz = timeZoneEmpresa.trim() || 'America/Sao_Paulo'
  if (opcoes?.diaOperacionalFlow && (preset === 'hoje' || preset === 'ontem')) {
    return intervaloDiaOperacionalKanban(preset, tz, opcoes.agora ?? new Date())
  }
  const opcao = PRESET_TO_PERIODO_OPCAO[preset]
  const { inicio, fim } = calcularPeriodoNoFusoEmpresa(opcao, tz, opcoes?.agora)
  if (!inicio || !fim) return null
  return { inicio, fim }
}

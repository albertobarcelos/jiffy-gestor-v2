'use client'

import { MenuItem } from '@mui/material'
import {
  KANBAN_FILTRO_DATA_PRESET_OPCOES,
  type KanbanFiltroDataPreset,
} from '../utils/kanbanFiltroDataPresets'
import { KanbanFiltroSelect } from './KanbanFiltroSelect'

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

function PeriodoSelecionadoResumo({
  inicio,
  fim,
}: {
  inicio: Date
  fim: Date
}) {
  return (
    <div className="flex shrink-0 flex-col justify-center self-center text-[11px] leading-tight text-primary/85 sm:text-xs">
      <span className="whitespace-nowrap">Dt. Ini.: {formatarDataHoraFiltroCurta(inicio)}</span>
      <span className="whitespace-nowrap">Dt. Fim: {formatarDataHoraFiltroCurta(fim)}</span>
    </div>
  )
}

function textoPresetPeriodo(preset: string): string {
  return (
    KANBAN_FILTRO_DATA_PRESET_OPCOES.find(opcao => opcao.value === preset)?.label ?? 'Hoje'
  )
}

export function KanbanFiltroPeriodo({
  preset,
  onPresetChange,
  periodoResumo,
}: {
  preset: KanbanFiltroDataPreset
  onPresetChange: (preset: KanbanFiltroDataPreset) => void
  periodoResumo?: { inicio: Date; fim: Date } | null
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <KanbanFiltroSelect
        ariaLabel="Período"
        value={preset}
        onChange={value => onPresetChange(value as KanbanFiltroDataPreset)}
        renderValor={textoPresetPeriodo}
      >
        {KANBAN_FILTRO_DATA_PRESET_OPCOES.map(opcao => (
          <MenuItem key={opcao.value} value={opcao.value}>
            {opcao.label}
          </MenuItem>
        ))}
      </KanbanFiltroSelect>
      {preset === 'por_data' && periodoResumo ? (
        <PeriodoSelecionadoResumo inicio={periodoResumo.inicio} fim={periodoResumo.fim} />
      ) : null}
    </div>
  )
}

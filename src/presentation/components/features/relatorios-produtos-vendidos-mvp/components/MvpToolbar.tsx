'use client'

import type { ReactNode } from 'react'
import {
  MdBarChart,
  MdDonutLarge,
  MdInsights,
  MdPieChart,
  MdRefresh,
  MdTune,
} from 'react-icons/md'
function TogglePainelBtn({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`font-nunito flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${
        active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-primary/25 bg-info text-primary-text hover:border-primary/50'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

/** KPIs, gráficos (modal), personalizar e atualizar — alinhado à barra de filtros. */
export function MvpRelatorioToolbarActions(props: {
  onAtualizar: () => void
  atualizando: boolean
  onPersonalizar: () => void
  kpisVisivel: boolean
  onToggleKpis: () => void
  modalGruposAberto: boolean
  onToggleModalGrupos: () => void
  modalEvolucaoAberto: boolean
  onToggleModalEvolucao: () => void
  modalAbcAberto: boolean
  onToggleModalAbc: () => void
}) {
  const {
    onAtualizar,
    atualizando,
    onPersonalizar,
    kpisVisivel,
    onToggleKpis,
    modalGruposAberto,
    onToggleModalGrupos,
    modalEvolucaoAberto,
    onToggleModalEvolucao,
    modalAbcAberto,
    onToggleModalAbc,
  } = props

  return (
    <div className="font-nunito ml-1 flex shrink-0 flex-wrap items-center gap-1.5 border-l border-primary/20 pl-2">
      <TogglePainelBtn
        active={kpisVisivel}
        onClick={onToggleKpis}
        icon={<MdInsights size={18} />}
        label="KPIs"
      />
      <TogglePainelBtn
        active={modalGruposAberto}
        onClick={onToggleModalGrupos}
        icon={<MdDonutLarge size={18} />}
        label="Grupos"
      />
      <TogglePainelBtn
        active={modalAbcAberto}
        onClick={onToggleModalAbc}
        icon={<MdPieChart size={18} />}
        label="ABC"
      />
      <TogglePainelBtn
        active={modalEvolucaoAberto}
        onClick={onToggleModalEvolucao}
        icon={<MdBarChart size={18} />}
        label="Evolução"
      />
      <button
        type="button"
        onClick={onPersonalizar}
        className="font-nunito flex h-8 items-center gap-1.5 rounded-lg border border-primary/25 bg-info px-2.5 text-xs font-medium text-primary-text hover:border-primary/50 sm:text-sm"
      >
        <MdTune size={18} />
        <span className="hidden sm:inline">Personalizar</span>
      </button>
      <button
        type="button"
        onClick={onAtualizar}
        disabled={atualizando}
        aria-label="Atualizar"
        title="Atualizar"
        className="font-nunito flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-black transition-colors hover:bg-black/5 disabled:opacity-50"
      >
        <MdRefresh size={20} className={atualizando ? 'animate-spin' : ''} aria-hidden />
      </button>
    </div>
  )
}

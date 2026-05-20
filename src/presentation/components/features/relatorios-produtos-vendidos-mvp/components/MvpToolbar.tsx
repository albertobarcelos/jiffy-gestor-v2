'use client'

import type { ReactNode } from 'react'
import {
  MdBarChart,
  MdDonutLarge,
  MdInsights,
  MdRefresh,
  MdTune,
} from 'react-icons/md'
import type { MvpPaineisVisibilidade } from '../mvpPersonalizacao'

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

/** KPIs, gráficos, personalizar e atualizar — alinhado à barra de filtros. */
export function MvpRelatorioToolbarActions(props: {
  onAtualizar: () => void
  atualizando: boolean
  onPersonalizar: () => void
  paineis: MvpPaineisVisibilidade
  onTogglePainel: (key: keyof MvpPaineisVisibilidade) => void
}) {
  const { onAtualizar, atualizando, onPersonalizar, paineis, onTogglePainel } = props

  return (
    <div className="font-nunito ml-1 flex shrink-0 flex-wrap items-center gap-1.5 border-l border-primary/20 pl-2">
      <TogglePainelBtn
        active={paineis.kpis}
        onClick={() => onTogglePainel('kpis')}
        icon={<MdInsights size={18} />}
        label="KPIs"
      />
      <TogglePainelBtn
        active={paineis.participacao}
        onClick={() => onTogglePainel('participacao')}
        icon={<MdDonutLarge size={18} />}
        label="Grupos"
      />
      <TogglePainelBtn
        active={paineis.evolucao}
        onClick={() => onTogglePainel('evolucao')}
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

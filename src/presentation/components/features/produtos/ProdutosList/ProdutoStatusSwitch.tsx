'use client'

import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'

interface ProdutoStatusSwitchProps {
  isAtivo: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function ProdutoStatusSwitch({ isAtivo, disabled = false, onChange }: ProdutoStatusSwitchProps) {
  return (
    <div
      className="tooltip-hover-below flex items-center justify-center"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      data-tooltip={isAtivo ? 'Produto ativo — clique para desativar' : 'Produto desativado — clique para ativar'}
    >
      <JiffyIconSwitch
        checked={isAtivo}
        onChange={(e) => {
          e.stopPropagation()
          onChange(e.target.checked)
        }}
        disabled={disabled}
        bordered={false}
        size="sm"
        className="shrink-0 px-0 py-0"
        inputProps={{
          'aria-label': isAtivo ? 'Desativar produto' : 'Ativar produto',
          onClick: (e) => e.stopPropagation(),
        }}
      />
    </div>
  )
}

'use client'

import { Tooltip } from '@mui/material'
import { MdPause, MdPlayArrow } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'

interface MenuProdutoPauseControlProps {
  isAtivo: boolean
  disabled?: boolean
  onToggle: (ativo: boolean) => void
}

/**
 * Pausar/retomar produto no cardápio atual (substitui o switch da lista base).
 */
export function MenuProdutoPauseControl({
  isAtivo,
  disabled = false,
  onToggle,
}: MenuProdutoPauseControlProps) {
  const pausar = () => onToggle(false)
  const retomar = () => onToggle(true)

  const tooltip = isAtivo
    ? 'Pausar neste cardápio — o produto deixa de aparecer aqui'
    : 'Retomar neste cardápio — o produto volta a aparecer aqui'

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <span
        className="inline-flex items-center justify-center"
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {isAtivo ? (
          <button
            type="button"
            disabled={disabled}
            onClick={e => {
              e.stopPropagation()
              pausar()
            }}
            aria-label="Pausar produto neste cardápio"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-red-600 text-red-600 transition-colors hover:bg-red-600/10 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <MdPause size={18} />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={e => {
              e.stopPropagation()
              retomar()
            }}
            aria-label="Retomar produto neste cardápio"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-accent5 text-accent5 transition-colors hover:bg-accent5/10 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <MdPlayArrow size={20} />
          </button>
        )}
      </span>
    </Tooltip>
  )
}

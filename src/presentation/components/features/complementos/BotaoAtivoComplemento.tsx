'use client'

import { Tooltip } from '@mui/material'
import { MdPause, MdPlayArrow } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'

type BotaoAtivoComplementoProps = {
  ativo: boolean
  disabled?: boolean
  title?: string
  onToggle: () => void
}

/**
 * Pause quando o complemento está ativo (o clique pausa).
 * Play quando está pausado (o clique ativa).
 */
export function BotaoAtivoComplemento({
  ativo,
  disabled = false,
  title,
  onToggle,
}: BotaoAtivoComplementoProps) {
  const tooltip = title ?? (ativo ? 'Pausar complemento neste produto' : 'Ativar complemento neste produto')

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <span className="inline-flex shrink-0 items-center justify-center">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          aria-label={tooltip}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            ativo
              ? 'border-red-600 text-red-600 hover:bg-red-600/10'
              : 'border-accent5 text-accent5 hover:bg-accent5/10'
          )}
        >
          {ativo ? <MdPause size={18} /> : <MdPlayArrow size={20} />}
        </button>
      </span>
    </Tooltip>
  )
}

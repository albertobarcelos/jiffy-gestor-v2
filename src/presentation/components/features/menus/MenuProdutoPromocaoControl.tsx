'use client'

import { Tooltip } from '@mui/material'
import { MdPause, MdPlayArrow } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'

type MenuProdutoPromocaoControlProps = {
  promocaoAtiva: boolean
  disabled?: boolean
  onToggle: (ativa: boolean) => void
}

/**
 * Ativa/pausa a promoção do produto neste cardápio (play = inativa, pause = ativa).
 */
export function MenuProdutoPromocaoControl({
  promocaoAtiva,
  disabled = false,
  onToggle,
}: MenuProdutoPromocaoControlProps) {
  const tooltip = promocaoAtiva
    ? 'Pausar promoção — o preço volta ao valor normal'
    : 'Ativar promoção — usa o preço promocional neste cardápio'

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <span className="inline-flex items-center justify-center">
        {promocaoAtiva ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onToggle(false)}
            aria-label="Pausar promoção neste cardápio"
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-600 text-red-600 transition-colors hover:bg-red-600/10 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <MdPause size={18} />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onToggle(true)}
            aria-label="Ativar promoção neste cardápio"
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent5 text-accent5 transition-colors hover:bg-accent5/10 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <MdPlayArrow size={20} />
          </button>
        )}
      </span>
    </Tooltip>
  )
}

'use client'

import Box from '@mui/material/Box'
import { forwardRef } from 'react'
import type { BackdropProps } from '@mui/material/Backdrop'

/**
 * Backdrop do Modal sem Fade interno — overlay aparece sem esmaecer (mesmo critério do Novo Pedido).
 */
type PainelPedidoBackdropProps = BackdropProps & {
  /** Prop interna do MUI (styled/slots); não pode ir para o DOM */
  ownerState?: unknown
}

export const PainelPedidoBackdrop = forwardRef<HTMLDivElement, PainelPedidoBackdropProps>(
  function PainelPedidoBackdrop(
    { open, invisible, className, sx, style, onClick, ownerState: _ownerState, ...other },
    ref
  ) {
    return (
      <Box
        ref={ref}
        aria-hidden
        className={['MuiBackdrop-root', className].filter(Boolean).join(' ')}
        onClick={onClick}
        {...other}
        sx={[
          {
            position: 'fixed',
            right: 0,
            bottom: 0,
            top: 0,
            left: 0,
            // Dentro do Modal, ficar abaixo do painel (z-[1]); -1 podia conflitar com overrides do tema
            zIndex: 0,
            display: open ? 'block' : 'none',
            WebkitTapHighlightColor: 'transparent',
            bgcolor: invisible ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
            transition: 'none',
          },
          ...(Array.isArray(sx) ? sx : sx != null ? [sx] : []),
        ]}
        style={style}
      />
    )
  }
)
PainelPedidoBackdrop.displayName = 'PainelPedidoBackdrop'

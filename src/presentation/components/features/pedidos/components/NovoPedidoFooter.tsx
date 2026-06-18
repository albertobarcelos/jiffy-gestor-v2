'use client'

import type { ReactNode } from 'react'
import { DialogFooter } from '@/src/presentation/components/ui/dialog'

interface NovoPedidoFooterShellProps {
  children: ReactNode
}

export function NovoPedidoFooterShell({ children }: NovoPedidoFooterShellProps) {
  return (
    <DialogFooter
      sx={{
        padding: 0,
        flexShrink: 0,
        borderTop: '1px solid #e5e7eb',
        marginTop: 0,
        minHeight: '3rem',
        // DialogActions vem com justify-content: flex-end — o grid ficava encolhido à direita
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        width: '100%',
        boxSizing: 'border-box',
        '& > *': {
          flex: '1 1 100%',
          maxWidth: '100%',
          minWidth: 0,
          minHeight: '3rem',
        },
      }}
    >
      {children}
    </DialogFooter>
  )
}

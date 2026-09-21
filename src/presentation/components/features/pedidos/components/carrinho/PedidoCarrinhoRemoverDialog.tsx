'use client'

import type { ReactNode } from 'react'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'

export type ProdutoPendendoRemocao = {
  index: number
  nome: string
}

type PedidoCarrinhoRemoverDialogProps = {
  produto: ProdutoPendendoRemocao | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: ReactNode
  cancelLabel?: string
  confirmLabel?: string
  busy?: boolean
}

export function PedidoCarrinhoRemoverDialog({
  produto,
  onOpenChange,
  onConfirm,
  title = 'Remover do pedido?',
  description,
  cancelLabel = 'Manter',
  confirmLabel = 'Remover',
  busy = false,
}: PedidoCarrinhoRemoverDialogProps) {
  return (
    <JiffyConfirmDialog
      open={produto != null}
      onOpenChange={onOpenChange}
      title={title}
      description={
        description ??
        (produto ? (
          <>
            <strong>{produto.nome}</strong> sai da lista. Se mudar de ideia, é só lançar de novo.
          </>
        ) : null)
      }
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      confirmButtonClassName="bg-red-600 hover:bg-red-700"
      onConfirm={onConfirm}
      busy={busy}
      dialogSx={{
        zIndex: 1400,
        '& .MuiDialog-container': { zIndex: 1400 },
      }}
    />
  )
}

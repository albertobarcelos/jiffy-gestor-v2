'use client'

import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'

export type ProdutoPendendoRemocao = {
  index: number
  nome: string
}

type PedidoCarrinhoRemoverDialogProps = {
  produto: ProdutoPendendoRemocao | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function PedidoCarrinhoRemoverDialog({
  produto,
  onOpenChange,
  onConfirm,
}: PedidoCarrinhoRemoverDialogProps) {
  return (
    <JiffyConfirmDialog
      open={produto != null}
      onOpenChange={onOpenChange}
      title="Remover do pedido?"
      description={
        produto ? (
          <>
            <strong>{produto.nome}</strong> sai da lista. Se mudar de ideia, é só lançar de novo.
          </>
        ) : null
      }
      cancelLabel="Manter"
      confirmLabel="Remover"
      confirmButtonClassName="bg-red-600 hover:bg-red-700"
      onConfirm={onConfirm}
      dialogSx={{
        zIndex: 1400,
        '& .MuiDialog-container': { zIndex: 1400 },
      }}
    />
  )
}

'use client'

import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { MdClose, MdPointOfSale, MdDeliveryDining } from 'react-icons/md'

export type TipoPedido = 'balcao' | 'entrega'

interface EscolhaTipoPedidoModalProps {
  open: boolean
  onClose: () => void
  onSelect: (tipo: TipoPedido) => void
}

/**
 * Dialog de escolha do tipo de pedido.
 * Balcão → abre NovoPedidoModal no fluxo padrão (step 1 = Informações).
 * Entrega → abre NovoPedidoModal iniciando pelo step de Produtos.
 * Segue o mesmo estilo visual do EmitirNfeModal (dois cards lado a lado).
 */
export function EscolhaTipoPedidoModal({ open, onClose, onSelect }: EscolhaTipoPedidoModalProps) {
  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent sx={{ maxWidth: 480, padding: '0px 24px 24px 24px' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-exo py-4 text-lg font-semibold sm:text-2xl">
            Novo Pedido
          </h1>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
            }}
          >
            <MdClose size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500">Selecione o tipo do pedido para continuar.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Balcão */}
          <button
            type="button"
            onClick={() => onSelect('balcao')}
            className="group flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-primary bg-primary p-4 text-center shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <MdPointOfSale className="h-12 w-12 text-info" aria-hidden />
            <div>
              <p className="text-xl font-extrabold tracking-tight text-info">Balcão</p>
              <p className="mt-1 text-xs font-medium leading-snug text-gray-200">
                Pedido presencial — inicia pelas informações do pedido
              </p>
            </div>
          </button>

          {/* Entrega */}
          <button
            type="button"
            onClick={() => onSelect('entrega')}
            className="group flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 text-center shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <MdDeliveryDining className="h-12 w-12 text-primary" aria-hidden />
            <div>
              <p className="text-xl font-extrabold tracking-tight text-gray-900">Entrega</p>
              <p className="mt-1 text-xs font-medium leading-snug text-gray-500">
                Delivery manual — inicia diretamente pela seleção de produtos
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

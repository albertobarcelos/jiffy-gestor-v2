'use client'

import { formatDeliveryCurrency } from '../../shared/utils/formatDeliveryCurrency'
import { DeliveryButton } from '../../shared/components/DeliveryButton'

type DeliveryCheckoutFooterProps = {
  total: number
  enviando: boolean
  onConfirm: () => void
}

export function DeliveryCheckoutFooter({ total, enviando, onConfirm }: DeliveryCheckoutFooterProps) {
  return (
    <>
      <div className="hidden items-center justify-between pt-2 text-lg font-bold sm:flex">
        <span className="delivery-text-primary">Total</span>
        <span className="delivery-text-accent">{formatDeliveryCurrency(total)}</span>
      </div>

      <DeliveryButton
        fullWidth
        disabled={enviando}
        onClick={onConfirm}
        className="hidden sm:block"
        style={{
          backgroundColor: 'var(--delivery-primary-dark)',
          color: 'var(--delivery-btn-text, #ffffff)',
        }}
      >
        {enviando ? 'Enviando...' : 'Confirmar pedido'}
      </DeliveryButton>

      <div
        className="fixed bottom-0 left-0 right-0 z-20 flex items-center gap-3 border-t px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:hidden"
        style={{
          backgroundColor: 'var(--delivery-surface)',
          borderColor: 'var(--delivery-border)',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="delivery-text-secondary text-xs">Total</p>
          <p className="delivery-text-accent truncate text-lg font-bold">
            {formatDeliveryCurrency(total)}
          </p>
        </div>
        <DeliveryButton
          disabled={enviando}
          onClick={onConfirm}
          className="min-h-[48px] flex-shrink-0 px-5 py-3"
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          {enviando ? 'Enviando...' : 'Confirmar'}
        </DeliveryButton>
      </div>
    </>
  )
}

'use client'

import { Store } from 'lucide-react'
import { MSG_FORA_COBERTURA_ENTREGA_PUBLICA } from '@/src/infrastructure/api/publicDeliveryApi'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'

type DeliveryCheckoutForaCoberturaDialogProps = {
  open: boolean
  onFechar: () => void
  onEscolherRetirada: () => void
}

export function DeliveryCheckoutForaCoberturaDialog({
  open,
  onFechar,
  onEscolherRetirada,
}: DeliveryCheckoutForaCoberturaDialogProps) {
  useDeliveryBodyScrollLock(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex overscroll-none items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
        aria-label="Fechar"
        onClick={onFechar}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl px-5 pb-5 pt-6 shadow-xl"
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-fora-cobertura-titulo"
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-alternate/15">
          <Store className="h-6 w-6 text-alternate" strokeWidth={2.25} aria-hidden />
        </div>

        <h2
          id="delivery-fora-cobertura-titulo"
          className="mt-4 text-center text-base font-semibold delivery-text-primary"
        >
          Fora da área de entrega
        </h2>

        <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">
          {MSG_FORA_COBERTURA_ENTREGA_PUBLICA}
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onEscolherRetirada}
            className="min-h-[48px] w-full rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--delivery-primary-dark)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            Quero retirar na loja
          </button>
          <button
            type="button"
            onClick={onFechar}
            className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-sm font-semibold delivery-text-primary"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}

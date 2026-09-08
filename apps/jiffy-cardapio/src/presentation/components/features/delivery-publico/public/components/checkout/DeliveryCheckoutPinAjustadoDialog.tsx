'use client'

import { MapPin } from 'lucide-react'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'

type DeliveryCheckoutPinAjustadoDialogProps = {
  open: boolean
  variante?: 'endereco' | 'preferencia'
  onConfirmar: () => void
  onCancelar: () => void
}

export function DeliveryCheckoutPinAjustadoDialog({
  open,
  variante = 'endereco',
  onConfirmar,
  onCancelar,
}: DeliveryCheckoutPinAjustadoDialogProps) {
  useDeliveryBodyScrollLock(open)

  if (!open) return null

  const titulo =
    variante === 'preferencia' ? 'Confirmar ponto de entrega' : 'Confirmar local no mapa'

  const descricao =
    variante === 'preferencia'
      ? 'O pin foi movido. Está no lugar certo onde você vai receber o pedido?'
      : 'O pin foi movido. Está no local correto para a entrega? O endereço escrito não muda.'

  return (
    <div className="fixed inset-0 z-[100] flex overscroll-none items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
        aria-label="Cancelar"
        onClick={onCancelar}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl px-5 pb-5 pt-6 shadow-xl"
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-pin-ajustado-titulo"
      >
        <div
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--delivery-primary, #2563eb) 15%, transparent)',
          }}
        >
          <MapPin
            className="h-6 w-6"
            style={{ color: 'var(--delivery-primary, #2563eb)' }}
            strokeWidth={2.25}
            aria-hidden
          />
        </div>

        <h2
          id="delivery-pin-ajustado-titulo"
          className="mt-4 text-center text-base font-semibold delivery-text-primary"
        >
          {titulo}
        </h2>

        <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">{descricao}</p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirmar}
            className="min-h-[48px] w-full rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--delivery-primary-dark)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            Sim, está correto
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-sm font-semibold delivery-text-primary"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

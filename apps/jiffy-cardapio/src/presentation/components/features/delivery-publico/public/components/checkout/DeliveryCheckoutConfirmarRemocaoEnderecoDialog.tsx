'use client'

import { Trash2 } from 'lucide-react'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'

type DeliveryCheckoutConfirmarRemocaoEnderecoDialogProps = {
  open: boolean
  resumoEndereco?: string
  removendo?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export function DeliveryCheckoutConfirmarRemocaoEnderecoDialog({
  open,
  resumoEndereco,
  removendo = false,
  onConfirmar,
  onCancelar,
}: DeliveryCheckoutConfirmarRemocaoEnderecoDialogProps) {
  useDeliveryBodyScrollLock(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex overscroll-none items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
        aria-label="Fechar"
        disabled={removendo}
        onClick={onCancelar}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl px-5 pb-5 pt-6 shadow-xl"
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-remover-endereco-titulo"
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
          <Trash2 className="h-6 w-6 text-red-600" strokeWidth={2.25} aria-hidden />
        </div>

        <h2
          id="delivery-remover-endereco-titulo"
          className="mt-4 text-center text-base font-semibold delivery-text-primary"
        >
          Remover endereço?
        </h2>

        <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">
          Esta ação não pode ser desfeita. O endereço será excluído do seu cadastro.
        </p>

        {resumoEndereco ? (
          <p
            className="mt-3 rounded-xl border px-3 py-2 text-center text-sm delivery-text-primary"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface-muted)',
            }}
          >
            {resumoEndereco}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={removendo}
            onClick={onConfirmar}
            className="min-h-[48px] w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#dc2626' }}
          >
            {removendo ? 'Removendo...' : 'Sim, remover'}
          </button>
          <button
            type="button"
            disabled={removendo}
            onClick={onCancelar}
            className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-sm font-semibold delivery-text-primary disabled:opacity-60"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

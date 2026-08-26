'use client'

import { AlertTriangle } from 'lucide-react'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import type { CotacaoPedidoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

type DeliveryCotacaoDesatualizadaDialogProps = {
  message: string
  cotacao: CotacaoPedidoPublicoDTO
  onConfirmar: () => void
}

export function DeliveryCotacaoDesatualizadaDialog({
  message,
  cotacao,
  onConfirmar,
}: DeliveryCotacaoDesatualizadaDialogProps) {
  useDeliveryBodyScrollLock()

  return (
    <div className="fixed inset-0 z-[70] flex overscroll-none items-center justify-center px-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
        aria-hidden
      />

      <div
        className="relative w-full max-w-sm rounded-2xl px-5 pb-5 pt-6 shadow-xl"
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delivery-cotacao-desatualizada-titulo"
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" strokeWidth={2.25} aria-hidden />
        </div>

        <h2
          id="delivery-cotacao-desatualizada-titulo"
          className="mt-4 text-center text-base font-semibold delivery-text-primary"
        >
          Revise o pedido
        </h2>

        <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">{message}</p>

        <p className="mt-4 text-center text-sm delivery-text-primary">
          Novo total:{' '}
          <span className="font-semibold">{transformarParaReal(cotacao.valorFinal)}</span>
        </p>

        <button
          type="button"
          onClick={onConfirmar}
          className="mt-6 min-h-[48px] w-full rounded-full px-4 text-sm font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          Ok, entendi
        </button>
      </div>
    </div>
  )
}

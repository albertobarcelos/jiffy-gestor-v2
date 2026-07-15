'use client'

import { Check } from 'lucide-react'

type DeliveryAdicionadoCarrinhoDialogProps = {
  produtoNome: string
  onContinuarComprando: () => void
  onIrParaCarrinho: () => void
}

export function DeliveryAdicionadoCarrinhoDialog({
  produtoNome,
  onContinuarComprando,
  onIrParaCarrinho,
}: DeliveryAdicionadoCarrinhoDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] sm:pt-[10vh]">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.55))' }}
        onClick={onContinuarComprando}
        aria-hidden
      />

      <div
        className="relative w-full max-w-sm rounded-2xl px-5 pb-5 pt-6 shadow-xl"
        style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-adicionado-titulo"
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-6 w-6 text-emerald-600" strokeWidth={2.5} aria-hidden />
        </div>

        <p
          id="delivery-adicionado-titulo"
          className="mt-4 text-center text-base leading-snug delivery-text-primary"
        >
          <span className="font-semibold">{produtoNome}</span> adicionado no carrinho!
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onContinuarComprando}
            className="min-h-[48px] w-full rounded-full border px-4 text-sm font-semibold uppercase tracking-wide delivery-text-primary"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface)',
            }}
          >
            Continuar comprando
          </button>
          <button
            type="button"
            onClick={onIrParaCarrinho}
            className="min-h-[48px] w-full rounded-full px-4 text-sm font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: 'var(--delivery-primary-dark)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            Avançar para o carrinho
          </button>
        </div>
      </div>
    </div>
  )
}

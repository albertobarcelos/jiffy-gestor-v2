'use client'

import { PackageX } from 'lucide-react'
import { useDeliveryBodyScrollLock } from '../../../shared/hooks/useDeliveryBodyScrollLock'

type DeliveryProdutoIndisponivelDialogProps = {
  open: boolean
  nomes: string[]
  onConfirmar: () => void
}

export function DeliveryProdutoIndisponivelDialog({
  open,
  nomes,
  onConfirmar,
}: DeliveryProdutoIndisponivelDialogProps) {
  useDeliveryBodyScrollLock(open)

  if (!open) return null

  const titulo =
    nomes.length > 1 ? 'Produtos indisponíveis' : 'Produto indisponível'

  const corpo =
    nomes.length === 0
      ? 'Um item do seu carrinho não está disponível no momento e será removido.'
      : nomes.length === 1
        ? `${nomes[0]} não está disponível no momento e será removido do seu carrinho.`
        : `Estes itens não estão disponíveis no momento e serão removidos do seu carrinho: ${nomes.join(', ')}.`

  return (
    <div
      className="delivery-vv-overlay z-[100] flex items-center justify-center overscroll-none px-4 py-6"
      style={{ zIndex: 100 }}
    >
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
        aria-labelledby="delivery-produto-indisponivel-titulo"
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-alternate/15">
          <PackageX className="h-6 w-6 text-alternate" strokeWidth={2.25} aria-hidden />
        </div>

        <h2
          id="delivery-produto-indisponivel-titulo"
          className="mt-4 text-center text-base font-semibold delivery-text-primary"
        >
          {titulo}
        </h2>

        <p className="mt-2 text-center text-sm leading-snug delivery-text-secondary">{corpo}</p>

        <button
          type="button"
          onClick={onConfirmar}
          className="mt-6 min-h-[48px] w-full rounded-xl px-4 py-3 text-sm font-semibold"
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          OK
        </button>
      </div>
    </div>
  )
}

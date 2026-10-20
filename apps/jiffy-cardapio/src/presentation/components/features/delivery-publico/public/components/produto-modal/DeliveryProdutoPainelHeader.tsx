'use client'

import { MdClose } from 'react-icons/md'

type DeliveryProdutoPainelHeaderProps = {
  onClose: () => void
}

export function DeliveryProdutoPainelHeader({ onClose }: DeliveryProdutoPainelHeaderProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
      style={{
        borderColor: 'var(--delivery-border)',
        backgroundColor: 'var(--delivery-surface)',
      }}
    >
      <h1 className="delivery-font-title text-base font-semibold delivery-text-primary">
        Detalhes do produto
      </h1>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ color: 'var(--delivery-text-primary)' }}
      >
        <MdClose className="h-5 w-5" />
      </button>
    </div>
  )
}

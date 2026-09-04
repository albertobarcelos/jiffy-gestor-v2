'use client'

import { MdClose } from 'react-icons/md'
import { normalizeTipoImpactoPreco } from '@/src/shared/utils/normalizeTipoImpactoPreco'
import { formatarValorComplemento } from '@/src/domain/services/pedido/CalculadoraPedido'
import type { DeliveryCarrinhoComplemento } from '../stores/deliveryCarrinhoStore'

type DeliveryCarrinhoComplementoRowProps = {
  complemento: DeliveryCarrinhoComplemento
  onRemove: () => void
}

export function DeliveryCarrinhoComplementoRow({
  complemento,
  onRemove,
}: DeliveryCarrinhoComplementoRowProps) {
  return (
    <li className="flex items-center gap-2 py-0.5 text-xs">
      <span className="w-6 shrink-0 text-right font-medium tabular-nums delivery-text-secondary">
        {complemento.quantidade}x
      </span>
      <span
        className="min-w-0 flex-1 truncate delivery-text-secondary"
        title={complemento.nome}
      >
        {complemento.nome}
      </span>
      <span className="shrink-0 font-medium tabular-nums delivery-text-accent">
        {formatarValorComplemento(
          complemento.valor,
          normalizeTipoImpactoPreco(complemento.tipoImpactoPreco)
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-0.5 text-red-500"
        aria-label={`Remover complemento ${complemento.nome}`}
      >
        <MdClose className="h-4 w-4" />
      </button>
    </li>
  )
}

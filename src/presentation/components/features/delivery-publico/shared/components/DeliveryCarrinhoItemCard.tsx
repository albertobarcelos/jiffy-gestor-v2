'use client'

import { MdDelete } from 'react-icons/md'
import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import { formatarValorComplemento } from '@/src/domain/services/pedido/CalculadoraPedido'
import type { DeliveryCarrinhoItem } from '../stores/deliveryCarrinhoStore'
import {
  observacaoItemCarrinho,
  valorUnitarioBaseProduto,
} from '../utils/deliveryCarrinhoItemUtils'
import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'
import { DeliveryCard } from './DeliveryCard'
import { DeliveryQuantidadeStepper } from './DeliveryQuantidadeStepper'

type DeliveryCarrinhoItemCardProps = {
  item: DeliveryCarrinhoItem
  onDecrease: () => void
  onIncrease: () => void
  onRemove: () => void
}

export function DeliveryCarrinhoItemCard({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: DeliveryCarrinhoItemCardProps) {
  const obs = observacaoItemCarrinho(item)

  return (
    <DeliveryCard className="flex gap-3 items-stretch !p-4 rounded-xl">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 flex-1 truncate font-semibold delivery-text-primary">
            {item.produtoNome}
          </p>
          <span className="shrink-0 pr-2 text-sm font-medium tabular-nums delivery-text-accent">
            {formatDeliveryCurrency(valorUnitarioBaseProduto(item))}
          </span>
        </div>

        {item.complementos.length > 0 ? (
          <ul className="mt-1.5 space-y-1">
            {item.complementos.map(c => (
              <li
                key={`${c.complementoId}-${c.grupoComplementoId}`}
                className="flex items-center gap-2 text-xs"
              >
                <span className="w-5 shrink-0 text-right font-medium tabular-nums delivery-text-secondary">
                  {c.quantidade}
                </span>
                <span
                  className="min-w-0 flex-1 truncate delivery-text-secondary"
                  title={c.nome}
                >
                  {c.nome}
                </span>
                <span className="shrink-0 pr-2 font-medium tabular-nums delivery-text-accent">
                  {formatarValorComplemento(
                    c.valor,
                    normalizeTipoImpactoPreco(c.tipoImpactoPreco)
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {obs ? (
          <p className="delivery-text-secondary mt-2 text-xs leading-snug">
            <span className="font-semibold">Obs:</span> {obs}
          </p>
        ) : null}

        <p className="delivery-text-accent mt-auto pt-2 text-base font-bold tabular-nums">
          {formatDeliveryCurrency(item.valorTotal)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between">
        <DeliveryQuantidadeStepper
          size="sm"
          value={item.quantidade}
          min={1}
          decreaseLabel="Diminuir quantidade"
          increaseLabel="Aumentar quantidade"
          onDecrease={onDecrease}
          onIncrease={onIncrease}
        />
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 p-1 text-red-500"
          aria-label="Remover item"
        >
          <MdDelete className="h-5 w-5" />
        </button>
      </div>
    </DeliveryCard>
  )
}

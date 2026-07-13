'use client'

import { Camera } from 'lucide-react'
import { MdDelete } from 'react-icons/md'
import type { DeliveryCarrinhoItem } from '../stores/deliveryCarrinhoStore'
import {
  observacaoItemCarrinho,
  valorUnitarioBaseProduto,
} from '../utils/deliveryCarrinhoItemUtils'
import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'
import { DeliveryCarrinhoComplementoRow } from './DeliveryCarrinhoComplementoRow'
import { DeliveryQuantidadeStepper } from './DeliveryQuantidadeStepper'

type DeliveryCarrinhoItemCardProps = {
  item: DeliveryCarrinhoItem
  onDecrease: () => void
  onIncrease: () => void
  onRemove: () => void
  onEdit: () => void
  onRemoveComplemento: (complementoId: string, grupoComplementoId: string) => void
}

function CarrinhoProdutoThumb({ imagemUrl, nome }: { imagemUrl: string | null; nome: string }) {
  return (
    <div
      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Camera
            className="h-5 w-5"
            style={{ color: 'var(--delivery-text-muted)' }}
            aria-hidden
          />
        </div>
      )}
      <span className="sr-only">{nome}</span>
    </div>
  )
}

export function DeliveryCarrinhoItemCard({
  item,
  onDecrease,
  onIncrease,
  onRemove,
  onEdit,
  onRemoveComplemento,
}: DeliveryCarrinhoItemCardProps) {
  const obs = observacaoItemCarrinho(item)

  return (
    <article className="py-4 first:pt-0">
      <div className="flex items-start gap-2.5">
        <CarrinhoProdutoThumb imagemUrl={item.produtoImagemUrl} nome={item.produtoNome} />

        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onEdit}
              className="line-clamp-2 text-left font-semibold leading-snug delivery-text-primary underline-offset-2 hover:underline"
              aria-label={`Editar ${item.produtoNome}`}
            >
              {item.produtoNome}
            </button>
            <span className="mt-0.5 inline-block text-sm font-medium tabular-nums delivery-text-accent">
              {formatDeliveryCurrency(valorUnitarioBaseProduto(item))}
            </span>
          </div>

          <div className="flex shrink-0 flex-col items-end">
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
        </div>
      </div>

      {item.complementos.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {item.complementos.map(c => (
            <DeliveryCarrinhoComplementoRow
              key={`${c.complementoId}-${c.grupoComplementoId}`}
              complemento={c}
              onRemove={() => onRemoveComplemento(c.complementoId, c.grupoComplementoId)}
            />
          ))}
        </ul>
      ) : null}

      {obs ? (
        <p className="delivery-text-secondary mt-2 text-xs leading-snug">
          <span className="font-semibold">Obs:</span> {obs}
        </p>
      ) : null}

      <p className="delivery-text-accent mt-2 text-base font-bold tabular-nums">
        {formatDeliveryCurrency(item.valorTotal)}
      </p>
    </article>
  )
}

'use client'

import { Camera, List, Share2 } from 'lucide-react'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { formatDeliveryCurrency } from '../../../shared/utils/formatDeliveryCurrency'

type DeliveryProdutoCabecalhoProps = {
  produto: CatalogoPublicoProdutoDTO
  precisaComplementos: boolean
  onIrParaComplementos: () => void
  onCompartilhar: () => void
}

export function DeliveryProdutoCabecalho({
  produto,
  precisaComplementos,
  onIrParaComplementos,
  onCompartilhar,
}: DeliveryProdutoCabecalhoProps) {
  return (
    <>
      <div className="relative w-full shrink-0 overflow-hidden aspect-square">
        {produto.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagemUrl}
            alt=""
            data-delivery-produto-img={produto.id}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
          >
            <Camera
              className="h-16 w-16"
              style={{ color: 'var(--delivery-text-muted)' }}
              aria-hidden
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pt-4">
        <h2 className="delivery-font-title text-xl font-bold delivery-text-primary">
          {produto.nome}
        </h2>

        {produto.descricao ? (
          <p className="delivery-text-secondary mt-2 text-sm leading-relaxed">{produto.descricao}</p>
        ) : null}

        <p className="mt-2 text-lg font-semibold delivery-text-primary">
          {formatDeliveryCurrency(produto.valor)}
        </p>

        <div className="mt-4 flex items-center gap-2">
          {precisaComplementos ? (
            <button
              type="button"
              onClick={onIrParaComplementos}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold uppercase tracking-wide delivery-text-primary lg:hidden"
              style={{
                borderColor: 'var(--delivery-border)',
                backgroundColor: 'var(--delivery-surface)',
              }}
            >
              <List className="h-4 w-4 shrink-0" aria-hidden />
              Complementos
            </button>
          ) : null}

          <button
            type="button"
            onClick={onCompartilhar}
            aria-label="Compartilhar produto"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface)',
              color: 'var(--delivery-text-primary)',
            }}
          >
            <Share2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  )
}

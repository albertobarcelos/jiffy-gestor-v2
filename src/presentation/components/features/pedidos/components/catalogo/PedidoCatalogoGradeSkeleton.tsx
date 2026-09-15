'use client'

import { ShimmerFill, ShimmerLine, ShimmerRepeat } from '@/src/presentation/components/ui/shimmer'
import { PEDIDO_CATALOGO_GRADE_CLASS } from './pedidoCatalogoLayout'

export function PedidoCatalogoProdutoSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1 p-0.5" aria-hidden>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
        <ShimmerFill radius="1rem" />
      </div>
      <div className="flex flex-col items-center gap-0.5 px-0.5">
        <ShimmerLine width="78%" height={14} />
        <ShimmerLine width="42%" height={16} />
      </div>
    </div>
  )
}

const CATALOGO_SKELETON_ITENS = 8

export function PedidoCatalogoGradeSkeleton() {
  return (
    <div
      className={`${PEDIDO_CATALOGO_GRADE_CLASS} overflow-hidden`}
      aria-busy="true"
      aria-label="Carregando produtos"
    >
      <ShimmerRepeat count={CATALOGO_SKELETON_ITENS}>
        {index => (
          <div key={index} className="min-w-0">
            <PedidoCatalogoProdutoSkeleton />
          </div>
        )}
      </ShimmerRepeat>
    </div>
  )
}

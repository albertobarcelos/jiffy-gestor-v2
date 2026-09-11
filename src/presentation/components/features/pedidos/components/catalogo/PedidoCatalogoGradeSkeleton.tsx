'use client'

import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { PEDIDO_CATALOGO_GRADE_CLASS } from './pedidoCatalogoLayout'

export function PedidoCatalogoProdutoSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1 p-0.5" aria-hidden>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
        <Skeleton
          animation="wave"
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{ position: 'absolute', inset: 0, transform: 'none' }}
        />
      </div>
      <div className="flex flex-col items-center gap-0.5 px-0.5">
        <Skeleton animation="wave" variant="text" width="78%" height={14} />
        <Skeleton animation="wave" variant="text" width="42%" height={16} />
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
      {Array.from({ length: CATALOGO_SKELETON_ITENS }, (_, index) => (
        <div key={index} className="min-w-0">
          <PedidoCatalogoProdutoSkeleton />
        </div>
      ))}
    </div>
  )
}

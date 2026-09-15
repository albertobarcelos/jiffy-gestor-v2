'use client'

import { ShimmerFill, ShimmerLine, ShimmerRepeat } from '@/src/presentation/components/ui/shimmer'

export function PedidoCatalogoGrupoSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg p-1.5 pt-2" aria-hidden>
      <div className="relative h-9 w-9 overflow-hidden rounded-xl">
        <ShimmerFill radius="0.75rem" />
      </div>
      <ShimmerLine width="78%" height={12} className="mt-1" />
    </div>
  )
}

const GRUPOS_SKELETON_ITENS = 5

export function PedidoCatalogoGruposSkeleton() {
  return (
    <div className="flex flex-col gap-1" aria-busy="true" aria-label="Carregando grupos">
      <ShimmerRepeat count={GRUPOS_SKELETON_ITENS}>
        {index => <PedidoCatalogoGrupoSkeleton key={index} />}
      </ShimmerRepeat>
    </div>
  )
}

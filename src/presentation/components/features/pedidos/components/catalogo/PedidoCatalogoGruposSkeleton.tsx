'use client'

import { Skeleton } from '@/src/presentation/components/ui/skeleton'

export function PedidoCatalogoGrupoSkeleton() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg p-1.5 pt-2"
      aria-hidden
    >
      <div className="relative h-9 w-9 overflow-hidden rounded-xl">
        <Skeleton
          animation="wave"
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{ position: 'absolute', inset: 0, transform: 'none' }}
        />
      </div>
      <Skeleton animation="wave" variant="text" width="78%" height={12} sx={{ mt: 0.5 }} />
    </div>
  )
}

const GRUPOS_SKELETON_ITENS = 5

export function PedidoCatalogoGruposSkeleton() {
  return (
    <div className="flex flex-col gap-1" aria-busy="true" aria-label="Carregando grupos">
      {Array.from({ length: GRUPOS_SKELETON_ITENS }, (_, index) => (
        <PedidoCatalogoGrupoSkeleton key={index} />
      ))}
    </div>
  )
}

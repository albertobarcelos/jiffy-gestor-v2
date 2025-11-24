'use client'

import { Skeleton } from '@mui/material'

/**
 * Componente de loading para páginas
 * Mostra skeleton loaders enquanto a página carrega
 */
export function PageLoading() {
  return (
    <div className="p-6 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" width={120} height={40} />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-4">
        <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 2 }} />
      </div>

      {/* List skeleton */}
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            width="100%"
            height={60}
            sx={{ borderRadius: 2 }}
          />
        ))}
      </div>
    </div>
  )
}


'use client'

import { Suspense } from 'react'
import { GruposComplementosList } from '@/src/presentation/components/features/grupos-complementos/GruposComplementosList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

/**
 * Página de grupos de complementos
 * Client Component para evitar RSC overhead e melhorar performance
 */
export default function GruposComplementosPage() {
  return (
  
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center py-12">
          <PageLoading />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <GruposComplementosList />
      </div>
    </Suspense>
  </div>
  )
}


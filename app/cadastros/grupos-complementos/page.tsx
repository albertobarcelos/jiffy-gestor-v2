'use client'

import { Suspense } from 'react'
import { GruposComplementosList } from '@/src/presentation/components/features/grupos-complementos/GruposComplementosList'

/**
 * Página de grupos de complementos
 * Client Component para evitar RSC overhead e melhorar performance
 */
export default function GruposComplementosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div>Carregando grupos de complementos...</div>}>
        <GruposComplementosList />
      </Suspense>
    </div>
  )
}


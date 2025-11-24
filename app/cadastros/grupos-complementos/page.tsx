'use client'

import { GruposComplementosList } from '@/src/presentation/components/features/grupos-complementos/GruposComplementosList'

/**
 * Página de grupos de complementos
 * Client Component para evitar RSC overhead e melhorar performance
 */
export default function GruposComplementosPage() {
  return (
    <div className="h-full">
      <GruposComplementosList />
    </div>
  )
}


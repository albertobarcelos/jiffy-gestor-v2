'use client'

import { Suspense } from 'react'
import { MesasAbertas } from '@/src/presentation/components/features/vendas/MesasAbertas'

/**
 * Página de Mesas Abertas
 * Exibe a lista de vendas (mesas) com status 'Aberta'.
 */
export default function MesasAbertasPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div>Carregando vendas abertas...</div>}>
        <MesasAbertas />
      </Suspense>
    </div>
  )
}

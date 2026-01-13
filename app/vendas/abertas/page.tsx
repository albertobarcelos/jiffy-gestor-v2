'use client'

import { Suspense } from 'react'
import { VendasAbertas } from '@/src/presentation/components/features/vendas/VendasAbertas'

/**
 * Página de Vendas Abertas
 * Exibe a lista de vendas com status 'Aberta'.
 */
export default function VendasAbertasPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div>Carregando vendas abertas...</div>}>
        <VendasAbertas />
      </Suspense>
    </div>
  )
}

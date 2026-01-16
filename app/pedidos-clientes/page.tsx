'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Novo componente Kanban baseado no modelo moderno
const PedidosClientesKanban = dynamic(
  () => import('@/src/presentation/components/features/nfe/FiscalFlowKanban').then((mod) => ({ default: mod.FiscalFlowKanban })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    ),
  }
)

export default function PedidosClientesPage() {
  return (
    <div className="h-full">
      <Suspense
        fallback={
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <PedidosClientesKanban />
      </Suspense>
    </div>
  )
}


'use client'

import dynamic from 'next/dynamic'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

/**
 * Kanban carregado sob demanda (bundle separado).
 * O `loading` do dynamic cobre o download do chunk; não usar Suspense extra aqui —
 * o FiscalFlowKanban não suspende com `use()`, e Suspense+dynamic gerava dois spinners
 * seguidos antes do loading interno (dados) do próprio Kanban.
 */
const PedidosClientesKanban = dynamic(
  () =>
    import('@/src/presentation/components/features/nfe/FiscalFlowKanban').then(mod => ({
      default: mod.FiscalFlowKanban,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <JiffyLoading />
      </div>
    ),
  }
)

export default function PedidosClientesPage() {
  return (
    <div className="h-full">
      <PedidosClientesKanban />
    </div>
  )
}

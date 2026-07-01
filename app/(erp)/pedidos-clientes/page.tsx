'use client'

import dynamic from 'next/dynamic'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

/**
 * Kanban carregado sob demanda (bundle separado).
 * O `loading` do dynamic cobre o download do chunk; não usar Suspense extra aqui —
 * o VendasKanban não suspende com `use()`, e Suspense+dynamic gerava dois spinners
 * seguidos antes do loading interno (dados) do próprio Kanban.
 */
const PedidosClientesKanban = dynamic(
  () =>
    import('@/features/kanban').then(mod => ({
      default: mod.VendasKanban,
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

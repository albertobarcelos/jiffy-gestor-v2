'use client'

import dynamic from 'next/dynamic'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

/**
 * O mesmo `VendasKanban` de antes. Este ficheiro é o adapter da rota —
 * para retirar o casco `/pedidos`, apaga-se esta pasta e as pages.
 */
const Kanban = dynamic(
  () =>
    import('@/features/kanban').then(mod => ({
      default: mod.VendasKanban,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <JiffyLoading text="Carregando o quadro de pedidos…" />
      </div>
    ),
  }
)

export function GestorPedidosKanban() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Kanban />
    </div>
  )
}

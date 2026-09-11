import type { SuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/superficieQuadroPedidos'

/**
 * Largura do quadro: Gestor rola na horizontal; Fredy preenche a tela.
 */
export function classesKanbanQuadroFaixa(superficie: SuperficieQuadroPedidos): string {
  return superficie === 'fredy'
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2'
    : 'scrollbar-thin flex min-h-0 flex-1 flex-col overflow-x-auto px-2 py-2'
}

export function classesKanbanQuadroRow(superficie: SuperficieQuadroPedidos): string {
  return superficie === 'fredy'
    ? 'flex h-full min-h-0 w-full min-w-0 flex-1 gap-3'
    : 'flex h-full min-h-0 w-max min-w-full flex-1 gap-3'
}

export function classesKanbanColunaCasco(superficie: SuperficieQuadroPedidos): string {
  const base =
    'flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50'
  return superficie === 'fredy' ? `${base} min-w-[15rem] flex-1` : `${base} w-80 shrink-0`
}

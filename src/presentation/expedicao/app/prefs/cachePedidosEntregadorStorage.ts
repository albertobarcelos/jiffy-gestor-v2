import {
  CHAVE_CACHE_PEDIDOS_ENTREGADOR_APP,
  montarCachePedidosEntregadorApp,
  parseCachePedidosEntregadorApp,
} from '@/src/application/expedicao/app/cachePedidosEntregadorApp'
import type { PedidoResumoAppEntregador } from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'

function storageLocal(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function lerCachePedidosEntregadorApp(
  entregadorId: string
): PedidoResumoAppEntregador[] | null {
  const storage = storageLocal()
  if (!storage) return null
  const lido = parseCachePedidosEntregadorApp({
    bruto: storage.getItem(CHAVE_CACHE_PEDIDOS_ENTREGADOR_APP),
    entregadorId,
    agora: Date.now(),
  })
  return lido
}

export function gravarCachePedidosEntregadorApp(
  entregadorId: string,
  pedidos: PedidoResumoAppEntregador[]
): void {
  const storage = storageLocal()
  if (!storage || !entregadorId.trim()) return
  try {
    storage.setItem(
      CHAVE_CACHE_PEDIDOS_ENTREGADOR_APP,
      montarCachePedidosEntregadorApp({
        entregadorId,
        pedidos,
        gravadoEm: Date.now(),
      })
    )
  } catch {
    /* quota / modo privado */
  }
}

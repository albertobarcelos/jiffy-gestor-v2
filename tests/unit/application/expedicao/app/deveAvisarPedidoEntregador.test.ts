import { describe, expect, it } from 'vitest'
import { deveAvisarPedidoEntregador } from '@/src/application/expedicao/app/deveAvisarPedidoEntregador'

describe('deveAvisarPedidoEntregador', () => {
  it('avisa pedido novo do entregador em rota', () => {
    expect(
      deveAvisarPedidoEntregador({
        entregadorId: 'e1',
        pedidoEntregadorId: 'e1',
        etapa: 'EM_ROTA',
        pedidoId: 'p2',
        idsJaVistos: new Set(['p1']),
      })
    ).toBe(true)
  })

  it('não avisa o que já está na lista nem de outro entregador', () => {
    expect(
      deveAvisarPedidoEntregador({
        entregadorId: 'e1',
        pedidoEntregadorId: 'e1',
        etapa: 'EM_ROTA',
        pedidoId: 'p1',
        idsJaVistos: new Set(['p1']),
      })
    ).toBe(false)
    expect(
      deveAvisarPedidoEntregador({
        entregadorId: 'e1',
        pedidoEntregadorId: 'e2',
        etapa: 'PRONTO',
        pedidoId: 'p3',
        idsJaVistos: new Set(),
      })
    ).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { filtrarPedidosAtivosDoEntregador } from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'

const pedido = (parcial: { entregadorId: string | null; etapa: string | null }) => ({
  ...parcial,
})

describe('filtrarPedidosAtivosDoEntregador', () => {
  it('fica só com PRONTO e EM_ROTA do entregador', () => {
    const lista = filtrarPedidosAtivosDoEntregador(
      [
        pedido({ entregadorId: 'e1', etapa: 'PRONTO' }),
        pedido({ entregadorId: 'e1', etapa: 'EM_ROTA' }),
        pedido({ entregadorId: 'e1', etapa: 'FINALIZADO' }),
        pedido({ entregadorId: 'e2', etapa: 'PRONTO' }),
        pedido({ entregadorId: null, etapa: 'PRONTO' }),
      ],
      'e1'
    )
    expect(lista).toHaveLength(2)
    expect(lista.map(p => p.etapa)).toEqual(['PRONTO', 'EM_ROTA'])
  })

  it('sem id não devolve nada', () => {
    expect(filtrarPedidosAtivosDoEntregador([pedido({ entregadorId: 'e1', etapa: 'PRONTO' })], '')).toEqual([])
  })
})

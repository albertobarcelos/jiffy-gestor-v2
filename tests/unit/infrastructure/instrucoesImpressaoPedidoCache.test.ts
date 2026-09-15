import { describe, expect, it } from 'vitest'
import {
  invalidarInstrucoesImpressaoCache,
  obterInstrucoesImpressaoCache,
  salvarInstrucoesImpressaoCache,
} from '@/src/infrastructure/api/instrucoesImpressaoPedidoCache'
import { salvarPedidoDeliveryDetalheCache, invalidarPedidoDeliveryDetalheCache } from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'

describe('cache de instrucoes de impressao', () => {
  it('invalida instrucoes quando os itens do pedido mudam', () => {
    invalidarPedidoDeliveryDetalheCache('venda-1')
    invalidarInstrucoesImpressaoCache('venda-1')
    salvarInstrucoesImpressaoCache('venda-1', 'est-1', { mapeamentos: [], warnings: [] })
    expect(obterInstrucoesImpressaoCache('venda-1', 'est-1')).not.toBeNull()

    salvarPedidoDeliveryDetalheCache('venda-1', {
      id: 'venda-1',
      produtosLancados: [{ id: 'pl-1', valorFinal: 10 }],
    })
    salvarPedidoDeliveryDetalheCache('venda-1', {
      id: 'venda-1',
      produtosLancados: [
        { id: 'pl-1', valorFinal: 10 },
        { id: 'pl-2', valorFinal: 12 },
      ],
    })

    expect(obterInstrucoesImpressaoCache('venda-1', 'est-1')).toBeNull()
  })

  it('mantem instrucoes quando so a taxa muda', () => {
    invalidarPedidoDeliveryDetalheCache('venda-2')
    invalidarInstrucoesImpressaoCache('venda-2')
    salvarInstrucoesImpressaoCache('venda-2', 'est-1', { mapeamentos: [], warnings: [] })
    salvarPedidoDeliveryDetalheCache('venda-2', {
      id: 'venda-2',
      produtosLancados: [{ id: 'pl-1', valorFinal: 10 }],
      taxasLancadas: [{ tipo: 'entrega', valor: 5 }],
    })
    salvarPedidoDeliveryDetalheCache('venda-2', {
      id: 'venda-2',
      produtosLancados: [{ id: 'pl-1', valorFinal: 10 }],
      taxasLancadas: [{ tipo: 'entrega', valor: 8 }],
    })

    expect(obterInstrucoesImpressaoCache('venda-2', 'est-1')).not.toBeNull()
  })
})

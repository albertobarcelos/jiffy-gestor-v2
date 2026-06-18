import { describe, expect, it, beforeEach } from 'vitest'
import {
  extrairRegistroPedidoDelivery,
  invalidarPedidoDeliveryDetalheCache,
  obterPedidoDeliveryDetalheCache,
  salvarPedidoDeliveryDetalheCache,
} from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'

describe('pedidoDeliveryDetalheCache', () => {
  beforeEach(() => {
    invalidarPedidoDeliveryDetalheCache('venda-1')
  })

  it('extrai registro de payload com wrapper data', () => {
    const registro = extrairRegistroPedidoDelivery({
      data: { id: 'venda-1', numeroVenda: 10 },
    })
    expect(registro.id).toBe('venda-1')
    expect(registro.numeroVenda).toBe(10)
  })

  it('salva e recupera pedido por vendaId', () => {
    salvarPedidoDeliveryDetalheCache('venda-1', { id: 'venda-1', numeroVenda: 42 })
    const cached = obterPedidoDeliveryDetalheCache('venda-1')
    expect(cached?.numeroVenda).toBe(42)
  })

  it('invalidar remove entrada do cache', () => {
    salvarPedidoDeliveryDetalheCache('venda-1', { id: 'venda-1' })
    invalidarPedidoDeliveryDetalheCache('venda-1')
    expect(obterPedidoDeliveryDetalheCache('venda-1')).toBeNull()
  })
})

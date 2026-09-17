import { describe, expect, it } from 'vitest'
import { podeEditarItensPedidoDeliveryDetalhe } from '@/src/domain/services/pedido/RegrasFluxoPedidoGestor'

const BASE = {
  modoVisualizacao: true,
  tabelaOrigemVenda: 'venda_gestor' as const,
  tipoVenda: 'entrega',
  origem: 'GESTOR',
  vendaId: 'venda-1',
  vendaGestorJaCancelada: false,
  statusEtapaOperacional: 'PENDENTE',
}

describe('podeEditarItensPedidoDeliveryDetalhe', () => {
  it('libera add/remove em PENDENTE, EM_PREPARO e PRONTO', () => {
    expect(podeEditarItensPedidoDeliveryDetalhe(BASE)).toBe(true)
    expect(
      podeEditarItensPedidoDeliveryDetalhe({ ...BASE, statusEtapaOperacional: 'EM_PREPARO' })
    ).toBe(true)
    expect(
      podeEditarItensPedidoDeliveryDetalhe({ ...BASE, statusEtapaOperacional: 'PRONTO' })
    ).toBe(true)
  })

  it('bloqueia a partir de EM_ROTA e pedidos cancelados', () => {
    expect(
      podeEditarItensPedidoDeliveryDetalhe({ ...BASE, statusEtapaOperacional: 'EM_ROTA' })
    ).toBe(false)
    expect(
      podeEditarItensPedidoDeliveryDetalhe({ ...BASE, statusEtapaOperacional: 'FINALIZADO' })
    ).toBe(false)
    expect(
      podeEditarItensPedidoDeliveryDetalhe({ ...BASE, vendaGestorJaCancelada: true })
    ).toBe(false)
  })

  it('não edita origem externa nem venda PDV', () => {
    expect(podeEditarItensPedidoDeliveryDetalhe({ ...BASE, origem: 'IFOOD' })).toBe(false)
    expect(
      podeEditarItensPedidoDeliveryDetalhe({ ...BASE, tabelaOrigemVenda: 'venda' })
    ).toBe(false)
    expect(podeEditarItensPedidoDeliveryDetalhe({ ...BASE, modoVisualizacao: false })).toBe(
      false
    )
  })

  it('libera pedidos Jiffy (GESTOR, DELIVERY e JIFFY_DELIVERY)', () => {
    expect(podeEditarItensPedidoDeliveryDetalhe({ ...BASE, origem: 'DELIVERY' })).toBe(true)
    expect(
      podeEditarItensPedidoDeliveryDetalhe({ ...BASE, origem: 'JIFFY_DELIVERY' })
    ).toBe(true)
  })
})

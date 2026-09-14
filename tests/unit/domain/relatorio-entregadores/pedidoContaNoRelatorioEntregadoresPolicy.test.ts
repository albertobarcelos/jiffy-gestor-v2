import { describe, expect, it } from 'vitest'
import { PedidoContaNoRelatorioEntregadoresPolicy } from '@/src/domain/policies/relatorio-entregadores/PedidoContaNoRelatorioEntregadoresPolicy'
import type { PedidoRelatorioEntregadores } from '@/src/domain/relatorio-entregadores/tipos'

const periodo = {
  inicio: new Date(2026, 8, 1, 0, 0, 0, 0),
  fim: new Date(2026, 8, 30, 23, 59, 59, 999),
}

function pedido(
  override: Partial<PedidoRelatorioEntregadores> = {}
): PedidoRelatorioEntregadores {
  return {
    id: 'p1',
    statusDelivery: 'FINALIZADO',
    tipoEntrega: 'entrega',
    entregadorId: 'e1',
    dataCriacao: new Date(2026, 8, 10, 12, 0, 0, 0),
    dataFinalizacao: new Date(2026, 8, 10, 14, 0, 0, 0),
    cobertura: { areaId: 'a1', raioId: null, valorCalculadoSistema: 8 },
    ...override,
  }
}

describe('PedidoContaNoRelatorioEntregadoresPolicy', () => {
  it('aceita pedido finalizado de entrega com entregador no período', () => {
    expect(PedidoContaNoRelatorioEntregadoresPolicy.check(pedido(), periodo)).toBe(true)
  })

  it('rejeita EM_ROTA', () => {
    expect(
      PedidoContaNoRelatorioEntregadoresPolicy.check(pedido({ statusDelivery: 'EM_ROTA' }), periodo)
    ).toBe(false)
  })

  it('rejeita cancelado', () => {
    expect(
      PedidoContaNoRelatorioEntregadoresPolicy.check(
        pedido({ statusDelivery: 'CANCELADO' }),
        periodo
      )
    ).toBe(false)
  })

  it('rejeita retirada', () => {
    expect(
      PedidoContaNoRelatorioEntregadoresPolicy.check(pedido({ tipoEntrega: 'retirada' }), periodo)
    ).toBe(false)
  })

  it('rejeita sem entregador', () => {
    expect(
      PedidoContaNoRelatorioEntregadoresPolicy.check(pedido({ entregadorId: null }), periodo)
    ).toBe(false)
  })

  it('rejeita finalização fora do período', () => {
    expect(
      PedidoContaNoRelatorioEntregadoresPolicy.check(
        pedido({ dataFinalizacao: new Date(2026, 7, 31, 23, 0, 0, 0) }),
        periodo
      )
    ).toBe(false)
  })

  it('aceita pedido criado no período ainda não finalizado', () => {
    expect(
      PedidoContaNoRelatorioEntregadoresPolicy.check(
        pedido({
          statusDelivery: 'PENDENTE',
          dataFinalizacao: null,
          dataCriacao: new Date(2026, 8, 12, 10, 0, 0, 0),
        }),
        periodo
      )
    ).toBe(true)
  })
})

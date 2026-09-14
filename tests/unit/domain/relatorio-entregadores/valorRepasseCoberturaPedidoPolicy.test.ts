import { describe, expect, it } from 'vitest'
import { ValorRepasseCoberturaPedidoPolicy } from '@/src/domain/policies/relatorio-entregadores/ValorRepasseCoberturaPedidoPolicy'
import { idCoberturaRelatorio } from '@/src/domain/relatorio-entregadores/tipos'
import type { CoberturaRelatorio, PedidoRelatorioEntregadores } from '@/src/domain/relatorio-entregadores/tipos'

const areaCentro: CoberturaRelatorio = {
  id: idCoberturaRelatorio('area', 'centro'),
  tipo: 'area',
  origemId: 'centro',
  nome: 'Centro',
  valorTaxa: 8,
}

function pedido(
  cobertura: PedidoRelatorioEntregadores['cobertura']
): PedidoRelatorioEntregadores {
  return {
    id: 'p1',
    statusDelivery: 'FINALIZADO',
    tipoEntrega: 'entrega',
    entregadorId: 'e1',
    dataCriacao: new Date(),
    dataFinalizacao: new Date(),
    cobertura,
  }
}

describe('ValorRepasseCoberturaPedidoPolicy', () => {
  it('usa o valor do snapshot mesmo com override implícito diferente do cadastro', () => {
    const result = ValorRepasseCoberturaPedidoPolicy.resolver(
      pedido({ areaId: 'centro', raioId: null, valorCalculadoSistema: 8 }),
      [areaCentro]
    )
    expect(result).toEqual({
      status: 'ok',
      valor: 8,
      coberturaId: areaCentro.id,
    })
  })

  it('cai no valor atual da área quando o snapshot não tem valorCalculadoSistema', () => {
    const result = ValorRepasseCoberturaPedidoPolicy.resolver(
      pedido({ areaId: 'centro', raioId: null, valorCalculadoSistema: null }),
      [areaCentro]
    )
    expect(result).toEqual({
      status: 'ok',
      valor: 8,
      coberturaId: areaCentro.id,
    })
  })

  it('marca sem cobertura quando não há snapshot', () => {
    expect(ValorRepasseCoberturaPedidoPolicy.resolver(pedido(null), [areaCentro])).toEqual({
      status: 'sem_cobertura',
    })
  })

  it('conta o valor da taxa do pedido mesmo sem área/raio no snapshot', () => {
    const result = ValorRepasseCoberturaPedidoPolicy.resolver(
      pedido({ areaId: null, raioId: null, valorCalculadoSistema: 8 }),
      [areaCentro]
    )
    expect(result).toEqual({
      status: 'ok',
      valor: 8,
      coberturaId: areaCentro.id,
    })
  })
})

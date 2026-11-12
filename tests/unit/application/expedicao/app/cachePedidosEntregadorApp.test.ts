import { describe, expect, it } from 'vitest'
import type { PedidoResumoAppEntregador } from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'
import {
  montarCachePedidosEntregadorApp,
  parseCachePedidosEntregadorApp,
  parsePedidoResumoCacheApp,
} from '@/src/application/expedicao/app/cachePedidosEntregadorApp'

const agora = 1_700_000_000_000

function pedidoStub(id = 'p1'): PedidoResumoAppEntregador {
  return {
    id,
    codigoVenda: 'V1',
    numeroVenda: 1,
    clienteNome: 'A',
    telefone: null,
    endereco: null,
    enderecoNavegacao: null,
    latitude: null,
    longitude: null,
    bairro: null,
    etapa: 'PRONTO',
    valorFinal: 10,
    taxaEntrega: null,
    entregadorId: 'ent-1',
    faltaPagar: 0,
    trocoLevar: 0,
    observacao: null,
    formaPagamento: null,
    meioPagamentoIds: [],
    cobrancas: [],
  }
}

describe('parsePedidoResumoCacheApp', () => {
  it('rejeita item sem id e aceita snapshot mínimo', () => {
    expect(parsePedidoResumoCacheApp({ clienteNome: 'A' })).toBeNull()
    expect(parsePedidoResumoCacheApp({ id: 'p1' })?.id).toBe('p1')
    expect(parsePedidoResumoCacheApp({ id: 'p1' })?.cobrancas).toEqual([])
  })
})

describe('parseCachePedidosEntregadorApp', () => {
  it('devolve a lista do mesmo entregador enquanto o cache é fresco', () => {
    const pedidos = [pedidoStub()]
    const bruto = montarCachePedidosEntregadorApp({
      entregadorId: 'ent-1',
      pedidos,
      gravadoEm: agora - 60_000,
    })
    expect(parseCachePedidosEntregadorApp({ bruto, entregadorId: 'ent-1', agora })).toEqual(pedidos)
  })

  it('ignora cache de outro entregador, vencido ou inválido', () => {
    const fresco = montarCachePedidosEntregadorApp({
      entregadorId: 'ent-1',
      pedidos: [pedidoStub()],
      gravadoEm: agora,
    })
    expect(
      parseCachePedidosEntregadorApp({ bruto: fresco, entregadorId: 'ent-2', agora })
    ).toBeNull()
    expect(
      parseCachePedidosEntregadorApp({
        bruto: montarCachePedidosEntregadorApp({
          entregadorId: 'ent-1',
          pedidos: [pedidoStub()],
          gravadoEm: agora - 25 * 60 * 60 * 1000,
        }),
        entregadorId: 'ent-1',
        agora,
      })
    ).toBeNull()
    expect(
      parseCachePedidosEntregadorApp({ bruto: '{', entregadorId: 'ent-1', agora })
    ).toBeNull()
    expect(
      parseCachePedidosEntregadorApp({
        bruto: JSON.stringify({
          v: 1,
          entregadorId: 'ent-1',
          pedidos: [{ clienteNome: 'sem id' }],
          gravadoEm: agora,
        }),
        entregadorId: 'ent-1',
        agora,
      })
    ).toBeNull()
  })

  it('aceita lista vazia gravada de propósito', () => {
    const bruto = montarCachePedidosEntregadorApp({
      entregadorId: 'ent-1',
      pedidos: [],
      gravadoEm: agora,
    })
    expect(parseCachePedidosEntregadorApp({ bruto, entregadorId: 'ent-1', agora })).toEqual([])
  })
})

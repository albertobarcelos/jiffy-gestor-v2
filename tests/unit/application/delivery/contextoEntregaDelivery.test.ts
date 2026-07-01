import { describe, expect, it } from 'vitest'
import {
  enderecoSnapshotParaEnderecoEntregaDetalhe,
  extrairEnderecoEntregaSnapshotDeVendaData,
  buildUpdateEnderecoEntregaPedidoPayload,
} from '@/src/application/mappers/ContextoEntregaDeliveryMapper'
import { clienteDeliveryParaMoradas } from '@/src/application/mappers/ClienteDeliveryMoradaMapper'
import { adaptPedidoDeliveryToVendaGestorApiResponse } from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'

describe('ContextoEntregaDeliveryMapper', () => {
  it('extrai endereço do snapshot contextoEntrega', () => {
    const vendaData = {
      contextoEntrega: {
        destinatarioTelefone: '65999998888',
        enderecoEntrega: {
          etiqueta: 'casa',
          rua: 'Rua Snapshot',
          numero: '10',
          bairro: 'Centro',
          cidade: 'Campo Grande',
          estado: 'MS',
          cep: '79002000',
        },
      },
    }

    const endereco = extrairEnderecoEntregaSnapshotDeVendaData(vendaData)
    expect(endereco?.rua).toBe('Rua Snapshot')
    expect(endereco?.numero).toBe('10')
  })

  it('monta PATCH com enderecoDeliveryId', () => {
    const payload = buildUpdateEnderecoEntregaPedidoPayload({
      enderecoDeliveryId: 'morada-123',
    })
    expect(payload).toEqual({ enderecoEntrega: { enderecoDeliveryId: 'morada-123' } })
  })

  it('monta PATCH com endereco manual', () => {
    const payload = buildUpdateEnderecoEntregaPedidoPayload({
      enderecoManual: {
        tipoEtiqueta: 'trabalho',
        endereco: {
          rua: 'Av B',
          numero: '200',
          bairro: 'Bairro',
          cep: '79002001',
        },
      },
    })

    expect(payload.enderecoEntrega.endereco?.etiqueta).toBe('trabalho')
    expect(payload.enderecoEntrega.endereco?.rua).toBe('Av B')
  })
})

describe('ClienteDeliveryMoradaMapper — ultimaUtilizacaoEm', () => {
  it('ordena moradas com uso recente primeiro', () => {
    const moradas = clienteDeliveryParaMoradas({
      telefone: '65999998888',
      enderecos: [
        { id: 'a', etiqueta: 'casa', rua: 'Antiga', cep: '1', ultimaUtilizacaoEm: '2026-01-01T00:00:00Z' },
        { id: 'b', etiqueta: 'trabalho', rua: 'Recente', cep: '2', ultimaUtilizacaoEm: '2026-06-01T00:00:00Z' },
      ],
    })

    expect(moradas[0]?.id).toBe('b')
    expect(moradas[1]?.id).toBe('a')
  })
})

describe('PedidoDeliveryDetalheAdapter — contextoEntrega', () => {
  it('propaga enderecoEntrega a partir do contextoEntrega', () => {
    const adaptado = adaptPedidoDeliveryToVendaGestorApiResponse({
      id: 'ped-1',
      tipoEntrega: 'entrega',
      statusDelivery: 'PENDENTE',
      valorFinal: 50,
      totalPago: 50,
      totalFaltaPagar: 0,
      cobrancas: [],
      produtosLancados: [],
      contextoEntrega: {
        destinatarioTelefone: '65999998888',
        enderecoEntrega: {
          etiqueta: 'casa',
          rua: 'Rua do Pedido',
          numero: '1',
          cep: '79002000',
        },
      },
    })

    const endereco = enderecoSnapshotParaEnderecoEntregaDetalhe(
      adaptado.enderecoEntrega as Parameters<typeof enderecoSnapshotParaEnderecoEntregaDetalhe>[0]
    )
    expect(endereco?.rua).toBe('Rua do Pedido')
  })
})

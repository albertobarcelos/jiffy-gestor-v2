import { describe, expect, it } from 'vitest'
import { validarInformacoesPedidoEntrega } from '@/src/domain/services/pedido/ValidadorPedidoGestor'

const base = {
  pedidoDeliveryGestor: true,
  clienteEntregaVinculadoId: 'cli-1',
  pedidoComEntrega: true,
  temEnderecoEntrega: true,
}

describe('validarInformacoesPedidoEntrega', () => {
  it('não bloqueia o wizard por falta de pin ou cobertura fora', () => {
    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: false,
        enderecoEntregaCoberturaStatus: 'fora',
      })
    ).toBeNull()
  })

  it('bloqueia Pagamento enquanto a taxa automática está calculando', () => {
    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: true,
        enderecoEntregaCoberturaStatus: 'pendente',
        taxaEntregaOverride: 'automatica',
      })?.message
    ).toMatch(/aguarde o cálculo da taxa/i)
  })

  it('libera Pagamento se o atendente escolher outra taxa durante o cálculo', () => {
    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: true,
        enderecoEntregaCoberturaStatus: 'pendente',
        taxaEntregaOverride: 'catalogo',
      })
    ).toBeNull()

    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: true,
        enderecoEntregaCoberturaStatus: 'pendente',
        taxaEntregaOverride: 'sem_taxa',
      })
    ).toBeNull()
  })

  it('ainda exige cliente e endereço de entrega', () => {
    expect(
      validarInformacoesPedidoEntrega({
        pedidoDeliveryGestor: true,
        pedidoComEntrega: true,
        temEnderecoEntrega: true,
      })?.message
    ).toMatch(/cliente/i)

    expect(
      validarInformacoesPedidoEntrega({
        pedidoDeliveryGestor: true,
        telefoneClienteDelivery: '65992934536',
        pedidoComEntrega: true,
        temEnderecoEntrega: true,
      })?.message
    ).toMatch(/cliente nesta empresa/i)

    expect(
      validarInformacoesPedidoEntrega({
        pedidoDeliveryGestor: true,
        clienteEntregaVinculadoId: 'cli-1',
        pedidoComEntrega: true,
        temEnderecoEntrega: false,
      })?.message
    ).toMatch(/endereço de entrega/i)
  })
})

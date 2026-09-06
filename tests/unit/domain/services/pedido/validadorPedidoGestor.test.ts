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

    expect(
      validarInformacoesPedidoEntrega({
        ...base,
        enderecoEntregaTemGeo: true,
        enderecoEntregaCoberturaStatus: 'pendente',
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
        clienteEntregaVinculadoId: 'cli-1',
        pedidoComEntrega: true,
        temEnderecoEntrega: false,
      })?.message
    ).toMatch(/endereço de entrega/i)
  })
})

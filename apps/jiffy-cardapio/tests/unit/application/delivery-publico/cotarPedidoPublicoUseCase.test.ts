import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckoutFormData } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import { CotarPedidoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/CotarPedidoPublicoUseCase'
import { GarantirClienteDeliveryPublicoUseCase } from '@/src/application/use-cases/delivery-publico/GarantirClienteDeliveryPublicoUseCase'
import { GarantirEnderecoEntregaPublicoUseCase } from '@/src/application/use-cases/delivery-publico/GarantirEnderecoEntregaPublicoUseCase'
import {
  publicDeliveryClienteAdapter,
  publicDeliveryCotacaoAdapter,
} from '@/src/infrastructure/api/adapters/PublicDeliveryApiAdapter'
import * as publicDeliveryApi from '@/src/infrastructure/api/publicDeliveryApi'

vi.mock('@/src/infrastructure/api/publicDeliveryApi', () => ({
  buscarClienteDeliveryPublico: vi.fn(),
  criarClienteDeliveryPublico: vi.fn(),
  atualizarClienteDeliveryPublico: vi.fn(),
  cotarPedidoPublico: vi.fn(),
}))

function formBase(overrides: Partial<CheckoutFormData> = {}): CheckoutFormData {
  return {
    tipoEntrega: 'retirada',
    telefone: '11999999999',
    telefonePaisIso2: 'BR',
    nome: 'Cliente',
    modoEndereco: 'existente',
    enderecoIdSelecionado: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    complemento: '',
    pontoReferencia: '',
    etiquetaEndereco: 'casa',
    apelidoEndereco: '',
    pagamentos: [],
    observacaoPedido: '',
    cpfNotaFiscal: '',
    modoTempo: 'imediato',
    ...overrides,
  }
}

function criarUseCase() {
  return new CotarPedidoPublicoUseCase(
    publicDeliveryCotacaoAdapter,
    new GarantirEnderecoEntregaPublicoUseCase(publicDeliveryClienteAdapter),
    new GarantirClienteDeliveryPublicoUseCase(publicDeliveryClienteAdapter)
  )
}

describe('CotarPedidoPublicoUseCase', () => {
  beforeEach(() => {
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockReset()
    vi.mocked(publicDeliveryApi.criarClienteDeliveryPublico).mockReset()
    vi.mocked(publicDeliveryApi.cotarPedidoPublico).mockReset()
    vi.mocked(publicDeliveryApi.cotarPedidoPublico).mockResolvedValue({
      tokenCotacao: 'token-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
      tipoEntrega: 'retirada',
      produtos: [],
      subtotalProdutos: 20,
      valorFinal: 20,
      entrega: null,
    })
  })

  it('cadastra cliente delivery antes de cotar retirada sem cadastro', async () => {
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockResolvedValue(null)
    vi.mocked(publicDeliveryApi.criarClienteDeliveryPublico).mockResolvedValue({
      telefone: '11999999999',
      nome: 'Cliente',
      cpf: null,
      clienteIdVinculado: null,
      enderecos: [],
    })

    const result = await criarUseCase().execute({
      slug: 'loja',
      telefoneApi: '11999999999',
      nomeEfetivo: 'Cliente',
      itens: [{ produtoId: 'p1', quantidade: 1, observacoes: [], complementos: [] }],
      form: formBase(),
      clienteLookup: null,
    })

    expect(result.ok).toBe(true)
    expect(publicDeliveryApi.criarClienteDeliveryPublico).toHaveBeenCalledOnce()
    expect(publicDeliveryApi.cotarPedidoPublico).toHaveBeenCalledOnce()
  })
})

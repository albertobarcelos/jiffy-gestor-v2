import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckoutFormData } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { EnviarPedidoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/EnviarPedidoPublicoUseCase'
import { garantirEnderecoEntregaPublicoUseCase } from '@/src/application/use-cases/delivery-publico/GarantirEnderecoEntregaPublicoUseCase'
import * as publicDeliveryApi from '@/src/infrastructure/api/publicDeliveryApi'

vi.mock('@/src/infrastructure/api/publicDeliveryApi', () => ({
  buscarClienteDeliveryPublico: vi.fn(),
  atualizarClienteDeliveryPublico: vi.fn(),
  criarPedidoPublico: vi.fn(),
  criarClienteDeliveryPublico: vi.fn(),
}))

function formBase(overrides: Partial<CheckoutFormData> = {}): CheckoutFormData {
  return {
    tipoEntrega: 'retirada',
    telefone: '',
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
    pagamentos: [{ meioPagamentoId: 'meio-pix', valor: 20 }],
    observacaoPedido: '',
    cpfNotaFiscal: '',
    modoTempo: 'imediato',
    ...overrides,
  }
}

const item = {
  produtoId: 'p1',
  quantidade: 1,
  observacoes: [] as string[],
  complementos: [],
}

const tokenCotacao = 'token-teste'

describe('EnviarPedidoPublicoUseCase', () => {
  beforeEach(() => {
    vi.mocked(publicDeliveryApi.criarPedidoPublico).mockReset()
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockReset()
    vi.mocked(publicDeliveryApi.atualizarClienteDeliveryPublico).mockReset()
    vi.mocked(publicDeliveryApi.criarPedidoPublico).mockResolvedValue({ id: 'pedido-1' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cria pedido de retirada sem PATCH de CPF', async () => {
    const useCase = new EnviarPedidoPublicoUseCase()
    const result = await useCase.execute({
      slug: 'loja',
      telefoneApi: '11999999999',
      nomeEfetivo: 'Cliente',
      itens: [item],
      total: 20,
      form: formBase(),
      clienteLookup: null,
      tokenCotacao,
    })

    expect(result.ok).toBe(true)
    expect(publicDeliveryApi.criarPedidoPublico).toHaveBeenCalledOnce()
    expect(publicDeliveryApi.atualizarClienteDeliveryPublico).not.toHaveBeenCalled()
  })

  it('faz PATCH de CPF quando cliente existe sem CPF', async () => {
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockResolvedValue({
      telefone: '11999999999',
      nome: 'Cliente',
      cpf: null,
      clienteIdVinculado: null,
      enderecos: [],
    })
    vi.mocked(publicDeliveryApi.atualizarClienteDeliveryPublico).mockResolvedValue({
      telefone: '11999999999',
      nome: 'Cliente',
      cpf: '12345678909',
      clienteIdVinculado: null,
      enderecos: [],
    })

    const useCase = new EnviarPedidoPublicoUseCase()
    const result = await useCase.execute({
      slug: 'loja',
      telefoneApi: '11999999999',
      nomeEfetivo: 'Cliente',
      itens: [item],
      total: 20,
      form: formBase({ cpfNotaFiscal: '12345678909' }),
      clienteLookup: null,
      tokenCotacao,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(publicDeliveryApi.atualizarClienteDeliveryPublico).toHaveBeenCalledWith(
      '11999999999',
      { cpf: '12345678909' }
    )
    expect(result.clienteAtualizado?.cpf).toBe('12345678909')
    expect(publicDeliveryApi.criarPedidoPublico).toHaveBeenCalledOnce()
  })

  it('não faz PATCH se cliente já tem CPF', async () => {
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockResolvedValue({
      telefone: '11999999999',
      nome: 'Cliente',
      cpf: '11144477735',
      clienteIdVinculado: null,
      enderecos: [],
    })

    const useCase = new EnviarPedidoPublicoUseCase()
    await useCase.execute({
      slug: 'loja',
      telefoneApi: '11999999999',
      nomeEfetivo: 'Cliente',
      itens: [item],
      total: 20,
      form: formBase({ cpfNotaFiscal: '12345678909' }),
      clienteLookup: null,
      tokenCotacao,
    })

    expect(publicDeliveryApi.atualizarClienteDeliveryPublico).not.toHaveBeenCalled()
    expect(publicDeliveryApi.criarPedidoPublico).toHaveBeenCalledOnce()
  })

  it('garante endereço antes do create em entrega', async () => {
    const garantirSpy = vi
      .spyOn(garantirEnderecoEntregaPublicoUseCase, 'execute')
      .mockResolvedValue('end-1')

    const useCase = new EnviarPedidoPublicoUseCase()
    const result = await useCase.execute({
      slug: 'loja',
      telefoneApi: '11999999999',
      nomeEfetivo: 'Cliente',
      itens: [item],
      total: 20,
      form: formBase({
        tipoEntrega: 'entrega',
        modoEndereco: 'existente',
        enderecoIdSelecionado: 'end-1',
      }),
      clienteLookup: null,
      tokenCotacao,
    })

    expect(result.ok).toBe(true)
    expect(garantirSpy).toHaveBeenCalledOnce()
    const payload = vi.mocked(publicDeliveryApi.criarPedidoPublico).mock.calls[0]?.[0]
    expect(payload?.cliente.enderecoIdEntrega).toBe('end-1')
    expect(payload?.tokenCotacao).toBe(tokenCotacao)
  })

  it('retorna erro se telefone inválido', async () => {
    const useCase = new EnviarPedidoPublicoUseCase()
    const result = await useCase.execute({
      slug: 'loja',
      telefoneApi: '12',
      nomeEfetivo: 'Cliente',
      itens: [item],
      total: 20,
      form: formBase(),
      clienteLookup: null,
      tokenCotacao,
    })
    expect(result).toEqual({ ok: false, error: 'Informe um telefone válido' })
    expect(publicDeliveryApi.criarPedidoPublico).not.toHaveBeenCalled()
  })
})

describe('GarantirEnderecoEntregaPublicoUseCase', () => {
  beforeEach(() => {
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockReset()
    vi.mocked(publicDeliveryApi.atualizarClienteDeliveryPublico).mockReset()
    vi.mocked(publicDeliveryApi.criarClienteDeliveryPublico).mockReset()
  })

  it('retorna id existente sem criar endereço', async () => {
    const id = await garantirEnderecoEntregaPublicoUseCase.execute({
      telefone: '11999999999',
      nome: 'Cliente',
      modoEndereco: 'existente',
      enderecoIdSelecionado: 'end-abc',
      clienteLookup: {
        telefone: '11999999999',
        nome: 'Cliente',
        cpf: null,
        clienteIdVinculado: null,
        enderecos: [],
      },
      enderecoNovo: {
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
      },
    })
    expect(id).toBe('end-abc')
    expect(publicDeliveryApi.criarClienteDeliveryPublico).not.toHaveBeenCalled()
  })

  it('cria cliente com endereço quando não existe', async () => {
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockResolvedValue(null)
    vi.mocked(publicDeliveryApi.criarClienteDeliveryPublico).mockResolvedValue({
      telefone: '11999999999',
      nome: 'Cliente',
      cpf: null,
      clienteIdVinculado: null,
      enderecos: [
        {
          id: 'end-novo',
          etiqueta: 'casa',
          rua: 'Rua A',
          numero: '10',
          bairro: 'Centro',
          cidade: 'SP',
          estado: 'SP',
          cep: null,
          complemento: null,
        },
      ],
    } satisfies ClienteDeliveryPublicoDTO)

    const geoMock = {
      enderecoLocalizacao: {
        type: 'Point' as const,
        coordinates: [-46.6333, -23.5505] as [number, number],
      },
      pinPosition: {
        type: 'Point' as const,
        coordinates: [-46.6333, -23.5505] as [number, number],
      },
    }

    const id = await garantirEnderecoEntregaPublicoUseCase.execute({
      telefone: '11999999999',
      nome: 'Cliente',
      modoEndereco: 'novo',
      enderecoIdSelecionado: null,
      clienteLookup: null,
      enderecoNovo: {
        rua: 'Rua A',
        numero: '10',
        bairro: 'Centro',
        cidade: 'SP',
        estado: 'SP',
        etiqueta: 'casa',
      },
      geo: geoMock,
    })

    expect(id).toBe('end-novo')
    expect(publicDeliveryApi.criarClienteDeliveryPublico).toHaveBeenCalledOnce()
  })
})

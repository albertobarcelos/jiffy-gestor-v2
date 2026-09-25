import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { GarantirClienteDeliveryPublicoUseCase } from '@/src/application/use-cases/delivery-publico/GarantirClienteDeliveryPublicoUseCase'
import { publicDeliveryClienteAdapter } from '@/src/infrastructure/api/adapters/PublicDeliveryApiAdapter'
import * as publicDeliveryApi from '@/src/infrastructure/api/publicDeliveryApi'

vi.mock('@/src/infrastructure/api/publicDeliveryApi', () => ({
  buscarClienteDeliveryPublico: vi.fn(),
  criarClienteDeliveryPublico: vi.fn(),
  atualizarClienteDeliveryPublico: vi.fn(),
}))

const cliente: ClienteDeliveryPublicoDTO = {
  telefone: '11999999999',
  nome: 'Cliente',
  cpf: null,
  clienteIdVinculado: null,
  enderecos: [],
}

describe('GarantirClienteDeliveryPublicoUseCase', () => {
  beforeEach(() => {
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockReset()
    vi.mocked(publicDeliveryApi.criarClienteDeliveryPublico).mockReset()
  })

  it('reusa o lookup sem chamar a API', async () => {
    const useCase = new GarantirClienteDeliveryPublicoUseCase(publicDeliveryClienteAdapter)
    const result = await useCase.execute({
      telefone: '11999999999',
      nome: 'Cliente',
      clienteLookup: cliente,
    })

    expect(result.telefone).toBe('11999999999')
    expect(publicDeliveryApi.buscarClienteDeliveryPublico).not.toHaveBeenCalled()
    expect(publicDeliveryApi.criarClienteDeliveryPublico).not.toHaveBeenCalled()
  })

  it('cria o cliente quando o telefone ainda não existe', async () => {
    vi.mocked(publicDeliveryApi.buscarClienteDeliveryPublico).mockResolvedValue(null)
    vi.mocked(publicDeliveryApi.criarClienteDeliveryPublico).mockResolvedValue(cliente)

    const useCase = new GarantirClienteDeliveryPublicoUseCase(publicDeliveryClienteAdapter)
    const result = await useCase.execute({
      telefone: '11999999999',
      nome: 'Cliente',
      clienteLookup: null,
    })

    expect(result.telefone).toBe('11999999999')
    expect(publicDeliveryApi.criarClienteDeliveryPublico).toHaveBeenCalledWith({
      telefone: '11999999999',
      nome: 'Cliente',
    })
  })
})

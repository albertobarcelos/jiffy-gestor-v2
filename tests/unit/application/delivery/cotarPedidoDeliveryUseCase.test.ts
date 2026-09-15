import { describe, expect, it, vi } from 'vitest'
import { CotarPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/CotarPedidoDeliveryUseCase'
import {
  montarCotacaoPedidoDeliveryBackend,
  parseResultadoCotacaoTaxaMorada,
} from '@/src/application/mappers/CotacaoPedidoDeliveryMapper'
import type { ICotacaoPedidoDeliveryRepository } from '@/src/domain/repositories/ICotacaoPedidoDeliveryRepository'
import { ApiError } from '@/src/infrastructure/api/apiClient'

describe('CotacaoPedidoDeliveryMapper', () => {
  it('monta payload autenticado sem slug e sem origem', () => {
    const payload = montarCotacaoPedidoDeliveryBackend({
      tipoEntrega: 'entrega',
      cliente: { telefone: '65999998888', enderecoIdEntrega: 'end-1' },
      produtos: [{ produtoId: 'prod-1', quantidade: 1 }],
    })

    expect(payload).not.toHaveProperty('slug')
    expect(payload).not.toHaveProperty('origem')
    expect(payload.cliente.enderecoIdEntrega).toBe('end-1')
  })

  it('lê a taxa oficial da cotação', () => {
    const resultado = parseResultadoCotacaoTaxaMorada({
      entrega: { taxaEntrega: 8 },
    })
    expect(resultado).toEqual({ status: 'ok', valorTaxa: 8 })
  })

  it('marca fora da cobertura pela mensagem do backend', () => {
    const resultado = parseResultadoCotacaoTaxaMorada(null, {
      status: 400,
      message: 'Endereço fora da cobertura de entrega',
    })
    expect(resultado).toEqual({ status: 'fora' })
  })
})

describe('CotarPedidoDeliveryUseCase', () => {
  it('encaminha o JWT e não busca slug nem envia origem', async () => {
    const cotar = vi.fn().mockResolvedValue({ entrega: { taxaEntrega: 8 } })
    const repo: ICotacaoPedidoDeliveryRepository = { cotar }
    const useCase = new CotarPedidoDeliveryUseCase(repo)

    const resultado = await useCase.execute(
      {
        tipoEntrega: 'entrega',
        cliente: { telefone: '65999998888', enderecoIdEntrega: 'end-1' },
        produtos: [{ produtoId: 'prod-1', quantidade: 1 }],
      },
      'token-test'
    )

    expect(resultado).toEqual({ status: 'ok', valorTaxa: 8 })
    expect(cotar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEntrega: 'entrega',
        cliente: { telefone: '65999998888', enderecoIdEntrega: 'end-1' },
      }),
      'token-test'
    )
    expect(cotar.mock.calls[0][0]).not.toHaveProperty('slug')
    expect(cotar.mock.calls[0][0]).not.toHaveProperty('origem')
  })

  it('propaga fora da cobertura', async () => {
    const repo: ICotacaoPedidoDeliveryRepository = {
      cotar: vi.fn().mockRejectedValue(new ApiError('Endereço fora da cobertura', 400, {})),
    }
    const useCase = new CotarPedidoDeliveryUseCase(repo)

    const resultado = await useCase.execute(
      {
        tipoEntrega: 'entrega',
        cliente: { telefone: '65999998888', enderecoIdEntrega: 'end-1' },
        produtos: [{ produtoId: 'prod-1', quantidade: 1 }],
      },
      'token-test'
    )

    expect(resultado).toEqual({ status: 'fora' })
  })
})

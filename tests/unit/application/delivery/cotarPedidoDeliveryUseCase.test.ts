import { describe, expect, it, vi } from 'vitest'
import { CotarPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/CotarPedidoDeliveryUseCase'
import {
  montarCotacaoPedidoDeliveryBackend,
  parseResultadoCotacaoTaxaMorada,
} from '@/src/application/mappers/CotacaoPedidoDeliveryMapper'
import type { ICotacaoPedidoDeliveryRepository } from '@/src/domain/repositories/ICotacaoPedidoDeliveryRepository'
import { ApiError } from '@/src/infrastructure/api/apiClient'

describe('CotacaoPedidoDeliveryMapper', () => {
  it('monta payload público com slug e sem origem', () => {
    const payload = montarCotacaoPedidoDeliveryBackend({
      slug: 'minha-pizzaria',
      body: {
        tipoEntrega: 'entrega',
        cliente: { telefone: '65999998888', enderecoIdEntrega: 'end-1' },
        produtos: [{ produtoId: 'prod-1', quantidade: 1 }],
      },
    })

    expect(payload.slug).toBe('minha-pizzaria')
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
  it('injeta o slug da empresa autenticada e não envia origem', async () => {
    const cotarPublico = vi.fn().mockResolvedValue({ entrega: { taxaEntrega: 8 } })
    const repo: ICotacaoPedidoDeliveryRepository = {
      buscarSlugEmpresaDelivery: vi.fn().mockResolvedValue('top-cmtu8c7v'),
      cotarPublico,
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

    expect(resultado).toEqual({ status: 'ok', valorTaxa: 8 })
    expect(cotarPublico).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'top-cmtu8c7v',
        tipoEntrega: 'entrega',
      })
    )
    expect(cotarPublico.mock.calls[0][0]).not.toHaveProperty('origem')
  })

  it('propaga fora da cobertura', async () => {
    const repo: ICotacaoPedidoDeliveryRepository = {
      buscarSlugEmpresaDelivery: vi.fn().mockResolvedValue('top-cmtu8c7v'),
      cotarPublico: vi
        .fn()
        .mockRejectedValue(new ApiError('Endereço fora da cobertura', 400, {})),
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

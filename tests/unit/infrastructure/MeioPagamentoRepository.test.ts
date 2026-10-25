import { describe, expect, it, vi } from 'vitest'
import { MeioPagamentoRepository } from '@/src/infrastructure/database/repositories/MeioPagamentoRepository'
import type { ApiClient } from '@/src/infrastructure/api/apiClient'

function repoComRequest(request: ApiClient['request']): MeioPagamentoRepository {
  return new MeioPagamentoRepository({ request } as ApiClient, 'token')
}

describe('MeioPagamentoRepository', () => {
  it('lista com o filtro de retirada na URL da API', async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        items: [{ id: 'mp-1', nome: 'PIX', ativoRetiradaDelivery: true }],
        count: 1,
      },
    })
    const repo = repoComRequest(request)

    await repo.buscarMeiosPagamentos({
      limit: 100,
      offset: 0,
      ativoRetiradaDelivery: true,
    })

    expect(request).toHaveBeenCalledWith(
      '/api/v1/pagamento/meios-pagamento?limit=100&offset=0&ativoRetiradaDelivery=true',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('cria sem ligar retirada por omissão', async () => {
    const request = vi.fn().mockResolvedValue({
      data: { id: 'mp-1', nome: 'PIX' },
    })
    const repo = repoComRequest(request)

    await repo.criarMeioPagamento({ nome: 'PIX' })

    const body = JSON.parse(String(request.mock.calls[0][1].body)) as {
      ativoEntregaDelivery: boolean
      ativoRetiradaDelivery: boolean
    }
    expect(body.ativoEntregaDelivery).toBe(false)
    expect(body.ativoRetiradaDelivery).toBe(false)
  })
})

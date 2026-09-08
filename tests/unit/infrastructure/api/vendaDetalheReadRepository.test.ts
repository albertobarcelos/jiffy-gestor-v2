import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidarPedidoDeliveryDetalheCache } from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

vi.mock('@/src/presentation/utils/fetchGestorApi', () => ({
  fetchGestorApi: vi.fn(),
}))

import { VendaDetalheReadRepository } from '@/src/infrastructure/api/repositories/VendaDetalheReadRepository'

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('VendaDetalheReadRepository.loadVenda', () => {
  const repo = new VendaDetalheReadRepository()
  const fetchMock = vi.mocked(fetchGestorApi)

  beforeEach(() => {
    fetchMock.mockReset()
    invalidarPedidoDeliveryDetalheCache('venda-rota')
  })

  it('cai no GET venda_gestor quando o módulo delivery responde 500', async () => {
    fetchMock.mockImplementation(async url => {
      const path = String(url)
      if (path.includes('/api/delivery/pedidos/')) {
        return jsonResponse(500, { error: 'Erro ao buscar venda externa por id' })
      }
      if (path.includes('/api/vendas/gestor/')) {
        return jsonResponse(200, {
          id: 'venda-rota',
          tipoVenda: 'entrega',
          numeroVenda: 24,
          codigoVenda: 'ABC',
        })
      }
      throw new Error(`URL inesperada: ${path}`)
    })

    const venda = await repo.loadVenda('venda-rota', 'venda_gestor', 'token', {
      preferirModuloDelivery: true,
    })

    expect(venda.id).toBe('venda-rota')
    expect(venda.numeroVenda).toBe(24)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('não chama venda_gestor quando o GET delivery funciona', async () => {
    fetchMock.mockImplementation(async url => {
      const path = String(url)
      if (path.includes('/api/delivery/pedidos/')) {
        return jsonResponse(200, {
          id: 'venda-rota',
          tipoEntrega: 'entrega',
          statusDelivery: 'EM_ROTA',
          numeroVenda: 24,
        })
      }
      throw new Error(`não deveria buscar venda_gestor: ${path}`)
    })

    const venda = await repo.loadVenda('venda-rota', 'venda_gestor', 'token', {
      preferirModuloDelivery: true,
    })

    expect(venda.id).toBe('venda-rota')
    expect(venda.statusEtapaOperacional).toBe('EM_ROTA')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('propaga o erro se delivery e venda_gestor falharem', async () => {
    fetchMock.mockImplementation(async url => {
      const path = String(url)
      if (path.includes('/api/delivery/pedidos/')) {
        return jsonResponse(500, { error: 'Erro ao buscar venda externa por id' })
      }
      return jsonResponse(404, { error: 'Venda não encontrada' })
    })

    await expect(
      repo.loadVenda('venda-rota', 'venda_gestor', 'token', {
        preferirModuloDelivery: true,
      })
    ).rejects.toThrow('Venda não encontrada')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GetCatalogoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { catalogoPublicoCacheTag } from '@/src/infrastructure/cache/catalogoPublicoCache'

const request = vi.fn()

vi.mock('@/src/infrastructure/api/apiClient', () => ({
  ApiClient: class {
    request = request
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number, public data?: unknown) {
      super(message)
      this.status = status
    }
  },
}))

import { fetchCatalogoPublicoUpstream } from '@/src/infrastructure/api/fetchCatalogoPublicoUpstream'

const catalogoVazio = {
  empresa: {
    id: 'e1',
    nomeFantasia: 'Loja',
    slug: 'nexsyn',
    telefone: null,
    segmento: null,
    logoUrl: null,
    bannerUrl: null,
    endereco: null,
  },
  funcionamento: {},
  catalogo: {
    gruposProdutos: [],
    gruposComplementos: [],
    complementos: [],
    paginacao: {
      count: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
  },
} as GetCatalogoPublicoResponseDTO

describe('fetchCatalogoPublicoUpstream', () => {
  beforeEach(() => {
    request.mockReset()
    request.mockResolvedValue({ data: catalogoVazio, status: 200 })
  })

  it('manda revalidate 30 com tag do slug — nao um catalogo global', async () => {
    await fetchCatalogoPublicoUpstream(' nexsyn ')

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/delivery/catalogo/nexsyn?'),
      expect.objectContaining({
        method: 'GET',
        next: {
          revalidate: 30,
          tags: [catalogoPublicoCacheTag('nexsyn')],
        },
      })
    )
  })

  it('isola a tag quando o slug muda', async () => {
    await fetchCatalogoPublicoUpstream('outra-loja')

    const init = request.mock.calls[0]?.[1] as {
      next: { tags: string[] }
    }
    expect(init.next.tags).toEqual([catalogoPublicoCacheTag('outra-loja')])
    expect(init.next.tags[0]).not.toBe(catalogoPublicoCacheTag('nexsyn'))
  })
})

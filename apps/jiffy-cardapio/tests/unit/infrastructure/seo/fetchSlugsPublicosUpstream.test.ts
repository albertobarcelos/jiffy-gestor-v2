import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn()

vi.mock('@/src/infrastructure/api/apiClient', () => ({
  ApiClient: class {
    request = request
  },
}))

import { fetchSlugsPublicosUpstream } from '@/src/infrastructure/seo/fetchSlugsPublicosUpstream'

describe('fetchSlugsPublicosUpstream', () => {
  beforeEach(() => {
    request.mockReset()
  })

  it('chama o endpoint publico e devolve slugs', async () => {
    request.mockResolvedValue({ data: { slugs: ['nexsyn', 'loja-2'] }, status: 200 })
    await expect(fetchSlugsPublicosUpstream()).resolves.toEqual(['nexsyn', 'loja-2'])
    expect(request).toHaveBeenCalledWith(
      '/api/v1/delivery/slugs-publicos',
      expect.objectContaining({
        method: 'GET',
        next: expect.objectContaining({ tags: ['slugs-publicos'] }),
      })
    )
  })

  it('endpoint fora do ar nao quebra o sitemap', async () => {
    request.mockRejectedValue(new Error('404'))
    await expect(fetchSlugsPublicosUpstream()).resolves.toEqual([])
  })
})

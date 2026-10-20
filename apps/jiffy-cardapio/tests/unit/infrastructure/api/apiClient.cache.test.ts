import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

function jsonOk(body: unknown = { ok: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('ApiClient cache multi-empresa', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST fica no-store — nao mistura cotacao entre lojas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonOk())
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient('https://api.example')
    await client.request('/api/v1/delivery/cotacao', {
      method: 'POST',
      body: JSON.stringify({ slug: 'nexsyn' }),
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.cache).toBe('no-store')
    expect(
      (init as RequestInit & { next?: unknown }).next
    ).toBeUndefined()
  })

  it('GET com next.revalidate nao forca no-store', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonOk())
    vi.stubGlobal('fetch', fetchMock)

    const client = new ApiClient('https://api.example')
    await client.request('/api/v1/delivery/catalogo/nexsyn', {
      method: 'GET',
      next: { revalidate: 30, tags: ['catalogo-publico:nexsyn'] },
    } as RequestInit)

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit & {
      next?: { revalidate?: number; tags?: string[] }
    }
    expect(init.next).toEqual({
      revalidate: 30,
      tags: ['catalogo-publico:nexsyn'],
    })
    expect(init.cache).toBeUndefined()
  })
})

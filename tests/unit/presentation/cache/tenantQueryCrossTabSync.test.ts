import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  attachTenantQueryCrossTabSync,
  isTenantQueryInvalidateMessage,
} from '@/src/presentation/cache/attachTenantQueryCrossTabSync'
import { JIFFY_TENANT_QUERY_BROADCAST_CHANNEL } from '@/src/shared/constants/tenantQueryBroadcast'

describe('isTenantQueryInvalidateMessage', () => {
  it('aceita payload valido', () => {
    expect(
      isTenantQueryInvalidateMessage({
        type: 'invalidate',
        tabId: 'aba-1',
        queryKey: ['tenant', 'emp', 'delivery-entregadores'],
      })
    ).toBe(true)
  })

  it('rejeita payload incompleto', () => {
    expect(isTenantQueryInvalidateMessage(null)).toBe(false)
    expect(isTenantQueryInvalidateMessage({ type: 'invalidate' })).toBe(false)
    expect(
      isTenantQueryInvalidateMessage({ type: 'invalidate', tabId: 'x', queryKey: [] })
    ).toBe(false)
  })
})

describe('attachTenantQueryCrossTabSync', () => {
  const originalBroadcast = globalThis.BroadcastChannel
  let posted: unknown[] = []
  let onmessage: ((ev: MessageEvent<unknown>) => void) | null = null

  beforeEach(() => {
    posted = []
    onmessage = null
    class FakeBroadcastChannel {
      name: string
      constructor(name: string) {
        this.name = name
      }
      set onmessage(handler: ((ev: MessageEvent<unknown>) => void) | null) {
        onmessage = handler
      }
      postMessage(data: unknown) {
        posted.push(data)
      }
      close() {
        onmessage = null
      }
    }
    globalThis.BroadcastChannel = FakeBroadcastChannel as unknown as typeof BroadcastChannel
  })

  afterEach(() => {
    globalThis.BroadcastChannel = originalBroadcast
  })

  it('espelha invalidateQueries no canal', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const detach = attachTenantQueryCrossTabSync(queryClient)

    void queryClient.invalidateQueries({
      queryKey: ['tenant', 'emp-1', 'delivery-entregadores'],
    })

    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      type: 'invalidate',
      queryKey: ['tenant', 'emp-1', 'delivery-entregadores'],
    })
    expect((posted[0] as { tabId: string }).tabId).toBeTruthy()
    detach()
  })

  it('invalida localmente ao receber mensagem de outra aba', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const detach = attachTenantQueryCrossTabSync(queryClient)
    invalidateSpy.mockClear()

    onmessage?.({
      data: {
        type: 'invalidate',
        tabId: 'outra-aba',
        queryKey: ['tenant', 'emp-1', 'clientes'],
      },
    } as MessageEvent<unknown>)

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['tenant', 'emp-1', 'clientes'],
    })
    await Promise.resolve()
    expect(posted).toHaveLength(0)
    detach()
  })

  it('usa o canal do gestor', () => {
    expect(JIFFY_TENANT_QUERY_BROADCAST_CHANNEL).toBe('jiffy-tenant-query-invalidate')
  })
})

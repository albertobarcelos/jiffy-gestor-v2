import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateUuid } from '@/src/shared/utils/generateUuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('generateUuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('usa randomUUID quando existe', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => '11111111-2222-4333-8444-555555555555',
    })
    expect(generateUuid()).toBe('11111111-2222-4333-8444-555555555555')
  })

  it('não quebra em HTTP sem randomUUID', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(7)
        return bytes
      },
    })
    expect(generateUuid()).toMatch(UUID_V4)
  })
})

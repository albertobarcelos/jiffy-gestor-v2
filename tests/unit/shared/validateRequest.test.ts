import { describe, it, expect } from 'vitest'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_TENANT } from '@/src/shared/utils/authCookies'
import { validateRequest } from '@/src/shared/utils/validateRequest'

function mockRequest(params: {
  authorization?: string | null
  cookies?: Record<string, string>
}): NextRequest {
  const cookies = params.cookies ?? {}
  return {
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return params.authorization ?? null
        }
        return null
      },
    },
    cookies: {
      get: (name: string) => {
        const value = cookies[name]
        return value !== undefined ? { name, value } : undefined
      },
    },
  } as unknown as NextRequest
}

describe('validateRequest requireAuthorizationHeader', () => {
  it('recusa cookie tenant-token quando o header Authorization está ausente', async () => {
    const result = validateRequest(
      mockRequest({
        cookies: { [AUTH_COOKIE_TENANT]: 'jwt-de-outra-aba' },
      }),
      { requireAuthorizationHeader: true }
    )

    expect(result.valid).toBe(false)
    expect(result.tokenInfo).toBeNull()
    const body = await result.error?.json()
    expect(body?.message).toMatch(/Authorization/)
  })

  it('recusa Bearer vazio mesmo com cookie tenant-token', async () => {
    const result = validateRequest(
      mockRequest({
        authorization: 'Bearer   ',
        cookies: { [AUTH_COOKIE_TENANT]: 'jwt-de-outra-aba' },
      }),
      { requireAuthorizationHeader: true }
    )

    expect(result.valid).toBe(false)
    expect(result.tokenInfo).toBeNull()
  })
})

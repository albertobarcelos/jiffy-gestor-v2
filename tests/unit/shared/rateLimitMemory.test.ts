import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { verificarRateLimit } from '@/src/shared/utils/rateLimitMemory'

function req(ip: string) {
  return new NextRequest('http://localhost/api/geolocalizacao/places/autocomplete?input=abc', {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('verificarRateLimit', () => {
  it('permite até o limite e bloqueia o excedente na janela', () => {
    const bucket = `test-rl-${Date.now()}-${Math.random()}`
    const config = { bucket, limit: 3, windowMs: 60_000 }

    expect(verificarRateLimit(req('10.0.0.1'), config)).toBeNull()
    expect(verificarRateLimit(req('10.0.0.1'), config)).toBeNull()
    expect(verificarRateLimit(req('10.0.0.1'), config)).toBeNull()

    const blocked = verificarRateLimit(req('10.0.0.1'), config)
    expect(blocked?.status).toBe(429)

    // Outro IP não é afetado
    expect(verificarRateLimit(req('10.0.0.2'), config)).toBeNull()
  })
})

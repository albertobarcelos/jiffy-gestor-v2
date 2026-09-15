import { NextRequest, NextResponse } from 'next/server'

type JanelaContagem = {
  count: number
  resetAt: number
}

/** Contadores em memória por processo (suficiente para abuso básico em single-instance/dev). */
const buckets = new Map<string, JanelaContagem>()

const MAX_KEYS = 5_000

function limparExpirados(now: number) {
  if (buckets.size < MAX_KEYS) return
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key)
  }
  // Evita crescimento indefinido sob ataque: remove as mais antigas.
  if (buckets.size >= MAX_KEYS) {
    const excesso = buckets.size - Math.floor(MAX_KEYS * 0.8)
    let removidos = 0
    for (const key of buckets.keys()) {
      buckets.delete(key)
      removidos += 1
      if (removidos >= excesso) break
    }
  }
}

export function extrairIpCliente(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

export type RateLimitConfig = {
  /** Identificador do endpoint (ex.: places-autocomplete). */
  bucket: string
  /** Máximo de requisições na janela. */
  limit: number
  /** Janela em ms (padrão 60s). */
  windowMs?: number
}

/**
 * Retorna resposta 429 se exceder o limite; caso contrário null.
 */
export function verificarRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const windowMs = config.windowMs ?? 60_000
  const ip = extrairIpCliente(request)
  const key = `${config.bucket}:${ip}`
  const now = Date.now()

  limparExpirados(now)

  const atual = buckets.get(key)
  if (!atual || atual.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (atual.count >= config.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((atual.resetAt - now) / 1000))
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde um momento e tente novamente.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  atual.count += 1
  buckets.set(key, atual)
  return null
}

/** Limites padrão para BFF público de geolocalização (por IP / minuto). */
export const RATE_LIMIT_GEO = {
  placesAutocomplete: { bucket: 'geo-places-autocomplete', limit: 60 } satisfies RateLimitConfig,
  placesDetails: { bucket: 'geo-places-details', limit: 30 } satisfies RateLimitConfig,
  forward: { bucket: 'geo-forward', limit: 30 } satisfies RateLimitConfig,
  reverso: { bucket: 'geo-reverso', limit: 30 } satisfies RateLimitConfig,
} as const

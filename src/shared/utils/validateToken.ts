import jwt from 'jsonwebtoken'

/**
 * Interface para o payload do token JWT
 * Baseado na confirmação do backend e estrutura real do token
 */
export interface TokenPayload {
  userId?: string
  empresaId?: string
  generatedFor?: string
  iat?: number
  exp?: number
  sub?: string
  email?: string
  type?: string
  [key: string]: unknown
}

export interface TokenValidationResult {
  valid: boolean
  payload?: TokenPayload
  error?: string
  expired?: boolean
}

/**
 * Decodifica um token JWT **sem verificar assinatura**.
 *
 * Decisão arquitetural (2026-05): O backend Jiffy assina todos os JWTs com
 * **RS256** (par RSA em `keys/`).  O frontend Next.js atua como BFF/proxy —
 * toda requisição protegida é reencaminhada ao backend, que valida o token
 * no seu próprio middleware (`jwt-auth-middleware`).  Verificar assinatura
 * RS256 aqui exigiria manter cópia da chave pública ou buscar o JWKS a cada
 * request, sem ganho real de segurança (o backend já rejeita tokens inválidos).
 *
 * Portanto o BFF apenas decodifica e checa `exp` para evitar tráfego com tokens
 * visivelmente expirados — a prova criptográfica fica com o backend.
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token, { complete: false })
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded as TokenPayload
    }
    return null
  } catch {
    return null
  }
}

/**
 * Valida estrutura e expiração do JWT.
 *
 * **Não verifica assinatura** — ver `decodeToken` para a justificativa.
 * O parâmetro `_secret` é mantido na assinatura para compatibilidade de
 * call-sites existentes, mas é ignorado.
 */
export function validateToken(token: string, _secret?: string): TokenValidationResult {
  try {
    const decoded = decodeToken(token)

    if (!decoded) {
      return { valid: false, error: 'Não foi possível decodificar o token' }
    }

    if (decoded.exp) {
      if (new Date(decoded.exp * 1000) < new Date()) {
        return { valid: false, expired: true, payload: decoded, error: 'Token expirado' }
      }
    }

    return { valid: true, payload: decoded }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao validar token',
    }
  }
}

/**
 * Extrai informações específicas do token.
 * Usa `userId` como campo principal (conforme backend), com fallback para `sub`.
 */
export function extractTokenInfo(token: string): {
  userId?: string
  email?: string
  empresaId?: string
  expiresAt?: Date
  generatedFor?: string
} {
  const decoded = decodeToken(token)
  if (!decoded) {
    return {}
  }
  return {
    userId: decoded.userId || decoded.sub,
    email: decoded.email,
    empresaId: decoded.empresaId,
    expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : undefined,
    generatedFor: decoded.generatedFor,
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return true
  }
  return new Date(decoded.exp * 1000) < new Date()
}


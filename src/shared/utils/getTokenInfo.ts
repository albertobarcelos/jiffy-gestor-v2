import { NextRequest } from 'next/server'
import { getAuthToken } from './getAuthToken'
import { validateToken, extractTokenInfo, TokenPayload } from './validateToken'

/**
 * Informações extraídas do token JWT
 */
export interface TokenInfo {
  token: string
  payload: TokenPayload
  userId?: string
  email?: string
  empresaId?: string
  expiresAt?: Date
  generatedFor?: string
}

/**
 * Obtém e valida o token da requisição, retornando informações extraídas
 * Valida assinatura se JWT_SECRET estiver configurado
 * 
 * @param request - Requisição Next.js
 * @returns TokenInfo se válido, null se inválido ou ausente
 */
export function getTokenInfo(request: NextRequest): TokenInfo | null {
  const token = getAuthToken(request)
  
  if (!token) {
    return null
  }

  // Valida token (usa JWT_SECRET se disponível)
  const jwtSecret = process.env.JWT_SECRET
  const validation = validateToken(token, jwtSecret)
  
  if (!validation.valid || !validation.payload) {
    return null
  }

  // Extrai informações específicas
  const info = extractTokenInfo(token)

  return {
    token,
    payload: validation.payload,
    userId: info.userId,
    email: info.email,
    empresaId: info.empresaId,
    expiresAt: info.expiresAt,
    generatedFor: info.generatedFor,
  }
}

/**
 * Valida token e retorna empresaId
 * Útil para validação de tenant
 */
export function getEmpresaIdFromToken(request: NextRequest): string | null {
  const tokenInfo = getTokenInfo(request)
  return tokenInfo?.empresaId || null
}

/**
 * Valida token e retorna userId
 */
export function getUserIdFromToken(request: NextRequest): string | null {
  const tokenInfo = getTokenInfo(request)
  return tokenInfo?.userId || null
}


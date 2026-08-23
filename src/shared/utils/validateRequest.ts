import { NextRequest, NextResponse } from 'next/server'
import { getTokenInfo, TokenInfo } from './getTokenInfo'

/**
 * Resultado da validação de requisição
 */
export interface ValidationResult {
  valid: boolean
  tokenInfo: TokenInfo | null
  error?: NextResponse
}

export type ValidateRequestOptions = {
  /**
   * Quando `false`, aceita JWT de identidade (hub) sem `empresaId` no payload.
   * Rotas como alteração de senha global (`/usuarios/me/senha`) usam só o utilizador autenticado.
   * Default: `true` (rotas multi-empresa).
   */
  requireEmpresaId?: boolean
  /**
   * Quando `true`, recusa cookie `tenant-token` (last-wins entre abas) e exige
   * `Authorization: Bearer` do token per-tab. Usar em rotas fiscais / DANFE.
   */
  requireAuthorizationHeader?: boolean
}

function hasAuthorizationBearer(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  return authHeader.substring(7).trim().length > 0
}

/**
 * Valida token e, por defeito, exige `empresaId` no JWT (multi-tenancy ERP).
 */
export function validateRequest(
  request: NextRequest,
  options?: ValidateRequestOptions
): ValidationResult {
  if (options?.requireAuthorizationHeader && !hasAuthorizationBearer(request)) {
    return {
      valid: false,
      tokenInfo: null,
      error: NextResponse.json(
        { message: 'Token da empresa obrigatório no header Authorization' },
        { status: 401 }
      ),
    }
  }

  const tokenInfo = getTokenInfo(request)

  if (!tokenInfo) {
    return {
      valid: false,
      tokenInfo: null,
      error: NextResponse.json(
        { message: 'Token inválido ou expirado' },
        { status: 401 }
      ),
    }
  }

  const requireEmpresaId = options?.requireEmpresaId !== false

  if (requireEmpresaId && !tokenInfo.empresaId) {
    return {
      valid: false,
      tokenInfo: null,
      error: NextResponse.json(
        { message: 'Empresa não identificada no token' },
        { status: 401 }
      ),
    }
  }

  return {
    valid: true,
    tokenInfo,
  }
}


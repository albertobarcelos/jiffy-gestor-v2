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

/**
 * Valida token e empresaId em uma requisição
 * Retorna tokenInfo se válido, ou NextResponse com erro se inválido
 * 
 * @param request - Requisição Next.js
 * @returns ValidationResult com tokenInfo ou erro
 */
export function validateRequest(request: NextRequest): ValidationResult {
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

  // Valida que empresaId está presente (requisito para multi-tenancy)
  if (!tokenInfo.empresaId) {
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


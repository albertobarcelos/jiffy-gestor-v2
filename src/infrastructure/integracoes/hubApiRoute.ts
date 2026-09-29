import { NextRequest, NextResponse } from 'next/server'
import { isIntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'
import { validateRequest, type ValidationResult } from '@/src/shared/utils/validateRequest'

export function respostaErroIntegracao(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function authorizationDaSessao(token: string): string {
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`
}

export function sessaoEmpresa(
  request: NextRequest,
  opts?: { exigirBearerHeader?: boolean }
): ValidationResult {
  return validateRequest(request, {
    requireAuthorizationHeader: opts?.exigirBearerHeader === true,
  })
}

export function responderErroIntegracao(error: unknown, fallback: string) {
  if (isIntegracaoMarketplaceError(error)) {
    return respostaErroIntegracao(error.message, error.status)
  }
  console.error('[integracoes] falha inesperada')
  return respostaErroIntegracao(fallback, 500)
}

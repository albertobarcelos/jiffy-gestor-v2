import { NextRequest, NextResponse } from 'next/server'
import { isIntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'
import { makeConectarMarketplaceUseCase } from '@/src/infrastructure/integracoes/makeConectarMarketplaceUseCase'
import { validateRequest } from '@/src/shared/utils/validateRequest'

function respostaErro(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Inicia OAuth de qualquer marketplace no mesmo hub.
 * O browser nunca chama o hub nem vê o segredo.
 */
export async function POST(request: NextRequest) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo?.empresaId) {
    return validation.error ?? respostaErro('Empresa não identificada no token', 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return respostaErro('Informe o marketplace e o ID da loja.', 400)
  }

  const row = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

  try {
    const resultado = await makeConectarMarketplaceUseCase().execute({
      empresaId: validation.tokenInfo.empresaId,
      marketplace: row.marketplace,
      merchantIdOd: row.merchantIdOd,
    })
    return NextResponse.json({ authorizationUrl: resultado.authorizationUrl })
  } catch (error) {
    if (isIntegracaoMarketplaceError(error)) {
      return respostaErro(error.message, error.status)
    }
    console.error('[integracoes/conectar] falha inesperada')
    return respostaErro('Não foi possível conectar a integração.', 500)
  }
}

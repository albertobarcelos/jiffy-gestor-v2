import { NextRequest, NextResponse } from 'next/server'
import { makeConsultarConexaoMarketplaceUseCase } from '@/src/infrastructure/integracoes/makeConsultarConexaoMarketplaceUseCase'
import {
  responderErroIntegracao,
  respostaErroIntegracao,
  sessaoEmpresa,
} from '@/src/infrastructure/integracoes/hubApiRoute'

/**
 * Status da loja no hub. Sem secret no cliente.
 */
export async function GET(request: NextRequest) {
  const validation = sessaoEmpresa(request)
  if (!validation.valid || !validation.tokenInfo?.empresaId) {
    return validation.error ?? respostaErroIntegracao('Empresa não identificada no token', 401)
  }

  try {
    const marketplace = request.nextUrl.searchParams.get('marketplace')
    const status = await makeConsultarConexaoMarketplaceUseCase().execute({
      empresaId: validation.tokenInfo.empresaId,
      marketplace,
    })
    return NextResponse.json(status)
  } catch (error) {
    return responderErroIntegracao(error, 'Não foi possível consultar a integração.')
  }
}

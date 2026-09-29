import { NextRequest, NextResponse } from 'next/server'
import {
  authorizationDaSessao,
  responderErroIntegracao,
  respostaErroIntegracao,
  sessaoEmpresa,
} from '@/src/infrastructure/integracoes/hubApiRoute'
import { makeSincronizarCardapioMarketplaceUseCase } from '@/src/infrastructure/integracoes/makeSincronizarCardapioMarketplaceUseCase'

export async function GET(request: NextRequest) {
  const validation = sessaoEmpresa(request, { exigirBearerHeader: true })
  if (!validation.valid || !validation.tokenInfo?.empresaId || !validation.tokenInfo.token) {
    return validation.error ?? respostaErroIntegracao('Empresa não identificada no token', 401)
  }

  try {
    const data = await makeSincronizarCardapioMarketplaceUseCase().listarPagamentos({
      empresaId: validation.tokenInfo.empresaId,
      authorization: authorizationDaSessao(validation.tokenInfo.token),
    })
    return NextResponse.json(data)
  } catch (error) {
    return responderErroIntegracao(error, 'Não foi possível ler as formas de pagamento.')
  }
}

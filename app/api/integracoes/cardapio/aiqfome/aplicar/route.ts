import { NextRequest, NextResponse } from 'next/server'
import {
  authorizationDaSessao,
  responderErroIntegracao,
  respostaErroIntegracao,
  sessaoEmpresa,
} from '@/src/infrastructure/integracoes/hubApiRoute'
import { makeSincronizarCardapioMarketplaceUseCase } from '@/src/infrastructure/integracoes/makeSincronizarCardapioMarketplaceUseCase'

export async function POST(request: NextRequest) {
  const validation = sessaoEmpresa(request, { exigirBearerHeader: true })
  if (!validation.valid || !validation.tokenInfo?.empresaId || !validation.tokenInfo.token) {
    return validation.error ?? respostaErroIntegracao('Empresa não identificada no token', 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return respostaErroIntegracao('Informe o menu e os itens.', 400)
  }

  const row = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

  try {
    const data = await makeSincronizarCardapioMarketplaceUseCase().aplicar({
      empresaId: validation.tokenInfo.empresaId,
      authorization: authorizationDaSessao(validation.tokenInfo.token),
      menuId: row.menuId,
      itens: row.itens,
    })
    return NextResponse.json(data)
  } catch (error) {
    return responderErroIntegracao(error, 'Não foi possível gravar a sincronização.')
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { BuscarGruposProdutosUseCase } from '@/src/application/use-cases/grupos-produtos/BuscarGruposProdutosUseCase'
import { CriarGrupoProdutoUseCase } from '@/src/application/use-cases/grupos-produtos/CriarGrupoProdutoUseCase'
import { GrupoProdutoRepository } from '@/src/infrastructure/database/repositories/GrupoProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * GET - Buscar grupos de produtos
 */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(req.url)
    const name = searchParams.get('q') || searchParams.get('name') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const ativoParam = searchParams.get('ativo')
    const ativo = ativoParam !== null ? ativoParam === 'true' : null

    const apiClient = new ApiClient()
    const repository = new GrupoProdutoRepository(apiClient, tokenInfo.token)
    const useCase = new BuscarGruposProdutosUseCase(repository)

    const result = await useCase.execute({ name, limit, offset, ativo })

    const response = NextResponse.json({
      success: true,
      ...result,
    })

    // Cache headers para melhor performance
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
    
    return response
  } catch (error: any) {
    console.error('Erro na API de buscar grupos:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST - Criar novo grupo de produtos
 */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await req.json()

    const apiClient = new ApiClient()
    const repository = new GrupoProdutoRepository(apiClient, tokenInfo.token)
    const useCase = new CriarGrupoProdutoUseCase(repository)

    const grupo = await useCase.execute({
      nome: body.nome,
      ativo: body.ativo ?? true,
      corHex: body.corHex || '#CCCCCC',
      iconName: body.iconName || '',
      ativoDelivery: body.ativoDelivery ?? false,
      ativoLocal: body.ativoLocal ?? false,
    })

    return NextResponse.json({ success: true, data: grupo.toJSON() })
  } catch (error: any) {
    console.error('Erro na API de criar grupo:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { BuscarProdutosUseCase } from '@/src/application/use-cases/produtos/BuscarProdutosUseCase'
import { ProdutoRepository } from '@/src/infrastructure/database/repositories/ProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

/**
 * GET - Listar produtos
 */
export async function GET(req: NextRequest) {
  try {
    // Valida token e extrai informações
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    // Valida que empresaId está presente (requisito para multi-tenancy)
    if (!tokenInfo.empresaId) {
      return NextResponse.json({ message: 'Empresa não identificada no token' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name') || ''
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const ativoParam = searchParams.get('ativo')

    let ativo: boolean | null = null
    if (ativoParam === 'true') {
      ativo = true
    } else if (ativoParam === 'false') {
      ativo = false
    }

    const apiClient = new ApiClient()
    const produtoRepository = new ProdutoRepository(apiClient, tokenInfo.token)
    const buscarProdutosUseCase = new BuscarProdutosUseCase(produtoRepository)

    const { produtos, total } = await buscarProdutosUseCase.execute({
      name,
      limit,
      offset,
      ativo,
    })

    const response = NextResponse.json({ 
      success: true, 
      items: produtos.map(p => p.toJSON()), 
      count: total 
    })

    // Cache headers para melhor performance
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
    
    return response
  } catch (error: any) {
    console.error('Erro na API de produtos:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST - Criar novo produto
 */
export async function POST(req: NextRequest) {
  try {
    // Valida token e extrai informações
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    // Valida que empresaId está presente (requisito para multi-tenancy)
    if (!tokenInfo.empresaId) {
      return NextResponse.json({ message: 'Empresa não identificada no token' }, { status: 401 })
    }

    const body = await req.json()

    const apiClient = new ApiClient()
    const { data } = await apiClient.request('/api/v1/cardapio/produtos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify({
        ...body,
        ativo: body.ativo ?? true,
      }),
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro na API de criação de produto:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

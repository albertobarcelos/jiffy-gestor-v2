import { NextRequest, NextResponse } from 'next/server'
import { AtualizarStatusProdutoUseCase } from '@/src/application/use-cases/produtos/AtualizarStatusProdutoUseCase'
import { ExcluirProdutoUseCase } from '@/src/application/use-cases/produtos/ExcluirProdutoUseCase'
import { ProdutoRepository } from '@/src/infrastructure/database/repositories/ProdutoRepository'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * GET - Buscar produto por ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    if (!tokenInfo.empresaId) {
      return NextResponse.json({ message: 'Empresa não identificada no token' }, { status: 401 })
    }

    const { id } = await params

    const apiClient = new ApiClient()
    const { data } = await apiClient.request(`/api/v1/cardapio/produtos/${id}`, {
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro na API de buscar produto:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

/**
 * PUT - Atualizar status do produto
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    if (!tokenInfo.empresaId) {
      return NextResponse.json({ message: 'Empresa não identificada no token' }, { status: 401 })
    }

    const { id } = await params
    const { ativo } = await req.json()

    if (typeof ativo !== 'boolean') {
      return NextResponse.json(
        { message: 'Status ativo inválido' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const produtoRepository = new ProdutoRepository(apiClient, tokenInfo.token)
    const atualizarStatusProdutoUseCase = new AtualizarStatusProdutoUseCase(
      produtoRepository
    )

    await atualizarStatusProdutoUseCase.execute(id, ativo)

    return NextResponse.json({ success: true, message: 'Status atualizado' })
  } catch (error: any) {
    console.error('Erro na API de atualização de status do produto:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

/**
 * PATCH - Atualizar produto completo ou apenas preço
 * Suporta atualização parcial (ex: apenas { "valor": 10.50 })
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error || NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const apiClient = new ApiClient()
    const { data } = await apiClient.request(`/api/v1/cardapio/produtos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validation.tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro na API de atualização de produto:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE - Exclui o produto do cadastro base
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error || NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const produtoRepository = new ProdutoRepository(apiClient, validation.tokenInfo.token)
    const excluirProdutoUseCase = new ExcluirProdutoUseCase(produtoRepository)
    await excluirProdutoUseCase.execute(id)

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('Erro na API de exclusão de produto:', error)
    if (error instanceof ApiError) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 500
      return NextResponse.json({ message: mensagemLegivelApiError(error) }, { status })
    }
    const message = error instanceof Error ? error.message : 'Erro ao excluir produto'
    return NextResponse.json({ message }, { status: 500 })
  }
}

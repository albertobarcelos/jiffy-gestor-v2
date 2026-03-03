import { NextRequest, NextResponse } from 'next/server'
import { BuscarGruposProdutosUseCase } from '@/src/application/use-cases/grupos-produtos/BuscarGruposProdutosUseCase'
import { GrupoProdutoRepository } from '@/src/infrastructure/database/repositories/GrupoProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

/**
 * GET - Buscar grupos de produtos para cardápio público
 * Não requer autenticação administrativa
 * Retorna apenas grupos ativos para local
 */
export async function GET(req: NextRequest) {
  try {
    // Para cardápio público, vamos usar um token mock ou buscar sem token
    // Por enquanto, vamos tentar buscar sem token (se o backend permitir)
    // Ou usar um token de sistema se necessário

    const { searchParams } = new URL(req.url)
    const ativoLocal = searchParams.get('ativoLocal') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Por enquanto, retornar erro informando que precisa de token
    // Quando backend estiver pronto, isso será ajustado
    return NextResponse.json(
      {
        success: false,
        message: 'Endpoint ainda não implementado. Use endpoint autenticado temporariamente.',
      },
      { status: 501 }
    )

    // Código futuro quando backend permitir acesso público:
    /*
    const apiClient = new ApiClient()
    const repository = new GrupoProdutoRepository(apiClient) // Sem token
    const useCase = new BuscarGruposProdutosUseCase(repository)

    const result = await useCase.execute({
      name: '',
      limit,
      offset,
      ativo: true, // Apenas ativos
    })

    // Filtrar apenas grupos ativos para local
    const gruposFiltrados = result.grupos.filter((g) => g.isAtivoLocal())

    return NextResponse.json({
      success: true,
      items: gruposFiltrados.map((g) => g.toJSON()),
      count: gruposFiltrados.length,
    })
    */
  } catch (error: any) {
    console.error('Erro na API pública de grupos:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

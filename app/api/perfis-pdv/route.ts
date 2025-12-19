import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { PerfilUsuarioRepository } from '@/src/infrastructure/database/repositories/PerfilUsuarioRepository'
import { BuscarPerfisUsuariosUseCase } from '@/src/application/use-cases/perfis-usuarios/BuscarPerfisUsuariosUseCase'

/**
 * GET /api/perfis-pdv
 * Lista perfis PDV para uso em dropdowns
 * Suporta paginação com limit e offset
 * Usa Clean Architecture: Repository -> Use Case -> Response
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const q = searchParams.get('q') || ''
    const ativoParam = searchParams.get('ativo')
    const ativo = ativoParam !== null ? ativoParam === 'true' : null

    // Usa Clean Architecture: Repository -> Use Case
    const repository = new PerfilUsuarioRepository(undefined, tokenInfo.token)
    const useCase = new BuscarPerfisUsuariosUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
      ativo,
    })

    // Retorna no formato esperado pelos componentes (UsuariosList.tsx e NovoUsuario.tsx)
    // Eles esperam { items: [...], count: ... } ou array direto
    return NextResponse.json({
      items: result.perfis.map((p) => p.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar perfis PDV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar perfis PDV' },
      { status: 500 }
    )
  }
}


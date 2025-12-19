import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { PerfilUsuarioRepository } from '@/src/infrastructure/database/repositories/PerfilUsuarioRepository'
import { BuscarPerfilUsuarioPorIdUseCase } from '@/src/application/use-cases/perfis-usuarios/BuscarPerfilUsuarioPorIdUseCase'

/**
 * GET /api/perfis-pdv/[id]
 * Busca um perfil PDV específico pelo ID
 * Usa Clean Architecture: Repository -> Use Case -> Response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID do perfil PDV é obrigatório' }, { status: 400 })
    }

    // Usa Clean Architecture: Repository -> Use Case
    const repository = new PerfilUsuarioRepository(undefined, tokenInfo.token)
    const useCase = new BuscarPerfilUsuarioPorIdUseCase(repository)

    const perfil = await useCase.execute(id)

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil PDV não encontrado' }, { status: 404 })
    }

    return NextResponse.json(perfil.toJSON())
  } catch (error) {
    console.error('Erro ao buscar perfil PDV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar perfil PDV' },
      { status: 500 }
    )
  }
}


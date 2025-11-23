import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { PerfilUsuarioRepository } from '@/src/infrastructure/database/repositories/PerfilUsuarioRepository'
import { BuscarPerfisUsuariosUseCase } from '@/src/application/use-cases/perfis-usuarios/BuscarPerfisUsuariosUseCase'
import { CriarPerfilUsuarioUseCase } from '@/src/application/use-cases/perfis-usuarios/CriarPerfilUsuarioUseCase'
import { CriarPerfilUsuarioSchema } from '@/src/application/dto/CriarPerfilUsuarioDTO'

/**
 * GET /api/perfis-usuarios-pdv
 * Lista perfis de usuários com paginação e busca
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

    const repository = new PerfilUsuarioRepository(undefined, tokenInfo.token)
    const useCase = new BuscarPerfisUsuariosUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
      ativo,
    })

    return NextResponse.json({
      items: result.perfis.map((p) => p.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar perfis de usuários:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar perfis de usuários' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/perfis-usuarios-pdv
 * Cria um novo perfil de usuário
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()

    // Validação com Zod
    const validatedData = CriarPerfilUsuarioSchema.parse(body)

    const repository = new PerfilUsuarioRepository(undefined, tokenInfo.token)
    const useCase = new CriarPerfilUsuarioUseCase(repository)

    const perfil = await useCase.execute(validatedData)

    return NextResponse.json(perfil.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar perfil de usuário:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar perfil de usuário' },
      { status: 500 }
    )
  }
}


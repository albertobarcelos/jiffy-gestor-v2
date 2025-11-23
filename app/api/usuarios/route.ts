import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { UsuarioRepository } from '@/src/infrastructure/database/repositories/UsuarioRepository'
import { BuscarUsuariosUseCase } from '@/src/application/use-cases/usuarios/BuscarUsuariosUseCase'
import { CriarUsuarioUseCase } from '@/src/application/use-cases/usuarios/CriarUsuarioUseCase'
import { CriarUsuarioSchema } from '@/src/application/dto/CriarUsuarioDTO'

/**
 * GET /api/usuarios
 * Lista usuários com paginação, busca e filtro
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
    const perfilPdvId = searchParams.get('perfilPdvId') || undefined
    const name = searchParams.get('name') || undefined
    const ativoParam = searchParams.get('ativo')
    const ativo = ativoParam !== null ? ativoParam === 'true' : null

    const repository = new UsuarioRepository(undefined, tokenInfo.token)
    const useCase = new BuscarUsuariosUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
      perfilPdvId,
      name,
      ativo,
    })

    return NextResponse.json({
      items: result.usuarios.map((u) => u.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/usuarios
 * Cria um novo usuário
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
    const validatedData = CriarUsuarioSchema.parse(body)

    const repository = new UsuarioRepository(undefined, tokenInfo.token)
    const useCase = new CriarUsuarioUseCase(repository)

    const usuario = await useCase.execute(validatedData)

    return NextResponse.json(usuario.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { PerfilUsuarioRepository } from '@/src/infrastructure/database/repositories/PerfilUsuarioRepository'
import { BuscarPerfilUsuarioPorIdUseCase } from '@/src/application/use-cases/perfis-usuarios/BuscarPerfilUsuarioPorIdUseCase'
import { AtualizarPerfilUsuarioUseCase } from '@/src/application/use-cases/perfis-usuarios/AtualizarPerfilUsuarioUseCase'
import { DeletarPerfilUsuarioUseCase } from '@/src/application/use-cases/perfis-usuarios/DeletarPerfilUsuarioUseCase'
import { AtualizarPerfilUsuarioSchema } from '@/src/application/dto/AtualizarPerfilUsuarioDTO'

/**
 * GET /api/perfis-usuarios-pdv/[id]
 * Busca um perfil de usuário por ID
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
      return NextResponse.json({ error: 'ID do perfil de usuário é obrigatório' }, { status: 400 })
    }

    const repository = new PerfilUsuarioRepository(undefined, tokenInfo.token)
    const useCase = new BuscarPerfilUsuarioPorIdUseCase(repository)

    const perfil = await useCase.execute(id)

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil de usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(perfil.toJSON())
  } catch (error) {
    console.error('Erro ao buscar perfil de usuário:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar perfil de usuário' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/perfis-usuarios-pdv/[id]
 * Atualiza um perfil de usuário
 */
export async function PATCH(
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
      return NextResponse.json({ error: 'ID do perfil de usuário é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarPerfilUsuarioSchema.parse(body)

    const repository = new PerfilUsuarioRepository(undefined, tokenInfo.token)
    const useCase = new AtualizarPerfilUsuarioUseCase(repository)

    const perfil = await useCase.execute(id, validatedData)

    return NextResponse.json(perfil.toJSON())
  } catch (error) {
    console.error('Erro ao atualizar perfil de usuário:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar perfil de usuário' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/perfis-usuarios-pdv/[id]
 * Deleta um perfil de usuário
 */
export async function DELETE(
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
      return NextResponse.json({ error: 'ID do perfil de usuário é obrigatório' }, { status: 400 })
    }

    const repository = new PerfilUsuarioRepository(undefined, tokenInfo.token)
    const useCase = new DeletarPerfilUsuarioUseCase(repository)

    await useCase.execute(id)

    return NextResponse.json({ message: 'Perfil de usuário deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar perfil de usuário:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao deletar perfil de usuário' },
      { status: 500 }
    )
  }
}


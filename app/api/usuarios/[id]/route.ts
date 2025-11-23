import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { UsuarioRepository } from '@/src/infrastructure/database/repositories/UsuarioRepository'
import { BuscarUsuarioPorIdUseCase } from '@/src/application/use-cases/usuarios/BuscarUsuarioPorIdUseCase'
import { AtualizarUsuarioUseCase } from '@/src/application/use-cases/usuarios/AtualizarUsuarioUseCase'
import { DeletarUsuarioUseCase } from '@/src/application/use-cases/usuarios/DeletarUsuarioUseCase'
import { AtualizarUsuarioSchema } from '@/src/application/dto/AtualizarUsuarioDTO'

/**
 * GET /api/usuarios/[id]
 * Busca um usuário por ID
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
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const repository = new UsuarioRepository(undefined, tokenInfo.token)
    const useCase = new BuscarUsuarioPorIdUseCase(repository)

    const usuario = await useCase.execute(id)

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(usuario.toJSON())
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar usuário' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/usuarios/[id]
 * Atualiza um usuário
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
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarUsuarioSchema.parse(body)

    const repository = new UsuarioRepository(undefined, tokenInfo.token)
    const useCase = new AtualizarUsuarioUseCase(repository)

    const usuario = await useCase.execute(id, validatedData)

    return NextResponse.json(usuario.toJSON())
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/usuarios/[id]
 * Deleta um usuário
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
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const repository = new UsuarioRepository(undefined, tokenInfo.token)
    const useCase = new DeletarUsuarioUseCase(repository)

    await useCase.execute(id)

    return NextResponse.json({ message: 'Usuário deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao deletar usuário' },
      { status: 500 }
    )
  }
}


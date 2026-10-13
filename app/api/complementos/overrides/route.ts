import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AtualizarOverridesComplementoUseCase } from '@/src/application/use-cases/complementos/AtualizarOverridesComplementoUseCase'
import { ComplementoOverrideRepository } from '@/src/infrastructure/database/repositories/ComplementoOverrideRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * PATCH /api/complementos/overrides
 * Grava valor/ativo de um produto no cardápio e/ou impacto do complemento no grupo.
 * Separado do PATCH /api/complementos/[id], que altera o cadastro (modelo).
 */
export async function PATCH(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const body = await request.json()
    const resultado = await new AtualizarOverridesComplementoUseCase(
      new ComplementoOverrideRepository(undefined, validation.tokenInfo.token)
    ).execute(body)

    return NextResponse.json(resultado)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar exceção de complemento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar exceção de complemento' },
      { status: 500 }
    )
  }
}

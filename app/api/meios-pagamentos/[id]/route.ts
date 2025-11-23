import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { MeioPagamentoRepository } from '@/src/infrastructure/database/repositories/MeioPagamentoRepository'
import { BuscarMeioPagamentoPorIdUseCase } from '@/src/application/use-cases/meios-pagamentos/BuscarMeioPagamentoPorIdUseCase'
import { AtualizarMeioPagamentoUseCase } from '@/src/application/use-cases/meios-pagamentos/AtualizarMeioPagamentoUseCase'
import { DeletarMeioPagamentoUseCase } from '@/src/application/use-cases/meios-pagamentos/DeletarMeioPagamentoUseCase'
import { AtualizarMeioPagamentoSchema } from '@/src/application/dto/AtualizarMeioPagamentoDTO'

/**
 * GET /api/meios-pagamentos/[id]
 * Busca um meio de pagamento por ID
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
      return NextResponse.json({ error: 'ID do meio de pagamento é obrigatório' }, { status: 400 })
    }

    const repository = new MeioPagamentoRepository(undefined, tokenInfo.token)
    const useCase = new BuscarMeioPagamentoPorIdUseCase(repository)

    const meioPagamento = await useCase.execute(id)

    if (!meioPagamento) {
      return NextResponse.json({ error: 'Meio de pagamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json(meioPagamento.toJSON())
  } catch (error) {
    console.error('Erro ao buscar meio de pagamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar meio de pagamento' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/meios-pagamentos/[id]
 * Atualiza um meio de pagamento
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
      return NextResponse.json({ error: 'ID do meio de pagamento é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarMeioPagamentoSchema.parse(body)

    const repository = new MeioPagamentoRepository(undefined, tokenInfo.token)
    const useCase = new AtualizarMeioPagamentoUseCase(repository)

    const meioPagamento = await useCase.execute(id, validatedData)

    return NextResponse.json(meioPagamento.toJSON())
  } catch (error) {
    console.error('Erro ao atualizar meio de pagamento:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar meio de pagamento' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/meios-pagamentos/[id]
 * Deleta um meio de pagamento
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
      return NextResponse.json({ error: 'ID do meio de pagamento é obrigatório' }, { status: 400 })
    }

    const repository = new MeioPagamentoRepository(undefined, tokenInfo.token)
    const useCase = new DeletarMeioPagamentoUseCase(repository)

    await useCase.execute(id)

    return NextResponse.json({ message: 'Meio de pagamento deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar meio de pagamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao deletar meio de pagamento' },
      { status: 500 }
    )
  }
}


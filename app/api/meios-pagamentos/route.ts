import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { MeioPagamentoRepository } from '@/src/infrastructure/database/repositories/MeioPagamentoRepository'
import { BuscarMeiosPagamentosUseCase } from '@/src/application/use-cases/meios-pagamentos/BuscarMeiosPagamentosUseCase'
import { CriarMeioPagamentoUseCase } from '@/src/application/use-cases/meios-pagamentos/CriarMeioPagamentoUseCase'
import { CriarMeioPagamentoSchema } from '@/src/application/dto/CriarMeioPagamentoDTO'

/**
 * GET /api/meios-pagamentos
 * Lista meios de pagamento com paginação, busca e filtro
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

    const repository = new MeioPagamentoRepository(undefined, tokenInfo.token)
    const useCase = new BuscarMeiosPagamentosUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
      ativo,
    })

    return NextResponse.json({
      items: result.meiosPagamento.map((m) => m.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar meios de pagamento:', error)
    
    // Log detalhado do erro para debug
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro ao buscar meios de pagamento',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/meios-pagamentos
 * Cria um novo meio de pagamento
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
    const validatedData = CriarMeioPagamentoSchema.parse(body)

    const repository = new MeioPagamentoRepository(undefined, tokenInfo.token)
    const useCase = new CriarMeioPagamentoUseCase(repository)

    const meioPagamento = await useCase.execute(validatedData)

    return NextResponse.json(meioPagamento.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar meio de pagamento:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar meio de pagamento' },
      { status: 500 }
    )
  }
}


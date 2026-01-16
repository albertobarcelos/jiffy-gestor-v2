import { NextRequest, NextResponse } from 'next/server'
import { DeliveryRepository } from '@/src/infrastructure/database/repositories/DeliveryRepository'
import { ListarMetodosPagamentoUseCase } from '@/src/application/use-cases/delivery/ListarMetodosPagamentoUseCase'

/**
 * GET /api/delivery/metodos-pagamento
 * Lista os métodos de pagamento disponíveis na plataforma
 */
export async function GET(request: NextRequest) {
  try {
    const bearerToken = request.headers.get('Bearer') || request.headers.get('bearer')
    const integradorToken = request.headers.get('integrador-token')

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const repository = new DeliveryRepository(
      undefined,
      bearerToken,
      integradorToken || undefined
    )
    const useCase = new ListarMetodosPagamentoUseCase(repository)

    const metodos = await useCase.execute()

    return NextResponse.json({
      status: 'success',
      code: '200',
      formas: metodos.map((m) => m.toJSON()),
    })
  } catch (error) {
    console.error('Erro ao listar métodos de pagamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar métodos de pagamento' },
      { status: 500 }
    )
  }
}


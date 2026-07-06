import { NextRequest, NextResponse } from 'next/server'
import { DeliveryRepository } from '@/src/infrastructure/database/repositories/DeliveryRepository'
import { ListarMetodosPagamentoUseCase } from '@/src/application/use-cases/delivery/ListarMetodosPagamentoUseCase'
import { resolveDeliveryIntegradorAuth } from '@/src/shared/utils/resolveDeliveryIntegradorAuth'

/**
 * GET /api/delivery/metodos-pagamento
 * Lista os métodos de pagamento disponíveis na plataforma.
 * Auth: JWT da sessão gestor (preferencial) ou header legado `Bearer`.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = resolveDeliveryIntegradorAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const repository = new DeliveryRepository(
      undefined,
      auth.bearerToken,
      auth.integradorToken
    )
    const useCase = new ListarMetodosPagamentoUseCase(repository)

    const metodos = await useCase.execute()

    return NextResponse.json({
      status: 'success',
      code: '200',
      formas: metodos.map(m => m.toJSON()),
    })
  } catch (error) {
    console.error('Erro ao listar métodos de pagamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar métodos de pagamento' },
      { status: 500 }
    )
  }
}

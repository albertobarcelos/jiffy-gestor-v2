import { NextRequest, NextResponse } from 'next/server'
import { DeliveryRepository } from '@/src/infrastructure/database/repositories/DeliveryRepository'
import { AvancarStatusPedidoUseCase } from '@/src/application/use-cases/delivery/AvancarStatusPedidoUseCase'

/**
 * POST /api/delivery/pedidos/[pedidoRef]/avancar-status
 * Avança o status do pedido para o próximo status disponível
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pedidoRef: string }> }
) {
  try {
    const bearerToken = request.headers.get('Bearer') || request.headers.get('bearer')
    const integradorToken = request.headers.get('integrador-token')

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const { pedidoRef } = await params

    if (!pedidoRef) {
      return NextResponse.json(
        { error: 'Referência do pedido é obrigatória' },
        { status: 400 }
      )
    }

    const repository = new DeliveryRepository(
      undefined,
      bearerToken,
      integradorToken || undefined
    )
    const useCase = new AvancarStatusPedidoUseCase(repository)

    const result = await useCase.execute(pedidoRef)

    return NextResponse.json({
      status: 'success',
      code: '200',
      status_pedido: result.status,
    })
  } catch (error) {
    console.error('Erro ao avançar status do pedido:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao avançar status do pedido' },
      { status: 500 }
    )
  }
}


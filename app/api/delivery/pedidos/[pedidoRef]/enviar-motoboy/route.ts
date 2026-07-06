import { NextRequest, NextResponse } from 'next/server'
import { DeliveryRepository } from '@/src/infrastructure/database/repositories/DeliveryRepository'
import { EnviarParaMotoboyUseCase } from '@/src/application/use-cases/delivery/EnviarParaMotoboyUseCase'
import { resolveDeliveryIntegradorAuth } from '@/src/shared/utils/resolveDeliveryIntegradorAuth'

/**
 * POST /api/delivery/pedidos/[pedidoRef]/enviar-motoboy
 * Envia o pedido para o serviço de motoboy.
 * Auth: JWT da sessão gestor (preferencial) ou header legado `Bearer`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pedidoRef: string }> }
) {
  try {
    const auth = resolveDeliveryIntegradorAuth(request)
    if (!auth) {
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

    const body = await request.json().catch(() => ({}))
    const servico = body.servico as
      | 'Pega Express'
      | 'Itz Express'
      | 'NextLeva'
      | undefined

    const repository = new DeliveryRepository(
      undefined,
      auth.bearerToken,
      auth.integradorToken
    )
    const useCase = new EnviarParaMotoboyUseCase(repository)

    await useCase.execute(pedidoRef, servico)

    return NextResponse.json({
      status: 'success',
      code: '200',
      message: 'Pedido enviado para o serviço de motoboy com sucesso',
    })
  } catch (error) {
    console.error('Erro ao enviar pedido para motoboy:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar pedido para motoboy' },
      { status: 500 }
    )
  }
}

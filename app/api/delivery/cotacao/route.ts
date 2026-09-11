import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { cotarPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/CotarPedidoDeliveryUseCase'
import type { CotacaoPedidoDeliveryBffRequest } from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'

/**
 * POST /api/delivery/cotacao
 * Gestor autenticado. Injeta o slug da empresa e chama a cotação pública
 * (`POST /api/v1/delivery/cotacao`) sem `origem`.
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = (await request.json()) as CotacaoPedidoDeliveryBffRequest
    if (body && typeof body === 'object' && 'origem' in body) {
      delete (body as { origem?: unknown }).origem
    }
    if (body && typeof body === 'object' && 'slug' in body) {
      delete (body as { slug?: unknown }).slug
    }

    const resultado = await cotarPedidoDeliveryUseCase.execute(body, validation.tokenInfo.token)
    const status = resultado.status === 'erro' ? 400 : 200
    return NextResponse.json(resultado, { status })
  } catch (error) {
    console.error('Erro ao cotar taxa de entrega:', error)
    return NextResponse.json(
      { status: 'erro', message: 'Não foi possível cotar a taxa de entrega.' },
      { status: 500 }
    )
  }
}

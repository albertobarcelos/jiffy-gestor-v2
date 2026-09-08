import { NextRequest, NextResponse } from 'next/server'
import {
  proxyPublicDeliveryGet,
  proxyPublicDeliveryPatch,
} from '@/src/shared/utils/proxyPublicDeliveryRoute'

type RouteContext = { params: Promise<{ telefone: string }> }

/**
 * GET /api/public/delivery/clientes/[telefone]
 * Proxy público → GET /api/v1/delivery/clientes/{telefone}
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { telefone } = await params
  if (!telefone?.trim()) {
    return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
  }

  return proxyPublicDeliveryGet(
    `/api/v1/delivery/clientes/${encodeURIComponent(telefone.trim())}`
  )
}

/**
 * PATCH /api/public/delivery/clientes/[telefone]
 * Proxy público → PATCH /api/v1/delivery/clientes/{telefone}
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { telefone } = await params
  if (!telefone?.trim()) {
    return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
  }

  try {
    const body = await request.json()
    return proxyPublicDeliveryPatch(
      `/api/v1/delivery/clientes/${encodeURIComponent(telefone.trim())}`,
      body
    )
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }
}

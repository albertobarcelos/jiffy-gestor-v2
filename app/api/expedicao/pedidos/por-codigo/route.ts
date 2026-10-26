import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  escolherPedidoPeloCodigo,
  mapPedidoLeituraExpedicao,
} from '@/src/application/expedicao/mapPedidoLeituraExpedicao'

/**
 * GET /api/expedicao/pedidos/por-codigo?codigo=
 * Localiza o pedido desta empresa pelo código da via de produção.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const codigo = String(new URL(request.url).searchParams.get('codigo') ?? '')
      .trim()
      .toUpperCase()
    if (!codigo) {
      return NextResponse.json({ error: 'Código do pedido é obrigatório.' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${validation.tokenInfo.token}`,
      Accept: 'application/json',
    }

    const buscas = [`q=${encodeURIComponent(codigo)}&limit=20&offset=0&cancelado=false`]
    if (/^\d+$/.test(codigo)) {
      buscas.push(
        'limit=50&offset=0&cancelado=false&statusDelivery=PENDENTE&statusDelivery=EM_PREPARO&statusDelivery=PRONTO'
      )
    }

    let resumo: unknown = null
    for (const query of buscas) {
      const lista = await apiClient.request<{ items?: unknown[] }>(
        `/api/v1/delivery/pedidos?${query}`,
        { method: 'GET', headers }
      )
      const items = Array.isArray(lista.data?.items) ? lista.data.items : []
      resumo = escolherPedidoPeloCodigo(items, codigo)
      if (resumo && typeof resumo === 'object' && 'id' in resumo) break
      resumo = null
    }
    if (!resumo || typeof resumo !== 'object' || !('id' in resumo)) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
    }

    const id = String((resumo as { id: unknown }).id)
    let detalhe: unknown = resumo
    try {
      const full = await apiClient.request<unknown>(`/api/v1/delivery/pedidos/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers,
      })
      detalhe = full.data ?? resumo
    } catch {
      detalhe = resumo
    }

    const pedido = mapPedidoLeituraExpedicao(detalhe)
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
    }
    return NextResponse.json(pedido)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status === 404 ? 404 : error.status || 500 }
      )
    }
    return NextResponse.json({ error: 'Não foi possível localizar o pedido.' }, { status: 500 })
  }
}

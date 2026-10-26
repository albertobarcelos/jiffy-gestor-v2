import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  escolherEntregadorParaSenhaTeste,
  permitirFallbackIdentificarTeste,
} from '@/src/application/expedicao/identificarEntregadorTeste'

/**
 * POST /api/delivery/entregadores/identificar
 * Encaminha `{ senha }` para a API da empresa. Não devolve a senha.
 * Enquanto o backend não tiver o endpoint, em dev a senha 1234 identifica o ENTREGADOR.
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = (await request.json().catch(() => ({}))) as { senha?: unknown }
    const senha = String(body.senha ?? '').replace(/\D/g, '')
    if (!/^\d{4}$/.test(senha)) {
      return NextResponse.json({ error: 'Informe a senha de 4 dígitos.' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${validation.tokenInfo.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    try {
      const response = await apiClient.request<unknown>('/api/v1/delivery/entregadores/identificar', {
        method: 'POST',
        headers,
        body: JSON.stringify({ senha }),
      })
      const data = response.data && typeof response.data === 'object' ? (response.data as Record<string, unknown>) : {}
      return NextResponse.json({
        id: data.id != null ? String(data.id) : '',
        nome: data.nome != null ? String(data.nome) : '',
        telefone: data.telefone != null ? String(data.telefone) : null,
        ativo: data.ativo !== false,
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return NextResponse.json({ error: mensagemLegivelApiError(error) }, { status: 401 })
      }
      const fallback = await identificarFallbackTeste(apiClient, headers, senha)
      if (fallback) return NextResponse.json(fallback)
      if (error instanceof ApiError) {
        return NextResponse.json({ error: 'Senha não encontrada.' }, { status: 404 })
      }
      throw error
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: 'Senha não encontrada.' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Não foi possível identificar o entregador.' }, { status: 500 })
  }
}

async function identificarFallbackTeste(
  apiClient: ApiClient,
  headers: Record<string, string>,
  senha: string
) {
  if (!permitirFallbackIdentificarTeste()) return null
  const lista = await apiClient.request<{ items?: unknown[] }>('/api/v1/delivery/entregadores?limit=50&offset=0', {
    method: 'GET',
    headers,
  })
  const items = Array.isArray(lista.data?.items) ? lista.data.items : []
  return escolherEntregadorParaSenhaTeste(items, senha)
}

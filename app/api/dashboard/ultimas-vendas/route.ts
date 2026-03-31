import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

type VendasListResponse = {
  items?: Array<Record<string, unknown>>
}

type UsuarioPdvResponse = {
  id?: string
  nome?: string
}

function normalizeUserId(item: Record<string, unknown>): string {
  const abertoPor = item.abertoPor as Record<string, unknown> | undefined
  const usuarioPdv = item.usuarioPdv as Record<string, unknown> | undefined
  const usuario = item.usuario as Record<string, unknown> | undefined

  return (
    (typeof abertoPor?.id === 'string' ? abertoPor.id : '') ||
    (typeof usuarioPdv?.id === 'string' ? usuarioPdv.id : '') ||
    (typeof usuario?.id === 'string' ? usuario.id : '') ||
    (typeof item.abertoPorId === 'string' ? (item.abertoPorId as string) : '') ||
    (typeof item.usuarioId === 'string' ? (item.usuarioId as string) : '') ||
    ''
  )
}

/**
 * GET /api/dashboard/ultimas-vendas
 *
 * Proxy BFF para últimas vendas do período (FINALIZADA) e resolve nomes de usuários PDV.
 * Centraliza no servidor para reduzir chamadas paralelas no client.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const periodoInicial = searchParams.get('periodoInicial') || ''
    const periodoFinal = searchParams.get('periodoFinal') || ''
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || '100'), 1), 100)

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const params = new URLSearchParams()
    params.append('limit', String(limit))
    params.append('offset', '0')
    params.append('status', 'FINALIZADA')
    if (periodoInicial) params.append('periodoInicial', periodoInicial)
    if (periodoFinal) params.append('periodoFinal', periodoFinal)

    const vendasResp = await apiClient.request<VendasListResponse>(
      `/api/v1/operacao-pdv/vendas?${params.toString()}`,
      { method: 'GET', headers }
    )

    const items = Array.isArray(vendasResp.data?.items) ? vendasResp.data.items : []

    const uniqueUserIds = Array.from(
      new Set(items.map(normalizeUserId).filter((id): id is string => Boolean(id)))
    )

    const userNames: Record<string, string> = {}

    await Promise.all(
      uniqueUserIds.map(async (id) => {
        try {
          const userResp = await apiClient.request<UsuarioPdvResponse>(`/api/v1/pessoas/usuarios-pdv/${id}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${tokenInfo.token}` },
          })
          const nome = typeof userResp.data?.nome === 'string' ? userResp.data.nome : ''
          if (nome) userNames[id] = nome
        } catch {
          // Se falhar, apenas não preenche o nome (client usa fallback).
        }
      })
    )

    return NextResponse.json({ items, userNames })
  } catch (error) {
    console.error('Erro ao buscar últimas vendas do dashboard:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar últimas vendas do dashboard' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}


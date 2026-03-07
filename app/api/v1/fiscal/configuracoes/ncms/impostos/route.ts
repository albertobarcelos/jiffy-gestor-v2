import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

function toImpostoConfig(ncm: any) {
  if (!ncm?.codigo) return null

  const impostos = ncm?.impostos ?? {}
  const hasImpostos =
    Boolean(impostos?.cfop) ||
    Boolean(impostos?.csosn) ||
    Boolean(impostos?.icms) ||
    Boolean(impostos?.pis) ||
    Boolean(impostos?.cofins)

  if (!hasImpostos) return null

  return {
    ncm: {
      codigo: ncm.codigo,
      descricao: ncm.descricao,
    },
    cfop: impostos.cfop,
    csosn: impostos.csosn,
    icms: impostos.icms,
    pis: impostos.pis,
    cofins: impostos.cofins,
  }
}

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>('/api/v1/fiscal/configuracoes/ncms?page=0&size=1000', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    const payload = response.data
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.content)
        ? payload.content
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data)
          ? payload.data
          : []

    const configuracoes = items
      .map(toImpostoConfig)
      .filter(Boolean)

    return NextResponse.json(configuracoes)
  } catch (error) {
    console.error('Erro ao buscar configurações de impostos:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar configurações de impostos' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

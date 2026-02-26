import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    const params = new URLSearchParams()
    params.set('uf', String(body?.uf ?? ''))
    params.set('ambiente', String(body?.ambiente ?? ''))
    params.set('modelo', String(body?.modelo ?? ''))
    params.set('serie', String(body?.serie ?? ''))
    params.set('numeroInicial', String(body?.numeroInicial ?? ''))
    params.set('numeroFinal', String(body?.numeroFinal ?? ''))
    params.set('justificativa', String(body?.justificativa ?? ''))

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/fiscal/inutilizar?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao inutilizar numeração:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao inutilizar numeração' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const searchParams = request.nextUrl.searchParams
    const modelo = searchParams.get('modelo')
    const terminalId = searchParams.get('terminal_id')

    let url = '/api/v1/fiscal/configuracoes/numeracao'
    const params = new URLSearchParams()
    if (modelo) params.append('modelo', modelo)
    if (terminalId !== null) params.append('terminal_id', terminalId)
    if (params.toString()) url += `?${params.toString()}`

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar configurações de numeração:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar configurações de numeração' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const body = await request.json()

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>('/api/v1/fiscal/configuracoes/numeracao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao criar configuração de numeração:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao criar configuração de numeração' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

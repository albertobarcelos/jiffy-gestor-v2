import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

function toImpostoConfigFromNcm(ncm: any) {
  const impostos = ncm?.impostos
  if (!ncm?.codigo || !impostos) return null

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { codigo } = await params

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/fiscal/configuracoes/ncms/${codigo}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    const mapped = toImpostoConfigFromNcm(response.data)
    if (!mapped) {
      return NextResponse.json(
        { error: `Configuração de impostos não encontrada para o NCM ${codigo}` },
        { status: 404 }
      )
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Erro ao buscar configuração de impostos:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar configuração de impostos' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { codigo } = await params
    const body = await request.json()

    const apiClient = new ApiClient()

    let response
    try {
      response = await apiClient.request<any>(`/api/v1/fiscal/configuracoes/ncms/${codigo}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenInfo.token}`,
        },
        body: JSON.stringify({ impostos: body }),
      })
    } catch (error) {
      // Se o NCM ainda não existe, criamos com o payload de impostos.
      if (!(error instanceof ApiError) || error.status !== 404) {
        throw error
      }

      response = await apiClient.request<any>('/api/v1/fiscal/configuracoes/ncms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenInfo.token}`,
        },
        body: JSON.stringify({ codigo, impostos: body }),
      })
    }

    const mapped = toImpostoConfigFromNcm(response.data)
    if (!mapped) {
      return NextResponse.json(
        { error: 'Configuração salva, mas sem dados de impostos no retorno da API.' },
        { status: 500 }
      )
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Erro ao salvar configuração de impostos:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao salvar configuração de impostos' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

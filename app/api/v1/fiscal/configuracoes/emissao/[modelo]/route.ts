import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  normalizeAmbiente,
  EmissaoResponse,
  buildEmissaoPayload,
  parseModelo,
  toNumeracaoView,
} from '@/src/server/fiscal/configuracaoEmissaoMapper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { tokenInfo } = validation
    const { modelo } = await params
    const modeloNumber = parseModelo(modelo)
    if (![55, 65].includes(modeloNumber)) {
      return NextResponse.json({ error: 'modelo inválido. Utilize 55 ou 65.' }, { status: 400 })
    }
    const ambienteParam = request.nextUrl.searchParams.get('ambiente')
    if (!ambienteParam) {
      return NextResponse.json(
        { error: 'ambiente é obrigatório. Use HOMOLOGACAO ou PRODUCAO.' },
        { status: 400 }
      )
    }
    const ambiente = normalizeAmbiente(ambienteParam)

    const apiClient = new ApiClient()
    const response = await apiClient.request<EmissaoResponse>(
      `/api/v1/fiscal/configuracoes/emissao/${modeloNumber}?ambiente=${ambiente}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(toNumeracaoView({ ...response.data, ambiente }))
  } catch (error) {
    console.error('Erro ao buscar configuração de emissão:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar configuração de emissão' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ modelo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { tokenInfo } = validation
    const { modelo } = await params
    const modeloNumber = parseModelo(modelo)
    if (![55, 65].includes(modeloNumber)) {
      return NextResponse.json({ error: 'modelo inválido. Utilize 55 ou 65.' }, { status: 400 })
    }

    const body = await request.json()
    const ambienteValue = body?.ambiente ?? request.nextUrl.searchParams.get('ambiente')
    if (!ambienteValue) {
      return NextResponse.json(
        { error: 'ambiente é obrigatório no body ou query. Use HOMOLOGACAO ou PRODUCAO.' },
        { status: 400 }
      )
    }
    const ambiente = normalizeAmbiente(ambienteValue)
    const apiClient = new ApiClient()
    const payload = buildEmissaoPayload(body, modeloNumber, ambiente)

    const response = await apiClient.request<EmissaoResponse>(
      `/api/v1/fiscal/configuracoes/emissao/${modeloNumber}?ambiente=${ambiente}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenInfo.token}`,
        },
        body: JSON.stringify(payload),
      }
    )

    return NextResponse.json(toNumeracaoView({ ...response.data, ambiente }))
  } catch (error) {
    console.error('Erro ao atualizar configuração de emissão:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar configuração de emissão' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


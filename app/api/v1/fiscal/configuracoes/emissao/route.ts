import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  AmbienteFiscal,
  EmissaoResponse,
  normalizeAmbiente,
  parseModelo,
  toNumeracaoView,
} from '@/src/server/fiscal/configuracaoEmissaoMapper'

const AMBIENTES: AmbienteFiscal[] = ['HOMOLOGACAO', 'PRODUCAO']

function isAmbienteNaoDisponivel(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false

  const message = String(error.message ?? '').toLowerCase()
  if (error.status === 400) {
    return message.includes('ambiente inválido') || message.includes('ambiente invalido')
  }

  if (error.status === 404) {
    // Ignora somente ausência da configuração de emissão para o modelo/ambiente.
    // Não deve ocultar 404 de rota inexistente.
    return (
      (message.includes('configura') && message.includes('emiss') && message.includes('não encontr')) ||
      (message.includes('configura') && message.includes('emiss') && message.includes('nao encontr'))
    )
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { tokenInfo } = validation
    const apiClient = new ApiClient()
    const modeloQuery = request.nextUrl.searchParams.get('modelo')
    const modelos = modeloQuery ? [parseModelo(modeloQuery)] : [55, 65]
    const result: any[] = []

    for (const modelo of modelos) {
      if (![55, 65].includes(modelo)) continue

      for (const ambiente of AMBIENTES) {
        try {
          const response = await apiClient.request<EmissaoResponse>(
            `/api/v1/fiscal/configuracoes/emissao/${modelo}?ambiente=${ambiente}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${tokenInfo.token}`,
              },
            }
          )
          // Garante ambiente canônico na resposta
          const data = { ...response.data, ambiente: normalizeAmbiente(response.data?.ambiente ?? ambiente) }
          result.push(toNumeracaoView(data))
        } catch (error) {
          if (isAmbienteNaoDisponivel(error)) continue
          throw error
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar configurações de emissão:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar configurações de emissão' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


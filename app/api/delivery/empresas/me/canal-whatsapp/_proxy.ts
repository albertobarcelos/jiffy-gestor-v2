import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  logFalhaCanalWhatsApp,
  MENSAGEM_CANAL_WHATSAPP_INDISPONIVEL_SUPORTE,
  CANAL_WHATSAPP_UNAVAILABLE_CODE,
} from '@/src/shared/utils/canalWhatsAppFalha'

const BACKEND_BASE = '/api/v1/delivery/empresas/me/canal-whatsapp'

export function backendCanalWhatsAppPath(suffix = ''): string {
  return `${BACKEND_BASE}${suffix}`
}

export async function proxyCanalWhatsApp(
  request: NextRequest,
  options: {
    method: 'GET' | 'PUT' | 'DELETE'
    suffix?: string
    logContext: string
  }
): Promise<NextResponse> {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(backendCanalWhatsAppPath(options.suffix ?? ''), {
      method: options.method,
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        Accept: 'application/json',
      },
    })

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      logFalhaCanalWhatsApp(options.logContext, mensagemLegivelApiError(error))
      return NextResponse.json(
        {
          error: MENSAGEM_CANAL_WHATSAPP_INDISPONIVEL_SUPORTE,
          errorCode: CANAL_WHATSAPP_UNAVAILABLE_CODE,
        },
        { status: 503 }
      )
    }

    if (error instanceof ApiError) {
      // GET 404 = empresa sem canal. A UI trata como vazio; não é falha operacional.
      if (error.status !== 404) {
        logFalhaCanalWhatsApp(options.logContext, error)
      }
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    logFalhaCanalWhatsApp(options.logContext, error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

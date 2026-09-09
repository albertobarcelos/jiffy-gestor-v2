import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import { isTipoNotificacaoWhatsAppDelivery } from '@/src/application/dto/delivery/NotificacaoWhatsAppDeliveryDTO'

function backendPath(tipo: string): string {
  return `/api/v1/delivery/empresas/me/notificacoes-whatsapp/${encodeURIComponent(tipo)}`
}

function handleApiError(error: unknown, context: string): NextResponse {
  console.error(context, error)
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: mensagemLegivelApiError(error), details: error.data },
      { status: error.status }
    )
  }
  return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
}

async function tipoDaRota(params: Promise<{ tipoNotificacao: string }>): Promise<string | null> {
  const { tipoNotificacao } = await params
  const tipo = tipoNotificacao?.trim() ?? ''
  if (!tipo || !isTipoNotificacaoWhatsAppDelivery(tipo)) return null
  return tipo
}

/** GET /api/delivery/empresas/me/notificacoes-whatsapp/[tipoNotificacao] */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipoNotificacao: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const tipo = await tipoDaRota(params)
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de notificação inválido' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(backendPath(tipo), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        Accept: 'application/json',
      },
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar notificação WhatsApp delivery:')
  }
}

/** PATCH /api/delivery/empresas/me/notificacoes-whatsapp/[tipoNotificacao] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tipoNotificacao: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const tipo = await tipoDaRota(params)
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de notificação inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(backendPath(tipo), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    return handleApiError(error, 'Erro ao atualizar notificação WhatsApp delivery:')
  }
}

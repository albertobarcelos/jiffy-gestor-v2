import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

const upstreamLogoPath = '/api/v1/empresas/me/logo-impressao'

function externalBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL
  return base && base.length > 0 ? base.replace(/\/$/, '') : null
}

/**
 * GET /api/empresas/me/logo-impressao
 * Devolve o PNG (ou outro content-type) da logo de impressão atual.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const base = externalBaseUrl()
    if (!base) {
      return NextResponse.json({ error: 'API base URL não configurada' }, { status: 500 })
    }

    const upstream = await fetch(`${base}${upstreamLogoPath}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        Accept: 'image/png,*/*',
      },
    })

    if (upstream.status === 404) {
      return new NextResponse(null, { status: 404 })
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return NextResponse.json(
        { error: text || 'Erro ao buscar logo de impressão' },
        { status: upstream.status }
      )
    }

    const buf = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') ?? 'image/png'
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Erro no GET logo-impressao:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/empresas/me/logo-impressao
 * Remove a logo de impressão no backend.
 */
export async function DELETE(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const base = externalBaseUrl()
    if (!base) {
      return NextResponse.json({ error: 'API base URL não configurada' }, { status: 500 })
    }

    const upstream = await fetch(`${base}${upstreamLogoPath}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
      },
    })

    if (upstream.status === 204 || upstream.status === 404) {
      return new NextResponse(null, { status: upstream.status })
    }

    const text = await upstream.text().catch(() => '')
    let message = text || 'Erro ao remover logo'
    try {
      const j = JSON.parse(text) as { error?: string; message?: string }
      message = j.error || j.message || message
    } catch {
      /* corpo não JSON */
    }
    return NextResponse.json({ error: message }, { status: upstream.status })
  } catch (error) {
    console.error('Erro no DELETE logo-impressao:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/empresas/me/logo-impressao
 * Encaminha multipart (campo `file`) para a API externa.
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const incoming = await request.formData()
    const file = incoming.get('file')
    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: 'Arquivo ausente ou inválido' }, { status: 400 })
    }

    const forward = new FormData()
    forward.append('file', file)

    const apiClient = new ApiClient()
    const { data, status } = await apiClient.request<unknown>(
      '/api/v1/empresas/me/logo-impressao',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
        body: forward,
      }
    )

    return NextResponse.json(data, { status })
  } catch (error) {
    console.error('Erro ao enviar logo de impressão:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao enviar logo' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ExportacaoXmlSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'
import {
  buildExportacaoXmlFilename,
  periodoExportacaoXml,
} from '@/src/shared/utils/exportacaoXmlFilename'

async function resolverNomeEmpresa(token: string, backendUrl: string): Promise<string> {
  try {
    const response = await fetch(`${backendUrl}/api/empresas/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return 'Empresa'
    const data = (await response.json()) as Record<string, unknown>
    const nome = String(
      data.nomeFantasia ?? data.razaoSocial ?? data.nome ?? data.empresa ?? 'Empresa'
    ).trim()
    return nome || 'Empresa'
  } catch {
    return 'Empresa'
  }
}

/**
 * POST /api/v1/fiscal/exportacao/xmls
 * Proxy para o backend principal → microserviço fiscal (exportação ZIP/JSON).
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    const parsed = ExportacaoXmlSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    const backendUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || 'http://localhost:3000'
    const url = `${backendUrl}/api/v1/fiscal/exportacao/xmls`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/zip, application/json, */*',
      },
      body: JSON.stringify(parsed.data),
    })

    const contentType = response.headers.get('content-type') ?? ''

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}))
        return NextResponse.json(
          {
            error:
              (errorData as { message?: string; error?: string }).message ||
              (errorData as { error?: string }).error ||
              'Erro ao exportar XMLs',
          },
          { status: response.status }
        )
      }

      const errorText = await response.text().catch(() => '')
      return NextResponse.json(
        { error: errorText || `Erro ${response.status}: ${response.statusText}` },
        { status: response.status }
      )
    }

    if (contentType.includes('application/json')) {
      const data = await response.json()
      return NextResponse.json(data)
    }

    const fileBuffer = await response.arrayBuffer()
    const fileBytes = Buffer.from(fileBuffer)
    const nomeEmpresa = await resolverNomeEmpresa(tokenInfo.token, backendUrl)
    const filename = buildExportacaoXmlFilename(
      nomeEmpresa,
      periodoExportacaoXml(parsed.data)
    )

    return new NextResponse(fileBytes, {
      status: 200,
      headers: {
        'Content-Type': contentType.includes('zip') ? 'application/zip' : contentType || 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBytes.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Exportacao XML] Erro:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor ao exportar XMLs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

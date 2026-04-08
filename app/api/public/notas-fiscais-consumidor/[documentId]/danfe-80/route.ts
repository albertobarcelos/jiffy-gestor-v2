import { NextRequest, NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/public/notas-fiscais-consumidor/[documentId]/danfe-80
 * Proxy: PNG rodapé NFC-e 80mm (QR + dados fiscais) — microserviço fiscal público.
 * Upstream: GET {FISCAL_MICROSERVICE_BASE_URL}/v1/public/documentos/{documentId}/nfce-cupom-rodape-80mm
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params
    if (!documentId?.trim()) {
      return NextResponse.json({ error: 'ID do documento fiscal é obrigatório' }, { status: 400 })
    }

    const id = documentId.trim()
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'ID inválido (deve ser um UUID)' },
        { status: 400 }
      )
    }

    const backendUrl = (process.env.FISCAL_MICROSERVICE_BASE_URL || '').replace(/\/$/, '')
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta (FISCAL_MICROSERVICE_BASE_URL)' },
        { status: 500 }
      )
    }

    const query = process.env.FISCAL_MICROSERVICE_NFCE_RODAPE_QUERY?.trim()
    const path = `${backendUrl}/v1/public/documentos/${encodeURIComponent(id)}/nfce-cupom-rodape-80mm`
    const url = query ? `${path}?${query}` : path

    const headers: Record<string, string> = {
      Accept: 'image/png,image/*;q=0.9,*/*;q=0.1',
    }
    const serviceKey = process.env.FISCAL_MICROSERVICE_API_KEY?.trim()
    if (serviceKey) {
      headers['X-Api-Key'] = serviceKey
    }

    const response = await fetch(url, { method: 'GET', headers })

    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: não foi possível obter o cupom fiscal`
      try {
        const text = await response.text()
        if (text) {
          try {
            const j = JSON.parse(text) as { message?: string; error?: string }
            errorMessage = j.message || j.error || errorMessage
          } catch {
            if (text.length < 200) errorMessage = text
          }
        }
      } catch {
        // ignore
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const buf = await response.arrayBuffer()
    const bytes = Buffer.from(buf)

    const isPng =
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a

    const upstreamCt = response.headers.get('content-type') || ''
    const looksLikeImage =
      upstreamCt.includes('image/') || upstreamCt.includes('application/octet-stream')

    if (!isPng && !looksLikeImage) {
      try {
        const text = bytes.toString('utf8')
        const j = JSON.parse(text) as { message?: string; error?: string }
        return NextResponse.json(
          { error: j.message || j.error || 'Resposta inesperada do servidor (não é imagem)' },
          { status: 502 }
        )
      } catch {
        return NextResponse.json(
          { error: 'Resposta inesperada do servidor (esperado PNG)' },
          { status: 502 }
        )
      }
    }

    if (!isPng && looksLikeImage) {
      const ct = upstreamCt.split(';')[0]?.trim() || 'application/octet-stream'
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          'Content-Type': ct.startsWith('image/') ? ct : 'application/octet-stream',
          'Content-Disposition': `inline; filename="danfe_80_${id}"`,
          'Content-Length': bytes.length.toString(),
          'Cache-Control': 'private, max-age=300',
        },
      })
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="danfe_80_${id}.png"`,
        'Content-Length': bytes.length.toString(),
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (e) {
    console.error('[danfe-80 public] Erro:', e)
    return NextResponse.json(
      { error: 'Erro interno ao buscar cupom fiscal' },
      { status: 500 }
    )
  }
}

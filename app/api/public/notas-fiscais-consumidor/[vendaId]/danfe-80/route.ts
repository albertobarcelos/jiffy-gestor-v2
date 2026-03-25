import { NextRequest, NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/public/notas-fiscais-consumidor/[vendaId]/danfe-80
 * Proxy público: PNG cupom 80mm (QR + dados fiscais) — backend gestor.
 * Autenticação: opcional X-Api-Key via EXTERNAL_API_PUBLIC_KEY (servidor).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vendaId: string }> }
) {
  try {
    const { vendaId } = await params
    if (!vendaId?.trim()) {
      return NextResponse.json({ error: 'ID da venda é obrigatório' }, { status: 400 })
    }

    const id = vendaId.trim()
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'ID inválido (deve ser um UUID)' },
        { status: 400 }
      )
    }

    const backendUrl = (process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || '').replace(/\/$/, '')
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta (API base)' },
        { status: 500 }
      )
    }

    const query = process.env.PUBLIC_GESTOR_DANFE_80_QUERY?.trim()
    const path = `${backendUrl}/api/v1/gestor/vendas/${encodeURIComponent(id)}/danfe`
    const url = query ? `${path}?${query}` : path

    const headers: Record<string, string> = {
      Accept: 'image/png,image/*;q=0.9,*/*;q=0.1',
    }
    const serviceKey = process.env.EXTERNAL_API_PUBLIC_KEY?.trim()
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
      // Pode ser JPEG/WebP etc.; repassa tipo quando reconhecível
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

import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  DELIVERY_IMAGE_MIME_TYPES,
  detectDeliveryImageMimeFromBytes,
  type DeliveryImageMimeType,
} from '@/src/shared/constants/deliveryImageUpload'

function isAllowedPresignedUploadUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== 'https:') return false

    const host = parsed.hostname.toLowerCase()
    return (
      host.endsWith('.amazonaws.com') ||
      host === 'amazonaws.com' ||
      host.endsWith('.cloudfront.net')
    )
  } catch {
    return false
  }
}

/**
 * POST /api/media/presigned-put
 * Envia o arquivo para a URL pré-assinada do S3 pelo servidor (evita CORS no browser).
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const uploadUrl = formData.get('uploadUrl')
    const mimeTypeField = formData.get('mimeType')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
    }

    if (typeof uploadUrl !== 'string' || !uploadUrl.trim()) {
      return NextResponse.json({ error: 'URL de upload é obrigatória' }, { status: 400 })
    }

    const mimeTypeCandidate =
      typeof mimeTypeField === 'string' && mimeTypeField.trim()
        ? mimeTypeField.trim().toLowerCase()
        : file.type?.trim().toLowerCase() || ''

    const buffer = Buffer.from(await file.arrayBuffer())
    const sniffedMimeType = detectDeliveryImageMimeFromBytes(new Uint8Array(buffer.subarray(0, 16)))

    const contentType = (sniffedMimeType ??
      (DELIVERY_IMAGE_MIME_TYPES.includes(mimeTypeCandidate as DeliveryImageMimeType)
        ? (mimeTypeCandidate as DeliveryImageMimeType)
        : null)) as DeliveryImageMimeType | null

    if (!contentType) {
      return NextResponse.json(
        {
          error:
            'Arquivo não é uma imagem JPEG, PNG ou WebP válida. Exporte ou salve a imagem novamente.',
        },
        { status: 400 }
      )
    }

    if (!isAllowedPresignedUploadUrl(uploadUrl)) {
      return NextResponse.json({ error: 'URL de upload não permitida' }, { status: 400 })
    }

    const upstream = await fetch(uploadUrl.trim(), {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
      },
      body: buffer,
    })

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => '')
      console.error('Erro no proxy PUT S3:', upstream.status, details)
      return NextResponse.json(
        { error: 'Falha ao enviar arquivo para o storage', details },
        { status: upstream.status || 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro no proxy presigned-put:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

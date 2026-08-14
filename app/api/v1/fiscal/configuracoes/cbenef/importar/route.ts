import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { requestCbenefUpstream } from '@/src/server/fiscal/cbenefUpstream'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Importa tabela cBenef. Upstream: POST multipart /v1/configuracoes/cbenef/importar
 * Campo: arquivo (JSON).
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const inbound = await request.formData()
    const arquivo = inbound.get('arquivo')
    if (!(arquivo instanceof Blob)) {
      return NextResponse.json(
        { error: 'Envie o arquivo JSON no campo "arquivo" (multipart/form-data).' },
        { status: 400 }
      )
    }

    const outbound = new FormData()
    const nome = arquivo instanceof File && arquivo.name ? arquivo.name : 'cbenef.json'
    outbound.append('arquivo', arquivo, nome)

    const response = await requestCbenefUpstream<unknown>('/v1/configuracoes/cbenef/importar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: outbound,
    })

    const data = asRecord(response.data) ?? {}
    return NextResponse.json({
      totalProcessados: asNumber(data.totalProcessados),
      inseridos: asNumber(data.inseridos),
      atualizados: asNumber(data.atualizados),
      ignorados: asNumber(data.ignorados),
      erros: asNumber(data.erros),
    })
  } catch (error) {
    console.error('Erro ao importar tabela cBenef:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao importar tabela cBenef' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

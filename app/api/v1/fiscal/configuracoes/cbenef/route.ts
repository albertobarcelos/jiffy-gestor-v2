import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { requestCbenefUpstream } from '@/src/server/fiscal/cbenefUpstream'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function mapItem(raw: unknown) {
  const item = asRecord(raw)
  if (!item) return null
  const codigo = String(item.codigo ?? '').trim()
  if (!codigo) return null
  const cstIcmsCompativel =
    item.cstIcmsCompativel != null ? String(item.cstIcmsCompativel) : undefined
  return {
    codigo,
    descricao: String(item.descricao ?? ''),
    uf: item.uf != null ? String(item.uf) : undefined,
    cstIcmsCompativel,
    cstIcms: cstIcmsCompativel,
    vigenciaInicio: item.vigenciaInicio != null ? String(item.vigenciaInicio) : null,
    vigenciaFim: item.vigenciaFim != null ? String(item.vigenciaFim) : null,
  }
}

/**
 * Lista cBenef da UF. Upstream: GET /v1/configuracoes/cbenef/por-uf/{uf}?cst=
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const uf = request.nextUrl.searchParams.get('uf')?.trim().toUpperCase() ?? ''
    const cst = request.nextUrl.searchParams.get('cst')?.trim() ?? ''

    if (!uf || uf.length !== 2) {
      return NextResponse.json({ error: 'Informe a UF (2 letras) para listar cBenef.' }, { status: 400 })
    }

    const qs = cst ? `?cst=${encodeURIComponent(cst)}` : ''
    const response = await requestCbenefUpstream<unknown>(
      `/v1/configuracoes/cbenef/por-uf/${encodeURIComponent(uf)}${qs}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    const payload = response.data
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(asRecord(payload)?.content)
        ? (asRecord(payload)?.content as unknown[])
        : Array.isArray(asRecord(payload)?.data)
          ? (asRecord(payload)?.data as unknown[])
          : []

    return NextResponse.json(items.map(mapItem).filter(Boolean))
  } catch (error) {
    console.error('Erro ao listar cBenef:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao listar cBenef' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

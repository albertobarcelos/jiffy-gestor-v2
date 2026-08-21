import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import {
  codigoCbenefTemTamanhoValido,
  normalizarCodigoCbenefParaValidacao,
} from '@/src/domain/entities/painel-contador/cbenefRegras'
import { requestCbenefUpstream } from '@/src/server/fiscal/cbenefUpstream'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Valida cBenef. Upstream: GET /v1/configuracoes/cbenef/validar/{codigo}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { codigo: codigoRaw } = await params
    const codigo = normalizarCodigoCbenefParaValidacao(codigoRaw)

    if (!codigoCbenefTemTamanhoValido(codigo)) {
      return NextResponse.json({
        valido: false,
        codigo,
        descricao: null,
        uf: null,
        vigente: false,
        mensagem: 'Formato de código inválido. Use 8 ou 10 caracteres (ex: SP070060), ou SEM CBENEF.',
      })
    }

    const response = await requestCbenefUpstream<unknown>(
      `/v1/configuracoes/cbenef/validar/${encodeURIComponent(codigo)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    const data = asRecord(response.data) ?? {}
    const valido = data.valido === true
    return NextResponse.json({
      valido,
      codigo: String(data.codigo ?? codigo),
      descricao: data.descricao != null ? String(data.descricao) : null,
      uf: data.uf != null ? String(data.uf) : null,
      vigente: valido,
      cstIcmsCompativel:
        data.cstIcmsCompativel != null ? String(data.cstIcmsCompativel) : null,
      mensagem: data.mensagem != null ? String(data.mensagem) : null,
    })
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      const { codigo: codigoRaw } = await params
      const data = asRecord(error.data)
      return NextResponse.json({
        valido: false,
        codigo: normalizarCodigoCbenefParaValidacao(codigoRaw),
        descricao: data?.descricao != null ? String(data.descricao) : null,
        uf: data?.uf != null ? String(data.uf) : null,
        vigente: false,
        mensagem: data?.mensagem != null ? String(data.mensagem) : null,
      })
    }
    console.error('Erro ao validar cBenef:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao validar cBenef' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

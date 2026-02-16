import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'

/**
 * POST /api/v1/fiscal/configuracoes/ncms/[codigo]/impostos/copiar
 * Copia configuração de impostos de um NCM para outros NCMs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { tokenInfo } = validation
    const { codigo } = await params

    if (!codigo) {
      return NextResponse.json({ error: 'Código NCM é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    if (!body.ncmsDestino || !Array.isArray(body.ncmsDestino) || body.ncmsDestino.length === 0) {
      return NextResponse.json(
        { error: 'Lista de NCMs destino é obrigatória e não pode estar vazia' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${BACKEND_URL}/api/v1/fiscal/configuracoes/ncms/${codigo}/impostos/copiar`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = errorText ? JSON.parse(errorText) : {}
      } catch {
        errorData = { message: errorText || `Erro ${response.status}` }
      }
      return NextResponse.json(
        { error: errorData.message || errorData.error || 'Erro ao copiar configuração' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erro ao copiar configuração:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

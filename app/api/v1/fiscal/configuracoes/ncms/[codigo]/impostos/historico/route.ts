import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'

/**
 * GET /api/v1/fiscal/configuracoes/ncms/[codigo]/impostos/historico
 * Lista histórico de alterações de configuração de impostos por NCM
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
    const { codigo } = await params

    if (!codigo) {
      return NextResponse.json({ error: 'Código NCM é obrigatório' }, { status: 400 })
    }

    const response = await fetch(
      `${BACKEND_URL}/api/v1/fiscal/configuracoes/ncms/${codigo}/impostos/historico`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
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
        { error: errorData.message || errorData.error || 'Erro ao buscar histórico' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erro ao buscar histórico de configuração:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

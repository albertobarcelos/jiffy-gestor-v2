import { NextRequest, NextResponse } from 'next/server'
import { proxyOperacaoCaixaEstacao } from '@/src/infrastructure/api/caixaEstacaoBff'

/** GET /api/caixa/operacao-caixa-estacao/:id */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id?.trim()) {
    return NextResponse.json({ error: 'ID da operação é obrigatório' }, { status: 400 })
  }
  return proxyOperacaoCaixaEstacao(request, `/${encodeURIComponent(id)}`)
}

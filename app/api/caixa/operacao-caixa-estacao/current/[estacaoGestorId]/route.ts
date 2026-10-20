import { NextRequest, NextResponse } from 'next/server'
import { proxyOperacaoCaixaEstacao } from '@/src/infrastructure/api/caixaEstacaoBff'

/** GET current — 404 = caixa fechado (não abre). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ estacaoGestorId: string }> }
) {
  const { estacaoGestorId } = await params
  if (!estacaoGestorId?.trim()) {
    return NextResponse.json({ error: 'estacaoGestorId é obrigatório' }, { status: 400 })
  }
  return proxyOperacaoCaixaEstacao(
    request,
    `/current/${encodeURIComponent(estacaoGestorId)}`
  )
}

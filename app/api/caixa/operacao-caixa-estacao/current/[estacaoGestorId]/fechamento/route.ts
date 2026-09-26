import { NextRequest, NextResponse } from 'next/server'
import { proxyOperacaoCaixaEstacao, readJsonBody } from '@/src/infrastructure/api/caixaEstacaoBff'

/** POST fechamento — body só { valorFornecido }. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ estacaoGestorId: string }> }
) {
  const { estacaoGestorId } = await params
  if (!estacaoGestorId?.trim()) {
    return NextResponse.json({ error: 'estacaoGestorId é obrigatório' }, { status: 400 })
  }
  const body = await readJsonBody(request)
  return proxyOperacaoCaixaEstacao(
    request,
    `/current/${encodeURIComponent(estacaoGestorId)}/fechamento`,
    { method: 'POST', body: JSON.stringify(body ?? {}) }
  )
}

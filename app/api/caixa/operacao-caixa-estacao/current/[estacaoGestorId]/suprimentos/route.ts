import { NextRequest, NextResponse } from 'next/server'
import { proxyOperacaoCaixaEstacao, readJsonBody } from '@/src/infrastructure/api/caixaEstacaoBff'

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
    `/current/${encodeURIComponent(estacaoGestorId)}/suprimentos`
  )
}

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
    `/current/${encodeURIComponent(estacaoGestorId)}/suprimentos`,
    { method: 'POST', body: JSON.stringify(body ?? {}) }
  )
}

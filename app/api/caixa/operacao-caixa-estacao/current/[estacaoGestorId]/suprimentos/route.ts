import { NextRequest, NextResponse } from 'next/server'
import { proxyOperacaoCaixaEstacao, readJsonBody } from '@/src/infrastructure/api/caixaEstacaoBff'
import { MovimentacaoCaixaEstacaoSchema } from '@/src/application/validators/caixa-estacao/CaixaEstacaoInputSchemas'
import { parseCaixaEstacaoInput } from '@/src/application/validators/caixa-estacao/parseCaixaEstacaoInput'
import { caixaEstacaoZodErrorResponse } from '@/src/infrastructure/api/caixaEstacaoRouteValidation'

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
  try {
    const { estacaoGestorId } = await params
    if (!estacaoGestorId?.trim()) {
      return NextResponse.json({ error: 'estacaoGestorId é obrigatório' }, { status: 400 })
    }
    const body = await readJsonBody(request)
    const parsed = parseCaixaEstacaoInput(MovimentacaoCaixaEstacaoSchema, body ?? {})
    return proxyOperacaoCaixaEstacao(
      request,
      `/current/${encodeURIComponent(estacaoGestorId)}/suprimentos`,
      { method: 'POST', body: JSON.stringify(parsed) }
    )
  } catch (error) {
    const zodResponse = caixaEstacaoZodErrorResponse(error)
    if (zodResponse) return zodResponse
    throw error
  }
}

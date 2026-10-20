import { NextRequest, NextResponse } from 'next/server'
import { proxyOperacaoCaixaEstacao, readJsonBody } from '@/src/infrastructure/api/caixaEstacaoBff'
import { FecharCaixaEstacaoSchema } from '@/src/application/validators/caixa-estacao/CaixaEstacaoInputSchemas'
import { parseCaixaEstacaoInput } from '@/src/application/validators/caixa-estacao/parseCaixaEstacaoInput'
import { caixaEstacaoZodErrorResponse } from '@/src/infrastructure/api/caixaEstacaoRouteValidation'

/** POST fechamento — body só { valorFornecido }. */
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
    const parsed = parseCaixaEstacaoInput(FecharCaixaEstacaoSchema, body ?? {})
    return proxyOperacaoCaixaEstacao(
      request,
      `/current/${encodeURIComponent(estacaoGestorId)}/fechamento`,
      { method: 'POST', body: JSON.stringify(parsed) }
    )
  } catch (error) {
    const zodResponse = caixaEstacaoZodErrorResponse(error)
    if (zodResponse) return zodResponse
    throw error
  }
}

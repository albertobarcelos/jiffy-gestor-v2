import { NextRequest, NextResponse } from 'next/server'
import { MovimentacaoCaixaTerminalSchema } from '@/src/application/validators/caixa-terminal/CaixaTerminalInputSchemas'
import {
  proxyOperacaoCaixaTerminal,
  readJsonBody,
} from '@/src/infrastructure/api/caixaTerminalBff'
import { caixaTerminalZodErrorResponse } from '@/src/infrastructure/api/caixaTerminalRouteValidation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ terminalId: string }> }
) {
  const { terminalId } = await params
  if (!terminalId?.trim()) {
    return NextResponse.json({ error: 'terminalId é obrigatório' }, { status: 400 })
  }
  return proxyOperacaoCaixaTerminal(
    request,
    `/current/${encodeURIComponent(terminalId)}/sangrias`
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ terminalId: string }> }
) {
  try {
    const { terminalId } = await params
    if (!terminalId?.trim()) {
      return NextResponse.json({ error: 'terminalId é obrigatório' }, { status: 400 })
    }
    const body = await readJsonBody(request)
    const parsed = MovimentacaoCaixaTerminalSchema.parse(body ?? {})
    return proxyOperacaoCaixaTerminal(
      request,
      `/current/${encodeURIComponent(terminalId)}/sangrias`,
      { method: 'POST', body: JSON.stringify(parsed) }
    )
  } catch (error) {
    const zodResponse = caixaTerminalZodErrorResponse(error)
    if (zodResponse) return zodResponse
    throw error
  }
}
